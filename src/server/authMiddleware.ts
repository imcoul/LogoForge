/**
 * Firebase ID token verification for API routes.
 *
 * Phase 3 of the roadmap. Before this, `/api/backup/*` was completely unauthenticated: any
 * anonymous caller could write arbitrary project rows, delete projects by id, or read another
 * user's projects back out.
 *
 * Verification is done against Google's published JWKS rather than through `firebase-admin`,
 * so it needs no service-account secret — only the project id, which is already public in
 * `firebase-applet-config.json`. That keeps deployment unchanged.
 */
import type { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;

/**
 * Google's public keys for Firebase ID tokens. `createRemoteJWKSet` caches the key set and
 * refreshes it on rotation, so this is one background fetch, not a per-request round trip.
 */
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export interface AuthenticatedRequest extends Request {
  /** Set by `requireAuth` once the caller's token has been verified. */
  auth?: { uid: string; email?: string };
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies a Firebase ID token and attaches the caller's uid to the request.
 *
 * Rejects with 401 unless the token is present, correctly signed by Google, unexpired, and
 * issued for *this* Firebase project. The issuer and audience checks matter: without them a
 * valid token from any other Firebase project would be accepted.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: missing bearer token.' });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });

    // Firebase puts the user id in `sub` (and mirrors it in `user_id`).
    const uid = typeof payload.sub === 'string' ? payload.sub : undefined;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized: token has no subject.' });
      return;
    }

    req.auth = { uid, email: typeof payload.email === 'string' ? payload.email : undefined };
    next();
  } catch {
    // Deliberately opaque: distinguishing "expired" from "bad signature" only helps an attacker.
    res.status(401).json({ error: 'Unauthorized: invalid token.' });
  }
}

/**
 * Asserts that the caller owns the project they are acting on.
 *
 * Authentication alone is not enough — without this, any signed-in user could overwrite or
 * delete any other user's project simply by knowing its id.
 */
export function assertOwnership(req: AuthenticatedRequest, ownerId: unknown): boolean {
  return typeof ownerId === 'string' && ownerId.length > 0 && ownerId === req.auth?.uid;
}
