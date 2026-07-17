import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { Command } from '../types';

const router = express.Router();

const getClient = (req: express.Request) => {
  const customKey = req.headers['x-custom-api-key'] as string;
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API key not configured");
  }
  return new GoogleGenAI({ apiKey });
};

// Unified helper supporting standard Gemini client and third-party custom LLMs
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
): Promise<{ text: string }> {
  const activeModel = req.headers['x-active-model'] as string || 'gemini';

  if (activeModel && activeModel !== 'gemini') {
    let apiKey = '';
    let endpoint = '';
    let modelName = '';

    if (activeModel === 'stepfun') {
      apiKey = req.headers['x-stepfun-key'] as string || process.env.STEPFUN_API_KEY || '';
      endpoint = req.headers['x-stepfun-endpoint'] as string || 'https://api.stepfun.com/v1/chat/completions';
      modelName = 'step-3.7-flash';
    } else if (activeModel === 'poolside') {
      apiKey = req.headers['x-poolside-key'] as string || process.env.POOLSIDE_API_KEY || '';
      endpoint = req.headers['x-poolside-endpoint'] as string || 'https://api.poolside.ai/v1/chat/completions';
      modelName = 'laguna-m.1';
    } else if (activeModel === 'tencent') {
      apiKey = req.headers['x-tencent-key'] as string || process.env.TENCENT_API_KEY || '';
      endpoint = req.headers['x-tencent-endpoint'] as string || 'https://api.hunyuan.tencent.com/v1/chat/completions';
      modelName = 'hy3';
    }

    if (!apiKey) {
      throw new Error(`API key for custom model '${activeModel}' is not configured. Please add it in Settings.`);
    }

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

  // Gemini Client call fallback
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

  const response = await client.models.generateContent({
    model: options.model,
    contents: { parts: contentsParts },
    config: {
      systemInstruction: options.systemInstruction,
      responseMimeType: options.responseMimeType,
      responseSchema: options.responseSchema,
    } as any,
  });

  return { text: response.text || '' };
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
      res.json(JSON.parse(response.text.trim()));
    } else {
      throw new Error("No command generated");
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Command interpretation failed." });
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
    
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        outputMimeType: "image/png",
        aspectRatio: "1:1",
        personGeneration: "DONT_ALLOW"
      } as any
    });

    const anyResponse = response as any;
    if (anyResponse.inlineData) {
      res.json({ url: `data:${anyResponse.inlineData.mimeType};base64,${anyResponse.inlineData.data}` });
    } else {
      throw new Error("No inlineData returned");
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "An internal server error occurred during AI generation." });
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
      res.json(JSON.parse(response.text.trim()));
    } else {
      throw new Error("No content generated");
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "An internal server error occurred during AI generation." });
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
      res.json(JSON.parse(response.text.trim()));
    } else {
      throw new Error("No content generated");
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "An internal server error occurred during AI generation." });
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
      res.json({ text: response.text.trim() });
    } else {
      throw new Error("No sonic philosophy generated");
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "An internal server error occurred during AI generation." });
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

    res.json({ text: response.text?.trim() || "Rationale could not be generated." });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "An internal server error occurred during AI generation." });
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

    res.json({ text: response.text?.trim() || "Terrific start. Consider checking color values for balanced contrast." });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "An internal server error occurred during AI generation." });
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

    res.json({ text: response.text?.trim() || "Analysis could not be generated." });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "An internal server error occurred during AI generation." });
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

    res.json({ text: response.text?.trim() || "Asset could not be generated." });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "An internal server error occurred during AI generation." });
  }
});

// Server-side proxy route that keeps the Gemini API key perfectly hidden
router.post("/generate", async (req, res) => {
  try {
    const { prompt, model, temperature, topK, systemInstruction, responseMimeType, responseSchema } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
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
      model: model || 'gemini-2.5-flash',
      contents: { parts: contentsParts },
      config,
    });

    res.json({ text: response.text || '' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "AI Generation failed." });
  }
});

export default router;
