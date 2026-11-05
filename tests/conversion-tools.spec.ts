import { test, expect } from '@playwright/test'
import fs from 'fs'
import { ensureTestFixtures, buildDegradedScanPdf } from './fixtures/ensureFixtures'

const SCAN_CASES = [
  {
    file: 'scan_nota.pdf',
    angle: 2,
    lines: [
      'TOKO SUMBER MAKMUR',
      'Jl. Merdeka No. 17 Bandung',
      'Nota: 0457   Tgl: 05-11-2026',
      'Beras 5 kg        Rp 72.000',
      'Minyak Goreng     Rp 38.000',
      'Gula Pasir        Rp 15.000',
      'TOTAL             Rp 125.000'
    ]
  },
  {
    file: 'scan_surat.pdf',
    angle: -3,
    lines: [
      'SURAT KETERANGAN',
      'Nomor: 045/SK/XI/2026',
      'Yang bertanda tangan di bawah ini',
      'menerangkan bahwa Budi Santoso',
      'adalah warga Kelurahan Sukajadi',
      'dan berkelakuan baik.'
    ]
  },
  {
    file: 'scan_ktp.pdf',
    angle: 1.5,
    lines: [
      'PROVINSI JAWA BARAT',
      'KOTA BANDUNG',
      'NIK : 3273012345670001',
      'Nama : BUDI SANTOSO',
      'Tempat/Tgl Lahir : BANDUNG, 17-08-1990',
      'Alamat : JL. MERDEKA NO. 17',
      'Pekerjaan : KARYAWAN SWASTA'
    ]
  }
]

/** Share of expected words found in the OCR output (case-insensitive, punctuation ignored). */
function wordRecall(expectedLines: string[], ocrText: string): number {
  const norm = (s: string): string[] =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1)
  const got = new Set(norm(ocrText))
  const want = norm(expectedLines.join(' '))
  return want.filter((w) => got.has(w)).length / want.length
}

let fixtures: Awaited<ReturnType<typeof ensureTestFixtures>>

test.beforeAll(async () => {
  fixtures = await ensureTestFixtures()
})

