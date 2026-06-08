import { test as setup, expect } from '@playwright/test';

setup('Autenticación de cliente', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('cliente1@demo.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('password123');

  const responsePromise = page.waitForResponse('**/api/users/login/');
  await page.getByRole('button', { name: /Entrar al Portal/i }).click();

  const response = await responsePromise;
  expect([200, 308]).toContain(response.status());

  await page.waitForURL('**/cliente**', { timeout: 15000 });
  await page.context().storageState({ path: 'playwright/.auth/cliente.json' });
});

setup('Autenticación de asesor', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('asesor1@demo.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('password123');

  const responsePromise = page.waitForResponse('**/api/users/login/');
  await page.getByRole('button', { name: /Entrar al Portal/i }).click();

  const response = await responsePromise;
  expect([200, 308]).toContain(response.status());

  await page.waitForURL('**/asesor**', { timeout: 15000 });
  await page.context().storageState({ path: 'playwright/.auth/asesor.json' });
});
