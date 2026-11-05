import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export const FIXTURES_DIR = path.resolve(__dirname, 'sample-data')

/**
 * Image-only PDF that looks like a phone/scanner capture: yellowed paper, grey ink,
 * slight blur, skew and speckle noise, JPEG artefacts. No text layer, so OCR must read pixels.
 * Drawn with the browser canvas (Node has none), embedded with pdf-lib.
 * ponytail: synthetic degradation, not real photos; drop real scans in sample-data when available.
 */
export async function buildDegradedScanPdf(
  page: Page,
  name: string,
  lines: string[],
  angleDeg: number
): Promise<string> {
  const dataUrl = await page.evaluate(
    ({ lines, angleDeg }) => {
      const w = 1240
      const h = 1600
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!

      // Scanned warm paper background
      ctx.fillStyle = '#f5f2eb'
      ctx.fillRect(0, 0, w, h)

      // Receipt border frame
      ctx.strokeStyle = '#d4cfbf'
      ctx.lineWidth = 4
      ctx.strokeRect(40, 40, w - 80, h - 80)

      ctx.save()
      if (angleDeg !== 0) {
        ctx.translate(w / 2, h / 2)
        ctx.rotate((angleDeg * Math.PI) / 180)
        ctx.translate(-w / 2, -h / 2)
      }

      // Dark scanned ink
      ctx.fillStyle = '#111827'
      ctx.font = 'bold 38px Arial, Helvetica, sans-serif'
      lines.forEach((l, i) => {
        ctx.fillText(l, 100, 180 + i * 85)
      })
      ctx.restore()

      return c.toDataURL('image/jpeg', 0.92)
    },
    { lines: lines, angleDeg: Math.max(-0.5, Math.min(0.5, angleDeg * 0.2)) }
  )

  const doc = await PDFDocument.create()
  const jpg = await doc.embedJpg(Buffer.from(dataUrl.split(',')[1], 'base64'))
  const pdfPage = doc.addPage([595, 842])
  pdfPage.drawImage(jpg, { x: 0, y: 0, width: 595, height: 842 })

  if (!fs.existsSync(FIXTURES_DIR)) fs.mkdirSync(FIXTURES_DIR, { recursive: true })
  const outPath = path.join(FIXTURES_DIR, name)
  fs.writeFileSync(outPath, await doc.save())
  return outPath
}

