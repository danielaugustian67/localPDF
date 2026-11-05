import * as pdfjsLib from 'pdfjs-dist'
import { buildZipArchive, ZipFileEntry } from './zipService'

export interface ExtractedImageItem {
  id: string
  pageNumber: number
  name: string
  width: number
  height: number
  dataUrl: string
  bytes: Uint8Array
  sizeKb: number
  format: 'png' | 'jpeg'
}

/**
 * Extracts embedded images from PDF pages using pdfjs-dist operator analysis
 */
export async function extractEmbeddedImages(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedImageItem[]> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  const extractedImages: ExtractedImageItem[] = []
  let imageCounter = 1

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    if (onProgress) onProgress(pageNum, pageCount)
    const page = await pdf.getPage(pageNum)
    const operatorList = await page.getOperatorList()

    // Find all image paint operators
    const imageObjIds: string[] = []
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i]
      if (
        fn === pdfjsLib.OPS.paintImageXObject ||
        fn === pdfjsLib.OPS.paintInlineImageXObject
      ) {
        const objId = operatorList.argsArray[i][0]
        if (objId && typeof objId === 'string' && !imageObjIds.includes(objId)) {
          imageObjIds.push(objId)
        }
      }
    }

    // Extract each image object from page.objs
    for (const objId of imageObjIds) {
      try {
        const imgObj = await new Promise<any>((resolve) => {
          page.objs.get(objId, (data: any) => resolve(data))
        })

        if (!imgObj || !imgObj.data || !imgObj.width || !imgObj.height) {
          continue
        }

        const width = imgObj.width
        const height = imgObj.height

        // Render raw image pixel data to offscreen canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        const imgData = ctx.createImageData(width, height)
        const srcData = imgObj.data

        // Handle RGBA, RGB, or Grayscale pixel buffers
        if (srcData.length === width * height * 4) {
          imgData.data.set(srcData)
        } else if (srcData.length === width * height * 3) {
          let j = 0
          for (let i = 0; i < srcData.length; i += 3) {
            imgData.data[j] = srcData[i]
            imgData.data[j + 1] = srcData[i + 1]
            imgData.data[j + 2] = srcData[i + 2]
            imgData.data[j + 3] = 255
            j += 4
          }
        } else if (srcData.length === width * height) {
          let j = 0
          for (let i = 0; i < srcData.length; i++) {
            const val = srcData[i]
            imgData.data[j] = val
            imgData.data[j + 1] = val
            imgData.data[j + 2] = val
            imgData.data[j + 3] = 255
            j += 4
          }
        } else {
          continue
        }

        ctx.putImageData(imgData, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        const base64Data = dataUrl.split(',')[1]
        const binaryStr = atob(base64Data)
        const bytes = new Uint8Array(binaryStr.length)
        for (let b = 0; b < binaryStr.length; b++) {
          bytes[b] = binaryStr.charCodeAt(b)
        }

        extractedImages.push({
          id: `img_${pageNum}_${imageCounter}`,
          pageNumber: pageNum,
          name: `Image_p${pageNum}_${imageCounter}.png`,
          width,
          height,
          dataUrl,
          bytes,
          sizeKb: Math.round(bytes.byteLength / 1024),
          format: 'png'
        })

        imageCounter++
      } catch (err) {
        console.warn('Could not extract image object:', objId, err)
      }
    }
  }

  return extractedImages
}

/**
 * Packages all extracted images into a single ZIP archive
 */
export function buildImagesZip(images: ExtractedImageItem[]): Uint8Array {
  const entries: ZipFileEntry[] = images.map((img) => ({
    name: img.name,
    data: img.bytes
  }))

  return buildZipArchive(entries)
}
