import { expect, test } from '@playwright/test';

// The internal endpoints only answer to pg_cron / npm run sweep with the CRON_SECRET.
// Authorized calls are covered by `npm run sweep` and tests/rls/jobs.rls.test.ts.
for (const path of ['/api/internal/sweep', '/api/internal/nightly']) {
  test.describe(path, () => {
    test('sin secreto responde 401', async ({ request }) => {
      const res = await request.post(path);
      expect(res.status()).toBe(401);
    });

    test('con un secreto incorrecto responde 401', async ({ request }) => {
      const res = await request.post(path, {
        headers: { Authorization: 'Bearer secreto-incorrecto-de-al-menos-32-caracteres' },
      });
      expect(res.status()).toBe(401);
    });

    test('GET no está permitido', async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(405);
    });
  });
}
