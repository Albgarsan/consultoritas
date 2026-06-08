import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/cliente.json' });

test.describe('HU-08: Consultor Virtual Privado', () => {
  test('Cliente puede interactuar con el Asistente IA', async ({ page }) => {
    await page.goto('/cliente');

    const openBtn = page.getByRole('button', { name: /Abrir asistente IA|Chat/i });
    if(await openBtn.isVisible()) {
        await openBtn.click();
    } else {
        await page.getByLabel(/Abrir asistente IA/i).click();
    }

    await page.getByPlaceholder('Escribe tu pregunta...').fill('Hola, ¿me ayudas con mi IVA?');

    await expect(page.getByLabel('Enviar mensaje')).toBeEnabled();
    await page.getByLabel('Enviar mensaje').click();

    await expect(page.locator('.bg-muted.text-muted-foreground').last()).toBeVisible({ timeout: 20000 });
  });
});
