import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { Command } from '../types';

function handleAIError(res: express.Response, err: any, customMessage = "An internal server error occurred during AI generation.") {
  const errMsg = err?.message || String(err);
  const isQuota = errMsg.includes('quota') || 
                  errMsg.includes('Quota exceeded') || 
                  errMsg.includes('RESOURCE_EXHAUSTED') || 
                  (err?.status === 429) ||
                  JSON.stringify(err).includes('RESOURCE_EXHAUSTED') ||
                  JSON.stringify(err).includes('Quota exceeded');
                  
  if (isQuota) {
    return res.status(429).json({ 
      error: "Gemini API Quota Exceeded. You have exceeded the free tier rate limits. Please try again later or add your own Gemini API Key in Settings > Secrets to resume immediately." 
    });
  }
  return res.status(500).json({ error: customMessage, details: errMsg });
}

const router = express.Router();

// Startup validation contract for free models
console.log("==========================================");
console.log("=== Connected Models Startup Validation ===");
const keysToValidate = {
  STEPFUN_API_KEY: process.env.STEPFUN_API_KEY,
  POOLSIDE_API_KEY: process.env.POOLSIDE_API_KEY,
  TENCENT_API_KEY: process.env.TENCENT_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};
Object.entries(keysToValidate).forEach(([key, val]) => {
  if (val) {
    console.log(`[Startup] Validation: ${key} is CONFIGURED (${val.substring(0, 4)}...${val.substring(val.length - 4)})`);
  } else {
    console.warn(`[Startup] Validation Warning: ${key} is MISSING`);
  }
});
console.log("==========================================");

const getClient = (req: express.Request) => {
  const customKey = req.headers['x-custom-api-key'] as string;
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API key not configured");
  }
  return new GoogleGenAI({ apiKey });
};

