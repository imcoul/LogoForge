import { Project } from '../store';

export interface BackupResult {
  success: boolean;
  message: string;
}

/**
 * Triggers a server-side sync of a project to the PostgreSQL database.
 */
export async function syncProjectToPostgres(
  project: Project,
  customConnectionString?: string
): Promise<BackupResult> {
  try {
    const response = await fetch('/api/backup/postgres', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project,
        customConnectionString,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to sync to PostgreSQL.');
    }

    return {
      success: true,
      message: data.message || 'PostgreSQL backup succeeded.',
    };
  } catch (error: any) {
    console.error('PostgreSQL Sync Error:', error);
    return {
      success: false,
      message: error.message || 'Unknown error during PostgreSQL backup.',
    };
  }
}

/**
 * Triggers a server-side sync of a project to Supabase.
 */
export async function syncProjectToSupabase(
  project: Project,
  customUrl?: string,
  customKey?: string
): Promise<BackupResult> {
  try {
    const response = await fetch('/api/backup/supabase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project,
        customUrl,
        customKey,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to sync to Supabase.');
    }

    return {
      success: true,
      message: data.message || 'Supabase backup succeeded.',
    };
  } catch (error: any) {
    console.error('Supabase Sync Error:', error);
    return {
      success: false,
      message: error.message || 'Unknown error during Supabase backup.',
    };
  }
}
