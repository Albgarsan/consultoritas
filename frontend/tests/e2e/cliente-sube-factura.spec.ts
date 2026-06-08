import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/cliente.json' });

test.describe('HU-06a: Cliente Sube Factura', () => {
  test('Cliente sube factura desde su panel SPA de facturación', async ({ page }) => {
    await page.goto('/cliente');

    await page.getByRole('button', { name: /Facturación/i }).click();

    const btnSubirFactura = page.getByRole('button', { name: /Subir factura/i });
    await expect(btnSubirFactura).toBeVisible({ timeout: 15000 });
    await btnSubirFactura.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'factura_test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4')
    });

    await dialog.getByRole('button', { name: /Subir factura/i }).last().click();

    await expect(page.locator('li[data-sonner-toast]')).toBeVisible({ timeout: 20000 });
  });
});
