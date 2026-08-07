/**
 * Security tests for API authentication (Phase 3).
 *
 * `/api/backup/*` was previously unauthenticated: anyone could write project rows, delete
 * projects by id, or read another user's projects by passing their ownerId. These tests
 * cover the middleware that closed that.
 *
 * `jose` is mocked so the tests exercise the middleware's own logic — header parsing, claim
 * handling, failure modes — rather than re-testing a JWT library.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const jwtVerify = vi.fn();

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
  jwtVerify: (...args: unknown[]) => jwtVerify(...args),
}));

const { requireAuth, assertOwnership } = await import('../../server/authMiddleware');

type MockRes = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  statusCode?: number;
  body?: unknown;
};

function mockRes(): MockRes {
  const res: MockRes = {
    status: vi.fn(function (this: MockRes, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: MockRes, payload: unknown) {
      this.body = payload;
      return this;
    }),
  };
  res.status = res.status.bind(res) as never;
  res.json = res.json.bind(res) as never;
  return res;
}

const reqWith = (authorization?: string) => ({ headers: authorization ? { authorization } : {} }) as never;

beforeEach(() => {
  jwtVerify.mockReset();
});

describe('requireAuth — rejection paths', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(reqWith(), res as never, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it('rejects a non-Bearer scheme', async () => {
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(reqWith('Basic dXNlcjpwYXNz'), res as never, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an empty bearer token', async () => {
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(reqWith('Bearer    '), res as never, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a token that fails verification', async () => {
    jwtVerify.mockRejectedValue(new Error('signature verification failed'));
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(reqWith('Bearer forged.token.here'), res as never, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not leak why verification failed', async () => {
    // Distinguishing "expired" from "bad signature" only helps an attacker.
    jwtVerify.mockRejectedValue(new Error('JWT expired at 2020-01-01'));
    const res = mockRes();

    await requireAuth(reqWith('Bearer expired.token'), res as never, vi.fn());

    expect(JSON.stringify(res.body)).not.toContain('expired');
    expect(res.body).toEqual({ error: 'Unauthorized: invalid token.' });
  });

  it('rejects a verified token that carries no subject', async () => {
    jwtVerify.mockResolvedValue({ payload: { email: 'a@b.com' } });
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(reqWith('Bearer no.subject'), res as never, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAuth — success path', () => {
  it('attaches the uid and calls next', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'user-123', email: 'a@b.com' } });
    const req = reqWith('Bearer good.token') as { auth?: { uid: string; email?: string } };
    const next = vi.fn();

    await requireAuth(req as never, mockRes() as never, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.auth).toEqual({ uid: 'user-123', email: 'a@b.com' });
  });

  it('pins the issuer and audience to this Firebase project', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'user-123' } });

    await requireAuth(reqWith('Bearer good.token') as never, mockRes() as never, vi.fn());

    // Without these, a valid token minted by ANY other Firebase project would be accepted.
    const options = jwtVerify.mock.calls[0][2] as { issuer: string; audience: string };
    expect(options.issuer).toMatch(/^https:\/\/securetoken\.google\.com\//);
    expect(options.audience).toBeTruthy();
    expect(options.issuer).toContain(options.audience);
  });
});

describe('assertOwnership', () => {
  const authed = (uid: string) => ({ auth: { uid } }) as never;

  it('allows a user to act on their own project', () => {
    expect(assertOwnership(authed('user-1'), 'user-1')).toBe(true);
  });

  it("blocks a user from acting on another user's project", () => {
    // The core horizontal-privilege check: authentication alone would still let any signed-in
    // user overwrite any project whose id they could guess.
    expect(assertOwnership(authed('user-1'), 'user-2')).toBe(false);
  });

  it('blocks an unauthenticated request', () => {
    expect(assertOwnership({} as never, 'user-1')).toBe(false);
  });

  it('rejects missing, empty and non-string owner ids', () => {
    expect(assertOwnership(authed('user-1'), undefined)).toBe(false);
    expect(assertOwnership(authed('user-1'), '')).toBe(false);
    expect(assertOwnership(authed('user-1'), null)).toBe(false);
    expect(assertOwnership(authed('user-1'), 42)).toBe(false);
  });

  it('does not treat the legacy "local" owner as ownership', () => {
    // Offline projects carry ownerId 'local'; that must never satisfy a server-side check.
    expect(assertOwnership(authed('user-1'), 'local')).toBe(false);
  });
});
