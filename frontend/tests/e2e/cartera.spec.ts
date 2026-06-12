import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/asesor.json' });

test.describe('HU-04: Cartera Cooperativa y Compartida', () => {
  test('Asesor visualiza la lista de empresas dadas de alta', async ({ page }) => {
    await page.goto('/asesor');

    await page.getByRole('button', { name: /Gestión Clientes/i }).click();

    const tabla = page.getByRole('table').first();
    await expect(tabla).toBeVisible({ timeout: 15000 });

    const rowGroup = tabla.locator('tbody');
    await expect(rowGroup).toBeVisible();
  });
});
