import * as pdfjsLib from 'pdfjs-dist'
import { buildZipArchive, ZipFileEntry } from './zipService'

export interface ExtractedTableRow {
  cells: string[]
  pageNumber: number
}

export interface PDFToExcelResult {
  xlsxBytes: Uint8Array
  csvContent: string
  rows: ExtractedTableRow[]
  totalRows: number
  totalColumns: number
  pageCount: number
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function columnLetter(colIndex: number): string {
  let letter = ''
  let temp = colIndex
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

/**
 * Extracts table rows and columns from PDF using coordinate analysis
 */
export async function extractPDFTable(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void
): Promise<{ rows: ExtractedTableRow[]; pageCount: number; maxColumns: number }> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  const allRows: ExtractedTableRow[] = []
  let maxColumns = 1

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    if (onProgress) onProgress(pageNum, pageCount)
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    const items = textContent.items.filter(
      (item: any) => typeof item.str === 'string' && item.str.trim().length > 0
    ) as any[]

    if (items.length === 0) continue

    // Group items into rows based on vertical Y position (tolerance ±3.5pt)
    items.sort((a, b) => {
      const yA = a.transform[5]
      const yB = b.transform[5]
      if (Math.abs(yA - yB) > 3.5) {
        return yB - yA // higher Y is higher on page (top to bottom)
      }
      return a.transform[4] - b.transform[4] // left to right
    })

    const pageLines: { y: number; items: any[] }[] = []
    for (const item of items) {
      const itemY = item.transform[5]
      let matchedLine = pageLines.find((l) => Math.abs(l.y - itemY) <= 3.5)
      if (matchedLine) {
        matchedLine.items.push(item)
      } else {
        pageLines.push({ y: itemY, items: [item] })
      }
    }

    // Sort page lines top to bottom
    pageLines.sort((a, b) => b.y - a.y)

    // For each line, sort items from left to right and segment into cells
    for (const line of pageLines) {
      line.items.sort((a, b) => a.transform[4] - b.transform[4])

      const cells: string[] = []
      let currentCellText: string[] = []
      let lastXEnd: number | null = null

      for (let i = 0; i < line.items.length; i++) {
        const item = line.items[i]
        const itemX = item.transform[4]
        const itemWidth = item.width || Math.abs(item.transform[0]) * item.str.length * 0.5 || 20

        if (lastXEnd === null) {
          currentCellText.push(item.str)
          lastXEnd = itemX + itemWidth
        } else {
          const gap = itemX - lastXEnd
          // If distance between items is greater than 16pt, consider it a new table column
          if (gap > 16) {
            cells.push(currentCellText.join(' ').replace(/\s+/g, ' ').trim())
            currentCellText = [item.str]
          } else {
            currentCellText.push(item.str)
          }
          lastXEnd = itemX + itemWidth
        }
      }

      if (currentCellText.length > 0) {
        cells.push(currentCellText.join(' ').replace(/\s+/g, ' ').trim())
      }

      if (cells.length > 0) {
        if (cells.length > maxColumns) {
          maxColumns = cells.length
        }
        allRows.push({ cells, pageNumber: pageNum })
      }
    }
  }

  return { rows: allRows, pageCount, maxColumns }
}

/**
 * Builds standard CSV content from extracted table rows
 */
export function buildCsvContent(rows: ExtractedTableRow[]): string {
  return rows
    .map((r) =>
      r.cells
        .map((cell) => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`
          }
          return cell
        })
        .join(',')
    )
    .join('\r\n')
}

/**
 * Builds valid Microsoft Excel Open XML (.xlsx) ZIP archive
 */
export function buildXlsxFile(rows: ExtractedTableRow[]): Uint8Array {
  const encoder = new TextEncoder()

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

  // 2. _rels/.rels
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  // 3. xl/_rels/workbook.xml.rels
  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

  // 4. xl/workbook.xml
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`

  // 5. xl/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font><name val="Calibri"/><sz val="11"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`

  // 6. xl/worksheets/sheet1.xml
  let sheetData = ''
  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx]
    const rowNum = rIdx + 1
    let rowCellsXml = ''

    for (let cIdx = 0; cIdx < row.cells.length; cIdx++) {
      const cellRef = `${columnLetter(cIdx)}${rowNum}`
      const val = escapeXml(row.cells[cIdx])
      rowCellsXml += `<c r="${cellRef}" t="inlineStr"><is><t>${val}</t></is></c>`
    }

    sheetData += `<row r="${rowNum}">${rowCellsXml}</row>`
  }

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetData}</sheetData>
</worksheet>`

  const zipEntries: ZipFileEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', data: encoder.encode(rootRelsXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRelsXml) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbookXml) },
    { name: 'xl/styles.xml', data: encoder.encode(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheet1Xml) }
  ]

  return buildZipArchive(zipEntries)
}

/**
 * End-to-end PDF to Excel converter
 */
export async function convertPDFToExcel(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void
): Promise<PDFToExcelResult> {
  const { rows, pageCount, maxColumns } = await extractPDFTable(pdfBytes, onProgress)

  const finalRows =
    rows.length > 0
      ? rows
      : [{ cells: ['Tidak ada data tabel terdeteksi dalam dokumen.'], pageNumber: 1 }]

  const csvContent = buildCsvContent(finalRows)
  const xlsxBytes = buildXlsxFile(finalRows)

  return {
    xlsxBytes,
    csvContent,
    rows: finalRows,
    totalRows: finalRows.length,
    totalColumns: maxColumns,
    pageCount
  }
}
