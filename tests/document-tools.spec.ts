import { test, expect } from '@playwright/test'
import { ensureTestFixtures } from './fixtures/ensureFixtures'

let fixtures: Awaited<ReturnType<typeof ensureTestFixtures>>

test.beforeAll(async () => {
  fixtures = await ensureTestFixtures()
})

test.describe('Document Tools Automation Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Merge PDF: upload 2 files and merge them successfully', async ({ page }) => {
    // Navigate to Merge tab
    await page.click('aside button:has-text("Merge"), aside button:has-text("Gabung")')

    // Upload doc1.pdf and doc2.pdf
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles([fixtures.doc1Path, fixtures.doc2Path])

    // Wait for file cards to appear in list
    await expect(page.locator('text=doc1.pdf')).toBeVisible()
    await expect(page.locator('text=doc2.pdf')).toBeVisible()

    // Click Merge button
    const mergeBtn = page.locator('button:has-text("Gabung & Simpan"), button:has-text("Merge & Save")')
    await expect(mergeBtn).toBeEnabled()
    await mergeBtn.click()

    // Assert success banner appears
    await expect(page.locator('text=/Berhasil menggabungkan|Merged/i')).toBeVisible({ timeout: 10000 })
  })

  test('Split PDF: upload document and configure split options', async ({ page }) => {
    // Navigate to Split tab
    await page.click('aside button:has-text("Split"), aside button:has-text("Pisah")')

    // Upload doc1.pdf
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)

    // Verify document details appear
    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    // Select "All Pages" split mode button
    const allPagesBtn = page.locator('button').filter({ hasText: /Semua Halaman|All Pages/i })
    await allPagesBtn.click()

    // Trigger Split & Save
    const splitBtn = page.locator('button:has-text("Pisah & Simpan"), button:has-text("Split & Save")')
    await expect(splitBtn).toBeEnabled()
    await splitBtn.click()

    // Verify extracted files list appears
    await expect(page.locator('main').getByText(/Berhasil memisahkan|doc1_part/i).first()).toBeVisible({
      timeout: 10000
    })
  })

  test('N-Up Print: upload document and switch 2-in-1 / 4-in-1 layout', async ({ page }) => {
    // Navigate to N-Up tab
    await page.click('aside button:has-text("N-Up")')

    // Upload doc1.pdf
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(fixtures.doc1Path)

    await expect(page.locator('text=doc1.pdf')).toBeVisible()

    // Select 4-Up layout
    const fourUpBtn = page.locator('button:has-text("4-in-1"), button:has-text("4 Pages")')
    if (await fourUpBtn.isVisible()) {
      await fourUpBtn.click()
    }

    const saveNupBtn = page.locator('button:has-text("Simpan Dokumen Hemat"), button:has-text("Save N-Up")')
    await expect(saveNupBtn).toBeEnabled()
  })

  test('Compare PDF: compare two documents and inspect visual differences', async ({ page }) => {
    // Navigate to Compare tab
    await page.click('aside button:has-text("Bandingkan"), aside button:has-text("Compare")')

    // Upload Document A
    const inputA = page.locator('input[type="file"]').first()
    await inputA.setInputFiles(fixtures.docAPath)
    await expect(page.locator('text=doc_a.pdf')).toBeVisible({ timeout: 10000 })

    // Upload Document B (remaining dropzone)
    const inputB = page.locator('input[type="file"]').first()
    await inputB.setInputFiles(fixtures.docBPath)

    // Wait for difference analysis
    await expect(page.locator('text=/perbedaan|differences|identik/i')).toBeVisible({ timeout: 20000 })

    // Switch to Side-by-Side view
    const sideBySideBtn = page.locator('button:has-text("Berdampingan"), button:has-text("Side by Side")')
    await sideBySideBtn.click()

    // Verify both document pages are rendered
    await expect(page.locator('img[alt="Doc A"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('img[alt="Doc B"]')).toBeVisible({ timeout: 10000 })
  })
})
