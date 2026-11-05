import { test, expect } from '@playwright/test'
import { ensureTestFixtures } from './fixtures/ensureFixtures'

let fixtures: Awaited<ReturnType<typeof ensureTestFixtures>>

test.beforeAll(async () => {
  fixtures = await ensureTestFixtures()
})

test.describe('Security & Maintenance Tools Automation Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Compress PDF: compress document and verify reduction', async ({ page }) => {
    // Navigate to Compress tab
    await page.click('aside button:has-text("Kompres"), aside button:has-text("Compress")')

    // Upload doc1.pdf
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)

    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    // Trigger Compress
    const compressBtn = page.locator('button:has-text("Kompres & Simpan"), button:has-text("Compress & Save")')
    await expect(compressBtn).toBeVisible()
    await compressBtn.click()

    // Verify compressed result card appears
    await expect(page.locator('text=/Ukuran Semula|Original Size/i')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('text=/Ukuran Baru|New Size/i')).toBeVisible()
  })

  test('Repair PDF: diagnose and repair corrupted/truncated PDF', async ({ page }) => {
    // Navigate to Repair tab
    await page.click('aside button:has-text("Perbaiki"), aside button:has-text("Repair")')

    // Upload corrupt.pdf (truncated EOF)
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.corruptPath)

    await expect(page.locator('text=corrupt.pdf')).toBeVisible()

    // Verify diagnostic issues are detected
    await expect(
      page.locator('main').getByText(/anomali|Issues/i).first()
    ).toBeVisible({
      timeout: 15000
    })

    // Click Repair button
    const repairBtn = page.locator('button:has-text("Perbaiki Berkas"), button:has-text("Repair Document")')
    await expect(repairBtn).toBeEnabled({ timeout: 10000 })
    await repairBtn.click()

    // Verify recovery card and save button
    await expect(
      page.locator('button:has-text("Simpan PDF Hasil Perbaikan"), button:has-text("Save Repaired PDF")')
    ).toBeVisible({
      timeout: 20000
    })
  })

  test('Unlock PDF: detect encryption status and prepare decryption', async ({ page }) => {
    // Navigate to Unlock tab
    await page.click('aside button:has-text("Buka Password"), aside button:has-text("Unlock")')

    // Upload doc1.pdf
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)

    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    // Check password input field presence
    const passwordInput = page.locator('input[placeholder*="password"]')
    await expect(passwordInput).toBeVisible()
    await passwordInput.fill('secret123')
  })

  test('Metadata Sanitizer: inspect and sanitize document tracking data', async ({ page }) => {
    // Navigate to Metadata tab
    await page.click('aside button:has-text("Metadata")')

    // Upload doc1.pdf
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)

    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    // Click Sanitize Button inside main workspace
    const sanitizeBtn = page.locator('main button').filter({ hasText: /Bersihkan Semua Jejak|Sanitize/i })
    await expect(sanitizeBtn).toBeVisible()
    await sanitizeBtn.click()

    // Verify success notice
    await expect(page.locator('text=/Metadata berhasil dibersihkan/i')).toBeVisible({ timeout: 10000 })
  })
})
