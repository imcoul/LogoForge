import { useAppStore } from '../store';

export interface RefinementSuggestion {
  layoutImprovements: string[];
  vectorAdjustments: string[];
  colorAlternatives: { hex: string; name: string; usage: string }[];
  refinedLogoPrompt: string;
}

export interface BrandGuide {
  brandName: string;
  primaryColors: { hex: string; name: string; usage: string }[];
  secondaryColors: { hex: string; name: string; usage: string }[];
  typography: {
    primaryFont: string;
    secondaryFont: string;
    guidelines: string;
  };
  logoUsage: {
    clearSpace: string;
    minimumSize: string;
    doNot: string[];
  };
  brandVoice: {
    tone: string;
    keywords: string[];
    description: string;
  };
  photography: string;
  iconography: string;
  dosAndDonts: string[];
}

const getHeaders = () => {
  const customSettings = useAppStore.getState().settings;
  const customKey = customSettings?.geminiKey;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (customKey) {
    headers['x-custom-api-key'] = customKey;
  }
  return headers;
};

export const generateLogoImage = async (companyDescription: string): Promise<string> => {
  const res = await fetch('/api/gemini/generate-logo', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ companyDescription })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate logo image.");
  }
  const data = await res.json();
  return data.url;
};

export const analyzeRefinementContext = async (
  originalLogoBase64: string,
  originalLogoMimeType: string,
  contextFiles: { base64Data: string; mimeType: string; name: string }[]
): Promise<RefinementSuggestion> => {
  const res = await fetch('/api/gemini/analyze-refinement', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ originalLogoBase64, originalLogoMimeType, contextFiles })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to analyze refinement suggestions.");
  }
  return res.json();
};

export const generateBrandGuide = async (
  base64Data: string,
  mimeType: string,
  context?: string
): Promise<BrandGuide> => {
  const res = await fetch('/api/gemini/generate-brand-guide', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ base64Data, mimeType, context })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate brand guide.");
  }
  return res.json();
};

export const generateSonicPhilosophy = async (
  companyDescription: string,
  soundNames: string[]
): Promise<string> => {
  const res = await fetch('/api/gemini/generate-sonic', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ companyDescription, soundNames })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate sonic philosophy.");
  }
  const data = await res.json();
  return data.text;
};

export const generateDesignRationale = async (description: string, stage: string): Promise<string> => {
  const res = await fetch('/api/gemini/generate-rationale', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ description, stage })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate design rationale.");
  }
  const data = await res.json();
  return data.text;
};

export const generateAICriticComment = async (
  companyDescription: string,
  logoUrl?: string | null,
  role?: string
): Promise<string> => {
  const res = await fetch('/api/gemini/generate-critic', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ companyDescription, logoUrl, role })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate design critique.");
  }
  const data = await res.json();
  return data.text;
};