// Unified custom LLM call executor supporting OpenAI-compatible formats
async function callCustomModel(
  apiKey: string,
  endpoint: string,
  modelName: string,
  options: {
    prompt: string;
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
    inlineData?: { data: string; mimeType: string };
    inlineDataArray?: { data: string; mimeType: string }[];
  }
): Promise<{ text: string }> {
  const messages: any[] = [];
  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }

  let userContent: any = options.prompt;
  if (options.inlineData || options.inlineDataArray) {
    // Create OpenAI compatible vision payload
    const contentList: any[] = [{ type: 'text', text: options.prompt }];
    if (options.inlineData) {
      contentList.push({
        type: 'image_url',
        image_url: { url: `data:${options.inlineData.mimeType};base64,${options.inlineData.data}` }
      });
    }
    if (options.inlineDataArray) {
      options.inlineDataArray.forEach((item) => {
        contentList.push({
          type: 'image_url',
          image_url: { url: `data:${item.mimeType};base64,${item.data}` }
        });
      });
    }
    userContent = contentList;
  }

  messages.push({ role: 'user', content: userContent });

  const body: any = {
    model: modelName,
    messages,
    temperature: 0.2,
  };

  if (options.responseMimeType === 'application/json') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data: any = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Failed to call custom model ${modelName}`);
  }

  const textContent = data.choices?.[0]?.message?.content;
  if (!textContent) {
    throw new Error(`Empty response from model ${modelName}`);
  }

  return { text: textContent };
}

// Unified helper supporting standard Gemini client and third-party custom LLMs
import { modelRegistry } from "../config/modelRegistry";

function getPromptHash(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    hash = (hash << 5) - hash + prompt.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function getGenerationMetadata(modelId: string, modelName: string, prompt: string, temperature = 0.2) {
  return {
    model: {
      id: modelId,
      name: modelRegistry[modelId]?.name || modelId,
      version: modelName,
      promptHash: getPromptHash(prompt),
      temperature
    },
    generationId: Math.random().toString(36).substring(2, 15)
  };
}

async function generateAIContent(
  req: express.Request,
  options: {
    model: string;
    prompt: string;
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
    inlineData?: { data: string; mimeType: string };
    inlineDataArray?: { data: string; mimeType: string }[];
  }
): Promise<{ text: string; _meta?: any }> {
  const modelPreference = (
    req.headers['x-model-preference'] as string || 
    req.headers['x-active-model'] as string || 
    'gemini'
  ).toLowerCase();

  let activeModel = modelPreference;
  let activeEntry = modelRegistry[activeModel] || modelRegistry.gemini;

  // Feature Flag gating check
  if (activeModel !== 'gemini' && process.env[activeEntry.featureFlagKey] === 'false') {
    console.warn(`[Feature Gate] Model ${activeModel} is currently disabled via feature flag (${activeEntry.featureFlagKey}=false). Gating and falling back to Gemini...`);
    activeModel = 'gemini';
    activeEntry = modelRegistry.gemini;
  }

  // Validate API Key presence
  const apiKey = activeModel === 'gemini' 
    ? (req.headers['x-custom-api-key'] as string || process.env.GEMINI_API_KEY || '')
    : (req.headers[`x-${activeModel}-key`] as string || process.env[activeEntry.envKey] || '');

  if (activeModel !== 'gemini' && !apiKey) {
    console.warn(`[Key Validation] API key for custom model '${activeModel}' is missing. Automatically falling back to Gemini...`);
    activeModel = 'gemini';
    activeEntry = modelRegistry.gemini;
  }

  if (activeModel && activeModel !== 'gemini') {
    let endpoint = '';
    let modelName = '';

    if (activeModel === 'stepfun') {
      endpoint = req.headers['x-stepfun-endpoint'] as string || activeEntry.endpoint;
      modelName = activeEntry.defaultModelName;
    } else if (activeModel === 'poolside') {
      endpoint = req.headers['x-poolside-endpoint'] as string || activeEntry.endpoint;
      modelName = activeEntry.defaultModelName;
    } else if (activeModel === 'tencent') {
      endpoint = req.headers['x-tencent-endpoint'] as string || activeEntry.endpoint;
      modelName = activeEntry.defaultModelName;
    }

    try {
      console.log(`[Generation] Invoking custom model: ${activeModel} (${modelName})`);
      const result = await callCustomModel(apiKey, endpoint, modelName, options);
      const meta = getGenerationMetadata(activeModel, modelName, options.prompt);
      return { text: result.text, _meta: meta };
    } catch (err: any) {
      console.error(`[Fallback Trigger] Primary custom model ${activeModel} failed:`, err.message || err);
      console.warn(`[Fallback] Quota exceeded or error returned by ${activeModel}. Initiating automatic fallback to Gemini...`);
      activeModel = 'gemini';
      activeEntry = modelRegistry.gemini;
    }
  }

  // Gemini Client call / Fallback implementation
  const client = getClient(req);
  const contentsParts: any[] = [{ text: options.prompt }];
  if (options.inlineData) {
    contentsParts.push({ inlineData: options.inlineData });
  }
  if (options.inlineDataArray) {
    options.inlineDataArray.forEach((item) => {
      contentsParts.push({ inlineData: item });
    });
  }

  let modelToUse = options.model;
  let response;
  try {
    response = await client.models.generateContent({
      model: modelToUse,
      contents: { parts: contentsParts },
      config: {
        systemInstruction: options.systemInstruction,
        responseMimeType: options.responseMimeType,
        responseSchema: options.responseSchema,
      } as any,
    });
    const meta = getGenerationMetadata('gemini', modelToUse, options.prompt);
    return { text: response.text || '', _meta: meta };
  } catch (err: any) {
    const isQuotaError = err?.status === 429 || 
                         err?.message?.includes('quota') || 
                         err?.message?.includes('RESOURCE_EXHAUSTED') || 
                         err?.message?.includes('Quota exceeded') ||
                         JSON.stringify(err)?.includes('RESOURCE_EXHAUSTED') ||
                         JSON.stringify(err)?.includes('Quota exceeded');
                         
    if (isQuotaError) {
      const stepfunKey = req.headers['x-stepfun-key'] as string || process.env.STEPFUN_API_KEY || '';
      const poolsideKey = req.headers['x-poolside-key'] as string || process.env.POOLSIDE_API_KEY || '';
      const tencentKey = req.headers['x-tencent-key'] as string || process.env.TENCENT_API_KEY || '';

      if (stepfunKey && process.env.ENABLE_STEPFUN !== 'false') {
        console.warn(`[Gemini] Quota exceeded on ${modelToUse}. Falling back to connected StepFun free model preset...`);
        try {
          const endpoint = req.headers['x-stepfun-endpoint'] as string || 'https://api.stepfun.com/v1/chat/completions';
          const result = await callCustomModel(stepfunKey, endpoint, 'step-3.7-flash', options);
          const meta = getGenerationMetadata('stepfun', 'step-3.7-flash', options.prompt);
          return { text: result.text, _meta: meta };
        } catch (fallbackErr) {
          console.error(`[Fallback] StepFun fallback failed:`, fallbackErr);
        }
      }
      
      if (poolsideKey && process.env.ENABLE_POOLSIDE !== 'false') {
        console.warn(`[Gemini] Quota exceeded on ${modelToUse}. Falling back to connected Poolside free model preset...`);
        try {
          const endpoint = req.headers['x-poolside-endpoint'] as string || 'https://api.poolside.ai/v1/chat/completions';
          const result = await callCustomModel(poolsideKey, endpoint, 'laguna-m.1', options);
          const meta = getGenerationMetadata('poolside', 'laguna-m.1', options.prompt);
          return { text: result.text, _meta: meta };
        } catch (fallbackErr) {
          console.error(`[Fallback] Poolside fallback failed:`, fallbackErr);
        }
      }

      if (tencentKey && process.env.ENABLE_TENCENT !== 'false') {
        console.warn(`[Gemini] Quota exceeded on ${modelToUse}. Falling back to connected Tencent free model preset...`);
        try {
          const endpoint = req.headers['x-tencent-endpoint'] as string || 'https://api.hunyuan.tencent.com/v1/chat/completions';
          const result = await callCustomModel(tencentKey, endpoint, 'hy3', options);
          const meta = getGenerationMetadata('tencent', 'hy3', options.prompt);
          return { text: result.text, _meta: meta };
        } catch (fallbackErr) {
          console.error(`[Fallback] Tencent fallback failed:`, fallbackErr);
        }
      }

      if (modelToUse !== 'gemini-3.5-flash') {
        console.warn(`[Gemini] Quota exceeded for model ${modelToUse}. Retrying fallback with free gemini-3.5-flash...`);
        modelToUse = 'gemini-3.5-flash';
        response = await client.models.generateContent({
          model: modelToUse,
          contents: { parts: contentsParts },
          config: {
            systemInstruction: options.systemInstruction,
            responseMimeType: options.responseMimeType,
            responseSchema: options.responseSchema,
          } as any,
        });
        const meta = getGenerationMetadata('gemini', 'gemini-3.5-flash', options.prompt);
        return { text: response.text || '', _meta: meta };
      }
    }

    throw err;
  }
}

router.post("/interpreter", async (req, res) => {
  try {
    const { userCommand, sceneGraph } = req.body;
    const prompt = `Parse the following user command: "${userCommand}" into a structured Command object (op, nodeId, etc). Current scene graph: ${JSON.stringify(sceneGraph)}. Return ONLY a JSON object matching the Command type. If ambiguous, assume sensible defaults.`;

    const response = await generateAIContent(req, {
      model: 'gemini-3.1-pro-preview',
      prompt,
      responseMimeType: "application/json"
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      res.json({
        ...parsed,
        _meta: response._meta
      });
    } else {
      throw new Error("No command generated");
    }
  } catch (err: any) {
    console.error(err);
    handleAIError(res, err, "Command interpretation failed.");
  }
});

router.post("/generate-logo", async (req, res) => {
  try {
    const { companyDescription, isVariation } = req.body;
    const client = getClient(req);
    let prompt = `A professional, minimalist, scalable vector-style logo design based on this company description: "${companyDescription}". The logo MUST be isolated on a pure white background. Flat colors, clear simple shapes, negative space. No complex realistic details, no text. Perfect for a startup identity.`;
    
    if (isVariation) {
        prompt = `Generate a creative variation of a professional, minimalist vector-style logo for: "${companyDescription}". Explore a different layout, distinct visual metaphor, alternative shape geometry, and new color harmony while honoring the original brief. The logo MUST be isolated on a pure white background. Flat colors, clear simple shapes. No complex realistic details, no text.`;
    }
    
    let modelToUse = 'gemini-2.5-flash-image';
    let response;
    try {
      response = await client.models.generateContent({
        model: modelToUse,
        contents: { parts: [{ text: prompt }] },
        config: {
          outputMimeType: "image/png",
          aspectRatio: "1:1",
          personGeneration: "DONT_ALLOW"
        } as any
      });
    } catch (err: any) {
      const isQuotaError = err?.status === 429 || 
                           err?.message?.includes('quota') || 
                           err?.message?.includes('RESOURCE_EXHAUSTED') || 
                           err?.message?.includes('Quota exceeded') ||
                           JSON.stringify(err)?.includes('RESOURCE_EXHAUSTED') ||
                           JSON.stringify(err)?.includes('Quota exceeded');
                           
      if (isQuotaError) {
        console.warn(`[Gemini] Logo image generation hit quota on ${modelToUse}. Falling back to gemini-3.1-flash-lite-image...`);
        modelToUse = 'gemini-3.1-flash-lite-image';
        response = await client.models.generateContent({
          model: modelToUse,
          contents: { parts: [{ text: prompt }] },
          config: {
            outputMimeType: "image/png",
            aspectRatio: "1:1",
            personGeneration: "DONT_ALLOW"
          } as any
        });
      } else {
        throw err;
      }
    }

    const anyResponse = response as any;
    if (anyResponse.inlineData) {
      res.json({ url: `data:${anyResponse.inlineData.mimeType};base64,${anyResponse.inlineData.data}` });
    } else {
      throw new Error("No inlineData returned");
    }
  } catch (err: any) {
    console.error(err);
    handleAIError(res, err, "An internal server error occurred during AI generation.");
  }
});

router.post("/analyze-refinement", async (req, res) => {
  try {
    const { originalLogoBase64, originalLogoMimeType, contextFiles } = req.body;
    const prompt = `You are a master brand designer. Analyze the provided original logo and the provided contextual instruction files. Suggest concrete layout improvements, vector adjustments, and color alternatives. Crucially, write a 'refinedLogoPrompt' which is a highly detailed text-to-image prompt to generate the improved version.`;
    
    const inlineDataArray: any[] = [];
    if (contextFiles) {
      contextFiles.forEach((file: any) => {
        inlineDataArray.push({ data: file.base64Data, mimeType: file.mimeType });
      });
    }

    const response = await generateAIContent(req, {
      model: 'gemini-3.1-pro-preview',
      prompt,
      inlineData: { data: originalLogoBase64, mimeType: originalLogoMimeType },
      inlineDataArray: inlineDataArray.length > 0 ? inlineDataArray : undefined,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          layoutImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
          vectorAdjustments: { type: Type.ARRAY, items: { type: Type.STRING } },
          colorAlternatives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { hex: { type: Type.STRING }, name: { type: Type.STRING }, usage: { type: Type.STRING } },
              required: ["hex", "name", "usage"]
            }
          },
          refinedLogoPrompt: { type: Type.STRING }
        },
        required: ["layoutImprovements", "vectorAdjustments", "colorAlternatives", "refinedLogoPrompt"]
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      res.json({
        ...parsed,
        _meta: response._meta
      });
    } else {
      throw new Error("No content generated");
    }
  } catch (err: any) {
    console.error(err);
    handleAIError(res, err, "An internal server error occurred during AI generation.");
  }
});

router.post("/generate-brand-guide", async (req, res) => {
  try {
    const { base64Data, mimeType, context, generationMode = 'complete' } = req.body;
    const prompt = `Analyze this logo and generate a comprehensive, professional brand guideline document. ${context ? `The company context is: "${context}".` : "Infer the brand's industry and vibe from the logo itself."} Return the results in the requested JSON structure. Ensure colors match the primary features in the uploaded image accurately.${generationMode === 'compact' ? ' Keep descriptions short and concise.' : ''}`;
    
    const modelToUse = generationMode === 'compact' ? 'gemini-2.5-flash' : 'gemini-3.1-pro-preview';
    const response = await generateAIContent(req, {
      model: modelToUse,
      prompt,
      inlineData: { data: base64Data, mimeType },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          brandName: { type: Type.STRING },
          primaryColors: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, name: { type: Type.STRING }, usage: { type: Type.STRING } }, required: ["hex", "name", "usage"] }
          },
          secondaryColors: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, name: { type: Type.STRING }, usage: { type: Type.STRING } }, required: ["hex", "name", "usage"] }
          },
          typography: { type: Type.OBJECT, properties: { primaryFont: { type: Type.STRING }, secondaryFont: { type: Type.STRING }, guidelines: { type: Type.STRING } }, required: ["primaryFont", "secondaryFont", "guidelines"] },
          logoUsage: { type: Type.OBJECT, properties: { clearSpace: { type: Type.STRING }, minimumSize: { type: Type.STRING }, doNot: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["clearSpace", "minimumSize", "doNot"] },
          brandVoice: { type: Type.OBJECT, properties: { tone: { type: Type.STRING }, keywords: { type: Type.ARRAY, items: { type: Type.STRING } }, description: { type: Type.STRING } }, required: ["tone", "keywords", "description"] },
          photography: { type: Type.STRING },
          iconography: { type: Type.STRING },
          dosAndDonts: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["brandName", "primaryColors", "secondaryColors", "typography", "logoUsage", "brandVoice", "photography", "iconography", "dosAndDonts"]
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      res.json({
        ...parsed,
        _meta: response._meta
      });
    } else {
      throw new Error("No content generated");
    }
  } catch (err: any) {
    console.error(err);
    handleAIError(res, err, "An internal server error occurred during AI generation.");
  }
});

router.post("/generate-sonic", async (req, res) => {
  try {
    const { companyDescription, soundNames } = req.body;
    const prompt = `You are a master of Organic Sonic Branding. We are forging an auditory identity exclusively from organic, environmental, and animal sounds. No musical instruments. The company is: "${companyDescription}". The user has uploaded the following environmental sounds: ${soundNames.join(', ')}. Write a 2-3 paragraph "Sonic Identity Philosophy" for this brand. Explain how these specific organic sounds represent the brand's core values, their emotional meaning, and how they combine into a cohesive audio sting. Be poetic but professional.`;
    
    const response = await generateAIContent(req, {
      model: 'gemini-3.1-pro-preview',
      prompt
    });

    if (response.text) {
      res.json({ text: response.text.trim(), _meta: response._meta });
    } else {
      throw new Error("No sonic philosophy generated");
    }
  } catch (err: any) {
    console.error(err);
    handleAIError(res, err, "An internal server error occurred during AI generation.");
  }
});

