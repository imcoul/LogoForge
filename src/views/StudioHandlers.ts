import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, Project, Mockup } from '../store';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  generateLogoImage,
  generateBrandGuide,
  analyzeRefinementContext,
  generateSonicPhilosophy,
  generateDesignRationale,
  analyzeCompetitor,
  generateEcosystemAsset,
} from '../services/geminiService';
import { syncProjectToPostgres, syncProjectToSupabase } from '../utils/dbBackupClient';
import { useToast } from '../components/Toast';

export type StudioTab = 'preview' | 'draw' | 'precision' | 'mockups' | 'guide' | 'refine' | 'sonic' | 'competitor' | 'ecosystem';
export type WorkspaceType = 'sandbox' | 'workbench' | 'identity' | 'strategy';
export type SandboxSubTab = 'preview' | 'prompt' | 'rationales' | 'critic';
export type WorkbenchSubTab = 'sketch' | 'precision' | 'versions';
export type IdentitySubTab = 'guidelines' | 'compliance' | 'sonic';
export type StrategySubTab = 'rivals' | 'ecosystem';

export function useStudioHandlers() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const {
    projects,
    activeProjectId,
    updateProject,
    settings,
    updateSettings,
    undo,
    redo,
  } = useAppStore();

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  // Local Studio States
  const [mode, setMode] = useState<'create' | 'upload'>('create');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingSonic, setIsGeneratingSonic] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);
  const [isGeneratingRationale, setIsGeneratingRationale] = useState(false);
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [isR2VModalOpen, setIsR2VModalOpen] = useState(false);

  // Acoustic Synthesizer states
  const [synthWaveType, setSynthWaveType] = useState<OscillatorType>('sine');
  const [synthADSR, setSynthADSR] = useState({
    attack: 0.1,
    decay: 0.3,
    sustain: 0.5,
    release: 0.8,
  });
  const [isSynthPlaying, setIsSynthPlaying] = useState(false);
  const [synthRippleIntensity, setSynthRippleIntensity] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType>('sandbox');
  const [sandboxSubTab, setSandboxSubTab] = useState<SandboxSubTab>('preview');
  const [workbenchSubTab, setWorkbenchSubTab] = useState<WorkbenchSubTab>('sketch');
  const [identitySubTab, setIdentitySubTab] = useState<IdentitySubTab>('guidelines');
  const [strategySubTab, setStrategySubTab] = useState<StrategySubTab>('rivals');
  const [activeTab, setActiveTab] = useState<StudioTab>('preview');
  const [isCollabDrawerOpen, setIsCollabDrawerOpen] = useState(false);

  // Sandbox inputs
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [creativeDirection, setCreativeDirection] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Collaboration state
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [activeUsers, setActiveUsers] = useState<{ id: string; username: string; color: string }[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { username: string; color: string; x: number; y: number }>>({});
  const [username] = useState<string>(() => 'Editor_' + Math.random().toString(36).substring(2, 6));

  // Autosave Telemetry state
  const [saveLatencyMs, setSaveLatencyMs] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Web Worker performance state
  const [worker, setWorker] = useState<Worker | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<{ frameTimeMs: number; opsPerSec: number } | null>(null);

  // Snapshot/Notes states
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [isAddingSticky, setIsAddingSticky] = useState(false);
  const [stickyNoteText, setStickyNoteText] = useState('');
  const [selectedStickyColor, setSelectedStickyColor] = useState('#FDE047');

  // Competitor/Ecosystem States
  const [competitorNameInput, setCompetitorNameInput] = useState('');
  const [competitorLogoUrlInput, setCompetitorLogoUrlInput] = useState<string | null>(null);
  const [isAnalyzingCompetitor, setIsAnalyzingCompetitor] = useState(false);
  const [ecosystemAssetType, setEcosystemAssetType] = useState('Instagram Post Caption');
  const [isGeneratingEcosystem, setIsGeneratingEcosystem] = useState(false);

  // View Layout state
  const [fullscreen, setFullscreen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [criticRole, setCriticRole] = useState('Senior Art Director 🎨');
  const [isCriticLoading, setIsCriticLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copiedColorHex, setCopiedColorHex] = useState<string | null>(null);
  const [mockupTab, setMockupTab] = useState<'templates' | 'uploaded'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<'card' | 'splash' | 'billboard'>('card');
  const [cardBg, setCardBg] = useState<'cream' | 'charcoal' | 'forest'>('cream');

  const [mockupRotateX, setMockupRotateX] = useState<number>(15);
  const [mockupRotateY, setMockupRotateY] = useState<number>(-20);
  const [mockupRotateZ, setMockupRotateZ] = useState<number>(5);
  const [mockupScale, setMockupScale] = useState<number>(1.0);
  const [mockupPerspective, setMockupPerspective] = useState<number>(1200);
  const [mockupBlendMode, setMockupBlendMode] = useState<'normal' | 'multiply' | 'screen' | 'overlay' | 'difference' | 'color-dodge'>('normal');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const refineInputRef = useRef<HTMLInputElement>(null);
  const sonicInputRef = useRef<HTMLInputElement>(null);
  const cursorRafRef = useRef<number | null>(null);

  const activeProjectRef = useRef(activeProject);
  const activeProjectIdRef = useRef(activeProjectId);

  useEffect(() => {
    activeProjectRef.current = activeProject;
    activeProjectIdRef.current = activeProjectId;
  }, [activeProject, activeProjectId]);

  useEffect(() => {
    if (activeProject && description !== activeProject.description) {
      setDescription(activeProject.description || '');
    }
  }, [activeProject?.id]);

  // Synchronize and mirror updates
  const handleGhostSync = (ghostData: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'ghost_sync',
          ghostData,
        })
      );
    }
  };

  const handleUpdateAndSync = async (updates: Partial<Project>, throttleCloud?: boolean) => {
    if (!activeProjectId) return;
    const start = performance.now();
    setIsSaving(true);

    let nextUpdates = { ...updates };
    if (updates.svgSource && updates.svgSource !== activeProject?.svgSource) {
      const history = activeProject?.logoHistory || [];
      if (activeProject?.svgSource) {
        nextUpdates.logoHistory = [...history, activeProject.svgSource];
      }
      nextUpdates.logoUrl = `data:image/svg+xml;utf8,${encodeURIComponent(updates.svgSource)}`;
    }

    await updateProject(activeProjectId, nextUpdates, throttleCloud);

    const duration = performance.now() - start;
    setSaveLatencyMs(parseFloat(duration.toFixed(2)));
    setTimeout(() => setIsSaving(false), 800);

    const mergedProject = {
      ...activeProject,
      ...nextUpdates,
      updatedAt: Date.now(),
    } as Project;

    // Trigger Cloud Backups/Mirrors
    if (!throttleCloud) {
      if (settings.backupMode === 'postgres' || settings.backupMode === 'both') {
        syncProjectToPostgres(mergedProject, settings.postgresConnectionString).then((res) => {
          if (!res.success) {
            console.warn('Postgres Backup Failed:', res.message);
          }
        });
      }
      if (settings.backupMode === 'supabase' || settings.backupMode === 'both') {
        syncProjectToSupabase(mergedProject, settings.supabaseUrl, settings.supabaseAnonKey).then((res) => {
          if (!res.success) {
            console.warn('Supabase Backup Failed:', res.message);
          }
        });
      }
    }

    // Broadcast sync
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'sync',
          projectState: mergedProject,
        })
      );
    }
  };

  // Undo svg drawing node
  const handleUndoLogo = () => {
    if (!activeProject || !activeProject.logoHistory || activeProject.logoHistory.length === 0) return;
    const history = [...activeProject.logoHistory];
    const prevSvg = history.pop();
    if (prevSvg) {
      const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(prevSvg)}`;
      updateProject(activeProjectId!, {
        svgSource: prevSvg,
        logoUrl: dataUrl,
        logoHistory: history,
      });
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'sync',
            projectState: {
              ...activeProject,
              svgSource: prevSvg,
              logoUrl: dataUrl,
              logoHistory: history,
            },
          })
        );
      }
    }
  };

  // Web Worker performance
  useEffect(() => {
    const workerCode = `
      self.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'BENCHMARK_RENDER') {
          const start = performance.now();
          let sum = 0;
          for (let i = 0; i < 5000000; i++) {
            sum += Math.sin(i) * Math.cos(i);
          }
          const duration = performance.now() - start;
          self.postMessage({
            type: 'BENCHMARK_RESULT',
            payload: {
              frameTimeMs: parseFloat(duration.toFixed(2)),
              opsPerSec: Math.round(5000000 / (duration / 1000)),
              sum
            }
          });
        }
        if (type === 'GRADE_COLORS') {
          const { colors, filterType } = payload;
          const graded = colors.map((color) => {
            let r = parseInt(color.hex.slice(1, 3), 16);
            let g = parseInt(color.hex.slice(3, 5), 16);
            let b = parseInt(color.hex.slice(5, 7), 16);
            if (filterType === 'warm') {
              r = Math.min(255, r * 1.15);
              b = Math.max(0, b * 0.85);
            } else if (filterType === 'cool') {
              b = Math.min(255, b * 1.2);
              r = Math.max(0, r * 0.85);
            } else if (filterType === 'brutalist') {
              r = r > 128 ? 255 : 0;
              g = g > 128 ? 255 : 0;
              b = b > 128 ? 255 : 0;
            } else if (filterType === 'cinematic') {
              r = Math.round(r * 0.9 + 10);
              g = Math.round(g * 0.95 + 15);
              b = Math.round(b * 1.05 + 20);
            }
            const toHex = (val) => {
              const hex = Math.round(val).toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            };
            return { ...color, hex: "#" + toHex(r) + toHex(g) + toHex(b) };
          });
          self.postMessage({ type: 'GRADED_RESULT', payload: { gradedColors: graded, filterType } });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerInstance = new Worker(URL.createObjectURL(blob));

    workerInstance.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'BENCHMARK_RESULT') {
        setBenchmarkResult(payload);
      } else if (type === 'GRADED_RESULT') {
        const currentActiveProjectId = activeProjectIdRef.current;
        const currentActiveProject = activeProjectRef.current;
        if (currentActiveProjectId && currentActiveProject) {
          const updatedGuide = currentActiveProject.brandGuide
            ? {
                ...currentActiveProject.brandGuide,
                primaryColors: payload.gradedColors.filter((c: any) => c.category === 'primary'),
                secondaryColors: payload.gradedColors.filter((c: any) => c.category === 'secondary'),
              }
            : null;
          handleUpdateAndSync({ brandGuide: updatedGuide as any });
        }
      }
    };

    setWorker(workerInstance);
    return () => {
      workerInstance.terminate();
    };
  }, []);

  // WebSocket Collaborative Sync Effect
  useEffect(() => {
    if (!activeProjectId) {
      if (socket) {
        socket.close();
        setSocket(null);
      }
      return;
    }

    let ws: WebSocket | null = null;
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws-collab`;
      console.log('[Collab] Opening WebSocket connection:', wsUrl);

      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        console.log('[Collab] Connected to server sync.');
        ws!.send(
          JSON.stringify({
            type: 'join',
            roomId: activeProjectId,
            username,
            projectState: activeProjectRef.current,
            authToken: 'dev_token',
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'error') {
            console.error('[Collab] Server Error:', msg.message);
            return;
          }
          if (msg.type === 'welcome') {
            setActiveUsers(msg.activeUsers || []);
            if (msg.projectState) {
              updateProject(activeProjectId, msg.projectState, 'skip');
            }
          } else if (msg.type === 'user_joined') {
            setActiveUsers(msg.activeUsers || []);
          } else if (msg.type === 'user_left') {
            setActiveUsers(msg.activeUsers || []);
            setRemoteCursors((prev) => {
              const next = { ...prev };
              delete next[msg.userId];
              return next;
            });
          } else if (msg.type === 'sync') {
            if (msg.projectState) {
              updateProject(activeProjectId, msg.projectState, 'skip');
            }
          } else if (msg.type === 'ghost_sync') {
            const store = useAppStore.getState();
            store.setEphemeralGhost(msg.senderId, msg.ghostData);
            // Clear ghost after 500ms of inactivity
            setTimeout(() => {
              store.clearEphemeralGhost(msg.senderId);
            }, 500);
          } else if (msg.type === 'cursor') {
            setRemoteCursors((prev) => ({
              ...prev,
              [msg.userId]: {
                username: msg.username,
                color: msg.color,
                x: msg.x,
                y: msg.y,
              },
            }));
          }
        } catch (e) {
          console.error('[Collab] WS parse error:', e);
        }
      };

      setSocket(ws);
    };

    connect();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [activeProjectId]);

  // Audio / Sound synthesizer context
  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const triggerVoice = (frequency: number, duration: number = 0.5) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();

      osc.type = synthWaveType;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      filterNode.type = 'lowpass';
      if (synthWaveType === 'sine') {
        filterNode.frequency.setValueAtTime(1200, ctx.currentTime);
      } else if (synthWaveType === 'triangle') {
        filterNode.frequency.setValueAtTime(1400, ctx.currentTime);
      } else if (synthWaveType === 'sawtooth') {
        filterNode.frequency.setValueAtTime(1000, ctx.currentTime);
      } else {
        filterNode.frequency.setValueAtTime(800, ctx.currentTime);
      }

      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.4, now + synthADSR.attack);

      const sustainLevel = Math.max(synthADSR.sustain * 0.4, 0.001);
      gainNode.gain.setValueAtTime(0.4, now + synthADSR.attack);
      gainNode.gain.exponentialRampToValueAtTime(sustainLevel, now + synthADSR.attack + synthADSR.decay);

      osc.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);

      const releaseStart = now + synthADSR.attack + synthADSR.decay + duration;
      gainNode.gain.setValueAtTime(sustainLevel, releaseStart);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseStart + synthADSR.release);

      osc.stop(releaseStart + synthADSR.release);

      setSynthRippleIntensity((prev) => Math.min(prev + 1, 5));
      setTimeout(() => {
        setSynthRippleIntensity((prev) => Math.max(prev - 1, 0));
      }, (synthADSR.attack + synthADSR.decay + duration + synthADSR.release) * 1000);
    } catch (err) {
      console.error('Synthesizer Voice allocation error:', err);
    }
  };

  const playBrandMelody = () => {
    if (isSynthPlaying) return;
    setIsSynthPlaying(true);

    const notes = [
      { freq: 261.63, delay: 0.0, dur: 0.8 }, // C4
      { freq: 329.63, delay: 0.15, dur: 0.8 }, // E4
      { freq: 392.0, delay: 0.3, dur: 0.8 }, // G4
      { freq: 523.25, delay: 0.45, dur: 1.2 }, // C5
      { freq: 659.25, delay: 0.6, dur: 1.2 }, // E5
    ];

    notes.forEach((note) => {
      setTimeout(() => {
        triggerVoice(note.freq, note.dur);
      }, note.delay * 1000);
    });

    const totalDur = (0.6 + 1.2 + synthADSR.release) * 1000;
    setTimeout(() => {
      setIsSynthPlaying(false);
    }, totalDur);
  };

  const applySynthPreset = (presetName: 'bell' | 'pad' | 'retro') => {
    if (presetName === 'bell') {
      setSynthWaveType('sine');
      setSynthADSR({ attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.5 });
    } else if (presetName === 'pad') {
      setSynthWaveType('triangle');
      setSynthADSR({ attack: 0.6, decay: 0.8, sustain: 0.7, release: 1.5 });
    } else if (presetName === 'retro') {
      setSynthWaveType('square');
      setSynthADSR({ attack: 0.02, decay: 0.1, sustain: 0.4, release: 0.2 });
    }
    toast(`Applied acoustic preset: ${presetName.toUpperCase()}`, 'success');
  };

  // Actions
  const handleGenerateLogo = async () => {
    if (!description.trim()) {
      setError('Please describe your company before generating.');
      return;
    }
    if (!activeProjectId) return;
    try {
      setIsGenerating(true);
      setError(null);
      const url = await generateLogoImage(description);
      await updateProject(activeProjectId, {
        logoUrl: url,
        logoMimeType: 'image/png',
        brandGuide: null,
        description: description,
        name: description.split(' ').slice(0, 3).join(' ') + ' Logo',
      });
      setActiveTab('preview');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the logo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVariation = async () => {
    if (!activeProject || !activeProject.description) {
      toast('No description found to base the variation on.', 'error');
      return;
    }
    try {
      setIsGeneratingVariation(true);
      setError(null);
      const url = await generateLogoImage(activeProject.description, true);
      await updateProject(activeProject.id, { logoUrl: url, logoMimeType: 'image/png' });
      toast('Logo variation generated successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to generate variation.', 'error');
    } finally {
      setIsGeneratingVariation(false);
    }
  };

  const handleGenerateGuide = async () => {
    if (!activeProject?.logoUrl || !activeProjectId) return;
    try {
      setIsGeneratingGuide(true);
      setError(null);
      const base64Data = activeProject.logoUrl.split(',')[1];
      const mimeTypeMatch = activeProject.logoUrl.match(/data:(.*?);/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : activeProject.logoMimeType;

      const context = activeProject.description || undefined;
      const guide = await generateBrandGuide(base64Data, mimeType, context, 'complete');
      await updateProject(activeProjectId, { brandGuide: guide });
      setActiveTab('guide');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate brand guide.');
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  const handleRefineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject?.logoUrl || !activeProjectId) return;

    try {
      setIsRefining(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        const newFiles = [
          ...activeProject.refinementFiles,
          {
            name: file.name,
            base64Data: fileData.split(',')[1],
            mimeType: file.type || 'application/octet-stream',
          },
        ];

        await updateProject(activeProjectId, { refinementFiles: newFiles });

        const logoBase64 = activeProject.logoUrl!.split(',')[1];
        const logoMime = activeProject.logoMimeType;

        const suggestions = await analyzeRefinementContext(logoBase64, logoMime, newFiles);
        await updateProject(activeProjectId, { refinementSuggestions: suggestions });
        setIsRefining(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze refinement context.');
      setIsRefining(false);
    }
  };

  const applyRefinedPrompt = async () => {
    if (!activeProject?.refinementSuggestions?.refinedLogoPrompt || !activeProjectId) return;

    try {
      setIsGenerating(true);
      setError(null);
      setActiveTab('preview');

      const url = await generateLogoImage(activeProject.refinementSuggestions.refinedLogoPrompt);
      await updateProject(activeProjectId, {
        logoUrl: url,
        description: activeProject.refinementSuggestions.refinedLogoPrompt,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate refined logo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSonicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;

    try {
      setIsGeneratingSonic(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;

        const newAssets = [
          ...(activeProject?.sonicAssets || []),
          {
            name: file.name,
            base64Data: fileData,
            mimeType: file.type || 'audio/mp3',
          },
        ];

        await updateProject(activeProjectId, { sonicAssets: newAssets });

        const soundNames = newAssets.map((a) => a.name);
        const philosophy = await generateSonicPhilosophy(
          activeProject?.description || activeProject?.name || 'Brand',
          soundNames
        );
        await updateProject(activeProjectId, { sonicPhilosophy: philosophy });
        setIsGeneratingSonic(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate sonic philosophy.');
      setIsGeneratingSonic(false);
    }
  };

  const handleAnalyzeCompetitor = async () => {
    if (!activeProject || !competitorNameInput) return;
    setIsAnalyzingCompetitor(true);
    try {
      const analysis = await analyzeCompetitor(
        activeProject.description || activeProject.name,
        competitorNameInput,
        competitorLogoUrlInput || undefined
      );
      handleUpdateAndSync({ competitorAnalysis: analysis });
      toast('Competitor analysis complete.', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to analyze competitor', 'error');
    } finally {
      setIsAnalyzingCompetitor(false);
    }
  };

  const handleGenerateEcosystem = async () => {
    if (!activeProject || !activeProject.brandGuide) {
      toast('You need a generated Brand Guide first.', 'error');
      return;
    }
    setIsGeneratingEcosystem(true);
    try {
      const content = await generateEcosystemAsset(activeProject.brandGuide, ecosystemAssetType);
      const newAsset = { type: ecosystemAssetType, content };
      const currentAssets = activeProject.ecosystemAssets || [];
      handleUpdateAndSync({ ecosystemAssets: [newAsset, ...currentAssets] });
      toast('Ecosystem asset generated.', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to generate ecosystem asset', 'error');
    } finally {
      setIsGeneratingEcosystem(false);
    }
  };

  const handleMockupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId || !activeProject) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      const newMockup: Mockup = {
        id: crypto.randomUUID(),
        name: file.name,
        base64Data,
        mimeType: file.type || 'image/png',
      };
      updateProject(activeProjectId, { mockups: [...activeProject.mockups, newMockup] });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateRationale = async () => {
    if (!activeProject) return;
    setIsGeneratingRationale(true);
    setRationale(null);
    try {
      const text = await generateDesignRationale(activeProject.description, activeProject.stage);
      setRationale(text);
    } catch (err) {
      console.error(err);
      setError('Failed to generate rationale.');
    } finally {
      setIsGeneratingRationale(false);
    }
  };

  const handleDownloadSVG = () => {
    if (!activeProject) return;
    const svgContent =
      activeProject.svgSource ||
      `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="50" fill="#4F46E5"/></svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
    a.click();
  };

  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColorHex(hex);
    setTimeout(() => setCopiedColorHex(null), 2000);
  };

  const handleDownloadBrandGuide = () => {
    if (!activeProject?.brandGuide) return;
    const guide = activeProject.brandGuide;
    const text = `# Brand Identity Guidelines: ${guide.brandName}

## Primary Colors
${guide.primaryColors.map((c) => `- ${c.name}: ${c.hex} (${c.usage})`).join('\n')}

## Secondary Colors
${guide.secondaryColors.map((c) => `- ${c.name}: ${c.hex} (${c.usage})`).join('\n')}

## Typography
- Primary Font: ${guide.typography.primaryFont}
- Secondary Font: ${guide.typography.secondaryFont}
- Guidelines: ${guide.typography.guidelines}

## Brand Voice & Tone
- Tone: ${guide.brandVoice.tone}
- Keywords: ${guide.brandVoice.keywords.join(', ')}
- Description: ${guide.brandVoice.description}

## Photography Style
${guide.photography}

## Iconography Style
${guide.iconography}

## Do's and Don'ts
${guide.dosAndDonts.map((rule) => `- ${rule}`).join('\n')}
`;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${guide.brandName.replace(/\s+/g, '_')}_brand_guide.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    // States
    activeProject,
    activeProjectId,
    mode,
    setMode,
    description,
    setDescription,
    isGenerating,
    isGeneratingVariation,
    isGeneratingGuide,
    isRefining,
    isGeneratingSonic,
    rationale,
    isGeneratingRationale,
    isVectorizing,
    isR2VModalOpen,
    setIsR2VModalOpen,
    synthWaveType,
    setSynthWaveType,
    synthADSR,
    setSynthADSR,
    isSynthPlaying,
    synthRippleIntensity,
    activeWorkspace,
    setActiveWorkspace,
    sandboxSubTab,
    setSandboxSubTab,
    workbenchSubTab,
    setWorkbenchSubTab,
    identitySubTab,
    setIdentitySubTab,
    strategySubTab,
    setStrategySubTab,
    activeTab,
    setActiveTab,
    isCollabDrawerOpen,
    setIsCollabDrawerOpen,
    brandName,
    setBrandName,
    industry,
    setIndustry,
    creativeDirection,
    setCreativeDirection,
    error,
    setError,
    socket,
    handleGhostSync,
    activeUsers,
    remoteCursors,
    username,
    saveLatencyMs,
    isSaving,
    worker,
    benchmarkResult,
    newSnapshotName,
    setNewSnapshotName,
    isAddingSticky,
    setIsAddingSticky,
    stickyNoteText,
    setStickyNoteText,
    selectedStickyColor,
    setSelectedStickyColor,
    competitorNameInput,
    setCompetitorNameInput,
    competitorLogoUrlInput,
    setCompetitorLogoUrlInput,
    isAnalyzingCompetitor,
    ecosystemAssetType,
    setEcosystemAssetType,
    isGeneratingEcosystem,
    fullscreen,
    setFullscreen,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    criticRole,
    setCriticRole,
    isCriticLoading,
    setIsCriticLoading,
    commentText,
    setCommentText,
    copiedColorHex,
    mockupTab,
    setMockupTab,
    selectedTemplate,
    setSelectedTemplate,
    cardBg,
    setCardBg,
    mockupRotateX,
    setMockupRotateX,
    mockupRotateY,
    setMockupRotateY,
    mockupRotateZ,
    setMockupRotateZ,
    mockupScale,
    setMockupScale,
    mockupPerspective,
    setMockupPerspective,
    mockupBlendMode,
    setMockupBlendMode,

    // Refs
    fileInputRef,
    refineInputRef,
    sonicInputRef,
    cursorRafRef,

    // Handlers
    handleUpdateAndSync,
    handleUndoLogo,
    playBrandMelody,
    applySynthPreset,
    handleGenerateLogo,
    handleGenerateVariation,
    handleGenerateGuide,
    handleRefineUpload,
    applyRefinedPrompt,
    handleSonicUpload,
    handleAnalyzeCompetitor,
    handleGenerateEcosystem,
    handleMockupUpload,
    handleGenerateRationale,
    handleDownloadSVG,
    handleCopyColor,
    handleDownloadBrandGuide,
  };
}
