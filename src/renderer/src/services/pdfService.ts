import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import {
  PDFPageItem,
  WatermarkOptions,
  PageNumberOptions,
  SplitResultFile,
  CompressLevel,
  ImageFileItem,
  ImageToPdfOptions,
  PDFMetadata,
  NUpLayout
} from '../types'

/**
 * Konversi warna hex (#RRGGBB) ke format rgb(0-1, 0-1, 0-1) pdf-lib
 */
function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255 || 0
  const g = parseInt(clean.substring(2, 4), 16) / 255 || 0
  const b = parseInt(clean.substring(4, 6), 16) / 255 || 0
  return rgb(r, g, b)
}

/**
 * Convert base64 data URL to Uint8Array
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64Data = dataUrl.split(',')[1] || dataUrl
  const binaryStr = atob(base64Data)
  const len = binaryStr.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return bytes
}

/**
 * Hitung jumlah halaman dalam dokumen PDF
 */
export async function getPageCount(pdfBytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  return doc.getPageCount()
}

/**
 * Gabungkan beberapa dokumen PDF menjadi satu dokumen tunggal
 */
export async function mergePDFs(files: { data: Uint8Array; name: string }[]): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error('Tidak ada file yang dipilih untuk digabungkan.')
  }

  const mergedDoc = await PDFDocument.create()

  for (const file of files) {
    const srcDoc = await PDFDocument.load(file.data, { ignoreEncryption: true })
    const pageIndices = srcDoc.getPageIndices()
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices)

    for (const page of copiedPages) {
      mergedDoc.addPage(page)
    }
  }

  return await mergedDoc.save()
}

/**
 * Pisahkan PDF berdasarkan rentang halaman (misal 1-3, 5-8)
 */
export async function splitPDFByRanges(
  pdfBytes: Uint8Array,
  ranges: { start: number; end: number }[],
  baseFileName: string
): Promise<SplitResultFile[]> {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const totalPages = srcDoc.getPageCount()
  const results: SplitResultFile[] = []

  const cleanBaseName = baseFileName.replace(/\.pdf$/i, '')

  for (let idx = 0; idx < ranges.length; idx++) {
    const { start, end } = ranges[idx]
    if (start < 1 || end > totalPages || start > end) continue

    const subDoc = await PDFDocument.create()
    const indicesToCopy: number[] = []

    for (let p = start - 1; p <= end - 1; p++) {
      indicesToCopy.push(p)
    }

    const copiedPages = await subDoc.copyPages(srcDoc, indicesToCopy)
    for (const page of copiedPages) {
      subDoc.addPage(page)
    }

    const data = await subDoc.save()
    results.push({
      name: `${cleanBaseName}_part${idx + 1}_hal${start}-${end}.pdf`,
      pageDescription: `Halaman ${start} - ${end}`,
      data
    })
  }

  return results
}

/**
 * Pisahkan PDF setiap N halaman
 */
export async function splitPDFEveryNPages(
  pdfBytes: Uint8Array,
  n: number,
  baseFileName: string
): Promise<SplitResultFile[]> {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const totalPages = srcDoc.getPageCount()
  const ranges: { start: number; end: number }[] = []

  for (let i = 1; i <= totalPages; i += n) {
    const end = Math.min(i + n - 1, totalPages)
    ranges.push({ start: i, end })
  }

  return splitPDFByRanges(pdfBytes, ranges, baseFileName)
}

/**
 * Ekstrak setiap halaman menjadi file PDF terpisah satu per satu
 */
export async function splitAllPages(
  pdfBytes: Uint8Array,
  baseFileName: string
): Promise<SplitResultFile[]> {
  return splitPDFEveryNPages(pdfBytes, 1, baseFileName)
}

/**
 * Modifikasi PDF: Reorder, Rotate, Delete pages, Watermark, Page Numbering, dan Burn-in Annotations/eSign
 */
