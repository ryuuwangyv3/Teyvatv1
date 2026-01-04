
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { APP_KNOWLEDGE_BASE, QUALITY_TAGS, AI_MODELS, IMAGE_GEN_MODELS, VIDEO_GEN_MODELS } from '../data';
import { VoiceConfig, ApiKeyData } from '../types';
import { addWavHeader } from '../utils/audioUtils';
import { getSystemCredentials } from './credentials';
import { sanitizeInput } from './securityService';

const SITE_URL = "https://akashaai.netlify.app/";
const SITE_NAME = "AkashaAI V7.8";
const VALIDATION_MODEL = 'gemini-3-flash-preview'; 
const FALLBACK_GOOGLE_MODEL = 'gemini-3-flash-preview';

// --- INFINITE RESONANCE: DEEP SEARCH & ANALYSIS PROTOCOLS ---
const DEEP_SEARCH_INSTRUCTION = `
[PROTOCOL: INFINITE RESONANCE DEEP SEARCH & ANALYSIS]
1. CROSS-PLATFORM IDENTIFICATION: Sebelum memberikan respons atau melakukan sintesis visual, telusuri secara virtual berbagai platform (Official Wiki, Fan-lore, Art Databases, Media Sosial) untuk menemukan referensi karakter atau deskripsi yang paling akurat dan up-to-date.
2. MULTIMODAL CORRELATION: Jika user mengunggah gambar referensi, bedah setiap elemen (anatomi, palet warna HEX, gaya rendering, shader, pencahayaan) dan bandingkan dengan standar kualitas tinggi di internet.
3. DEEP ANALYSIS: Gunakan logika penalaran mendalam untuk memahami konteks tersembunyi dari instruksi user. Jangan hanya memproses permukaan; cari esensi dari karakter atau objek yang dideskripsikan.
4. ALIGNMENT: Pastikan output akhir (teks/gambar/video) memiliki akurasi referensi di atas 99% terhadap sumber asli yang ditemukan melalui deep search.
`;

// --- SERVICE KEY MANAGEMENT ---
let activeUserKeys: ApiKeyData[] = [];

/**
 * Updates the internal key pool with keys from the UI vault.
 */
export const setServiceKeys = (keys: ApiKeyData[]) => {
    activeUserKeys = keys;
};

/**
 * Retrieves the best available key for a provider.
 * PRIORITY: 1. .env (Google only) | 2. Admin Console (Vault) | 3. credentials.ts (System)
 */
const getApiKeyForProvider = (provider: string): string => {
    const p = provider.toLowerCase();
    
    // 1. Check process.env.API_KEY (Primary for Google)
    if (p === 'google' && process.env.API_KEY && !process.env.API_KEY.includes('YOUR_API_KEY')) {
        return process.env.API_KEY;
    }

    // 2. Check User Vault (Admin Console) - use the key if it exists and isn't explicitly marked invalid
    const vaultKey = activeUserKeys.find(k => k.provider.toLowerCase() === p && k.isValid !== false)?.key;
    if (vaultKey) return vaultKey;
    
    // 3. Fallback to System Defaults (credentials.ts)
    const creds = getSystemCredentials();
    switch(p) {
        case 'google': return process.env.API_KEY || ''; 
        case 'openai': return creds.openai;
        case 'openrouter': return creds.openrouter;
        case 'pollinations': return creds.pollinations;
        case 'huggingface': return creds.huggingface;
        default: return '';
    }
};

// --- SECURITY: RATE LIMITING ---
const requestLogs: number[] = [];
const MAX_REQUESTS = 15; 
const WINDOW_MS = 60000; 

const checkRateLimit = () => {
    const now = Date.now();
    while (requestLogs.length > 0 && requestLogs[0] < now - WINDOW_MS) {
        requestLogs.shift();
    }
    if (requestLogs.length >= MAX_REQUESTS) {
        throw new Error("Resonance Frequency Limit: Ley Lines are unstable. Please wait 60s.");
    }
    requestLogs.push(now);
};

const getAI = (customKey?: string) => {
  const key = customKey || getApiKeyForProvider('google');
  if (!key) throw new Error("Irminsul Error: Google API Key missing. Please check Admin Console.");
  return new GoogleGenAI({ apiKey: key });
};

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

const getAuthHeaders = (apiKey: string, provider: string) => {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    
    if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }

    if (provider === 'openrouter') {
        headers["HTTP-Referer"] = SITE_URL;
        headers["X-Title"] = SITE_NAME;
    }

    return headers;
};

/**
 * Enhanced API Key Validation
 */
