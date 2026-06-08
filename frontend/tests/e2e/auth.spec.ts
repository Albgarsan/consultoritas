import { test, expect } from '@playwright/test';

test.describe('HU-01: Acceso Seguro y Control de Identidad', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Muestra un error con credenciales incorrectas', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email', { exact: true }).fill('falso@correo.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('123456');
    await page.getByRole('button', { name: /Entrar al Portal/i }).click();

    const toastError = page.locator('div[data-component="toast"], li[data-sonner-toast]').getByText(/Credenciales incorrectas/i);
    await expect(toastError).toBeVisible({ timeout: 10000 });
  });

  test('Permite cerrar sesión correctamente', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill('cliente1@demo.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('password123');
    await page.getByRole('button', { name: /Entrar al Portal/i }).click();
    await page.waitForURL('**/cliente**', { timeout: 15000 });

    await page.getByRole('button', { name: /Salir/i }).click();
    await page.waitForURL('**/', { timeout: 10000 });

    await expect(page.getByRole('button', { name: /Acceso Portal/i }).first()).toBeVisible();
  });
});