export async function modifyPDF(
  pdfBytes: Uint8Array,
  pageItems: PDFPageItem[],
  watermark?: WatermarkOptions,
  pageNumbers?: PageNumberOptions
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const newDoc = await PDFDocument.create()

  const activePages = pageItems.filter((p) => !p.isDeleted)

  if (activePages.length === 0) {
    throw new Error('Setidaknya harus ada 1 halaman yang tersisa.')
  }

  let standardFont
  if (watermark?.enabled || pageNumbers?.enabled) {
    standardFont = await newDoc.embedFont(StandardFonts.HelveticaBold)
  }

  const totalFinalPages = activePages.length

  for (let idx = 0; idx < activePages.length; idx++) {
    const item = activePages[idx]
    const [copiedPage] = await newDoc.copyPages(srcDoc, [item.originalIndex])

    // Atur rotasi jika ada perubahan
    if (item.rotation !== 0) {
      const currentRotation = copiedPage.getRotation().angle
      copiedPage.setRotation(degrees((currentRotation + item.rotation) % 360))
    }

    const { width, height } = copiedPage.getSize()

    // Burn-in anotasi kanvas (e-Sign, coretan, whiteout, text) jika ada
    if (item.annotationOverlay && item.annotationOverlay.startsWith('data:image/png')) {
      try {
        const overlayBytes = dataUrlToBytes(item.annotationOverlay)
        const embeddedPng = await newDoc.embedPng(overlayBytes)
        copiedPage.drawImage(embeddedPng, {
          x: 0,
          y: 0,
          width,
          height
        })
      } catch (err) {
        console.error('Gagal menempelkan layer anotasi:', err)
      }
    }

    // Tambahkan Watermark teks jika aktif
    if (watermark && watermark.enabled && watermark.text.trim()) {
      const text = watermark.text.trim()
      const fontSize = watermark.fontSize || 36
      const color = hexToRgb(watermark.color || '#888888')
      const textWidth = standardFont ? standardFont.widthOfTextAtSize(text, fontSize) : text.length * 10

      copiedPage.drawText(text, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: fontSize,
        font: standardFont,
        color,
        opacity: Math.max(0.05, Math.min(1.0, watermark.opacity || 0.3)),
        rotate: degrees(watermark.rotation || 45)
      })
    }

    // Tambahkan nomor halaman jika aktif
    if (pageNumbers && pageNumbers.enabled && standardFont) {
      const currentNumber = (pageNumbers.startFrom || 1) + idx
      const pageText =
        pageNumbers.format === 'page-of-total'
          ? `Halaman ${currentNumber} dari ${totalFinalPages}`
          : `${currentNumber}`

      const fontSize = pageNumbers.fontSize || 10
      const textWidth = standardFont.widthOfTextAtSize(pageText, fontSize)
      const margin = 24

      let x = margin
      let y = margin

      if (pageNumbers.position.includes('center')) {
        x = (width - textWidth) / 2
      } else if (pageNumbers.position.includes('right')) {
        x = width - textWidth - margin
      }

      if (pageNumbers.position.startsWith('top')) {
        y = height - margin - fontSize
      }

      copiedPage.drawText(pageText, {
        x,
        y,
        size: fontSize,
        font: standardFont,
        color: rgb(0.2, 0.2, 0.2),
        opacity: 0.85
      })
    }

    newDoc.addPage(copiedPage)
  }

  return await newDoc.save()
}

/**
 * Kompres ukuran berkas PDF dengan merender halaman ke gambar JPEG yang dioptimasi
 */
export async function compressPDF(
  pdfBytes: Uint8Array,
  level: CompressLevel = 'balanced',
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes.slice(0)
  })
  const pdf = await loadingTask.promise
  const total = pdf.numPages

  // Setting rasio kompresi
  let scale = 1.3
  let quality = 0.72

  if (level === 'extreme') {
    scale = 1.05
    quality = 0.55
  } else if (level === 'light') {
    scale = 1.6
    quality = 0.85
  }

  const newDoc = await PDFDocument.create()

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    canvas.width = viewport.width
    canvas.height = viewport.height

    // Selalu isi latar belakang kertas putih agar halaman transparan tidak menjadi hitam saat dikompres ke JPEG
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise

    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality)
    const jpegBytes = dataUrlToBytes(jpegDataUrl)

    const embeddedImage = await newDoc.embedJpg(jpegBytes)
    const newPage = newDoc.addPage([page.view[2] - page.view[0], page.view[3] - page.view[1]])

    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: newPage.getWidth(),
      height: newPage.getHeight()
    })

    if (onProgress) {
      onProgress(i, total)
    }
  }

  return await newDoc.save()
}