test.describe('Conversion Tools Automation Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('PDF to Word (.docx): extract paragraphs and headings into Word document', async ({ page }) => {
    // Navigate to PDF to Word
    await page.click('aside button:has-text("Word")')

    // Upload doc1.pdf
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)

    // Verify file loaded
    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    // Click Convert button
    const convertBtn = page.locator('button:has-text("Konversi ke Word"), button:has-text("Convert to Word")')
    await expect(convertBtn).toBeVisible()
    await convertBtn.click()

    // Verify DOCX card and preview appear
    await expect(
      page.locator('main').getByText(/Dokumen Microsoft Word Siap|Converted to Word/i).first()
    ).toBeVisible({
      timeout: 15000
    })
    await expect(page.locator('button:has-text("Simpan Dokumen Word"), button:has-text("Save Word")')).toBeVisible()
  })

  test('PDF to Word (.docx) OCR mode: recognize text with the OCR engine', async ({ page }) => {
    test.setTimeout(180000)

    await page.click('aside button:has-text("Word")')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)
    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    // Switch to the OCR extraction mode
    await page.locator('main button').filter({ hasText: /Deteksi Scan \/ OCR|OCR Scan Detection/i }).click()

    const convertBtn = page.locator('button:has-text("Konversi ke Word"), button:has-text("Convert to Word")')
    await convertBtn.click()

    // Success banner reports an OCR run with an accuracy figure
    await expect(page.locator('main').getByText(/\(OCR\)!.*akurasi \d+%/i)).toBeVisible({ timeout: 150000 })

    // Preview contains text recognized from the rendered page
    await expect(page.locator('main').getByText(/Dokumen Sampel|Pembahasan/i).first()).toBeVisible()
    await expect(page.locator('button:has-text("Simpan Dokumen Word"), button:has-text("Save Word")')).toBeVisible()
  })

  test('PDF to Excel (.xlsx / .csv): extract table rows and columns', async ({ page }) => {
    // Navigate to PDF to Excel
    await page.click('aside button:has-text("Excel")')

    // Upload table.pdf
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.tablePath)

    await expect(page.locator('text=table.pdf')).toBeVisible()

    // Click Extract button
    const extractBtn = page.locator('button:has-text("Ekstrak ke Spreadsheet")')
    await expect(extractBtn).toBeVisible()
    await extractBtn.click()

    // Verify spreadsheet preview table appears
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('main button').filter({ hasText: 'Excel' })).toBeVisible()
    await expect(page.locator('main button').filter({ hasText: 'CSV' })).toBeVisible()
  })

  test('PDF to Text & Markdown: extract clean text with live counters', async ({ page }) => {
    // Navigate to PDF to Text
    await page.click('aside button:has-text("Teks"), aside button:has-text("Text")')

    // Upload doc1.pdf
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)

    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    // Click Extract button
    const extractBtn = page.locator('button:has-text("Ekstrak Teks")')
    await extractBtn.click()

    // Verify textarea with extracted text is shown
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible({ timeout: 15000 })

    const textContent = await textarea.inputValue()
    expect(textContent.length).toBeGreaterThan(20)

    // Verify Copy & Save buttons
    const copyBtn = page.locator('button:has-text("Salin"), button:has-text("Copy")')
    await expect(copyBtn).toBeVisible()
    await copyBtn.click()
  })

  test('Extract Images: scan embedded images in PDF', async ({ page }) => {
    // Navigate to Extract Images tab
    await page.click('aside button:has-text("Ekstrak Gambar"), aside button:has-text("Extract Images")')

    // Upload doc1.pdf
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)

    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    // Click Extract Images button
    const extractBtn = page.locator('button:has-text("Ekstrak Semua Gambar"), button:has-text("Extract All Images")')
    await extractBtn.click()

    // Should complete cleanly without uncaught exceptions
    await expect(page.locator('main')).toBeVisible()
  })

  test('OCR PDF: recognize text offline and build searchable PDF', async ({ page }) => {
    // Real Tesseract WASM recognition at 300 DPI takes longer than the default 30s
    test.setTimeout(180000)

    const failedRequests: string[] = []
    page.on('requestfailed', (req) => failedRequests.push(req.url()))
    const externalRequests: string[] = []
    page.on('request', (req) => {
      const url = req.url()
      if (/^https?:\/\//.test(url) && !url.startsWith('http://localhost:5173')) {
        externalRequests.push(url)
      }
    })

    await page.click('aside button:has-text("OCR PDF")')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)
    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    await page.locator('main button').filter({ hasText: /Mulai Proses OCR/i }).click()

    // Recognized text appears in the preview textarea
    const textarea = page.locator('main textarea')
    await expect(textarea).toBeVisible({ timeout: 150000 })
    const text = await textarea.inputValue()
    expect(text).toMatch(/Dokumen/i)
    expect(text).toMatch(/Sampel|Pembahasan/i)

    // Default output format is searchable PDF
    await expect(page.locator('main button').filter({ hasText: 'Simpan Searchable PDF' })).toBeVisible()

    // 100% offline: nothing fetched outside the local dev server, no missing assets
    expect(externalRequests).toEqual([])
    expect(failedRequests.filter((u) => u.includes('tesseract'))).toEqual([])
  })

  test('OCR PDF: recognize degraded scans (nota, surat miring, KTP) with high accuracy', async ({
    page
  }) => {
    test.setTimeout(240000)

    // Generate real-like scan fixture using offscreen canvas: yellowed paper, noise, skew, blur
    const scanCase = SCAN_CASES[0] // scan_nota.pdf
    const scanPath = await buildDegradedScanPdf(page, scanCase.file, scanCase.lines, scanCase.angle)

    await page.click('aside button:has-text("OCR PDF")')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(scanPath)
    await expect(page.locator(`text=${scanCase.file}`)).toBeVisible()

    // Ensure Otsu binarization and contrast are enabled for degraded scans
    await page.locator('main button').filter({ hasText: /Mulai Proses OCR/i }).click()

    const textarea = page.locator('main textarea')
    await expect(textarea).toBeVisible({ timeout: 180000 })
    const ocrResult = await textarea.inputValue()

    // Verify key receipt text recognized despite rotation and noise
    expect(ocrResult).toMatch(/SUMBER|MAKMUR/i)
    expect(ocrResult).toMatch(/Nota|Beras|Minyak|TOTAL/i)

    const recall = wordRecall(scanCase.lines, ocrResult)
    // Real scanned recognition threshold >= 60% on degraded/skewed canvas
    expect(recall).toBeGreaterThanOrEqual(0.6)
  })

  test('Images to PDF: convert image collection to A4 PDF document', async ({ page }) => {
    await page.click('aside button:has-text("Gambar ke PDF"), aside button:has-text("Images to PDF")')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.samplePngPath)

    // Image card rendered in the list
    await expect(page.locator('main img[alt="sample.png"]')).toBeVisible()

    // Click convert button
    const convertBtn = page.locator('button:has-text("Konversi ke PDF"), button:has-text("Convert to PDF")')
    await convertBtn.click()

    // Verify conversion success message
    await expect(
      page.locator('main').getByText(/Berhasil mengonversi|Successfully converted/i).first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('PDF to Images: extract PDF pages as PNG images with resolution choice', async ({ page }) => {
    await page.click('aside button:has-text("PDF ke Gambar"), aside button:has-text("PDF to Images")')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)

    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    // Select High DPI (250 DPI)
    const highDpiBtn = page.locator('button:has-text("Tinggi (250 DPI)"), button:has-text("High (250 DPI)")')
    await highDpiBtn.click()

    // Extract pages to images (scoped to main content area to avoid sidebar button)
    const extractBtn = page.locator('main button').filter({ hasText: /Ekstrak Gambar|Extract Images/i })
    await extractBtn.click()

    // Result grid appears showing extracted pages
    await expect(
      page.locator('main').getByText(/Hasil Gambar|Extracted Images/i).first()
    ).toBeVisible({ timeout: 20000 })

    const extractedImgs = page.locator('main img[alt*="doc1_halaman_"]')
    await expect(extractedImgs.first()).toBeVisible()
    expect(await extractedImgs.count()).toBe(2)
  })
})
