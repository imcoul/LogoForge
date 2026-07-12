import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request the full drive and drive.file scopes to allow browsing and writing SVG files
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
}

/**
 * Initializes the auth listener.
 */
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else {
        // If Firebase remembered user but token was not cached in-memory,
        // we'll require sign-in to obtain a fresh token.
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

/**
 * Signs in with Google Popup and returns the authenticated user and their access token.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token from Firebase Authentication.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Signs the user out.
 */
export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Retrieves the currently cached access token.
 */
export const getCachedToken = () => {
  return cachedAccessToken;
};

/**
 * Lists SVG files from Google Drive.
 */
export const listSvgFiles = async (token: string): Promise<DriveFile[]> => {
  try {
    // Search for SVG files or files ending in .svg that are not trashed
    const query = encodeURIComponent("(mimeType = 'image/svg+xml' or name contains '.svg') and trashed = false");
    const fields = 'files(id,name,mimeType,createdTime,modifiedTime)';
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to list files: ${res.statusText}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Error listing files from Drive:', err);
    throw err;
  }
};

/**
 * Downloads the SVG text content from Google Drive.
 */
export const downloadSvgFile = async (fileId: string, token: string): Promise<string> => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to download file content: ${res.statusText}`);
    }

    return await res.text();
  } catch (err) {
    console.error('Error downloading file from Drive:', err);
    throw err;
  }
};

/**
 * Finds or creates a specific folder in the user's Google Drive and returns its ID.
 */
export const getOrCreateFolder = async (folderName: string, token: string): Promise<string> => {
  try {
    const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!searchRes.ok) {
      const errData = await searchRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to query folders: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    const existingFolder = searchData.files?.[0];

    if (existingFolder) {
      return existingFolder.id;
    }

    // Folder doesn't exist, create it
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(folderMetadata),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to create folder: ${createRes.statusText}`);
    }

    const createdFolder = await createRes.json();
    return createdFolder.id;
  } catch (err) {
    console.error('Error getting or creating folder on Drive:', err);
    throw err;
  }
};

/**
 * Uploads a new SVG file to Google Drive (using multipart related upload).
 */
export const uploadSvgFile = async (
  name: string,
  svgContent: string,
  token: string,
  parentId?: string
): Promise<DriveFile> => {
  try {
    const fileName = name.toLowerCase().endsWith('.svg') ? name : `${name}.svg`;
    const metadata: Record<string, any> = {
      name: fileName,
      mimeType: 'image/svg+xml',
    };

    if (parentId) {
      metadata.parents = [parentId];
    }

    const boundary = 'google_drive_upload_boundary_395949534227';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const body =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: image/svg+xml\r\n\r\n' +
      svgContent +
      closeDelim;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to upload file: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error('Error uploading file to Drive:', err);
    throw err;
  }
};

/**
 * Updates an existing SVG file on Google Drive.
 */
export const updateSvgFile = async (
  fileId: string,
  name: string,
  svgContent: string,
  token: string
): Promise<DriveFile> => {
  try {
    const fileName = name.toLowerCase().endsWith('.svg') ? name : `${name}.svg`;
    const metadata = {
      name: fileName,
    };

    const boundary = 'google_drive_update_boundary_395949534227';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const body =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: image/svg+xml\r\n\r\n' +
      svgContent +
      closeDelim;

    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to update file: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error('Error updating file on Drive:', err);
    throw err;
  }
};
