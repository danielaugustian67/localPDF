/**
 * Offline OCR service (Tesseract.js 6, WebAssembly).
 *
 * Every asset (worker, WASM core, ind/eng traineddata) is served from
 * `src/renderer/public/tesseract`, copied there by `scripts/copyOcrAssets.mjs`,
 * so no request ever leaves the machine.
 */

import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib'
import { createWorker, OEM, PSM } from 'tesseract.js'
import {
  renderPageToHighResCanvas,
  prepareImageForOcr,
  PreprocessOptions
} from './imageProcessingService'
import { buildDocxFile, ExtractedParagraph } from './docxService'

export type OcrLanguage = 'ind' | 'eng' | 'ind+eng'
export type OcrOutputFormat = 'searchable-pdf' | 'docx' | 'text'

const OCR_DPI = 300

export interface OcrProgress {
  currentPage: number
  totalPages: number
  percent: number
  status: string
}

interface Bbox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OcrLine {
  text: string
  confidence: number
  bbox: Bbox
}

export interface OcrParagraph {
  text: string
  lines: OcrLine[]
}

export interface OcrPageResult {
  pageNumber: number
  text: string
  confidence: number
  paragraphs: OcrParagraph[]
  lines: OcrLine[]
  /** Original (un-binarized) render, used as the visual layer of the searchable PDF */
  highResCanvas: HTMLCanvasElement
  /** Page size in PDF points (scale 1.0) */
  pageWidth: number
  pageHeight: number
}

export interface OcrCompleteResult {
  fullText: string
  markdownText: string
  pages: OcrPageResult[]
  averageConfidence: number
  totalPages: number
  searchablePdfBytes?: Uint8Array
  docxBytes?: Uint8Array
}

/** Resolves a public asset against the page base, so it works on http:// (dev) and file:// (build). */
function assetUrl(relative: string): string {
  return new URL(relative, document.baseURI).href
}

function toLangList(lang: OcrLanguage): string[] {
  return lang.split('+')
}

/**
 * Standard-14 Helvetica only encodes WinAnsi. Normalise typographic characters and
 * drop anything else so drawText never throws on OCR output.
 */
function toWinAnsi(text: string): string {
  return text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E -ÿ]/g, '')
}

async function createOcrWorker(lang: OcrLanguage, onRecognizeProgress: (p: number) => void) {
  const worker = await createWorker(toLangList(lang), OEM.LSTM_ONLY, {
    workerPath: assetUrl('tesseract/worker.min.js'),
    corePath: assetUrl('tesseract/core'),
    langPath: assetUrl('tesseract/lang'),
    gzip: true,
    cacheMethod: 'none',
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onRecognizeProgress(Math.round(m.progress * 100))
      }
    }
  })

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
    user_defined_dpi: String(OCR_DPI)
  })

  return worker
}

/**
 * Builds a searchable PDF: the original page render as the visible layer, plus an
 * invisible (opacity 0) text layer positioned on each recognised line so it can be
 * selected, copied and found with Ctrl/Cmd+F.
 */
export async function buildSearchablePdf(pages: OcrPageResult[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)

  for (const p of pages) {
    // Embed at ~2x page size: sharp on screen and in print, far smaller than the 300 DPI render
    const embedScale = Math.min(1, (p.pageWidth * 2) / p.highResCanvas.width)
    const embedCanvas = document.createElement('canvas')
    embedCanvas.width = Math.round(p.highResCanvas.width * embedScale)
    embedCanvas.height = Math.round(p.highResCanvas.height * embedScale)
    const ectx = embedCanvas.getContext('2d')
    if (!ectx) throw new Error('Failed to get 2D canvas context.')
    ectx.drawImage(p.highResCanvas, 0, 0, embedCanvas.width, embedCanvas.height)

    const jpgBytes = await new Promise<Uint8Array>((resolve, reject) => {
      embedCanvas.toBlob(
        async (blob) => {
          if (!blob) return reject(new Error('Failed to encode page image.'))
          resolve(new Uint8Array(await blob.arrayBuffer()))
        },
        'image/jpeg',
        0.85
      )
    })

    const image = await doc.embedJpg(jpgBytes)
    const page = doc.addPage([p.pageWidth, p.pageHeight])
    page.drawImage(image, { x: 0, y: 0, width: p.pageWidth, height: p.pageHeight })

    const fx = p.pageWidth / p.highResCanvas.width
    const fy = p.pageHeight / p.highResCanvas.height

    for (const line of p.lines) {
      drawInvisibleLine(page, font, line, fx, fy, p.pageHeight)
    }
  }

  return await doc.save()
}

function drawInvisibleLine(
  page: ReturnType<PDFDocument['addPage']>,
  font: PDFFont,
  line: OcrLine,
  fx: number,
  fy: number,
  pageHeight: number
): void {
  const text = toWinAnsi(line.text).trim()
  if (!text) return

  const boxW = (line.bbox.x1 - line.bbox.x0) * fx
  const boxH = (line.bbox.y1 - line.bbox.y0) * fy
  if (boxW <= 0 || boxH <= 0) return

  // Start from the box height, then fit the width so selection matches the visible words
  let size = boxH * 0.85
  const measured = font.widthOfTextAtSize(text, size)
  if (measured > 0) size *= boxW / measured
  size = Math.max(3, Math.min(72, size))

  page.drawText(text, {
    x: line.bbox.x0 * fx,
    // PDF origin is bottom-left; sit the baseline slightly above the box bottom (descenders)
    y: pageHeight - line.bbox.y1 * fy + boxH * 0.2,
    size,
    font,
    color: rgb(0, 0, 0),
    opacity: 0
  })
}

