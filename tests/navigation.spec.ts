import { test, expect } from '@playwright/test'
import { ensureTestFixtures } from './fixtures/ensureFixtures'

test.beforeAll(async () => {
  await ensureTestFixtures()
})

test.describe('LocalPDF Navigation & Global Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load application and display header brand', async ({ page }) => {
    await expect(page.locator('header').getByText('LocalPDF')).toBeVisible()
    await expect(page.locator('header [data-testid="app-logo"]')).toBeVisible()
  })

  test('should toggle dark mode and light mode', async ({ page }) => {
    const html = page.locator('html')
    const themeBtn = page.locator('button[aria-label="Toggle Theme"]')
    await expect(themeBtn).toBeVisible()

    const initialDark = await html.evaluate((el) => el.classList.contains('dark'))
    await themeBtn.click()

    const newDark = await html.evaluate((el) => el.classList.contains('dark'))
    expect(newDark).not.toBe(initialDark)
  })

  test('should toggle language between Indonesian and English', async ({ page }) => {
    // Click the EN language button
    const enBtn = page.locator('header button').filter({ hasText: 'EN' })
    await enBtn.click()

    await expect(page.locator('aside')).toContainText('Documents')
    await expect(page.locator('aside')).toContainText('Convert')
    await expect(page.locator('aside')).toContainText('Security & Tools')

    // Click the ID language button
    const idBtn = page.locator('header button').filter({ hasText: 'ID' })
    await idBtn.click()

    await expect(page.locator('aside')).toContainText('Dokumen')
    await expect(page.locator('aside')).toContainText('Konversi')
    await expect(page.locator('aside')).toContainText('Keamanan & Alat')
  })

  test('should switch across all 15 sidebar tools seamlessly', async ({ page }) => {
    // 1. Documents
    await page.click('aside button:has-text("Merge")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Split")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Kelola"), aside button:has-text("Edit")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("N-Up")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Bandingkan"), aside button:has-text("Compare")')
    await expect(page.locator('main')).toBeVisible()

    // 2. Conversion
    await page.click('aside button:has-text("Word")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("OCR PDF")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Excel")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Teks"), aside button:has-text("Text")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Ekstrak Gambar"), aside button:has-text("Extract Images")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Gambar ke PDF"), aside button:has-text("Images to PDF")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("PDF ke Gambar"), aside button:has-text("PDF to Images")')
    await expect(page.locator('main')).toBeVisible()

    // 3. Security
    await page.click('aside button:has-text("Kompres"), aside button:has-text("Compress")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Buka Password"), aside button:has-text("Unlock")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Perbaiki"), aside button:has-text("Repair")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Metadata")')
    await expect(page.locator('main')).toBeVisible()

    await page.click('aside button:has-text("Tentang"), aside button:has-text("About")')
    await expect(page.locator('main')).toBeVisible()
  })
})
