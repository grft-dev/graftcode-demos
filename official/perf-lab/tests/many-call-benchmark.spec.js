import { expect, test } from '@playwright/test'

function parseTotalMs(summary, label) {
  const idx = summary.indexOf(label)
  expect(idx, `missing card for ${label}`).toBeGreaterThanOrEqual(0)
  const chunk = summary.slice(idx, idx + 280)
  const match = chunk.match(/(\d+(?:\.\d+)?)\s*ms/)
  expect(match, `no ms value near ${label}`).toBeTruthy()
  return Number(match[1])
}

test.describe('perf-lab sequential benchmark', () => {
  test('100 sequential getPrice calls per path', async ({ page }) => {
    await page.goto('/')
    await page.locator('#benchmark-count-select').selectOption('100')
    await page.getByRole('button', { name: 'Run benchmark' }).click()
    await expect(page.getByRole('button', { name: 'Run benchmark' })).toBeEnabled({ timeout: 300_000 })
    await expect(page.locator('.many-call-benchmark .payload-error')).toHaveCount(0)

    const summary = await page.locator('.benchmark-path-list').innerText()
    expect(parseTotalMs(summary, 'REST (JSON)')).toBeGreaterThan(0)
    expect(parseTotalMs(summary, 'gRPC unary (protobuf)')).toBeGreaterThan(0)
    expect(parseTotalMs(summary, 'gRPC stream (protobuf)')).toBeGreaterThan(0)
    expect(parseTotalMs(summary, 'Graftcode')).toBeGreaterThan(0)
  })
})
