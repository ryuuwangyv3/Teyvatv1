import { GoogleGenAI, Type, Modality } from "@google/genai";
import { APP_KNOWLEDGE_BASE, QUALITY_TAGS, AI_MODELS, IMAGE_GEN_MODELS, VIDEO_GEN_MODELS, ASPECT_RATIOS } from '../data';
import { VoiceConfig, ApiKeyData } from '../types';
import { addWavHeader } from '../utils/audioUtils';
import { sanitizeInput } from './securityService';

// Define ImageAttachment interface used by Terminal.tsx
export interface ImageAttachment {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

const SITE_URL = "https://akashaai.netlify.app/";
const SITE_NAME = "AkashaAI V8.5";
const VALIDATION_MODEL = 'gemini-3-flash-preview'; 
const FALLBACK_GOOGLE_MODEL = 'gemini-3-flash-preview';

// 🌐 CELESTIAL CONSTANTS (FALLBACK KEYS)
const GLOBAL_FALLBACK_GEMINI = "AIzaSyCWFLagWil_s7OFUsBAjBrGsp5OYKLsb6U";
const GLOBAL_FALLBACK_POLLINATIONS = "sk_qM87JYMwNGfqoGKf6vQ5iHEIEUhBDu3x";
const GLOBAL_FALLBACK_OPENROUTER = "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";
const GLOBAL_FALLBACK_OPENAI = "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";

export const SERVICE_ACCOUNT_CONFIG = {
    type: "service_account",
    project_id: process.env.GCP_PROJECT_ID || "alyaai",
    private_key: (process.env.GCP_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    client_email: process.env.GCP_CLIENT_EMAIL || "ryuuwangyv3@alyaai.iam.gserviceaccount.com",
    token_uri: "https://oauth2.googleapis.com/token",
};

const getDynamicVisualContext = (userPrompt: string) => {
    const hour = new Date().getHours();
    const promptLower = userPrompt.toLowerCase();
    let state = "PRODUCTIVE", outfitType = "Official Signature Attire", lighting = "Natural Daylight", environment = "Workplace";

    if (hour >= 5 && hour < 9) { state = "MORNING"; outfitType = "Fresh Official Outfit"; lighting = "Soft Morning Sunlight"; environment = "Garden"; }
    else if (hour >= 17 && hour < 21 || promptLower.includes('santai')) { state = "CHILL"; outfitType = "Casual Streetwear"; lighting = "Warm Sunset"; environment = "Cafe"; }
    else if (hour >= 21 || hour < 5 || promptLower.includes('tidur')) { state = "REST"; outfitType = "Silk Pajamas"; lighting = "Moonlight"; environment = "Bedroom"; }

    return { state, outfitType, lighting, environment };
};

const DEEP_SEARCH_INSTRUCTION = `
[PROTOCOL: CELESTIAL MEDIA RETRIEVAL v11.0]
1. MEDIA SEARCH: Jika Traveler meminta gambar/media dari internet (Google, Pixiv, Pinterest, dsb), gunakan googleSearch untuk menemukan Direct URL yang paling relevan.
2. RENDERING: Masukkan URL gambar (.jpg/png/webp) langsung di dalam teks agar sistem UI dapat merendernya.
3. GROUNDING: SELALU tampilkan sumber website aslinya sebagai referensi di bawah media.
`;

let activeUserKeys: ApiKeyData[] = [];
export const setServiceKeys = (keys: ApiKeyData[]) => { activeUserKeys = keys; };

const getApiKeyForProvider = (provider: string): string => {
    const p = provider.toLowerCase();
    
    // PRIORITAS 1: Variabel Lingkungan (.env)
    if (p === 'google' || p === 'gemini') {
        const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        return envKey || GLOBAL_FALLBACK_GEMINI; // Fallback ke Konstanta Surgawi
    }
    if (p === 'openai') return process.env.OPENAI_API_KEY || GLOBAL_FALLBACK_OPENAI;
    if (p === 'openrouter') return process.env.OPENROUTER_API_KEY || GLOBAL_FALLBACK_OPENROUTER;
    if (p === 'pollinations') return process.env.POLLINATIONS_API_KEY || GLOBAL_FALLBACK_POLLINATIONS;
    
    // Fallback ke kunci kustom dari UI jika tersedia
    const userKey = activeUserKeys.find(k => k.provider.toLowerCase() === p)?.key;
    return userKey || '';
};

const getAI = () => {
  const key = getApiKeyForProvider('google');
  if (!key) throw new Error("Irminsul Connectivity Error: API_KEY tidak terdeteksi.");
  return new GoogleGenAI({ apiKey: key });
};

export const validateApiKey = async (key: string, provider: string): Promise<boolean> => {
    const p = provider.toLowerCase();
    if (p === 'google' || p === 'gemini') {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent({
                model: VALIDATION_MODEL,
                contents: 'Resonance check'
            });
            return !!response.text;
        } catch (e) {
            return false;
        }
    }
    return key.length > 5;
};

export const chatWithAI = async (modelName: string, history: any[], message: string, systemInstruction: string, userContext: string = "", images: any[] = [], isRetry: boolean = false): Promise<string> => {
  const safeMessage = sanitizeInput(message);
  const provider = AI_MODELS.find(m => m.id === modelName)?.provider || 'google';

  const finalInstruction = `
    ${DEEP_SEARCH_INSTRUCTION}
    ${APP_KNOWLEDGE_BASE}
    ${systemInstruction}
  `;

  if (provider === 'pollinations') {
      // NEW PROTOCOL: Pollinations GET method
      const promptForGet = `${finalInstruction}\n\nTraveler: ${safeMessage}\n\nResponse (as ${modelName}):`;
      const url = `https://text.pollinations.ai/${encodeURIComponent(promptForGet)}?model=${modelName}&system=${encodeURIComponent(finalInstruction)}`;
      
      try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Status: ${response.status}`);
          const text = await response.text();
          return text || "Neural feedback empty.";
      } catch (e) {
          return `Resonance Error (Pollinations GET): Jalur transmisi terganggu.`;
      }
  } else if (provider === 'google') {
      try {
          const ai = getAI();
          const isGemini3 = modelName.includes('gemini-3');
          
          const response = await ai.models.generateContent({
              model: modelName,
              contents: [...history, { role: 'user', parts: [...images, { text: safeMessage }] }],
              config: {
                  systemInstruction: finalInstruction,
                  temperature: 1.0,
                  ...(isGemini3 ? { tools: [{ googleSearch: {} }] } : {})
              }
          });

          let textOutput = response.text || "";
          const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (grounding && grounding.length > 0) {
              const links = grounding.map((c: any) => c.web?.uri ? `- [${c.web.title || 'Source'}](${c.web.uri})` : null).filter(Boolean);
              if (links.length > 0) textOutput += "\n\n**Fragments found in Irminsul:**\n" + links.join("\n");
          }
          return textOutput;
      } catch (e: any) {
          console.error("Gemini Execution Error:", e);
          return `Irminsul Error: Resonansi gagal. Memeriksa integritas API Key...`;
      }
  } else {
      // Logic for OpenAI and OpenRouter (POST)
      const apiKey = getApiKeyForProvider(provider);
      const endpoint = provider === 'openrouter' ? "https://openrouter.ai/api/v1/chat/completions" : 
                       "https://api.openai.com/v1/chat/completions";

      try {
          const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}),
                  ...(provider === 'openrouter' ? { "HTTP-Referer": SITE_URL, "X-Title": SITE_NAME } : {})
              },
              body: JSON.stringify({
                  model: modelName,
                  messages: [
                      { role: "system", content: finalInstruction },
                      ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text })),
                      { role: "user", content: safeMessage }
                  ]
              })
          });
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "Neural feedback empty.";
      } catch (e) {
          return `Resonance Error (${provider}): Bridge connection failed.`;
      }
  }
};

export const generateImage = async (prompt: string, personaVisuals: string = "", base64Inputs?: string | string[], referenceImageUrl?: string, preferredModel: string = 'flux', ratioId: string = "1:1", stylePrompt: string = "", negativePrompt: string = ""): Promise<string | null> => {
  const context = getDynamicVisualContext(prompt);
  const ratio = ASPECT_RATIOS.find(r => r.id === ratioId) || ASPECT_RATIOS[0];
  const finalPrompt = `[STYLE: ${stylePrompt}] [PERSONA: ${personaVisuals}] [CONTEXT: ${context.state}, ${context.outfitType}] Action: ${prompt}. Quality: ${QUALITY_TAGS}. Neg: ${negativePrompt}`;

  try {
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://gen.pollinations.ai/image/prompt/${encodeURIComponent(finalPrompt)}?model=${preferredModel}&width=${ratio.width}&height=${ratio.height}&seed=${seed}&nologo=true`;
    return url;
  } catch (e) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: finalPrompt }] },
          config: { imageConfig: { aspectRatio: ratioId as any } }
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    } catch (err) {
      console.error("Visual Alchemy failed.");
    }
  }
  return null;
};

