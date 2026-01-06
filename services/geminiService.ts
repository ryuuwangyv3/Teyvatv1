
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { APP_KNOWLEDGE_BASE, QUALITY_TAGS, AI_MODELS, IMAGE_GEN_MODELS, VIDEO_GEN_MODELS, ASPECT_RATIOS } from '../data';
import { VoiceConfig, ApiKeyData } from '../types';
import { addWavHeader } from '../utils/audioUtils';
import { getSystemCredentials } from './credentials';
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

// 🌐 Pollinations Public Key (Hardcoded Fallback)
const POLLINATIONS_PUBLIC_KEY = "pk_kcR3k4nvqWfkH92K";

export const SERVICE_ACCOUNT_CONFIG = {
    type: process.env.GCP_TYPE || "service_account",
    project_id: process.env.GCP_PROJECT_ID || "",
    private_key_id: process.env.GCP_PRIVATE_KEY_ID || "",
    private_key: (process.env.GCP_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    client_email: process.env.GCP_CLIENT_EMAIL || "",
    client_id: process.env.GCP_CLIENT_ID || "",
    auth_uri: process.env.GCP_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
    token_uri: process.env.GCP_TOKEN_URI || "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: process.env.GCP_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.GCP_CLIENT_X509_CERT_URL || "",
    universe_domain: process.env.GCP_UNIVERSE_DOMAIN || "googleapis.com"
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
[PROTOCOL: INFINITE RESONANCE v10.0]
1. MEDIA RETRIEVAL: Jika Traveler meminta gambar/foto dari internet, carilah Direct URL yang valid dan sertakan dalam teks.
2. VISUAL FALLBACK AWARENESS: Sistem memiliki hierarki fallback visual (Pollinations -> Google -> OpenAI -> OpenRouter).
3. CASUAL RESONANCE: Gunakan gaya bicara santai sesuai instruksi bahasa.
`;

let activeUserKeys: ApiKeyData[] = [];
export const setServiceKeys = (keys: ApiKeyData[]) => { activeUserKeys = keys; };

const getApiKeyForProvider = (provider: string): string => {
    const p = provider.toLowerCase();
    const creds = getSystemCredentials();
    let envKey = '';
    switch(p) {
        case 'google': envKey = creds.google || process.env.API_KEY || ''; break;
        case 'openai': envKey = creds.openai || process.env.OPENAI_API_KEY || ''; break;
        case 'openrouter': envKey = creds.openrouter || process.env.OPENROUTER_API_KEY || ''; break;
        case 'pollinations': envKey = creds.pollinations || ''; break;
    }
    if (envKey) return envKey;
    
    const userKey = activeUserKeys.find(k => k.provider.toLowerCase() === p && k.isValid !== false)?.key;
    if (userKey) return userKey;

    // Use Public Fallback for Pollinations
    if (p === 'pollinations') return POLLINATIONS_PUBLIC_KEY;
    
    return '';
};

const requestLogs: number[] = [];
const checkRateLimit = () => {
    const now = Date.now();
    while (requestLogs.length > 0 && requestLogs[0] < now - 60000) requestLogs.shift();
    if (requestLogs.length >= 25) throw new Error("Resonance Frequency Limit reached.");
    requestLogs.push(now);
};

const getAI = (customKey?: string) => {
  const key = customKey || getApiKeyForProvider('google');
  if (!key) throw new Error("Irminsul Error: Google API Key missing.");
  return new GoogleGenAI({ apiKey: key });
};

export const validateApiKey = async (key: string, provider: string): Promise<boolean> => {
    if (provider === 'google') {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            await ai.models.generateContent({
                model: VALIDATION_MODEL,
                contents: "ping",
                config: { maxOutputTokens: 1 }
            });
            return true;
        } catch (e) {
            return false;
        }
    }
    return !!key;
};

export const chatWithAI = async (modelName: string, history: any[], message: string, systemInstruction: string, userContext: string = "", images: any[] = []) => {
  checkRateLimit();
  const safeMessage = sanitizeInput(message);
  const finalInstruction = `${DEEP_SEARCH_INSTRUCTION}\n${APP_KNOWLEDGE_BASE}\n${systemInstruction}`;
  const modelConfig = AI_MODELS.find(m => m.id === modelName);
  const provider = modelConfig?.provider || 'google';

  if (['pollinations', 'openrouter', 'openai'].includes(provider)) {
      const apiKey = getApiKeyForProvider(provider);
      const endpoint = provider === 'pollinations' ? "https://text.pollinations.ai/v1/chat/completions" : 
                       provider === 'openrouter' ? "https://openrouter.ai/api/v1/chat/completions" : 
                       "https://api.openai.com/v1/chat/completions";
      
      const messages = [{ role: "system", content: finalInstruction }];
      history.forEach(item => messages.push({ role: item.role === 'model' ? 'assistant' : 'user', content: item.parts?.[0]?.text || item.text } as any));
      
      const multimodalContent: any[] = [{ type: "text", text: safeMessage }];
      images.forEach(img => multimodalContent.push({ type: "image_url", image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` } }));
      messages.push({ role: "user", content: images.length > 0 ? multimodalContent : safeMessage } as any);
      
      try {
          const response = await fetch(endpoint, { 
              method: "POST", 
              headers: { 
                  "Content-Type": "application/json", 
                  "Authorization": `Bearer ${apiKey}`, 
                  ...(provider === 'openrouter' ? { "HTTP-Referer": SITE_URL, "X-Title": SITE_NAME } : {}) 
              }, 
              body: JSON.stringify({ model: modelName, messages, temperature: 1.0 }) 
          });
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "Neural feedback empty.";
      } catch (e) { return chatWithAI(FALLBACK_GOOGLE_MODEL, history, message, systemInstruction, userContext, images); }
  } else {
      const ai = getAI(); 
      // Only use tools for Gemini 3 models
      const canUseTools = modelName.includes('gemini-3');
      
      const executeRequest = async (useTools: boolean) => {
        return await ai.models.generateContent({
            model: modelName, 
            contents: [...history, { role: 'user', parts: [...images, { text: safeMessage }] }],
            config: { 
                systemInstruction: finalInstruction, 
                temperature: 1.0, 
                ...(useTools ? { tools: [{ googleSearch: {} }] } : {}) 
            }
          });
      };

      try {
          let response = await executeRequest(canUseTools);
          let textOutput = response.text || "";
          
          // Enhanced grounding link extraction
          const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (grounding && grounding.length > 0) {
              const links = grounding
                .map((c: any) => c.web?.uri ? `- [${c.web.title || 'Source'}](${c.web.uri})` : null)
                .filter(Boolean);
              if (links.length > 0) {
                textOutput += "\n\n**Sources Found:**\n" + links.join("\n");
              }
          }
          return textOutput;
      } catch (e: any) { 
          // 🛡️ CRITICAL BUG FIX: If "Invalid Argument" (often tool mismatch), retry without tools
          if (canUseTools && (e.message?.includes('argument') || e.message?.includes('tool'))) {
              try {
                  const fallbackRes = await executeRequest(false);
                  return fallbackRes.text || "Resonance recovered without external search.";
              } catch (innerE) {
                  return chatWithAI(FALLBACK_GOOGLE_MODEL, history, safeMessage, systemInstruction, userContext, images);
              }
          }
          return chatWithAI(FALLBACK_GOOGLE_MODEL, history, safeMessage, systemInstruction, userContext, images); 
      }
  }
};

