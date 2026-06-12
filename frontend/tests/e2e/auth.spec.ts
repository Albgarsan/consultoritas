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

  test('Permite cerrar sesión correctamente', async ({ page, request }) => {
    const advRes = await request.get('http://127.0.0.1:8000/api/users/advisors/');
    const advRaw = await advRes.json();
    const advisors = Array.isArray(advRaw) ? advRaw : (advRaw.results || []);
    const email = advisors[0]?.email;

    if (!email) throw new Error('No advisor email found');

    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill('password123');
    await page.getByRole('button', { name: /Entrar al Portal/i }).click();
    await page.waitForURL('**/asesor**', { timeout: 15000 });

    await page.getByRole('button', { name: /Salir/i }).click();
    await page.waitForURL('**/', { timeout: 10000 });

    await expect(page.getByRole('button', { name: /Acceso Portal/i }).first()).toBeVisible();
  });
});