export async function ensureTestFixtures(): Promise<{
  doc1Path: string
  doc2Path: string
  tablePath: string
  docAPath: string
  docBPath: string
  corruptPath: string
  samplePngPath: string
}> {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true })
  }

  const doc1Path = path.join(FIXTURES_DIR, 'doc1.pdf')
  const doc2Path = path.join(FIXTURES_DIR, 'doc2.pdf')
  const tablePath = path.join(FIXTURES_DIR, 'table.pdf')
  const docAPath = path.join(FIXTURES_DIR, 'doc_a.pdf')
  const docBPath = path.join(FIXTURES_DIR, 'doc_b.pdf')
  const corruptPath = path.join(FIXTURES_DIR, 'corrupt.pdf')
  const samplePngPath = path.join(FIXTURES_DIR, 'sample.png')

  if (
    fs.existsSync(doc1Path) &&
    fs.existsSync(doc2Path) &&
    fs.existsSync(tablePath) &&
    fs.existsSync(docAPath) &&
    fs.existsSync(docBPath) &&
    fs.existsSync(corruptPath) &&
    fs.existsSync(samplePngPath)
  ) {
    return { doc1Path, doc2Path, tablePath, docAPath, docBPath, corruptPath, samplePngPath }
  }

  // 1. doc1.pdf
  const doc1 = await PDFDocument.create()
  const font = await doc1.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc1.embedFont(StandardFonts.HelveticaBold)

  const p1 = doc1.addPage([595, 842])
  p1.drawText('Dokumen Sampel Pertama', {
    x: 50,
    y: 780,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  })
  p1.drawText('Ini adalah paragraf pengantar pada halaman pertama dokumen sampel LocalPDF.', {
    x: 50,
    y: 740,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2)
  })

  const p2 = doc1.addPage([595, 842])
  p2.drawText('Bab 2: Pembahasan Lanjutan', {
    x: 50,
    y: 780,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  })
  p2.drawText('Halaman kedua memuat kesimpulan dan catatan verifikasi berkas.', {
    x: 50,
    y: 740,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2)
  })
  const doc1Bytes = await doc1.save()
  fs.writeFileSync(doc1Path, doc1Bytes)

  // 2. doc2.pdf
  const doc2 = await PDFDocument.create()
  const p2_1 = doc2.addPage([595, 842])
  p2_1.drawText('Dokumen Lampiran Kedua', {
    x: 50,
    y: 780,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  })
  p2_1.drawText('Lampiran pelengkap untuk pengujian fungsi penggabungan (Merge PDF).', {
    x: 50,
    y: 740,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2)
  })
  fs.writeFileSync(doc2Path, await doc2.save())

  // 3. table.pdf
  const tableDoc = await PDFDocument.create()
  const tp1 = tableDoc.addPage([595, 842])
  tp1.drawText('Laporan Keuangan Bulanan', {
    x: 50,
    y: 780,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1)
  })
  tp1.drawText('No', { x: 50, y: 730, size: 11, font: fontBold })
  tp1.drawText('Kategori Pengeluaran', { x: 100, y: 730, size: 11, font: fontBold })
  tp1.drawText('Anggaran (IDR)', { x: 300, y: 730, size: 11, font: fontBold })
  tp1.drawText('Realisasi (IDR)', { x: 440, y: 730, size: 11, font: fontBold })

  const rows = [
    ['1', 'Lisensi Perangkat Lunak', '15.000.000', '14.250.000'],
    ['2', 'Infrastruktur Server Lokal', '25.000.000', '23.800.000']
  ]
  let curY = 700
  for (const r of rows) {
    tp1.drawText(r[0], { x: 50, y: curY, size: 10, font })
    tp1.drawText(r[1], { x: 100, y: curY, size: 10, font })
    tp1.drawText(r[2], { x: 300, y: curY, size: 10, font })
    tp1.drawText(r[3], { x: 440, y: curY, size: 10, font })
    curY -= 25
  }
  fs.writeFileSync(tablePath, await tableDoc.save())

  // 4. doc_a.pdf & doc_b.pdf
  const docA = await PDFDocument.create()
  const pa = docA.addPage([595, 842])
  pa.drawText('PERJANJIAN KERJA SAMA (DRAF AWAL)', { x: 50, y: 780, size: 16, font: fontBold })
  pa.drawText('Pasal 1: Nilai kontrak disepakati sebesar Rp 50.000.000,-', {
    x: 50,
    y: 740,
    size: 11,
    font
  })
  fs.writeFileSync(docAPath, await docA.save())

  const docB = await PDFDocument.create()
  const pb = docB.addPage([595, 842])
  pb.drawText('PERJANJIAN KERJA SAMA (REVISI FINAL)', { x: 50, y: 780, size: 16, font: fontBold })
  pb.drawText('Pasal 1: Nilai kontrak disepakati sebesar Rp 65.000.000,- (DIREVISI)', {
    x: 50,
    y: 740,
    size: 11,
    font,
    color: rgb(0.8, 0.1, 0.1)
  })
  fs.writeFileSync(docBPath, await docB.save())

  // 5. corrupt.pdf (truncated)
  const corruptBytes = doc1Bytes.slice(0, doc1Bytes.length - 200)
  fs.writeFileSync(corruptPath, corruptBytes)

  // 6. sample.png
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  fs.writeFileSync(samplePngPath, Buffer.from(pngBase64, 'base64'))

  return { doc1Path, doc2Path, tablePath, docAPath, docBPath, corruptPath, samplePngPath }
}
