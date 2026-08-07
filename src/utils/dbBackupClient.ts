import { Project } from '../store';
import { auth } from '../services/firebase';

export interface BackupResult {
  success: boolean;
  message: string;
}

/**
 * Client for the server-side backup API.
 *
 * Phase 3 changed the security contract of this module in two ways:
 *
 *  1. Every request now carries the caller's Firebase ID token. The backup routes were
 *     previously unauthenticated.
 *  2. Database credentials are no longer sent from the browser. The previous
 *     `customConnectionString` / `customUrl` / `customKey` arguments let the client dictate
 *     which database the server connected to, which is an SSRF primitive and an
 *     exfiltration channel. Credentials now come from the server environment only.
 *
 * Bring-your-own-database can return as server-side, per-user encrypted configuration; it
 * cannot return as a request field.
 */

async function authorizedHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const user = auth.currentUser;
  if (user) {
    try {
      // getIdToken refreshes automatically when the cached token is close to expiry.
      headers['Authorization'] = `Bearer ${await user.getIdToken()}`;
    } catch (err) {
      console.warn('Could not attach auth token to backup request:', err);
    }
  }

  return headers;
}

async function postJson(path: string, body: unknown): Promise<any> {
  const response = await fetch(path, {
    method: 'POST',
    headers: await authorizedHeaders(),
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request to ${path} failed.`);
  }
  return data;
}

function failure(context: string, error: any): BackupResult {
  console.error(`${context}:`, error);
  return { success: false, message: error?.message || `Unknown error during ${context}.` };
}

/** Syncs a project to the server-configured PostgreSQL database. */
export async function syncProjectToPostgres(project: Project): Promise<BackupResult> {
  try {
    const data = await postJson('/api/backup/postgres', { project });
    return { success: true, message: data.message || 'PostgreSQL backup succeeded.' };
  } catch (error) {
    return failure('PostgreSQL sync', error);
  }
}

/** Syncs a project to the server-configured Supabase project. */
export async function syncProjectToSupabase(project: Project): Promise<BackupResult> {
  try {
    const data = await postJson('/api/backup/supabase', { project });
    return { success: true, message: data.message || 'Supabase backup succeeded.' };
  } catch (error) {
    return failure('Supabase sync', error);
  }
}

/** Deletes a project from the PostgreSQL backup. */
export async function deleteProjectFromPostgres(id: string): Promise<BackupResult> {
  try {
    const data = await postJson('/api/backup/postgres/delete', { id });
    return {
      success: true,
      message: data.message || 'Successfully deleted project from PostgreSQL backup.',
    };
  } catch (error) {
    return failure('PostgreSQL delete', error);
  }
}

/** Loads every project owned by `ownerId`. The server rejects any other owner id. */
export async function loadProjectsFromSupabase(
  ownerId: string,
): Promise<BackupResult & { projects?: Project[] }> {
  try {
    const data = await postJson('/api/backup/supabase/load', { ownerId });
    return { success: true, message: 'Supabase load succeeded.', projects: data.projects };
  } catch (error) {
    return failure('Supabase load', error);
  }
}

/** Deletes a project from the Supabase backup. */
export async function deleteProjectFromSupabase(id: string): Promise<BackupResult> {
  try {
    const data = await postJson('/api/backup/supabase/delete', { id });
    return {
      success: true,
      message: data.message || 'Successfully deleted project from Supabase backup.',
    };
  } catch (error) {
    return failure('Supabase delete', error);
  }
}
