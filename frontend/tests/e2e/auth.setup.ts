import { test as setup, expect } from '@playwright/test';

setup('Autenticación de cliente', async ({ page, request }) => {
  // Obtenemos un asesor del endpoint público
  const advRes = await request.get('http://127.0.0.1:8000/api/users/advisors/');
  const advisors = await advRes.json();
  const advisorEmail = advisors[0].email;

  // Hacemos login como asesor por API para obtener la sesión
  await request.post('http://127.0.0.1:8000/api/users/login/', {
    data: { email: advisorEmail, password: 'password123' }
  });

  // Con la sesión de asesor, consultamos el endpoint de clientes
  const clientsRes = await request.get('http://127.0.0.1:8000/api/users/clients/');
  const clients = await clientsRes.json();
  const clientEmail = clients[0].email;

  if (!clientEmail) {
    throw new Error("No client email found via API");
  }

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

setup('Autenticación de asesor', async ({ page, request }) => {
  const advRes = await request.get('http://127.0.0.1:8000/api/users/advisors/');
  const advisors = await advRes.json();
  const advisorEmail = advisors[0].email;

  if (!advisorEmail) {
    throw new Error("No advisor email found via API");
  }

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