router.post("/generate-rationale", async (req, res) => {
  try {
    const { description, stage } = req.body;
    const prompt = `As a master brand architect and logo designer from the "Srvel" ecosystem, provide an expert educational rationale for a logo design based on this brief: "${description}". The current stage of the project is: ${stage}. Explain the psychological choices, shape theory, typography pairings, and color meaning. Address this to a beginner designer using the "Beginex" educational framework to help them understand *why* this works and how to pitch it to clients. Keep it structured, encouraging, and highly professional.`;
    
    const response = await generateAIContent(req, {
      model: 'gemini-3.1-pro-preview',
      prompt
    });

    res.json({ text: response.text?.trim() || "Rationale could not be generated.", _meta: response._meta });
  } catch (err: any) {
    console.error(err);
    handleAIError(res, err, "An internal server error occurred during AI generation.");
  }
});

router.post("/generate-critic", async (req, res) => {
  try {
    const { companyDescription, logoUrl, role } = req.body;
    const actualRole = role || "Senior Art Director";
    const prompt = `You are playing the role of an elite, highly precise and constructive design critic: a "${actualRole}". We are designing a logo for this company/brief: "${companyDescription}". Please write a short, professional, and actionable design critique (2-3 sentences) of the current logo direction. Focus on visual weight, color contrast, metaphorical depth, or industry fit based on your specialty. Be critical but highly constructive and encouraging.`;
    
    let inlineData: any = undefined;
    if (logoUrl && logoUrl.startsWith('data:')) {
      const base64Data = logoUrl.split(',')[1];
      const mimeTypeMatch = logoUrl.match(/data:(.*?);/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
      inlineData = { data: base64Data, mimeType };
    }

    const response = await generateAIContent(req, {
      model: 'gemini-3.1-pro-preview',
      prompt,
      inlineData
    });

    res.json({ text: response.text?.trim() || "Terrific start. Consider checking color values for balanced contrast.", _meta: response._meta });
  } catch (err: any) {
    console.error(err);
    handleAIError(res, err, "An internal server error occurred during AI generation.");
  }
});

router.post("/analyze-competitor", async (req, res) => {
  try {
    const { companyDescription, competitorName, competitorLogoUrl } = req.body;
    const prompt = `You are an elite Brand Strategist. The user is building a brand with this description: "${companyDescription}". They want to analyze a competitor named "${competitorName}". Perform a strategic analysis comparing the two. If a logo was provided, analyze its visual elements. Outline: 1) Competitor Strengths, 2) Competitor Weaknesses, 3) Visual/Brand Tone, 4) Strategic Differentiation for the user's brand.`;
    
    let inlineData: any = undefined;
    if (competitorLogoUrl && competitorLogoUrl.startsWith('data:')) {
      const base64Data = competitorLogoUrl.split(',')[1];
      const mimeTypeMatch = competitorLogoUrl.match(/data:(.*?);/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
      inlineData = { data: base64Data, mimeType };
    }

    const response = await generateAIContent(req, {
      model: 'gemini-3.1-pro-preview',
      prompt,
      inlineData
    });

    res.json({ text: response.text?.trim() || "Analysis could not be generated.", _meta: response._meta });
  } catch (err: any) {
    console.error(err);
    handleAIError(res, err, "An internal server error occurred during AI generation.");
  }
});

router.post("/generate-ecosystem", async (req, res) => {
  try {
    const { brandGuide, assetType } = req.body;
    const prompt = `You are a social media copywriter and brand manager. Based on this Brand Guide: ${JSON.stringify(brandGuide)}, generate a compelling and engaging asset of type: "${assetType}". Examples of asset types include 'Instagram Post Caption', 'Email Newsletter Intro', 'Twitter Thread Hook', or 'LinkedIn Post'. Write only the content for the asset, ensuring it perfectly matches the brand voice, tone, and keywords. Do not include introductory text, just the content itself.`;

    const response = await generateAIContent(req, {
      model: 'gemini-3.1-pro-preview',
      prompt
    });

    res.json({ text: response.text?.trim() || "Asset could not be generated.", _meta: response._meta });
  } catch (err: any) {
    console.error(err);
    handleAIError(res, err, "An internal server error occurred during AI generation.");
  }
});

const ALLOWED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite-image'
];

// Simple in-memory audit log for demonstration. In production, save to a DB table.
export const generationAuditLog: Array<{
  timestamp: string;
  model: string;
  promptLength: number;
  status: 'success' | 'failed';
  error?: string;
}> = [];

// Server-side proxy route that keeps the Gemini API key perfectly hidden
router.post("/generate", async (req, res) => {
  try {
    const { prompt, model, temperature, topK, systemInstruction, responseMimeType, responseSchema } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const requestedModel = model || 'gemini-2.5-flash';
    if (!ALLOWED_MODELS.includes(requestedModel)) {
      generationAuditLog.push({
        timestamp: new Date().toISOString(),
        model: requestedModel,
        promptLength: prompt.length,
        status: 'failed',
        error: 'Unauthorized model requested'
      });
      return res.status(403).json({ error: "Model not allowed in registry." });
    }

    const client = getClient(req);
    const contentsParts = [{ text: prompt }];

    const config: any = {};
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (responseMimeType) config.responseMimeType = responseMimeType;
    if (responseSchema) config.responseSchema = responseSchema;
    if (temperature !== undefined) config.temperature = Number(temperature);
    if (topK !== undefined) config.topK = Number(topK);

    const response = await client.models.generateContent({
      model: requestedModel,
      contents: { parts: contentsParts },
      config,
    });

    generationAuditLog.push({
      timestamp: new Date().toISOString(),
      model: requestedModel,
      promptLength: prompt.length,
      status: 'success'
    });

    res.json({ text: response.text || '' });
  } catch (err: any) {
    console.error(err);
    generationAuditLog.push({
      timestamp: new Date().toISOString(),
      model: req.body?.model || 'gemini-2.5-flash',
      promptLength: req.body?.prompt?.length || 0,
      status: 'failed',
      error: err.message || 'Unknown error'
    });
    
    const errMsg = err?.message || String(err);
    const isQuota = errMsg.includes('quota') || 
                    errMsg.includes('Quota exceeded') || 
                    errMsg.includes('RESOURCE_EXHAUSTED') || 
                    (err?.status === 429) ||
                    JSON.stringify(err).includes('RESOURCE_EXHAUSTED') ||
                    JSON.stringify(err).includes('Quota exceeded');
                    
    if (isQuota) {
      res.status(429).json({ 
        error: "Gemini API Quota Exceeded. You have exceeded the free tier rate limits. Please try again later or add your own Gemini API Key in Settings > Secrets to resume immediately." 
      });
    } else {
      res.status(500).json({ error: err.message || "AI Generation failed." });
    }
  }
});

export default router;
