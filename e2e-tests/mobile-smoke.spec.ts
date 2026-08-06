import { test, expect } from '@playwright/test';

/**
 * Phase 0 mobile smoke flows.
 *
 * Purpose: prove the app boots and its primary surfaces are reachable on a phone viewport,
 * so the Phase 1 document-model rewrite has an end-to-end tripwire and not just unit tests.
 *
 * These are deliberately shallow and selector-light. Deep interaction flows belong in later
 * phases, once the editors have stable test ids.
 */

test.describe('boot', () => {
  test('renders the app shell without a fatal error', async ({ page }) => {
    const fatalErrors: string[] = [];
    page.on('pageerror', (err) => fatalErrors.push(err.message));

    await page.goto('/');

    // #root must actually receive content — a white screen means React failed to mount.
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();

    expect(fatalErrors, `uncaught page errors: ${fatalErrors.join(' | ')}`).toEqual([]);
  });

  test('does not scroll horizontally on a phone viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).not.toBeEmpty();

    // Horizontal overflow is the classic mobile-first regression.
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('registers a service worker manifest for PWA installability', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest');
    expect(response?.status()).toBe(200);

    const manifest = await response!.json();
    expect(manifest.name).toBeTruthy();
  });
});

test.describe('project lifecycle', () => {
  test('exposes the create-project affordance', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).not.toBeEmpty();

    const createBtn = page.locator('#btn-create-project');
    await expect(createBtn).toBeVisible();
  });

  test('creates a project and reaches the studio', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).not.toBeEmpty();

    await page.locator('#btn-create-project').click();

    // A newly created project is named "Untitled Brand" and starts in the discovery stage.
    await expect(page.getByText('Untitled Brand').first()).toBeVisible();
  });
});
