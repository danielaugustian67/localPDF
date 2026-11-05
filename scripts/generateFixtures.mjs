import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const fixturesDir = path.resolve(__dirname, '../tests/fixtures/sample-data')
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true })
}

async function createSamplePdfs() {
  console.log('Generating test PDF fixtures in:', fixturesDir)

  // 1. doc1.pdf (2 pages)
  const doc1 = await PDFDocument.create()
  const font = await doc1.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc1.embedFont(StandardFonts.HelveticaBold)

  // Page 1
  const p1 = doc1.addPage([595, 842])
  p1.drawText('Dokumen Sampel Pertama', { x: 50, y: 780, size: 20, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  p1.drawText('Ini adalah paragraf pengantar pada halaman pertama dokumen sampel LocalPDF.', {
    x: 50,
    y: 740,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2)
  })
  p1.drawText('Fitur keamanan offline menjamin data tidak dikirim ke internet.', {
    x: 50,
    y: 720,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2)
  })

  // Page 2
  const p2 = doc1.addPage([595, 842])
  p2.drawText('Bab 2: Pembahasan Lanjutan', { x: 50, y: 780, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  p2.drawText('Halaman kedua memuat kesimpulan dan catatan verifikasi berkas.', {
    x: 50,
    y: 740,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2)
  })

  fs.writeFileSync(path.join(fixturesDir, 'doc1.pdf'), await doc1.save())
  console.log('Created doc1.pdf (2 pages)')

  // 2. doc2.pdf (1 page)
  const doc2 = await PDFDocument.create()
  const p2_1 = doc2.addPage([595, 842])
  p2_1.drawText('Dokumen Lampiran Kedua', { x: 50, y: 780, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  p2_1.drawText('Lampiran pelengkap untuk pengujian fungsi penggabungan (Merge PDF).', {
    x: 50,
    y: 740,
    size: 11,
    font,
    color: rgb(0.2, 0.2, 0.2)
  })
  fs.writeFileSync(path.join(fixturesDir, 'doc2.pdf'), await doc2.save())
  console.log('Created doc2.pdf (1 page)')

  // 3. table.pdf (Tabular Data)
  const tableDoc = await PDFDocument.create()
  const tp1 = tableDoc.addPage([595, 842])
  tp1.drawText('Laporan Keuangan Bulanan', { x: 50, y: 780, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1) })

  // Header row
  tp1.drawText('No', { x: 50, y: 730, size: 11, font: fontBold })
  tp1.drawText('Kategori Pengeluaran', { x: 100, y: 730, size: 11, font: fontBold })
  tp1.drawText('Anggaran (IDR)', { x: 300, y: 730, size: 11, font: fontBold })
  tp1.drawText('Realisasi (IDR)', { x: 440, y: 730, size: 11, font: fontBold })

  // Data rows
  const rows = [
    ['1', 'Lisensi Perangkat Lunak', '15.000.000', '14.250.000'],
    ['2', 'Infrastruktur Server Lokal', '25.000.000', '23.800.000'],
    ['3', 'Pelatihan Karyawan', '10.000.000', '9.500.000'],
    ['4', 'Pemeliharaan Hardware', '8.000.000', '7.900.000']
  ]

  let curY = 700
  for (const r of rows) {
    tp1.drawText(r[0], { x: 50, y: curY, size: 10, font })
    tp1.drawText(r[1], { x: 100, y: curY, size: 10, font })
    tp1.drawText(r[2], { x: 300, y: curY, size: 10, font })
    tp1.drawText(r[3], { x: 440, y: curY, size: 10, font })
    curY -= 25
  }

  fs.writeFileSync(path.join(fixturesDir, 'table.pdf'), await tableDoc.save())
  console.log('Created table.pdf')

  // 4. doc_a.pdf & doc_b.pdf (Compare PDF test)
  const docA = await PDFDocument.create()
  const pa = docA.addPage([595, 842])
  pa.drawText('PERJANJIAN KERJA SAMA (DRAF AWAL)', { x: 50, y: 780, size: 16, font: fontBold })
  pa.drawText('Pasal 1: Nilai kontrak disepakati sebesar Rp 50.000.000,-', { x: 50, y: 740, size: 11, font })
  pa.drawText('Pasal 2: Jangka waktu penyelesaian adalah 30 hari kalender.', { x: 50, y: 710, size: 11, font })
  fs.writeFileSync(path.join(fixturesDir, 'doc_a.pdf'), await docA.save())

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
  pb.drawText('Pasal 2: Jangka waktu penyelesaian diperpanjang menjadi 45 hari kalender.', {
    x: 50,
    y: 710,
    size: 11,
    font
  })
  fs.writeFileSync(path.join(fixturesDir, 'doc_b.pdf'), await docB.save())
  console.log('Created doc_a.pdf & doc_b.pdf (for comparison test)')

  // 5. corrupt.pdf (Truncated PDF)
  const validBytes = await doc1.save()
  // Truncate last 200 bytes so %%EOF is missing
  const corruptBytes = validBytes.slice(0, validBytes.length - 200)
  fs.writeFileSync(path.join(fixturesDir, 'corrupt.pdf'), corruptBytes)
  console.log('Created corrupt.pdf (truncated EOF for repair test)')

  // 6. sample.png (Valid 64x64 PNG for Images to PDF)
  // Minimal valid 1x1 transparent PNG base64
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  fs.writeFileSync(path.join(fixturesDir, 'sample.png'), Buffer.from(pngBase64, 'base64'))
  console.log('Created sample.png')
}

createSamplePdfs()
  .then(() => console.log('All fixtures created successfully.'))
  .catch((err) => console.error('Error creating fixtures:', err))
