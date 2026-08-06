/**
 * Shared Vitest setup: browser APIs that jsdom does not implement but the app requires.
 *
 * Wired via `setupFiles` in vitest.config.ts so individual tests do not each have to
 * re-declare these mocks.
 */
import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// jsdom has no Worker implementation; the editors instantiate module workers on mount.
class MockWorker {
  onmessage: ((event: any) => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  constructor(_url: string | URL, _opts?: WorkerOptions) {}
  postMessage(_msg: any) {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
globalThis.Worker = MockWorker as any;

// jsdom implements neither of these object-URL helpers.
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
globalThis.URL.revokeObjectURL = vi.fn();

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Touch-capable code paths call this; jsdom does not provide it.
  if (!('vibrate' in window.navigator)) {
    Object.defineProperty(window.navigator, 'vibrate', {
      writable: true,
      value: vi.fn(),
    });
  }
}