/**
 * Konversi daftar file gambar (JPG, PNG, WebP) menjadi 1 berkas PDF
 */
export async function convertImagesToPDF(
  images: ImageFileItem[],
  options: ImageToPdfOptions
): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new Error('Pilih minimal 1 gambar untuk dikonversi.')
  }

  const doc = await PDFDocument.create()

  // Standard paper dimensions in points (72 points = 1 inch)
  const PAGE_SIZES = {
    A4: { width: 595.28, height: 841.89 },
    Letter: { width: 612.0, height: 792.0 }
  }

  const MARGINS = {
    none: 0,
    small: 16,
    normal: 32
  }

  const margin = MARGINS[options.margin] || 0

  for (const imgItem of images) {
    let embeddedImage

    // Handle image type
    if (imgItem.name.toLowerCase().endsWith('.png')) {
      embeddedImage = await doc.embedPng(imgItem.data)
    } else {
      // Standard JPG or convert from canvas
      try {
        embeddedImage = await doc.embedJpg(imgItem.data)
      } catch {
        // Fallback to PNG embed
        embeddedImage = await doc.embedPng(imgItem.data)
      }
    }

    const naturalWidth = embeddedImage.width
    const naturalHeight = embeddedImage.height

    let targetPageWidth = 595.28
    let targetPageHeight = 841.89

    if (options.pageSize === 'fit') {
      targetPageWidth = naturalWidth + margin * 2
      targetPageHeight = naturalHeight + margin * 2
    } else {
      const baseSize = PAGE_SIZES[options.pageSize] || PAGE_SIZES.A4
      let isLandscape = false

      if (options.orientation === 'auto') {
        isLandscape = naturalWidth > naturalHeight
      } else if (options.orientation === 'landscape') {
        isLandscape = true
      }

      targetPageWidth = isLandscape ? Math.max(baseSize.width, baseSize.height) : Math.min(baseSize.width, baseSize.height)
      targetPageHeight = isLandscape ? Math.min(baseSize.width, baseSize.height) : Math.max(baseSize.width, baseSize.height)
    }

    const page = doc.addPage([targetPageWidth, targetPageHeight])

    const printableWidth = targetPageWidth - margin * 2
    const printableHeight = targetPageHeight - margin * 2

    const scale = Math.min(printableWidth / naturalWidth, printableHeight / naturalHeight)
    const drawWidth = naturalWidth * scale
    const drawHeight = naturalHeight * scale

    // Center in printable area
    const x = margin + (printableWidth - drawWidth) / 2
    const y = margin + (printableHeight - drawHeight) / 2

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight
    })
  }

  return await doc.save()
}

/**
 * Baca metadata dokumen PDF
 */
export async function getPDFMetadata(pdfBytes: Uint8Array): Promise<PDFMetadata> {
  const doc = await PDFDocument.load(pdfBytes)
  const creationDate = doc.getCreationDate()
  const modDate = doc.getModificationDate()

  return {
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
    subject: doc.getSubject() || '',
    keywords: doc.getKeywords() || '',
    creator: doc.getCreator() || '',
    producer: doc.getProducer() || '',
    creationDate: creationDate ? creationDate.toLocaleString('id-ID') : 'Tidak tercatat',
    modificationDate: modDate ? modDate.toLocaleString('id-ID') : 'Tidak tercatat'
  }
}

/**
 * Bersihkan seluruh jejak metadata atau sunting metadata kustom
 */
