import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/asesor.json' });

test.describe('HU-02: Alta Sincronizada de Empresa y Cliente', () => {
  test('Asesor puede registrar un nuevo cliente unificado', async ({ page }) => {
    await page.goto('/asesor');

    await page.getByRole('button', { name: /Gestión Clientes/i }).click();

    await page.getByRole('button', { name: /Nuevo Cliente/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Nombre').fill('Nuevo'); // Nombre
    await dialog.getByLabel('Apellidos').fill('Cliente E2E'); // Apellidos
    await dialog.getByLabel('Email').fill(`test-${Date.now()}@demo.com`); // Email

    const switchEmpleados = dialog.getByRole('switch').first();
    await expect(switchEmpleados).toBeVisible();
    await switchEmpleados.click(); // ¿Tiene empleados?

    const submitBtn = dialog.getByRole('button', { name: /Crear Cliente/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    await expect(page.locator('li[data-sonner-toast]')).toBeVisible({ timeout: 15000 });
  });
});
