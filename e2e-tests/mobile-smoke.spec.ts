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

test.describe('navigation', () => {
  /**
   * These replace two speculative specs that shipped in the repo but had never been run:
   * they targeted ~20 selectors that do not exist in the app (`.project-card`,
   * `.color-swatch-badge`, `.mockup-container-selector-placeholder`, ...). Rather than write
   * assertions against a UI that Phase 1 and Phase 4 are actively rewriting, these cover the
   * navigation surface that genuinely exists today, via stable ids.
   */
  const gotoApp = async (page: import('@playwright/test').Page) => {
    await page.goto('/');
    await expect(page.locator('#root')).not.toBeEmpty();
  };

  test('primary navigation exposes every view', async ({ page }) => {
    await gotoApp(page);

    for (const id of ['#btn-nav-dashboard', '#btn-nav-studio', '#btn-nav-course', '#btn-nav-settings']) {
      await expect(page.locator(id)).toBeVisible();
    }
  });

  test('navigating to the course view loads its lazy chunk without error', async ({ page }) => {
    const fatalErrors: string[] = [];
    page.on('pageerror', (err) => fatalErrors.push(err.message));

    await gotoApp(page);
    await page.locator('#btn-nav-course').click();

    // Code splitting means this view arrives as a separate chunk; a failed chunk load would
    // leave the Suspense fallback on screen forever.
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.getByText(/Loading/)).toHaveCount(0);
    expect(fatalErrors, `uncaught page errors: ${fatalErrors.join(' | ')}`).toEqual([]);
  });

  test('navigating to settings loads its lazy chunk without error', async ({ page }) => {
    const fatalErrors: string[] = [];
    page.on('pageerror', (err) => fatalErrors.push(err.message));

    await gotoApp(page);
    await page.locator('#btn-nav-settings').click();

    await expect(page.locator('#root')).not.toBeEmpty();
    await expect(page.getByText(/Loading/)).toHaveCount(0);
    expect(fatalErrors, `uncaught page errors: ${fatalErrors.join(' | ')}`).toEqual([]);
  });

  test('returns to the dashboard after visiting another view', async ({ page }) => {
    await gotoApp(page);

    await page.locator('#btn-nav-course').click();
    await page.locator('#btn-nav-dashboard').click();

    await expect(page.locator('#btn-create-project')).toBeVisible();
  });
});

test.describe('PWA installability', () => {
  test('manifest declares everything a browser needs to install the app', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest');
    const manifest = await response!.json();

    // Each of these was missing before Phase 4; without them the app is not installable.
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.icons?.length).toBeGreaterThanOrEqual(2);
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });

  test('every icon the manifest references actually exists', async ({ page }) => {
    // The manifest previously pointed at /icon-192.png and /icon-512.png, neither of which
    // had ever been created.
    const response = await page.goto('/manifest.webmanifest');
    const manifest = await response!.json();

    for (const icon of manifest.icons) {
      const iconResponse = await page.request.get(icon.src);
      expect(iconResponse.status(), `${icon.src} should exist`).toBe(200);
    }
  });
});