export const generateVideo = async (prompt: string, base64Input?: string, model: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
  const apiKey = getApiKeyForProvider('google');
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    let imageInput: any = undefined;
    if (base64Input) {
        const [header, data] = base64Input.split(',');
        imageInput = { imageBytes: data, mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' };
    }

    let operation = await ai.models.generateVideos({
      model: model,
      prompt: `[CINEMATIC] ${prompt}`,
      image: imageInput,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) return `${videoUri}&key=${apiKey}`;
  } catch (e) {
    console.error("Chronicle error:", e);
    throw e;
  }
  return null;
};

export const generateTTS = async (text: string, voiceName: string, voiceConfig?: VoiceConfig) => {
  try {
    const ai = getAI();
    const cleanText = text.replace(/\|\|GEN_IMG:.*?\|\|/g, '').replace(/(https?:\/\/[^\s]+)/g, '').trim();
    if (!cleanText) return null;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText.substring(0, 2000) }] }],
      config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } } 
      },
    });
    const rawPcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (rawPcm) return addWavHeader(rawPcm, 24000, 1);
  } catch (e) { return null; }
  return null;
};

export const translateText = async (text: string, targetLang: string = "Indonesian") => {
  try {
    const ai = getAI(); 
    const response = await ai.models.generateContent({
        model: FALLBACK_GOOGLE_MODEL, 
        contents: `Translate this text to ${targetLang}, maintain the original tone: "${text}"`,
        config: { systemInstruction: "Output ONLY the translated text without any quotes or explanations.", temperature: 0.3 }
      });
    return response.text?.trim() || text;
  } catch(e) { return text; }
};

export const analyzePersonaFromImage = async (base64WithHeader: string) => {
  const ai = getAI();
  const [header, data] = base64WithHeader.split(',');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: {
        parts: [
            { inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/jpeg', data } }, 
            { text: "Analyze this character image. Provide JSON output: {name, description, personality, background, speechStyle, visualSummary, voiceSuggestion}." }
        ]
      },
      config: { 
          responseMimeType: "application/json", 
          responseSchema: { 
              type: Type.OBJECT, 
              properties: { 
                  name: { type: Type.STRING }, 
                  description: { type: Type.STRING }, 
                  personality: { type: Type.STRING }, 
                  background: { type: Type.STRING }, 
                  speechStyle: { type: Type.STRING }, 
                  visualSummary: { type: Type.STRING }, 
                  voiceSuggestion: { type: Type.STRING } 
              },
              required: ['name', 'description', 'personality']
          }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { throw e; }
};
