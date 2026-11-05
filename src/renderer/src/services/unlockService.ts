import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'

export interface EncryptionStatus {
  isEncrypted: boolean
  hasPasswordPrompt: boolean
}

/**
 * Checks if a PDF is encrypted or requires a password to open
 */
export async function checkPdfEncryption(pdfBytes: Uint8Array): Promise<EncryptionStatus> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) })
    let hasPasswordPrompt = false

    loadingTask.onPassword = (_updatePassword: (pw: string) => void, reason: number) => {
      hasPasswordPrompt = true
    }

    await loadingTask.promise
    return { isEncrypted: false, hasPasswordPrompt: false }
  } catch (err: any) {
    if (
      err.name === 'PasswordException' ||
      err.message?.toLowerCase().includes('password') ||
      err.code === 1
    ) {
      return { isEncrypted: true, hasPasswordPrompt: true }
    }
    return { isEncrypted: false, hasPasswordPrompt: false }
  }
}

/**
 * Unlocks a password-protected PDF and produces an unencrypted, restriction-free PDF
 */
export async function unlockPdfDocument(
  pdfBytes: Uint8Array,
  password?: string
): Promise<Uint8Array> {
  // 1. Try direct pdf-lib load (some PDFs have owner restrictions without user password)
  try {
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
    const unlockedDoc = await PDFDocument.create()
    const pageIndices = doc.getPageIndices()
    const copiedPages = await unlockedDoc.copyPages(doc, pageIndices)

    for (const page of copiedPages) {
      unlockedDoc.addPage(page)
    }

    return await unlockedDoc.save()
  } catch {
    // If pdf-lib fails due to user password, use pdfjs-dist with password to extract pages
  }

  // 2. Load with pdfjs-dist using user-supplied password
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes.slice(0),
    password: password || ''
  })

  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages

  const unlockedDoc = await PDFDocument.create()

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 2.0 })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')

    if (!ctx) continue

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise

    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const base64Data = imgDataUrl.split(',')[1]
    const binaryStr = atob(base64Data)
    const imgBytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      imgBytes[i] = binaryStr.charCodeAt(i)
    }

    const embeddedImage = await unlockedDoc.embedJpg(imgBytes)
    const pdfPage = unlockedDoc.addPage([viewport.width / 2.0, viewport.height / 2.0])

    pdfPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: viewport.width / 2.0,
      height: viewport.height / 2.0
    })
  }

  return await unlockedDoc.save()
}
