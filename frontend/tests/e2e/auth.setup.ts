import { test as setup, expect } from '@playwright/test';
import { execSync } from 'child_process';

const getEmailByRole = (role: string) => {
  try {
    return execSync(`docker exec consultoritas_backend python manage.py shell -c "from apps.users.models import User; print(User.objects.filter(role='${role}', is_superuser=False).first().email)"`).toString().trim();
  } catch (error) {
    console.error(`Error obteniendo email para rol ${role}:`, error);
    return "";
  }
};

setup('Autenticación de cliente', async ({ page }) => {
  const clientEmail = getEmailByRole('Autónomo') || getEmailByRole('Sociedad');

  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(clientEmail);
  await page.getByLabel('Contraseña', { exact: true }).fill('password123');

  const responsePromise = page.waitForResponse('**/api/users/login/');
  await page.getByRole('button', { name: /Entrar al Portal/i }).click();

  const response = await responsePromise;
  expect([200, 308]).toContain(response.status());

  await page.waitForURL('**/cliente**', { timeout: 15000 });
  await page.context().storageState({ path: 'playwright/.auth/cliente.json' });
});

setup('Autenticación de asesor', async ({ page }) => {
  const advisorEmail = getEmailByRole('Asesor');

  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(advisorEmail);
  await page.getByLabel('Contraseña', { exact: true }).fill('password123');

  const responsePromise = page.waitForResponse('**/api/users/login/');
  await page.getByRole('button', { name: /Entrar al Portal/i }).click();

  const response = await responsePromise;
  expect([200, 308]).toContain(response.status());

  await page.waitForURL('**/asesor**', { timeout: 15000 });
  await page.context().storageState({ path: 'playwright/.auth/asesor.json' });
});
