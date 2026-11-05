import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Inisialisasi Web Worker PDF.js menggunakan URL statis bundler Vite
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  } catch (err) {
    console.warn('Gagal set workerSrc via Vite URL:', err)
  }
}

/**
 * Render a single page to a base64 image data URL
 */
export async function renderPageThumbnail(
  pdfData: Uint8Array,
  pageNumber: number = 1,
  scale: number = 0.35
): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData.slice(0) // copy buffer
    })

    const pdf = await loadingTask.promise
    if (pageNumber > pdf.numPages) return ''

    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    canvas.width = viewport.width
    canvas.height = viewport.height

    // Selalu isi latar belakang putih solid
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise

    return canvas.toDataURL('image/jpeg', 0.85)
  } catch (error) {
    console.error(`Gagal render thumbnail halaman ${pageNumber}:`, error)
    return ''
  }
}

/**
 * Render high-resolution page for interactive canvas editor and image export
 */
export async function renderHighResPage(
  pdfData: Uint8Array,
  pageNumber: number = 1,
  scale: number = 1.8
): Promise<{ dataUrl: string; width: number; height: number; originalWidth: number; originalHeight: number } | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData.slice(0)
    })

    const pdf = await loadingTask.promise
    if (pageNumber > pdf.numPages) return null

    const page = await pdf.getPage(pageNumber)
    const unscaledViewport = page.getViewport({ scale: 1.0 })
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    canvas.width = viewport.width
    canvas.height = viewport.height

    // Selalu isi latar belakang kertas putih
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: viewport.width,
      height: viewport.height,
      originalWidth: unscaledViewport.width,
      originalHeight: unscaledViewport.height
    }
  } catch (error) {
    console.error(`Gagal render resolusi tinggi halaman ${pageNumber}:`, error)
    return null
  }
}

/**
 * Render thumbnails for all pages of a document
 */
export async function renderAllThumbnails(
  pdfData: Uint8Array,
  scale: number = 0.35,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData.slice(0)
    })

    const pdf = await loadingTask.promise
    const total = pdf.numPages
    const thumbnails: string[] = []

    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = viewport.width
        canvas.height = viewport.height

        // Selalu isi latar belakang kertas putih
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        await page.render({
          canvasContext: ctx,
          viewport
        }).promise

        thumbnails.push(canvas.toDataURL('image/jpeg', 0.85))
      } else {
        thumbnails.push('')
      }

      if (onProgress) {
        onProgress(i, total)
      }
    }

    return thumbnails
  } catch (error) {
    console.error('Error saat render semua thumbnail:', error)
    return []
  }
}