export const validateApiKey = async (key: string, provider: string): Promise<boolean> => {
    if (!key || key.length < 5) return false;
    const p = provider.toLowerCase();
    
    try {
        if (p === 'google') {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent({ 
                model: VALIDATION_MODEL, 
                contents: "ping",
                config: { maxOutputTokens: 1, thinkingConfig: { thinkingBudget: 0 } }
            });
            return !!response;
        }
        
        if (p === 'openrouter') {
            const response = await fetch("https://openrouter.ai/api/v1/auth/key", { 
                method: "GET", 
                headers: { "Authorization": `Bearer ${key}` } 
            });
            return response.ok;
        }

        if (p === 'openai') {
            const response = await fetch("https://api.openai.com/v1/models", { 
                method: "GET", 
                headers: { "Authorization": `Bearer ${key}` } 
            });
            return response.ok;
        }

        if (p === 'pollinations') return true;
        
        return false;
    } catch (e) {
        console.warn(`Validation failed for ${provider}:`, e);
        return false;
    }
};

export interface ImageAttachment {
  inlineData: {
    mimeType: string;
    data: string;
  }
}

const convertHistoryToOpenAI = (history: any[], systemInstruction: string) => {
    const messages: { role: string; content: any }[] = [
        { role: "system", content: `${DEEP_SEARCH_INSTRUCTION}\n${systemInstruction}` }
    ];
    
    history.forEach(item => {
        const role = item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user';
        let text = "";
        
        if (Array.isArray(item.parts)) {
            text = item.parts.map((p: any) => p.text || "").join("\n").trim();
        } else if (typeof item.text === 'string') {
            text = item.text.trim();
        } else if (item.parts?.[0]?.text) {
            text = item.parts[0].text.trim();
        }

        if (text) {
            messages.push({ role, content: text });
        }
    });
    
    return messages;
};

