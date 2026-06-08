import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/cliente.json' });

test.describe('HU-07: Visualización Contable Reactiva', () => {
  test('Dashboard carga y muestra los datos generales al cliente', async ({ page }) => {
    await page.goto('/cliente');

    await expect(page.getByRole('heading', { name: /Mi Portal/i })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Facturación/i }).click();
    await expect(page.getByText(/Total Ingresos/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total Gastos/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Mi Resumen/i }).click();
    await expect(page.locator('.bg-background').first()).toBeVisible();
  });
});
