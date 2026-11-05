import * as pdfjsLib from 'pdfjs-dist'
import { buildZipArchive, ZipFileEntry } from './zipService'

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface ExtractedParagraph {
  text: string
  isHeading?: boolean
  pageNumber: number
}

export interface PDFToDocxResult {
  docxBytes: Uint8Array
  paragraphsCount: number
  wordsCount: number
  pagesCount: number
  isScanned: boolean
  paragraphs: ExtractedParagraph[]
}

/**
 * Extracts structured paragraphs from a PDF using coordinate clustering
 */
export async function extractPDFParagraphs(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void
): Promise<{ paragraphs: ExtractedParagraph[]; isScanned: boolean; pageCount: number }> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  const allParagraphs: ExtractedParagraph[] = []
  let totalCharacters = 0

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    if (onProgress) onProgress(pageNum, pageCount)
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Items filter
    const items = textContent.items.filter((item: any) => typeof item.str === 'string' && item.str.trim().length > 0) as any[]

    if (items.length === 0) {
      continue
    }

    // Sort items by Y (top to bottom, descending), then X (left to right, ascending)
    items.sort((a, b) => {
      const yA = a.transform[5]
      const yB = b.transform[5]
      if (Math.abs(yA - yB) > 3) {
        return yB - yA // higher Y is higher on page
      }
      return a.transform[4] - b.transform[4] // lower X is further left
    })

    // Group items into lines based on Y coordinate
    const lines: { text: string; y: number; height: number }[] = []
    let currentLine: string[] = []
    let currentY: number | null = null
    let currentHeight = 10

    for (const item of items) {
      const itemY = item.transform[5]
      const itemHeight = Math.abs(item.transform[0]) || item.height || 10

      if (currentY === null) {
        currentY = itemY
        currentHeight = itemHeight
        currentLine.push(item.str)
      } else if (Math.abs(currentY - itemY) <= 3) {
        // Same line
        currentLine.push(item.str)
      } else {
        // New line
        lines.push({
          text: currentLine.join(' ').replace(/\s+/g, ' ').trim(),
          y: currentY,
          height: currentHeight
        })
        currentLine = [item.str]
        currentY = itemY
        currentHeight = itemHeight
      }
    }

    if (currentLine.length > 0 && currentY !== null) {
      lines.push({
        text: currentLine.join(' ').replace(/\s+/g, ' ').trim(),
        y: currentY,
        height: currentHeight
      })
    }

    // Group lines into coherent paragraphs based on vertical spacing
    let currentPara: string[] = []
    let lastY: number | null = null
    let isHeadingCandidate = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      totalCharacters += line.text.length

      if (lastY === null) {
        currentPara.push(line.text)
        isHeadingCandidate = line.height >= 14
        lastY = line.y
      } else {
        const gap = Math.abs(lastY - line.y)
        // If line gap is significantly larger than typical line height, flush paragraph
        if (gap > line.height * 1.8 || isHeadingCandidate || line.height >= 14) {
          if (currentPara.length > 0) {
            allParagraphs.push({
              text: currentPara.join(' '),
              isHeading: isHeadingCandidate,
              pageNumber: pageNum
            })
          }
          currentPara = [line.text]
          isHeadingCandidate = line.height >= 14
        } else {
          currentPara.push(line.text)
        }
        lastY = line.y
      }
    }

    if (currentPara.length > 0) {
      allParagraphs.push({
        text: currentPara.join(' '),
        isHeading: isHeadingCandidate,
        pageNumber: pageNum
      })
    }
  }

  const isScanned = totalCharacters < 50 && pageCount > 0

  return {
    paragraphs: allParagraphs,
    isScanned,
    pageCount
  }
}

/**
 * Builds a Microsoft Word (.docx) file from extracted paragraphs
 */
export function buildDocxFile(paragraphs: ExtractedParagraph[]): Uint8Array {
  const encoder = new TextEncoder()

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`

  // 2. _rels/.rels
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  // 3. word/_rels/document.xml.rels
  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

  // 4. word/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="18181B"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto" w:after="160"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="240" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="32"/>
      <w:szCs w:val="32"/>
      <w:color w:val="09090B"/>
    </w:rPr>
  </w:style>
</w:styles>`

  // 5. word/document.xml
  let bodyXml = ''

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]
    const cleanText = escapeXml(p.text)

    if (p.isHeading) {
      bodyXml += `
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
      </w:pPr>
      <w:r>
        <w:t xml:space="preserve">${cleanText}</w:t>
      </w:r>
    </w:p>`
    } else {
      bodyXml += `
    <w:p>
      <w:r>
        <w:t xml:space="preserve">${cleanText}</w:t>
      </w:r>
    </w:p>`
    }
  }

  // A4 page size (11906 x 16838 twips = 210 x 297 mm), 1 inch margins (1440 twips)
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`

  const zipEntries: ZipFileEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(rootRelsXml) },
    { name: 'word/_rels/document.xml.rels', data: encoder.encode(docRelsXml) },
    { name: 'word/styles.xml', data: encoder.encode(stylesXml) },
    { name: 'word/document.xml', data: encoder.encode(documentXml) }
  ]

  return buildZipArchive(zipEntries)
}

/**
 * End-to-end convert PDF to DOCX
 */
export async function convertPDFToDocx(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void
): Promise<PDFToDocxResult> {
  const { paragraphs, isScanned, pageCount } = await extractPDFParagraphs(pdfBytes, onProgress)

  // If no text found (scanned document), generate fallback placeholder
  const finalParagraphs =
    paragraphs.length > 0
      ? paragraphs
      : [
          {
            text: '[Hasil Pemindaian Dokumen PDF]',
            isHeading: true,
            pageNumber: 1
          },
          {
            text: 'Dokumen ini merupakan hasil scan fisik atau gambar tanpa layer teks digital bawaan.',
            pageNumber: 1
          }
        ]

  const docxBytes = buildDocxFile(finalParagraphs)
  const totalWords = finalParagraphs.reduce((sum, p) => sum + p.text.split(/\s+/).filter(Boolean).length, 0)

  return {
    docxBytes,
    paragraphsCount: finalParagraphs.length,
    wordsCount: totalWords,
    pagesCount: pageCount,
    isScanned,
    paragraphs: finalParagraphs
  }
}
