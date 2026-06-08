import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/asesor.json' });

test.describe('HU-06b: Asesor Valida Factura', () => {
  test('Asesor valida la factura subida mediante navegación SPA', async ({ page }) => {
    await page.goto('/asesor');

    await page.getByRole('button', { name: /Validar Facturas/i }).click();

    const table = page.getByRole('table').first();
    await expect(table).toBeVisible({ timeout: 15000 });

    const validateBtn = page.getByRole('button', { name: /Validar/i }).first();

    if (await validateBtn.isVisible()) {
      await validateBtn.click();

      await expect(page.getByText(/Campos oficiales AEAT/i)).toBeVisible();

      const finalValidateBtn = page.getByRole('button', { name: /Validar Datos/i });
      if (await finalValidateBtn.isVisible()) {
        await finalValidateBtn.click();
        await expect(page.locator('li[data-sonner-toast]')).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
