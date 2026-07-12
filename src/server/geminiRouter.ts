import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

const getClient = (req: express.Request) => {
  const customKey = req.headers['x-custom-api-key'] as string;
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API key not configured");
  }
  return new GoogleGenAI({ apiKey });
};

router.post("/generate-logo", async (req, res) => {
  try {
    const { companyDescription } = req.body;
    const client = getClient(req);
    const prompt = `A professional, minimalist, scalable vector-style logo design based on this company description: "${companyDescription}". The logo MUST be isolated on a pure white background. Flat colors, clear simple shapes, negative space. No complex realistic details, no text. Perfect for a startup identity.`;
    
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
    res.status(500).json({ error: err.message });
  }
});

router.post("/analyze-refinement", async (req, res) => {
  try {
    const { originalLogoBase64, originalLogoMimeType, contextFiles } = req.body;
    const client = getClient(req);
    const prompt = `You are a master brand designer. Analyze the provided original logo and the provided contextual instruction files. Suggest concrete layout improvements, vector adjustments, and color alternatives. Crucially, write a 'refinedLogoPrompt' which is a highly detailed text-to-image prompt to generate the improved version.`;
    
    const parts: any[] = [
      { text: prompt },
      { inlineData: { data: originalLogoBase64, mimeType: originalLogoMimeType } }
    ];
    if (contextFiles) {
      contextFiles.forEach((file: any) => {
        parts.push({ inlineData: { data: file.base64Data, mimeType: file.mimeType } });
      });
    }

    const response = await client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: { parts },
      config: {
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
      }
    });

    if (response.text) {
      res.json(JSON.parse(response.text.trim()));
    } else {
      throw new Error("No content generated");
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/generate-brand-guide", async (req, res) => {
  try {
    const { base64Data, mimeType, context } = req.body;
    const client = getClient(req);
    const prompt = `Analyze this logo and generate a comprehensive, professional brand guideline document. ${context ? `The company context is: "${context}".` : "Infer the brand's industry and vibe from the logo itself."} Return the results in the requested JSON structure. Ensure colors match the primary features in the uploaded image accurately.`;
    
    const response = await client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType } }
        ]
      },
      config: {
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
      }
    });

    if (response.text) {
      res.json(JSON.parse(response.text.trim()));
    } else {
      throw new Error("No content generated");
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/generate-sonic", async (req, res) => {
  try {
    const { companyDescription, soundNames } = req.body;
    const client = getClient(req);
    const prompt = `You are a master of Organic Sonic Branding. We are forging an auditory identity exclusively from organic, environmental, and animal sounds. No musical instruments. The company is: "${companyDescription}". The user has uploaded the following environmental sounds: ${soundNames.join(', ')}. Write a 2-3 paragraph "Sonic Identity Philosophy" for this brand. Explain how these specific organic sounds represent the brand's core values, their emotional meaning, and how they combine into a cohesive audio sting. Be poetic but professional.`;
    
    const response = await client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: { parts: [{ text: prompt }] }
    });

    if (response.text) {
      res.json({ text: response.text.trim() });
    } else {
      throw new Error("No sonic philosophy generated");
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/generate-rationale", async (req, res) => {
  try {
    const { description, stage } = req.body;
    const client = getClient(req);
    const prompt = `As a master brand architect and logo designer from the "Srvel" ecosystem, provide an expert educational rationale for a logo design based on this brief: "${description}". The current stage of the project is: ${stage}. Explain the psychological choices, shape theory, typography pairings, and color meaning. Address this to a beginner designer using the "Beginex" educational framework to help them understand *why* this works and how to pitch it to clients. Keep it structured, encouraging, and highly professional.`;
    
    const response = await client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: { parts: [{ text: prompt }] }
    });

    res.json({ text: response.text?.trim() || "Rationale could not be generated." });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/generate-critic", async (req, res) => {
  try {
    const { companyDescription, logoUrl, role } = req.body;
    const client = getClient(req);
    const actualRole = role || "Senior Art Director";
    const prompt = `You are playing the role of an elite, highly precise and constructive design critic: a "${actualRole}". We are designing a logo for this company/brief: "${companyDescription}". Please write a short, professional, and actionable design critique (2-3 sentences) of the current logo direction. Focus on visual weight, color contrast, metaphorical depth, or industry fit based on your specialty. Be critical but highly constructive and encouraging.`;
    
    const parts: any[] = [{ text: prompt }];
    if (logoUrl && logoUrl.startsWith('data:')) {
      const base64Data = logoUrl.split(',')[1];
      const mimeTypeMatch = logoUrl.match(/data:(.*?);/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
      parts.push({ inlineData: { data: base64Data, mimeType } });
    }

    const response = await client.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: { parts }
    });

    res.json({ text: response.text?.trim() || "Terrific start. Consider checking color values for balanced contrast." });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
