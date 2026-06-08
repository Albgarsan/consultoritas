import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/asesor.json' });

test.describe('HU-02: Alta Sincronizada de Empresa y Cliente', () => {
  test('Asesor puede registrar un nuevo cliente unificado', async ({ page }) => {
    await page.goto('/asesor');

    await page.getByRole('button', { name: /Gestión Clientes/i }).click();

    await page.getByRole('button', { name: /Nuevo Cliente/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('input').nth(0).fill('Nuevo'); // Nombre
    await dialog.locator('input').nth(1).fill('Cliente E2E'); // Apellidos
    await dialog.locator('input[type="email"]').fill(`test-${Date.now()}@demo.com`); // Email

    const switches = dialog.locator('button[role="switch"]');
    if (await switches.count() > 0) {
      await switches.nth(0).click(); // ¿Tiene empleados?
    }

    const submitBtn = dialog.getByRole('button', { name: /Crear Cliente/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    await expect(page.locator('li[data-sonner-toast]')).toBeVisible({ timeout: 15000 });
  });
});
