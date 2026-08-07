/**
 * Security tests for the outbound model endpoint allowlist (Phase 3).
 *
 * Before this allowlist, `endpoint` was read from a request header and passed straight to
 * `fetch`, letting any caller steer the server's outbound requests. The SSRF cases below are
 * the payloads that attack would use.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  isAllowedEndpoint,
  resolveEndpoint,
  assertAllowedEndpoint,
  DisallowedEndpointError,
} from '../../server/endpointAllowlist';

const FALLBACK = 'https://api.stepfun.com/v1/chat/completions';

afterEach(() => {
  delete process.env.ALLOWED_MODEL_HOSTS;
});

describe('allowed endpoints', () => {
  it.each([
    'https://api.stepfun.com/v1/chat/completions',
    'https://api.poolside.ai/v1/chat/completions',
    'https://api.hunyuan.tencent.com/v1/chat/completions',
    'https://generativelanguage.googleapis.com/v1/models',
    'https://api.openai.com/v1/chat/completions',
    'https://openrouter.ai/api/v1/chat/completions',
  ])('accepts the known provider %s', (url) => {
    expect(isAllowedEndpoint(url)).toBe(true);
  });

  it('accepts any path on an allowed host', () => {
    expect(isAllowedEndpoint('https://api.openai.com/anything/at/all')).toBe(true);
  });
});

describe('SSRF payloads are rejected', () => {
  it.each([
    ['cloud metadata service', 'http://169.254.169.254/latest/meta-data/'],
    ['GCP metadata over https', 'https://metadata.google.internal/computeMetadata/v1/'],
    ['localhost', 'http://localhost:3000/api/backup/postgres'],
    ['loopback ip', 'http://127.0.0.1:8080/'],
    ['private network', 'http://10.0.0.5/admin'],
    ['attacker host', 'https://attacker.example.com/collect'],
    ['file scheme', 'file:///etc/passwd'],
    ['gopher scheme', 'gopher://127.0.0.1:6379/_INFO'],
  ])('rejects %s', (_label, url) => {
    expect(isAllowedEndpoint(url)).toBe(false);
  });

  it('rejects plain http even for an otherwise allowed host', () => {
    // Downgrade would expose the API key the server attaches to the request.
    expect(isAllowedEndpoint('http://api.openai.com/v1/chat/completions')).toBe(false);
  });

  it('rejects credentials embedded in the URL', () => {
    // `https://api.openai.com@attacker.example.com/` resolves to the attacker's host.
    expect(isAllowedEndpoint('https://api.openai.com:x@attacker.example.com/')).toBe(false);
  });

  it('rejects a lookalike host that merely contains an allowed name', () => {
    expect(isAllowedEndpoint('https://api.openai.com.attacker.example.com/')).toBe(false);
    expect(isAllowedEndpoint('https://notapi.openai.com/')).toBe(false);
  });

  it('rejects malformed and empty values', () => {
    expect(isAllowedEndpoint('not a url')).toBe(false);
    expect(isAllowedEndpoint('')).toBe(false);
    expect(isAllowedEndpoint(undefined)).toBe(false);
    expect(isAllowedEndpoint(null)).toBe(false);
  });
});

describe('operator-configured hosts', () => {
  it('accepts a host added via ALLOWED_MODEL_HOSTS', () => {
    process.env.ALLOWED_MODEL_HOSTS = 'llm.internal.example.com';
    expect(isAllowedEndpoint('https://llm.internal.example.com/v1/chat')).toBe(true);
  });

  it('accepts a comma-separated list and ignores surrounding whitespace', () => {
    process.env.ALLOWED_MODEL_HOSTS = ' a.example.com , b.example.com ';
    expect(isAllowedEndpoint('https://b.example.com/v1')).toBe(true);
  });

  it('still requires https for operator-configured hosts', () => {
    process.env.ALLOWED_MODEL_HOSTS = 'a.example.com';
    expect(isAllowedEndpoint('http://a.example.com/v1')).toBe(false);
  });

  it('is configured by the operator, not by request headers', () => {
    // The variable is read from the server environment; a client cannot set it.
    expect(isAllowedEndpoint('https://llm.internal.example.com/v1/chat')).toBe(false);
  });
});

describe('resolveEndpoint', () => {
  it('honours an allowed proposal', () => {
    expect(resolveEndpoint('https://api.openai.com/v1/chat', FALLBACK)).toBe(
      'https://api.openai.com/v1/chat',
    );
  });

  it('silently falls back when the proposal is disallowed', () => {
    expect(resolveEndpoint('http://169.254.169.254/', FALLBACK)).toBe(FALLBACK);
  });

  it('falls back when no proposal is made', () => {
    expect(resolveEndpoint(undefined, FALLBACK)).toBe(FALLBACK);
    expect(resolveEndpoint(null, FALLBACK)).toBe(FALLBACK);
  });
});

describe('assertAllowedEndpoint', () => {
  it('passes for an allowed endpoint', () => {
    expect(() => assertAllowedEndpoint('https://api.openai.com/v1')).not.toThrow();
  });

  it('throws a typed error for a disallowed endpoint', () => {
    expect(() => assertAllowedEndpoint('http://169.254.169.254/')).toThrow(DisallowedEndpointError);
  });
});
