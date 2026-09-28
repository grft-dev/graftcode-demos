import { expect, test } from '@playwright/test'

test.describe('perf-lab 1.3', () => {
  test('Fetch One Price uses the live graft', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.graft-error')).toHaveCount(0)
    await page.getByRole('button', { name: 'Fetch One Price' }).click()
    await expect(page.locator('.price-section .value')).not.toHaveText(/^\s*0\s/)
    const text = await page.locator('.price-section .value').innerText()
    const n = Number(text.replace(/[^\d.-]/g, ''))
    expect(n).toBeGreaterThan(0)
  })

  test('Exclude Network Latency is on by default', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('checkbox', { name: 'Exclude Network Latency' })).toBeChecked()
  })
})
