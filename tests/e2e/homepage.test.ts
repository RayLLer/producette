import { test, expect } from '@playwright/test';

const locales = ['es', 'en'] as const;

for (const locale of locales) {
  test.describe(`/${locale} - sin desplazamiento lateral`, () => {
    test('a ancho de teléfono (390px): la página no se desplaza de lado', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test('a ancho de escritorio (1280px): la página no se desplaza de lado', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test('tiene etiqueta hreflang para es y en', async ({ page }) => {
      await page.goto(`/${locale}`);
      const hreflangs = await page.locator('link[hreflang]').all();
      const langs = await Promise.all(
        hreflangs.map((el) => el.getAttribute('hreflang')),
      );
      expect(langs).toContain('es');
      expect(langs).toContain('en');
      expect(langs).toContain('x-default');
    });
  });
}

test('la raíz / redirige a /es o /en', async ({ page }) => {
  const response = await page.goto('/');
  const url = new URL(page.url());
  expect(url.pathname).toMatch(/^\/(es|en)/);
  expect(response?.status()).toBeLessThan(400);
});
