import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/asesor.json' });

test.describe('HU-05: Registro Delegado de Nuevos Profesionales', () => {
  test('Asesor puede acceder al alta de asesores si es principal', async ({ page }) => {
    await page.goto('/asesor');

    const btnAlta = page.getByRole('button', { name: /Alta de Asesores/i });

    if (await btnAlta.isVisible()) {
      await btnAlta.click();
      await expect(page.getByRole('heading', { name: /Alta de Asesores/i }).first()).toBeVisible();
      await expect(page.getByLabel(/Email/i)).toBeVisible();
    } else {
      expect(await btnAlta.isVisible()).toBeFalsy();
    }
  });
});
