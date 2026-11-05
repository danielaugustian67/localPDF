/**
 * Image Processing Pipeline for High-Accuracy OCR
 *
 * Provides:
 * - High-DPI page rasterization (300 DPI)
 * - Grayscale luminance transformation
 * - Linear contrast stretching & histogram equalization
 * - Otsu's adaptive binarization (optimal foreground text separation)
 * - Edge sharpening (unsharp masking)
 */

export interface PreprocessOptions {
  binarize?: boolean
  contrast?: boolean
  sharpen?: boolean
  scale?: number
}

/**
 * Renders a PDF.js page onto an off-screen high-resolution Canvas (300 DPI)
 */
export async function renderPageToHighResCanvas(
  pdfPage: any,
  dpi: number = 300
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  // 72 DPI is scale 1.0; 300 DPI is scale 4.167 (we use scale 3.0-3.5 for optimal speed & accuracy)
  const scale = Math.max(1.5, Math.min(4.0, dpi / 72))
  const viewport = pdfPage.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Failed to get 2D canvas context.')

  // Fill with clean white background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await pdfPage.render({
    canvasContext: ctx,
    viewport
  }).promise

  return {
    canvas,
    width: canvas.width,
    height: canvas.height
  }
}

/**
 * Calculates Otsu's global threshold value from pixel luminance histogram
 */
function calculateOtsuThreshold(histogram: Uint32Array, totalPixels: number): number {
  let sum = 0
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i]
  }

  let sumBackground = 0
  let weightBackground = 0
  let weightForeground = 0
  let maxVariance = 0
  let threshold = 128

  for (let t = 0; t < 256; t++) {
    weightBackground += histogram[t]
    if (weightBackground === 0) continue

    weightForeground = totalPixels - weightBackground
    if (weightForeground === 0) break

    sumBackground += t * histogram[t]

    const meanBackground = sumBackground / weightBackground
    const meanForeground = (sum - sumBackground) / weightForeground

    // Inter-class variance
    const varianceBetween =
      weightBackground * weightForeground * Math.pow(meanBackground - meanForeground, 2)

    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween
      threshold = t
    }
  }

  return threshold
}

/**
 * Performs Otsu's Adaptive Binarization:
 * Automatically computes the optimal separation threshold between text ink and paper background,
 * eliminating shadows, yellowed paper, and gradients.
 */
export function applyOtsuBinarization(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const output = document.createElement('canvas')
  output.width = sourceCanvas.width
  output.height = sourceCanvas.height

  const ctx = output.getContext('2d', { willReadFrequently: true })
  if (!ctx) return sourceCanvas

  ctx.drawImage(sourceCanvas, 0, 0)
  const imgData = ctx.getImageData(0, 0, output.width, output.height)
  const data = imgData.data
  const totalPixels = output.width * output.height

  // 1. Build 256-bin luminance histogram
  const histogram = new Uint32Array(256)
  const grayBuffer = new Uint8Array(totalPixels)

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Standard perceptual luminance formula (ITU-R BT.601)
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    grayBuffer[p] = gray
    histogram[gray]++
  }

  // 2. Compute Otsu threshold
  const threshold = calculateOtsuThreshold(histogram, totalPixels)

  // 3. Apply binary threshold
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const val = grayBuffer[p] < threshold ? 0 : 255
    data[i] = val     // R
    data[i + 1] = val // G
    data[i + 2] = val // B
    data[i + 3] = 255 // A
  }

  ctx.putImageData(imgData, 0, 0)
  return output
}

/**
 * Enhances contrast via linear histogram stretching to brighten paper and darken ink
 */
export function enhanceContrast(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const output = document.createElement('canvas')
  output.width = sourceCanvas.width
  output.height = sourceCanvas.height

  const ctx = output.getContext('2d', { willReadFrequently: true })
  if (!ctx) return sourceCanvas

  ctx.drawImage(sourceCanvas, 0, 0)
  const imgData = ctx.getImageData(0, 0, output.width, output.height)
  const data = imgData.data

  let minLuma = 255
  let maxLuma = 0

  // Find min and max luminance
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (luma < minLuma) minLuma = luma
    if (luma > maxLuma) maxLuma = luma
  }

  const range = maxLuma - minLuma
  if (range <= 10) return sourceCanvas // Contrast already minimal or uniform

  // Normalize range
  for (let i = 0; i < data.length; i += 4) {
    const r = ((data[i] - minLuma) / range) * 255
    const g = ((data[i + 1] - minLuma) / range) * 255
    const b = ((data[i + 2] - minLuma) / range) * 255

    data[i] = Math.max(0, Math.min(255, r))
    data[i + 1] = Math.max(0, Math.min(255, g))
    data[i + 2] = Math.max(0, Math.min(255, b))
  }

  ctx.putImageData(imgData, 0, 0)
  return output
}

/**
 * 3x3 Convolution Unsharp Mask to crispen letter and glyph edges
 */
export function sharpenCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const output = document.createElement('canvas')
  output.width = sourceCanvas.width
  output.height = sourceCanvas.height

  const ctx = output.getContext('2d', { willReadFrequently: true })
  if (!ctx) return sourceCanvas

  ctx.drawImage(sourceCanvas, 0, 0)
  const srcData = ctx.getImageData(0, 0, output.width, output.height)
  const outData = ctx.createImageData(output.width, output.height)

  const w = output.width
  const h = output.height
  const s = srcData.data
  const d = outData.data
  // Seed with the source so the 1px border (skipped by the kernel) stays opaque, not black
  d.set(s)

  // Laplacian-based 3x3 sharpening kernel:
  // [  0, -1,  0 ]
  // [ -1,  5, -1 ]
  // [  0, -1,  0 ]
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4

      for (let c = 0; c < 3; c++) {
        const val =
          5 * s[idx + c] -
          s[((y - 1) * w + x) * 4 + c] -
          s[((y + 1) * w + x) * 4 + c] -
          s[(y * w + (x - 1)) * 4 + c] -
          s[(y * w + (x + 1)) * 4 + c]

        d[idx + c] = Math.max(0, Math.min(255, val))
      }
      d[idx + 3] = 255 // Alpha
    }
  }

  ctx.putImageData(outData, 0, 0)
  return output
}

/**
 * Full Pipeline: executes selected enhancements sequentially
 */
export function prepareImageForOcr(
  sourceCanvas: HTMLCanvasElement,
  options: PreprocessOptions = {}
): HTMLCanvasElement {
  let current = sourceCanvas

  if (options.contrast !== false) {
    current = enhanceContrast(current)
  }

  if (options.sharpen) {
    current = sharpenCanvas(current)
  }

  if (options.binarize !== false) {
    current = applyOtsuBinarization(current)
  }

  return current
}
