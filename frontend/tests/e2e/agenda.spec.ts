import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/asesor.json' });

test.describe('HU-03: Agenda Personal de Citas sin Solapamientos', () => {
  test('Asesor visualiza agenda e intenta interactuar con ella', async ({ page }) => {
    await page.goto('/asesor');

    await page.getByRole('button', { name: /Agenda|Citas/i }).click();

    await expect(page.getByRole('heading', { name: /Citas|Agenda/i })).toBeVisible();

    const nuevaCitaBtn = page.getByRole('button', { name: /Crear Cita Manual/i });
    await expect(nuevaCitaBtn).toBeVisible();
    await nuevaCitaBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /Cancelar|Cerrar/i }).click();
  });
});