/** Word document with one paragraph per recognised paragraph (lines re-joined). */
export function buildOcrDocx(pages: OcrPageResult[]): Uint8Array {
  return buildDocxFile(ocrPagesToParagraphs(pages))
}

/** Converts OCR pages into the paragraph model shared with the DOCX generator and previews. */
export function ocrPagesToParagraphs(pages: OcrPageResult[]): ExtractedParagraph[] {
  const paragraphs: ExtractedParagraph[] = []

  for (const page of pages) {
    if (pages.length > 1) {
      paragraphs.push({ text: `Halaman ${page.pageNumber}`, isHeading: true, pageNumber: page.pageNumber })
    }
    for (const para of page.paragraphs) {
      const text = para.lines.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim()
      if (!text) continue
      const isHeading =
        para.lines.length === 1 && text.length <= 60 && /[A-Z]/.test(text) && text === text.toUpperCase()
      paragraphs.push({ text, isHeading, pageNumber: page.pageNumber })
    }
  }

  return paragraphs
}

function pageText(paragraphs: OcrParagraph[]): string {
  return paragraphs
    .map((p) => p.lines.map((l) => l.text).join('\n'))
    .filter(Boolean)
    .join('\n\n')
}

/**
 * End-to-end pipeline: render at 300 DPI → preprocess → recognise → build output.
 * One worker is reused for every page; it is always terminated, even on failure.
 */
export async function runOcrPipeline(
  pdfBytes: Uint8Array,
  options: {
    language?: OcrLanguage
    outputFormat?: OcrOutputFormat
    preprocess?: PreprocessOptions
  } = {},
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrCompleteResult> {
  const lang = options.language || 'ind+eng'
  const format = options.outputFormat || 'searchable-pdf'
  const preprocess = options.preprocess || { binarize: true, contrast: true, sharpen: true }

  const pdf = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise
  const totalPages = pdf.numPages

  const report = (currentPage: number, percent: number, status: string): void => {
    onProgress?.({ currentPage, totalPages, percent: Math.min(100, Math.round(percent)), status })
  }

  let activePage = 1
  report(1, 0, 'Memuat mesin OCR offline...')
  const worker = await createOcrWorker(lang, (pagePercent) => {
    report(
      activePage,
      ((activePage - 1 + pagePercent / 100) / totalPages) * 95,
      `Membaca karakter halaman ${activePage}/${totalPages} (${pagePercent}%)...`
    )
  })

  const pageResults: OcrPageResult[] = []

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      activePage = pageNum
      report(pageNum, ((pageNum - 1) / totalPages) * 95, `Merender halaman ${pageNum}/${totalPages} pada ${OCR_DPI} DPI...`)

      const pdfPage = await pdf.getPage(pageNum)
      const base = pdfPage.getViewport({ scale: 1 })
      const { canvas: highResCanvas } = await renderPageToHighResCanvas(pdfPage, OCR_DPI)
      const enhanced = prepareImageForOcr(highResCanvas, preprocess)

      const { data } = await worker.recognize(enhanced, {}, { text: true, blocks: true })

      const paragraphs: OcrParagraph[] = []
      const lines: OcrLine[] = []
      for (const block of data.blocks || []) {
        for (const para of block.paragraphs || []) {
          const paraLines: OcrLine[] = []
          for (const l of para.lines || []) {
            const text = l.text.replace(/\s+$/g, '')
            if (!text.trim()) continue
            const line = { text, confidence: l.confidence, bbox: l.bbox }
            paraLines.push(line)
            lines.push(line)
          }
          if (paraLines.length > 0) {
            paragraphs.push({ text: paraLines.map((x) => x.text).join(' '), lines: paraLines })
          }
        }
      }

      pageResults.push({
        pageNumber: pageNum,
        text: paragraphs.length > 0 ? pageText(paragraphs) : (data.text || '').trim(),
        confidence: lines.length > 0 ? Math.round(data.confidence) : 0,
        paragraphs,
        lines,
        highResCanvas,
        pageWidth: base.width,
        pageHeight: base.height
      })
    }
  } finally {
    await worker.terminate()
  }

  const recognised = pageResults.filter((p) => p.lines.length > 0)
  const averageConfidence = recognised.length
    ? Math.round(recognised.reduce((s, p) => s + p.confidence, 0) / recognised.length)
    : 0

  const multi = totalPages > 1
  const fullText = pageResults
    .map((p) => (multi ? `[Halaman ${p.pageNumber}]\n${p.text}` : p.text))
    .join('\n\n')
    .trim()
  const markdownText = pageResults
    .map((p) => (multi ? `## Halaman ${p.pageNumber}\n\n${p.text}` : p.text))
    .join('\n\n---\n\n')
    .trim()

  const result: OcrCompleteResult = { fullText, markdownText, pages: pageResults, averageConfidence, totalPages }

  if (format === 'searchable-pdf') {
    report(totalPages, 97, 'Menyematkan lapisan teks dan menyusun Searchable PDF...')
    result.searchablePdfBytes = await buildSearchablePdf(pageResults)
  } else if (format === 'docx') {
    report(totalPages, 97, 'Menyusun berkas Microsoft Word (.docx)...')
    result.docxBytes = buildOcrDocx(pageResults)
  }

  report(totalPages, 100, 'Proses OCR selesai.')
  return result
}