export const chatWithAI = async (modelName: string, history: any[], message: string, systemInstruction: string, userContext: string = "", images: ImageAttachment[] = []) => {
  checkRateLimit();
  const safeMessage = sanitizeInput(message);
  const finalInstruction = `${DEEP_SEARCH_INSTRUCTION}\n${APP_KNOWLEDGE_BASE}\n${systemInstruction}`;
  const modelConfig = AI_MODELS.find(m => m.id === modelName);
  const provider = modelConfig?.provider || 'google';

  if (provider === 'pollinations' || provider === 'openrouter' || provider === 'openai') {
      const apiKey = getApiKeyForProvider(provider);
      const endpoint = provider === 'pollinations' ? "https://gen.pollinations.ai/v1/chat/completions" : 
                       provider === 'openrouter' ? "https://openrouter.ai/api/v1/chat/completions" : 
                       "https://api.openai.com/v1/chat/completions";

      const messages = convertHistoryToOpenAI(history, finalInstruction);
      const multimodalContent: any[] = [{ type: "text", text: safeMessage }];
      images.forEach(img => {
          multimodalContent.push({
              type: "image_url",
              image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` }
          });
      });

      messages.push({ role: "user", content: images.length > 0 ? multimodalContent : safeMessage });

      try {
          const response = await fetch(endpoint, {
              method: "POST",
              headers: getAuthHeaders(apiKey, provider),
              body: JSON.stringify({ 
                  model: modelName, 
                  messages, 
                  temperature: 0.8,
                  stream: false
              })
          });

          const data = await response.json();
          return data.choices?.[0]?.message?.content || "Resonance received but empty.";
      } catch (e: any) {
          console.error(`${provider} Error:`, e);
          return chatWithAI(FALLBACK_GOOGLE_MODEL, history, message, systemInstruction, userContext, images);
      }
  } else {
      const ai = getAI(); 
      const currentParts: any[] = [...images, { text: safeMessage }];
      
      // Setup Tools for Deep Searching on supported Google Models
      const tools: any[] = [];
      if (modelName.includes('pro') || modelName.includes('search')) {
          tools.push({ googleSearch: {} });
      }

      try {
          const response = await ai.models.generateContent({
            model: modelName, 
            contents: [...history, { role: 'user', parts: currentParts }],
            config: { 
                systemInstruction: finalInstruction, 
                temperature: 0.9, 
                safetySettings: SAFETY_SETTINGS as any,
                tools: tools.length > 0 ? tools : undefined,
                thinkingConfig: modelName.includes('pro') ? { thinkingBudget: 32768 } : { thinkingBudget: 24576 }
            }
          });
          return response.text || "Neural feedback empty.";
      } catch (e: any) {
          if (modelName !== FALLBACK_GOOGLE_MODEL) {
              return chatWithAI(FALLBACK_GOOGLE_MODEL, history, safeMessage, systemInstruction, userContext, images);
          }
          throw e;
      }
  }
};

export const generateImage = async (prompt: string, personaVisuals: string = "", base64Inputs?: string | string[], referenceImageUrl?: string, model: string = 'gemini-2.5-flash-image'): Promise<string | null> => {
  checkRateLimit();
  const modelConfig = IMAGE_GEN_MODELS.find(m => m.id === model);
  const provider = (modelConfig?.provider.toLowerCase() || 'google');

  // Inject Deep Analysis into the Prompt for all models
  const augmentedPrompt = `[DEEP ANALYSIS & CROSS-PLATFORM SEARCH ENABLED] 
  STEP 1: Cari referensi visual, lore, dan detail karakter terbaru dari internet (Pixiv, ArtStation, Wiki). 
  STEP 2: Analisis detail input user dan referensi gambar yang diunggah. 
  STEP 3: Generate visual dengan tingkat akurasi referensi maksimal. 
  
  Objective: ${prompt}
  Persona Context: ${personaVisuals}
  Quality Constraints: ${QUALITY_TAGS}`;

  if (provider === 'pollinations') {
      const apiKey = getApiKeyForProvider('pollinations');
      const encodedPrompt = encodeURIComponent(augmentedPrompt);
      const authParam = apiKey ? `&auth=${apiKey}` : "";
      return `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&nologo=true&private=true&enhance=true&width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}${authParam}`;
  }

  const ai = getAI();
  try {
    const parts: any[] = [];
    if (base64Inputs) {
        const inputs = Array.isArray(base64Inputs) ? base64Inputs : [base64Inputs];
        inputs.forEach(base64 => {
            const [header, data] = base64.split(',');
            parts.push({ inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/png', data } });
        });
    }
    parts.push({ text: augmentedPrompt });
    
    // Enable Deep Searching tool specifically for gemini-3-pro-image-preview
    const config: any = { 
        imageConfig: { aspectRatio: "1:1" }, 
        safetySettings: SAFETY_SETTINGS as any 
    };

    if (model === 'gemini-3-pro-image-preview') {
        config.tools = [{ google_search: {} }];
        config.imageConfig.imageSize = "1K";
    }
    
    const response = await ai.models.generateContent({
      model: model.includes('gemini') ? model : 'gemini-2.5-flash-image', 
      contents: { parts },
      config: config
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e: any) {
      throw e;
  }
  return null;
};

export const generateVideo = async (prompt: string, base64Input?: string, model: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
  checkRateLimit();
  const ai = getAI();
  try {
    let imageInput: any = undefined;
    if (base64Input) {
        const [header, data] = base64Input.split(',');
        imageInput = { imageBytes: data, mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' };
    }
    let operation = await ai.models.generateVideos({ 
      model: model, 
      prompt: `[DEEP MOTION ANALYSIS & INTERNET CORRELATION] ${prompt}`, 
      image: imageInput, 
      config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' } 
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation});
    }
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
      const response = await fetch(`${videoUri}&key=${getApiKeyForProvider('google')}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) { throw e; }
  return null;
};

export const generateTTS = async (text: string, voiceName: string, voiceConfig?: VoiceConfig) => {
  const ai = getAI();
  const cleanText = text.replace(/\|\|GEN_IMG:.*?\|\|/g, '').replace(/(https?:\/\/[^\s]+)/g, '').replace(/[*#`_~]/g, '').trim();
  if (!cleanText) return null;

  try {
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
  } catch (e: any) { return null; }
  return null;
};

export const translateText = async (text: string, targetLang: string = "Indonesian") => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: FALLBACK_GOOGLE_MODEL, 
      contents: `Translate to ${targetLang}: "${text}"`,
      config: { 
          systemInstruction: "Output ONLY translated text.",
          safetySettings: SAFETY_SETTINGS as any,
          temperature: 0.1 
      }
    });
    return response.text?.trim() || text;
  } catch (e) { return text; }
};

export const analyzePersonaFromImage = async (base64WithHeader: string) => {
  const ai = getAI();
  const [header, data] = base64WithHeader.split(',');
  try {
    const response = await ai.models.generateContent({
      model: FALLBACK_GOOGLE_MODEL, 
      contents: {
        parts: [{ inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/jpeg', data } }, { text: "PROTOCOL: DEEP_ANALYSIS_V2. Analisis gambar karakter secara ekstrem. Lakukan verifikasi lore melalui platform internet jika karakter tersebut populer. Kembalikan JSON: {name, description, personality, background, speechStyle, visualSummary, voiceSuggestion}." }]
      },
      config: { 
          responseMimeType: "application/json", 
          responseSchema: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, personality: { type: Type.STRING }, background: { type: Type.STRING }, speechStyle: { type: Type.STRING }, visualSummary: { type: Type.STRING }, voiceSuggestion: { type: Type.STRING, enum: ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"] } } },
          thinkingConfig: { thinkingBudget: 24576 }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { throw e; }
};
