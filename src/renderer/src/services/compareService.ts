import * as pdfjsLib from 'pdfjs-dist'

export interface ComparePageResult {
  dataUrlA: string
  dataUrlB: string
  diffDataUrl: string
  hasDifferences: boolean
  diffPixelPercent: number
}

/**
 * Compares two PDF pages side-by-side and generates a visual difference heatmap
 */
export async function comparePdfPages(
  pdfBytesA: Uint8Array,
  pdfBytesB: Uint8Array,
  pageNumber: number,
  scale: number = 1.5
): Promise<ComparePageResult> {
  const [docA, docB] = await Promise.all([
    pdfjsLib.getDocument({ data: pdfBytesA.slice(0) }).promise,
    pdfjsLib.getDocument({ data: pdfBytesB.slice(0) }).promise
  ])

  const safePageA = Math.min(pageNumber, docA.numPages)
  const safePageB = Math.min(pageNumber, docB.numPages)

  const [pageA, pageB] = await Promise.all([
    docA.getPage(safePageA),
    docB.getPage(safePageB)
  ])

  const viewportA = pageA.getViewport({ scale })
  const viewportB = pageB.getViewport({ scale })

  const width = Math.max(viewportA.width, viewportB.width)
  const height = Math.max(viewportA.height, viewportB.height)

  // 1. Render Page A
  const canvasA = document.createElement('canvas')
  canvasA.width = width
  canvasA.height = height
  const ctxA = canvasA.getContext('2d')!
  ctxA.fillStyle = '#FFFFFF'
  ctxA.fillRect(0, 0, width, height)
  await pageA.render({ canvasContext: ctxA, viewport: viewportA }).promise
  const dataUrlA = canvasA.toDataURL('image/png')

  // 2. Render Page B
  const canvasB = document.createElement('canvas')
  canvasB.width = width
  canvasB.height = height
  const ctxB = canvasB.getContext('2d')!
  ctxB.fillStyle = '#FFFFFF'
  ctxB.fillRect(0, 0, width, height)
  await pageB.render({ canvasContext: ctxB, viewport: viewportB }).promise
  const dataUrlB = canvasB.toDataURL('image/png')

  // 3. Compute Visual Difference
  const imgDataA = ctxA.getImageData(0, 0, width, height)
  const imgDataB = ctxB.getImageData(0, 0, width, height)

  const diffCanvas = document.createElement('canvas')
  diffCanvas.width = width
  diffCanvas.height = height
  const diffCtx = diffCanvas.getContext('2d')!
  const diffImgData = diffCtx.createImageData(width, height)

  let diffPixels = 0
  const totalPixels = width * height

  for (let i = 0; i < totalPixels * 4; i += 4) {
    const rA = imgDataA.data[i]
    const gA = imgDataA.data[i + 1]
    const bA = imgDataA.data[i + 2]

    const rB = imgDataB.data[i + 3]
    const gB = imgDataB.data[i + 1]
    const bB = imgDataB.data[i + 2]

    const delta = Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB)

    if (delta > 20) {
      diffPixels++
      // Highlight diff in vibrant coral red
      diffImgData.data[i] = 239 // Red
      diffImgData.data[i + 1] = 68 // Green
      diffImgData.data[i + 2] = 68 // Blue
      diffImgData.data[i + 3] = 255 // Alpha
    } else {
      // Keep subtle dimmed original background
      const avg = Math.round((rB + gB + bB) / 3)
      diffImgData.data[i] = avg
      diffImgData.data[i + 1] = avg
      diffImgData.data[i + 2] = avg
      diffImgData.data[i + 3] = 70
    }
  }

  diffCtx.putImageData(diffImgData, 0, 0)
  const diffDataUrl = diffCanvas.toDataURL('image/png')
  const diffPixelPercent = (diffPixels / totalPixels) * 100

  return {
    dataUrlA,
    dataUrlB,
    diffDataUrl,
    hasDifferences: diffPixels > 100,
    diffPixelPercent: parseFloat(diffPixelPercent.toFixed(2))
  }
}
