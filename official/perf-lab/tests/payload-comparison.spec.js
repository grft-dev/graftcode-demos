import { expect, test } from '@playwright/test'

function parseMs(summary, ...labels) {
  const line = summary.split('\n').find((l) => labels.some((label) => l.startsWith(label)))
  expect(line, `missing summary row for ${labels.join(' or ')}`).toBeTruthy()
  const match = line.match(/(\d+(?:\.\d+)?)\s*ms/)
  expect(match, `no ms value in: ${line}`).toBeTruthy()
  return Number(match[1])
}

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

  for (const count of [1000, 20000, 50000]) {
    test(`Run comparison at ${count} points`, async ({ page }) => {
      await page.goto('/')
      await page.locator('#payload-count-select').selectOption(String(count))
      await page.getByRole('button', { name: 'Run comparison' }).click()
      await expect(page.getByRole('button', { name: 'Run comparison' })).toBeEnabled({ timeout: 120_000 })
      await expect(page.locator('.payload-error')).toHaveCount(0)

      const summary = await page.locator('.summary').innerText()
      const rest = parseMs(summary, 'REST (JSON)')
      const unary = parseMs(summary, 'gRPC unary (protobuf)')
      const stream = parseMs(summary, 'gRPC stream (protobuf)')
      const graft = parseMs(summary, 'Graftcode (direct call)')
      expect(rest).toBeGreaterThan(0)
      expect(unary).toBeGreaterThan(0)
      expect(stream).toBeGreaterThan(0)
      expect(graft).toBeGreaterThan(0)
      expect(summary).toMatch(/KB/)

      await page.locator('#integration-tech-select').selectOption('gRPC')
      const cost = page.locator('.cost-results')
      await expect(cost).toContainText(/gRPC → Graftcode|gRPC → REST/)
    })
  }
})
