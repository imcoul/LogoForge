import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  Download, 
  Upload, 
  RefreshCw, 
  Search, 
  Check, 
  ExternalLink, 
  FileCode, 
  LogOut, 
  AlertTriangle, 
  FileText,
  Sparkles
} from 'lucide-react';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  listSvgFiles, 
  downloadSvgFile, 
  uploadSvgFile, 
  updateSvgFile,
  getOrCreateFolder,
  DriveFile 
} from '../services/googleDriveService';
import { useAppStore, Project } from '../store';
import { User } from 'firebase/auth';
import { useToast } from './Toast';
import { Modal } from './ui/Modal';

interface GoogleDriveIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: Project | null;
  onImportSuccess?: (projectName: string, svgContent: string) => void;
}

export const GoogleDriveIntegration: React.FC<GoogleDriveIntegrationProps> = ({
  isOpen,
  onClose,
  activeProject,
  onImportSuccess
}) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  
  // File Listing State
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Operation states
  const [importingFileId, setImportingFileId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingToFolder, setIsExportingToFolder] = useState(false);
  const [destinationFolder, setDestinationFolder] = useState('Forgel Logos');
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const { createProject, updateProject } = useAppStore();

  // Initialize auth
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        fetchFiles(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        fetchFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setErrorMsg(null);
    try {
      await googleSignOut();
      setUser(null);
      setToken(null);
      setFiles([]);
      setNeedsAuth(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Logout failed.');
    }
  };

  const fetchFiles = async (accessToken: string) => {
    setIsLoadingFiles(true);
    setErrorMsg(null);
    try {
      const driveFiles = await listSvgFiles(accessToken);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Error fetching files:', err);
      setErrorMsg(err.message || 'Failed to list Google Drive files.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleRefresh = () => {
    if (token) {
      fetchFiles(token);
    }
  };

  const handleImportFile = async (file: DriveFile) => {
    if (!token) return;
    
    // Explicit Confirmation
    const confirmImport = window.confirm(
      `Do you want to import "${file.name}" as a new brand project workspace?`
    );
    if (!confirmImport) return;

    setImportingFileId(file.id);
    setErrorMsg(null);
    try {
      const svgContent = await downloadSvgFile(file.id, token);
      
      // Remove file extension for project name
      const projectName = file.name.replace(/\.svg$/i, '');
      
      // Create new project in Zustand store
      const newProj = await createProject(projectName);
      await updateProject(newProj.id, {
        svgSource: svgContent,
        logoMimeType: 'image/svg+xml',
        stage: 'drafting',
        // Preserve Drive file link
        driveFileId: file.id
      });

      if (onImportSuccess) {
        onImportSuccess(projectName, svgContent);
      }

      toast(`Successfully imported "${file.name}" into Forgel brand spaces!`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Import failed:', err);
      setErrorMsg(err.message || 'Failed to download or import SVG file.');
    } finally {
      setImportingFileId(null);
    }
  };

  const handleExportActiveProject = async (asNew: boolean = false) => {
    if (!token || !activeProject) return;

    const svgContent = activeProject.svgSource;
    if (!svgContent) {
      toast('The current active brand space does not have an SVG source layer to export yet. Please design or import one first.', 'error');
      return;
    }

    // Determine if we should update or create
    const hasDriveId = activeProject.driveFileId;
    const shouldUpdate = hasDriveId && !asNew;

    // Explicit Confirmation Dialog
    const confirmMessage = shouldUpdate
      ? `Do you want to update the existing file on Google Drive linked to this project?`
      : `Do you want to export "${activeProject.name}" as an SVG file to your Google Drive?`;
      
    const confirmExport = window.confirm(confirmMessage);
    if (!confirmExport) return;

    setIsExporting(true);
    setExportSuccess(null);
    setErrorMsg(null);

    try {
      let resultFile: DriveFile;
      if (shouldUpdate) {
        resultFile = await updateSvgFile(
          activeProject.driveFileId!,
          activeProject.name,
          svgContent,
          token
        );
      } else {
        resultFile = await uploadSvgFile(
          activeProject.name,
          svgContent,
          token
        );
        
        // Link this project with the newly uploaded file ID in our store
        await updateProject(activeProject.id, {
          driveFileId: resultFile.id
        });
      }

      setExportSuccess(resultFile.id);
      fetchFiles(token); // refresh list in background
      toast(`Successfully saved "${activeProject.name}.svg" to your Google Drive!`, 'success');
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMsg(err.message || 'Failed to upload SVG file to Google Drive.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToFolder = async () => {
    if (!token || !activeProject) return;

    const svgContent = activeProject.svgSource;
    if (!svgContent) {
      toast('The current active brand space does not have an SVG source layer to export yet. Please design or import one first.', 'error');
      return;
    }

    const folderName = destinationFolder.trim() || 'Forgel Logos';
    const confirmExport = window.confirm(
      `Do you want to upload "${activeProject.name}.svg" to the specific folder "${folderName}" in your Google Drive?`
    );
    if (!confirmExport) return;

    setIsExportingToFolder(true);
    setExportSuccess(null);
    setErrorMsg(null);

    try {
      // 1. Resolve or create folder
      const folderId = await getOrCreateFolder(folderName, token);

      // 2. Upload file inside the folder parent
      const resultFile = await uploadSvgFile(
        activeProject.name,
        svgContent,
        token,
        folderId
      );

      // Link this project with the uploaded file ID
      await updateProject(activeProject.id, {
        driveFileId: resultFile.id
      });

      setExportSuccess(resultFile.id);
      fetchFiles(token); // refresh list in background
      toast(`Successfully saved "${activeProject.name}.svg" inside your Google Drive folder "${folderName}"!`, 'success');
    } catch (err: any) {
      console.error('Export to specific folder failed:', err);
      setErrorMsg(err.message || `Failed to upload SVG file to Google Drive folder "${folderName}".`);
    } finally {
      setIsExportingToFolder(false);
    }
  };

  const handleExportBrandGuide = async () => {
    if (!token || !activeProject) return;
    if (!activeProject.brandGuide) {
      toast('The current active brand space does not have a generated Brand Guide manual to export yet. Please generate one under the Brand Architect tab first.', 'error');
      return;
    }

    const confirmExport = window.confirm(
      `Do you want to export the compiled Brand Guide for "${activeProject.name}" as a Markdown file to your Google Drive?`
    );
    if (!confirmExport) return;

    setIsExporting(true);
    setExportSuccess(null);
    setErrorMsg(null);

    try {
      // Generate standard markdown representation of the brand guide
      const bg = activeProject.brandGuide;
      const mdContent = `# Forgel Brand Manual: ${bg.brandName || activeProject.name}

## 1. Brand Essence & Pillars
- **Industry Category**: Design
- **Tone of Voice**: ${bg.brandVoice?.tone || 'Professional'}
- **Description**: ${activeProject.description || 'Brand description'}

## 2. Color Palette Hex Hierarchy
- **Primary Color**: ${bg.primaryColors?.[0]?.name || 'Accent'} (${bg.primaryColors?.[0]?.hex || '#000000'})
- **Secondary Color**: ${bg.secondaryColors?.[0]?.name || 'Supporting'} (${bg.secondaryColors?.[0]?.hex || '#777777'})

## 3. Brand Directives (Dos and Don'ts)
- **Do's**:
  - Preserve color values
  - Ensure visual contrast
- **Don'ts**:
${bg.logoUsage?.doNot?.map(item => `  - ${item}`).join('\n') || '  - Distort vector coordinates\n  - Apply low contrast backgrounds'}

*Generated by Forgel Branding Forge operating system on Google Drive.*`;

      const fileName = `${(bg.brandName || activeProject.name).replace(/\s+/g, '_')}_brand_manual.md`;
      
      const boundary = 'google_drive_brand_guide_boundary';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;
      
      const metadata = {
        name: fileName,
        mimeType: 'text/markdown',
      };

      const body =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/markdown\r\n\r\n' +
        mdContent +
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
        throw new Error(errData?.error?.message || `Failed to upload Brand Manual: ${res.statusText}`);
      }

      const resultFile = await res.json();
      setExportSuccess(resultFile.id);
      toast(`Successfully saved Brand Manual "${fileName}" to Google Drive!`, 'success');
    } catch (err: any) {
      console.error('Brand Guide export failed:', err);
      setErrorMsg(err.message || 'Failed to upload Brand Guide to Google Drive.');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId="gdrive-title" className="max-w-2xl w-full flex flex-col p-0 overflow-hidden shadow-2xl h-full max-h-[85dvh] md:h-[600px]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-neutral-100 dark:border-zinc-800 flex items-center justify-between bg-neutral-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-zinc-800 text-indigo-600 rounded-2xl border border-indigo-100 dark:border-zinc-700 flex items-center justify-center">
              <Cloud size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display tracking-tight text-neutral-900 dark:text-white">
                Google Drive Storage
              </h2>
              <p className="text-xs text-neutral-500 dark:text-zinc-400">
                Import and export flat vector branding files instantly with permission
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        {needsAuth ? (
          /* Login View */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-zinc-900 overflow-y-auto">
            <div className="w-16 h-16 bg-neutral-50 dark:bg-zinc-950 rounded-2xl flex items-center justify-center border border-neutral-200 dark:border-zinc-900 mb-6 shadow-sm">
              <Cloud size={32} className="text-neutral-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Connect Google Drive</h3>
            <p className="text-sm text-neutral-500 dark:text-zinc-400 max-w-sm mb-8 leading-relaxed">
              Enable the Google Drive integration with your permission to load vector files (.svg) directly into Forgel, or archive finished design guides into your cloud drive securely.
            </p>

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button cursor-pointer select-none"
              style={{ minWidth: '220px' }}
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-sans font-medium text-sm text-neutral-800">
                  {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
                </span>
              </div>
            </button>

            {errorMsg && (
              <div className="mt-6 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        ) : (
          /* Main Authenticated Layout */
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
            {/* User Account Info Bar */}
            <div className="px-6 py-3 bg-neutral-50 dark:bg-zinc-950/50 border-b border-neutral-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'user'} className="w-7 h-7 rounded-full border border-neutral-200 dark:border-zinc-800" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                    {user?.email?.charAt(0) || 'G'}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-xs font-bold text-neutral-900 dark:text-white leading-tight">
                    {user?.displayName || 'Google User'}
                  </p>
                  <p className="text-[10px] text-neutral-400 leading-none truncate max-w-[200px]">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isLoadingFiles}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                  title="Refresh File List"
                >
                  <RefreshCw size={15} className={isLoadingFiles ? 'animate-spin text-indigo-600' : ''} />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
                  title="Disconnect Google Drive"
                >
                  <LogOut size={14} />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="px-6 border-b border-neutral-100 dark:border-zinc-900 flex gap-4 shrink-0">
              <button
                onClick={() => { setActiveTab('import'); setErrorMsg(null); }}
                className={`py-3 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer ${activeTab === 'import' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                Import from Drive
                {activeTab === 'import' && <motion.div layoutId="driveTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
              </button>
              <button
                onClick={() => { setActiveTab('export'); setErrorMsg(null); }}
                className={`py-3 text-xs font-bold uppercase tracking-wider relative transition-all cursor-pointer ${activeTab === 'export' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                Export Active Brand
                {activeTab === 'export' && <motion.div layoutId="driveTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6">
              {errorMsg && (
                <div className="mb-4 flex items-center gap-2.5 p-3 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {activeTab === 'import' ? (
                /* IMPORT WORKFLOW */
                <div className="space-y-4">
                  {/* File Search */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-zinc-500" size={15} />
                    <input
                      type="text"
                      placeholder="Search files on Google Drive..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-300 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-neutral-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {isLoadingFiles ? (
                    <div className="py-24 text-center text-neutral-400 space-y-3">
                      <RefreshCw size={24} className="animate-spin mx-auto text-indigo-600" />
                      <p className="text-xs">Browsing Google Drive files...</p>
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-neutral-100 dark:border-zinc-800 rounded-3xl space-y-3 text-neutral-400">
                      <FileCode className="w-10 h-10 mx-auto text-neutral-300 dark:text-zinc-700" />
                      <h4 className="font-bold text-sm text-neutral-700 dark:text-zinc-300">No Vector SVG Files Found</h4>
                      <p className="text-xs max-w-xs mx-auto">
                        No `.svg` files were found on your Drive. Upload some SVGs to Google Drive first or export your current active Forgel project to begin.
                      </p>
                      <button
                        onClick={handleRefresh}
                        className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1.5 cursor-pointer mt-2"
                      >
                        <RefreshCw size={12} /> Refresh List
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                        SVG Files ({filteredFiles.length})
                      </div>
                      <div className="divide-y divide-neutral-100 dark:divide-zinc-800/60 border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950">
                        {filteredFiles.map((file) => (
                          <div 
                            key={file.id} 
                            className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-zinc-900 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-indigo-50 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <FileCode size={18} />
                              </div>
                              <div className="text-left min-w-0">
                                <p className="text-xs font-bold text-neutral-800 dark:text-zinc-200 truncate pr-4">
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-neutral-400">
                                  Modified {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'recently'}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleImportFile(file)}
                              disabled={importingFileId !== null}
                              className="px-3.5 py-2 bg-neutral-900 hover:bg-indigo-600 text-white dark:bg-zinc-800 dark:hover:bg-indigo-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                            >
                              {importingFileId === file.id ? (
                                <>
                                  <RefreshCw size={13} className="animate-spin" />
                                  <span>Importing...</span>
                                </>
                              ) : (
                                <>
                                  <Download size={13} />
                                  <span>Import</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* EXPORT WORKFLOW */
                <div className="space-y-6">
                  {!activeProject ? (
                    <div className="py-16 text-center text-neutral-400 space-y-2 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-200 dark:border-zinc-900 p-6">
                      <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
                      <h4 className="font-bold text-sm text-neutral-800 dark:text-zinc-300">No Active Brand Selected</h4>
                      <p className="text-xs max-w-sm mx-auto">
                        Please open a brand project workspace from your Asset Library first to export raw vector assets or compiled guides.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 text-left">
                      {/* Active Project Card */}
                      <div className="bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-900 rounded-2xl p-5 flex items-center gap-5">
                        <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800 flex items-center justify-center p-2.5 shadow-sm shrink-0 overflow-hidden">
                          {activeProject.logoUrl ? (
                            <img src={activeProject.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <FileCode size={24} className="text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] uppercase font-black tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
                            Active Brand Space
                          </span>
                          <h4 className="font-bold text-base text-neutral-900 dark:text-white mt-1 truncate">
                            {activeProject.name}
                          </h4>
                          <p className="text-xs text-neutral-500 dark:text-zinc-400 truncate">
                            {activeProject.brandGuide?.brandVoice?.tone || 'No industry declared yet'}
                          </p>
                        </div>
                      </div>

                      {/* Export Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* SVG Export Box */}
                        <div className="bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                          <div>
                            <div className="p-2 bg-indigo-50 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit mb-4">
                              <FileCode size={20} />
                            </div>
                            <h5 className="font-bold text-sm text-neutral-900 dark:text-white mb-1">
                              Flat Vector (.svg)
                            </h5>
                            <p className="text-xs text-neutral-500 dark:text-zinc-400 leading-relaxed mb-4">
                              Upload the active raw SVG code as an isolated vector graphic to your cloud storage directory.
                            </p>

                            {/* Destination Folder Selector */}
                            <div className="mb-4 pt-3 border-t border-neutral-100 dark:border-zinc-900">
                              <label className="block text-[10px] font-black text-neutral-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                                Specific Target Folder
                              </label>
                              <input
                                type="text"
                                value={destinationFolder}
                                onChange={(e) => setDestinationFolder(e.target.value)}
                                placeholder="e.g. Forgel Logos"
                                className="w-full bg-neutral-50 dark:bg-zinc-900 border border-neutral-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-neutral-800 dark:text-zinc-200"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <button
                              onClick={() => handleExportActiveProject(false)}
                              disabled={isExporting || isExportingToFolder || !activeProject.svgSource}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-200 dark:disabled:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {isExporting ? (
                                <RefreshCw size={13} className="animate-spin" />
                              ) : (
                                <Upload size={13} />
                              )}
                              <span>
                                {activeProject.driveFileId ? 'Save (Update Linked File)' : 'Export to Root Drive'}
                              </span>
                            </button>

                            <button
                              onClick={handleExportToFolder}
                              disabled={isExporting || isExportingToFolder || !activeProject.svgSource}
                              className="w-full py-2 bg-neutral-900 dark:bg-zinc-800 text-white hover:bg-neutral-800 dark:hover:bg-zinc-700 disabled:bg-neutral-200 dark:disabled:bg-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {isExportingToFolder ? (
                                <RefreshCw size={13} className="animate-spin" />
                              ) : (
                                <Cloud size={13} className="text-indigo-400" />
                              )}
                              <span>Upload to Folder</span>
                            </button>

                            {activeProject.driveFileId && (
                              <button
                                onClick={() => handleExportActiveProject(true)}
                                disabled={isExporting || isExportingToFolder}
                                className="w-full py-1.5 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-zinc-800 rounded-xl text-[11px] font-bold transition-colors cursor-pointer text-center"
                              >
                                Export as New Root Copy
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Brand Manual Export Box */}
                        <div className="bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
                          <div>
                            <div className="p-2 bg-emerald-50 dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit mb-4">
                              <FileText size={20} />
                            </div>
                            <h5 className="font-bold text-sm text-neutral-900 dark:text-white mb-1">
                              Brand Manual (.md)
                            </h5>
                            <p className="text-xs text-neutral-500 dark:text-zinc-400 leading-relaxed mb-6">
                              Compile the generated logo rules, color swatches, typography, and voice pillars into a standard Markdown manual document.
                            </p>
                          </div>

                          <button
                            onClick={handleExportBrandGuide}
                            disabled={isExporting || !activeProject.brandGuide}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-200 dark:disabled:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isExporting ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <Upload size={13} />
                            )}
                            <span>Export Guide to Drive</span>
                          </button>
                        </div>
                      </div>

                      {/* Success Link */}
                      {exportSuccess && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900 rounded-2xl flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-400 ">
                          <span className="flex items-center gap-1.5">
                            <Check size={14} className="stroke-[3]" />
                            <span>Export succeeded! File is available in your Drive.</span>
                          </span>
                          <a
                            href={`https://drive.google.com/open?id=${exportSuccess}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                          >
                            <span>Open in Drive</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
  );
};
