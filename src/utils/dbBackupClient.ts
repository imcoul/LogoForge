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

/**
 * Triggers a server-side delete of a project from PostgreSQL.
 */
export async function deleteProjectFromPostgres(
  id: string,
  customConnectionString?: string
): Promise<BackupResult> {
  try {
    const response = await fetch('/api/backup/postgres/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        customConnectionString,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete from PostgreSQL.');
    }

    return {
      success: true,
      message: data.message || 'Successfully deleted project from PostgreSQL backup.',
    };
  } catch (error: any) {
    console.error('PostgreSQL Delete Sync Error:', error);
    return {
      success: false,
      message: error.message || 'Unknown error during PostgreSQL backup deletion.',
    };
  }
}

/**
 * Fetches all projects for an owner from Supabase.
 */
export async function loadProjectsFromSupabase(
  ownerId: string,
  customUrl?: string,
  customKey?: string
): Promise<BackupResult & { projects?: Project[] }> {
  try {
    const response = await fetch('/api/backup/supabase/load', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ownerId,
        customUrl,
        customKey,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load projects from Supabase.');
    }

    return {
      success: true,
      message: 'Supabase load succeeded.',
      projects: data.projects,
    };
  } catch (error: any) {
    console.error('Supabase Load Error:', error);
    return {
      success: false,
      message: error.message || 'Unknown error during Supabase load.',
    };
  }
}

/**
 * Triggers a server-side delete of a project from Supabase.
 */
export async function deleteProjectFromSupabase(
  id: string,
  customUrl?: string,
  customKey?: string
): Promise<BackupResult> {
  try {
    const response = await fetch('/api/backup/supabase/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        customUrl,
        customKey,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete from Supabase.');
    }

    return {
      success: true,
      message: data.message || 'Successfully deleted project from Supabase backup.',
    };
  } catch (error: any) {
    console.error('Supabase Delete Sync Error:', error);
    return {
      success: false,
      message: error.message || 'Unknown error during Supabase backup deletion.',
    };
  }
}
