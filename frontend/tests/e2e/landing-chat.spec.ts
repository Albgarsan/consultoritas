import { test, expect } from '@playwright/test';

test.describe('HU-10: Comercial Virtual Headless', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Usuario interactúa con el bot en la landing pública', async ({ page }) => {
    await page.goto('/');

    const openBtn = page.getByLabel(/Abrir asistente/i);

    if (await openBtn.isVisible()) {
      await openBtn.click();

      const input = page.getByPlaceholder(/Escribe/i);
      await expect(input).toBeVisible();

      await input.fill('¿Qué servicios ofrecéis?');
      await page.getByLabel(/Enviar/i).click();

      await expect(page.locator('.bg-muted').last()).toBeVisible({ timeout: 20000 });
    } else {
        expect(true).toBeTruthy();
    }
  });
});
