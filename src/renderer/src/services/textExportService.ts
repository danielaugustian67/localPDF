import * as pdfjsLib from 'pdfjs-dist'

export interface PDFTextResult {
  plainText: string
  markdownText: string
  wordCount: number
  characterCount: number
  lineCount: number
  pageCount: number
}

/**
 * Extracts plain text and formatted markdown from a PDF document
 */
export async function extractPDFTextAndMarkdown(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void
): Promise<PDFTextResult> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages

  const plainTextParts: string[] = []
  const markdownParts: string[] = []

  let totalWords = 0
  let totalChars = 0
  let totalLines = 0

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    if (onProgress) onProgress(pageNum, pageCount)
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    const items = textContent.items.filter(
      (item: any) => typeof item.str === 'string' && item.str.trim().length > 0
    ) as any[]

    if (items.length === 0) continue

    // Sort items by Y (top to bottom), then X (left to right)
    items.sort((a, b) => {
      const yA = a.transform[5]
      const yB = b.transform[5]
      if (Math.abs(yA - yB) > 3) {
        return yB - yA
      }
      return a.transform[4] - b.transform[4]
    })

    // Group items into lines
    const lines: { text: string; height: number; y: number }[] = []
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
        currentLine.push(item.str)
      } else {
        lines.push({
          text: currentLine.join(' ').replace(/\s+/g, ' ').trim(),
          height: currentHeight,
          y: currentY
        })
        currentLine = [item.str]
        currentY = itemY
        currentHeight = itemHeight
      }
    }

    if (currentLine.length > 0 && currentY !== null) {
      lines.push({
        text: currentLine.join(' ').replace(/\s+/g, ' ').trim(),
        height: currentHeight,
        y: currentY
      })
    }

    // Format plain text and markdown
    const pagePlainTextLines: string[] = []
    const pageMarkdownLines: string[] = []

    pageMarkdownLines.push(`\n<!-- Halaman ${pageNum} -->\n`)

    for (let i = 0; i < lines.length; i++) {
      let lineText = lines[i].text
      const lineHeight = lines[i].height

      // Reconnect hyphenated word splits if ending with '-'
      if (lineText.endsWith('-') && i + 1 < lines.length) {
        const nextFirstWord = lines[i + 1].text.split(' ')[0]
        if (nextFirstWord && /^[a-zA-Z]/.test(nextFirstWord)) {
          lineText = lineText.slice(0, -1) + nextFirstWord
          lines[i + 1].text = lines[i + 1].text.substring(nextFirstWord.length).trim()
        }
      }

      pagePlainTextLines.push(lineText)

      // Markdown formatting: check for headings & bullets
      if (lineHeight >= 18) {
        pageMarkdownLines.push(`\n# ${lineText}\n`)
      } else if (lineHeight >= 14) {
        pageMarkdownLines.push(`\n## ${lineText}\n`)
      } else if (/^[•\-\*]\s/.test(lineText) || /^\d+\.\s/.test(lineText)) {
        pageMarkdownLines.push(`* ${lineText.replace(/^[•\-\*]\s*/, '')}`)
      } else {
        pageMarkdownLines.push(lineText)
      }
    }

    const pagePlain = pagePlainTextLines.join('\n')
    plainTextParts.push(pagePlain)
    markdownParts.push(pageMarkdownLines.join('\n'))

    const words = pagePlain.split(/\s+/).filter(Boolean)
    totalWords += words.length
    totalChars += pagePlain.length
    totalLines += pagePlainTextLines.length
  }

  const plainText = plainTextParts.join('\n\n--- Halaman Berikutnya ---\n\n')
  const markdownText = markdownParts.join('\n\n')

  return {
    plainText,
    markdownText,
    wordCount: totalWords,
    characterCount: totalChars,
    lineCount: totalLines,
    pageCount
  }
}