/**
 * 🎨 Recursive Visual Manifestation
 */
export const generateImage = async (
    prompt: string, 
    personaVisuals: string = "", 
    base64Inputs?: string | string[], 
    referenceImageUrl?: string, 
    preferredModel: string = 'flux',
    ratioId: string = "1:1",
    stylePrompt: string = "",
    negativePrompt: string = ""
): Promise<string | null> => {
  checkRateLimit();
  const context = getDynamicVisualContext(prompt);
  const ratio = ASPECT_RATIOS.find(r => r.id === ratioId) || ASPECT_RATIOS[0];
  
  const finalPrompt = `[STYLE: ${stylePrompt}] [PERSONA: ${personaVisuals}] [CONTEXT: ${context.state}, ${context.outfitType}] Action: ${prompt}. Quality: ${QUALITY_TAGS}. Neg: ${negativePrompt}`;

  const tryPollinations = async () => {
    const seed = Math.floor(Math.random() * 1000000);
    const key = getApiKeyForProvider('pollinations');
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?model=flux&width=${ratio.width}&height=${ratio.height}&seed=${seed}&nologo=true`;
    
    const res = await fetch(url, {
        headers: key ? { "Authorization": `Bearer ${key}` } : {}
    });
    if (!res.ok) throw new Error("Pollinations Down");
    return url;
  };

  const tryGoogle = async () => {
    const key = getApiKeyForProvider('google');
    if (!key) throw new Error("No Google Key");
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: finalPrompt }] },
        config: { imageConfig: { aspectRatio: ratioId as any } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Google Empty");
  };

  const tryOpenAI = async () => {
    const key = getApiKeyForProvider('openai');
    if (!key) throw new Error("No OpenAI Key");
    const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({ model: "dall-e-3", prompt: finalPrompt, n: 1, size: "1024x1024" })
    });
    const data = await res.json();
    if (data.data?.[0]?.url) return data.data[0].url;
    throw new Error("OpenAI Failed");
  };

  const chain = [
    { name: 'Pollinations', fn: tryPollinations },
    { name: 'Google', fn: tryGoogle },
    { name: 'OpenAI', fn: tryOpenAI }
  ];

  for (const provider of chain) {
    try {
      const result = await provider.fn();
      if (result) return result;
    } catch (e) {
      console.warn(`Fallback: ${provider.name} failed.`);
    }
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
      prompt: `[CONSISTENT IDENTITY] ${prompt}`, 
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
      return URL.createObjectURL(await response.blob());
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
      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } } },
    });
    const rawPcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (rawPcm) return addWavHeader(rawPcm, 24000, 1);
  } catch (e) { return null; }
  return null;
};

export const translateText = async (text: string, targetLang: string = "Indonesian") => {
  const ai = getAI(); 
  const response = await ai.models.generateContent({
      model: FALLBACK_GOOGLE_MODEL, 
      contents: `Translate to ${targetLang}: "${text}"`,
      config: { systemInstruction: "Output ONLY translated text.", temperature: 1.0 }
    });
  return response.text?.trim() || text;
};

export const analyzePersonaFromImage = async (base64WithHeader: string) => {
  const ai = getAI();
  const [header, data] = base64WithHeader.split(',');
  try {
    const response = await ai.models.generateContent({
      model: FALLBACK_GOOGLE_MODEL, 
      contents: {
        parts: [{ inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/jpeg', data } }, { text: "DEEP_ANALYSIS_V2: JSON {name, description, personality, background, speechStyle, visualSummary, voiceSuggestion}." }]
      },
      config: { 
          responseMimeType: "application/json", 
          responseSchema: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, personality: { type: Type.STRING }, background: { type: Type.STRING }, speechStyle: { type: Type.STRING }, visualSummary: { type: Type.STRING }, voiceSuggestion: { type: Type.STRING } } }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { throw e; }
};
