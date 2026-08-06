/**
 * Records a mobile performance baseline for Forgel.
 *
 * Loads the built app in Chromium under emulated Slow 4G + 4x CPU throttling and reports
 * paint timings and transfer weight. Phase 4 of the roadmap compares against these numbers.
 *
 * Usage:
 *   npx vite build
 *   npx vite preview --port 4173 &
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium node scripts/perfBaseline.mjs
 */
import { chromium, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4173';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

// Chrome DevTools "Slow 4G" preset.
const SLOW_4G = {
  offline: false,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (400 * 1024) / 8,
  latency: 400,
};

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();

// Tally transfer weight by resource type.
const bytesByType = {};
page.on('response', async (response) => {
  try {
    const headers = response.headers();
    const len = Number(headers['content-length'] || 0);
    const type = response.request().resourceType();
    bytesByType[type] = (bytesByType[type] || 0) + len;
  } catch {
    // Response bodies can be gone by the time we ask; ignore.
  }
});

const client = await context.newCDPSession(page);
await client.send('Network.enable');
await client.send('Network.emulateNetworkConditions', SLOW_4G);
await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

const startedAt = Date.now();
await page.goto(BASE_URL, { waitUntil: 'load', timeout: 120_000 });

// Wait until React has actually mounted something.
await page.waitForFunction(() => {
  const root = document.getElementById('root');
  return !!root && root.children.length > 0;
}, { timeout: 120_000 });

const mountedAtMs = Date.now() - startedAt;

const timings = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const paints = performance.getEntriesByType('paint');
  const fcp = paints.find((p) => p.name === 'first-contentful-paint');
  return {
    domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    loadEventMs: nav ? Math.round(nav.loadEventEnd) : null,
    firstContentfulPaintMs: fcp ? Math.round(fcp.startTime) : null,
    transferSizeBytes: nav ? nav.transferSize : null,
    encodedBodySizeBytes: nav ? nav.encodedBodySize : null,
  };
});

const result = {
  recordedAt: new Date().toISOString().slice(0, 10),
  conditions: { network: 'Slow 4G (400kbps, 400ms RTT)', cpuThrottlingRate: 4, device: 'Pixel 7' },
  timings,
  reactMountedMs: mountedAtMs,
  bytesByResourceType: bytesByType,
};

console.log(JSON.stringify(result, null, 2));

await browser.close();