export async function sanitizePDFMetadata(
  pdfBytes: Uint8Array,
  customMetadata?: Partial<PDFMetadata>
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes)

  if (customMetadata) {
    if (customMetadata.title !== undefined) doc.setTitle(customMetadata.title)
    if (customMetadata.author !== undefined) doc.setAuthor(customMetadata.author)
    if (customMetadata.subject !== undefined) doc.setSubject(customMetadata.subject)
    if (customMetadata.keywords !== undefined) {
      doc.setKeywords(
        customMetadata.keywords
          .split(',')
          .map((k: string) => k.trim())
          .filter(Boolean)
      )
    }
    if (customMetadata.creator !== undefined) doc.setCreator(customMetadata.creator)
    if (customMetadata.producer !== undefined) doc.setProducer(customMetadata.producer)
  } else {
    // Total Wipe (Sanitize 100% jejak privasi)
    doc.setTitle('')
    doc.setAuthor('')
    doc.setSubject('')
    doc.setKeywords([])
    doc.setProducer('LocalPDF Offline Sanitizer')
    doc.setCreator('LocalPDF')
    doc.setCreationDate(new Date())
    doc.setModificationDate(new Date())
  }

  return await doc.save()
}

/**
 * Cetak Hemat N-Up: Gabungkan 2 atau 4 halaman ke dalam 1 lembar kertas A4
 */
export async function generateNUpPDF(
  pdfBytes: Uint8Array,
  layout: NUpLayout = '2-up'
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes)
  const newDoc = await PDFDocument.create()
  const pageIndices = srcDoc.getPageIndices()
  const total = pageIndices.length

  const A4_WIDTH = 595.28
  const A4_HEIGHT = 841.89

  if (layout === '2-up') {
    // 2 halaman per lembar A4 (orientasi Lanskap: 841.89 x 595.28)
    const sheetW = A4_HEIGHT
    const sheetH = A4_WIDTH
    const margin = 24
    const slotW = (sheetW - margin * 3) / 2
    const slotH = sheetH - margin * 2

    for (let i = 0; i < total; i += 2) {
      const sheet = newDoc.addPage([sheetW, sheetH])
      const batchIndices = [i]
      if (i + 1 < total) batchIndices.push(i + 1)
      const embeddedPages = await newDoc.embedPdf(srcDoc, batchIndices)

      const embedded1 = embeddedPages[0]
      const scale1 = Math.min(slotW / embedded1.width, slotH / embedded1.height)
      const drawW1 = embedded1.width * scale1
      const drawH1 = embedded1.height * scale1
      const x1 = margin + (slotW - drawW1) / 2
      const y1 = margin + (slotH - drawH1) / 2

      sheet.drawPage(embedded1, { x: x1, y: y1, width: drawW1, height: drawH1 })

      if (embeddedPages.length > 1) {
        const embedded2 = embeddedPages[1]
        const scale2 = Math.min(slotW / embedded2.width, slotH / embedded2.height)
        const drawW2 = embedded2.width * scale2
        const drawH2 = embedded2.height * scale2
        const x2 = margin * 2 + slotW + (slotW - drawW2) / 2
        const y2 = margin + (slotH - drawH2) / 2

        sheet.drawPage(embedded2, { x: x2, y: y2, width: drawW2, height: drawH2 })
      }
    }
  } else if (layout === '4-up') {
    // 4 halaman per lembar A4 (orientasi Potret: 595.28 x 841.89) - 2x2 grid
    const sheetW = A4_WIDTH
    const sheetH = A4_HEIGHT
    const margin = 18
    const slotW = (sheetW - margin * 3) / 2
    const slotH = (sheetH - margin * 3) / 2

    for (let i = 0; i < total; i += 4) {
      const sheet = newDoc.addPage([sheetW, sheetH])
      const batchIndices = [i, i + 1, i + 2, i + 3].filter((idx) => idx < total)
      const embeddedPages = await newDoc.embedPdf(srcDoc, batchIndices)

      embeddedPages.forEach((embedded, batchIdx) => {
        const col = batchIdx % 2
        const row = Math.floor(batchIdx / 2) // 0 = atas, 1 = bawah

        const scale = Math.min(slotW / embedded.width, slotH / embedded.height)
        const drawW = embedded.width * scale
        const drawH = embedded.height * scale

        const x = margin + col * (slotW + margin) + (slotW - drawW) / 2
        const y = sheetH - margin - (row + 1) * slotH - row * margin + (slotH - drawH) / 2

        sheet.drawPage(embedded, { x, y, width: drawW, height: drawH })
      })
    }
  }

  return await newDoc.save()
}
