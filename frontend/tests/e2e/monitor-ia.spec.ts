import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/asesor.json' });

test.describe('HU-09: Monitor de Intervención Híbrida', () => {
  test('Asesor puede acceder al monitor y ver conversaciones activas', async ({ page }) => {
    await page.goto('/asesor');

    const monitorBtn = page.getByRole('button', { name: /Monitor IA/i });
    await expect(monitorBtn).toBeVisible({ timeout: 10000 });
    await monitorBtn.click();

    await expect(page.getByRole('heading', { name: /Monitor/i }).first()).toBeVisible();

    const area = page.locator('.space-y-4').first();
    await expect(area).toBeVisible({ timeout: 10000 });
  });
});
