import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const data = JSON.parse(readFileSync(new URL('../src/metrics/ai-token-cost.json', import.meta.url), 'utf8'))
const number = (value) => Math.round(value).toLocaleString('en-US')

test.describe('AI token cost', () => {
  test('page numbers match the committed runs and examples', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('ai-token-cost')).toBeVisible()

    for (const stack of ['rest', 'graftcode']) {
      const item = data.stacks[stack]
      await expect(page.getByTestId(`${stack}-total-tokens`)).toHaveText(number(item.totalTokens))
      await expect(page.getByTestId(`${stack}-output-tokens`)).toHaveText(number(item.outputTokens))
      await expect(page.getByTestId(`${stack}-files`)).toHaveText(String(item.files))
      await expect(page.getByTestId(`${stack}-lines`)).toHaveText(number(item.lines))
    }

    await expect(page.getByTestId('token-reduction')).toContainText(`${data.reduction}%`)
  })
})
