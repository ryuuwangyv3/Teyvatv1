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
[PROTOCOL: CELESTIAL MEDIA RETRIEVAL v11.0]
1. MEDIA SEARCH: Jika Traveler meminta gambar/media dari internet (Google, Pixiv, Pinterest, dsb), gunakan googleSearch untuk menemukan Direct URL yang paling relevan.
2. RENDERING: Masukkan URL gambar (.jpg/png/webp) langsung di dalam teks agar sistem UI dapat merendernya.
3. GROUNDING: SELALU tampilkan sumber website aslinya sebagai referensi di bawah media.
4. NARRATION: Berikan narasi yang puitis atau santai sesuai persona Anda saat memproyeksikan media tersebut.
`;

let activeUserKeys: ApiKeyData[] = [];
export const setServiceKeys = (keys: ApiKeyData[]) => { activeUserKeys = keys; };

const getApiKeyForProvider = (provider: string): string => {
    const p = provider.toLowerCase();
    
    // MENGAMBIL LANGSUNG DARI process.env (Prioritas Utama)
    if (p === 'google') return process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    if (p === 'openai') return process.env.OPENAI_API_KEY || '';
    if (p === 'openrouter') return process.env.OPENROUTER_API_KEY || '';
    if (p === 'pollinations') return process.env.POLLINATIONS_API_KEY || POLLINATIONS_PUBLIC_KEY;
    
    // Fallback ke kunci yang diinput di Admin Console jika .env kosong
    const userKey = activeUserKeys.find(k => k.provider.toLowerCase() === p && k.isValid !== false)?.key;
    return userKey || '';
};

const requestLogs: number[] = [];
const checkRateLimit = () => {
    const now = Date.now();
    while (requestLogs.length > 0 && requestLogs[0] < now - 60000) requestLogs.shift();
    if (requestLogs.length >= 50) throw new Error("Resonance Frequency Limit reached. Please wait a moment.");
    requestLogs.push(now);
};

const getAI = () => {
  // MENGAMBIL LANGSUNG process.env.API_KEY sesuai instruksi SDK Gemini
  const key = process.env.API_KEY;
  if (!key) throw new Error("Irminsul Error: API_KEY missing in .env. Please check your localhost setup.");
  return new GoogleGenAI({ apiKey: key });
};

export const analyzeImageVision = async (images: ImageAttachment[]): Promise<string> => {
    if (images.length === 0) return "";
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    ...images,
                    { text: "ACT AS GOOGLE VISION SERVICE. Analyze this image. Identify: 1. Detailed labels, 2. Text/OCR, 3. Landmark/Location hints, 4. Dominant atmosphere. Provide a concise technical summary." }
                ]
            }
        });
        return response.text || "[Vision Scan Empty]";
    } catch (e) {
        console.error("Vision Service Failure:", e);
        return "[Vision Service Offline]";
    }
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

export const chatWithAI = async (modelName: string, history: any[], message: string, systemInstruction: string, userContext: string = "", images: any[] = [], isRetry: boolean = false): Promise<string> => {
  try {
      checkRateLimit();
  } catch (e: any) {
      return e.message;
  }

  const safeMessage = sanitizeInput(message);
  
  let visionSummary = "";
  if (images.length > 0 && !isRetry) {
      visionSummary = await analyzeImageVision(images);
  }

  const finalInstruction = `
    ${DEEP_SEARCH_INSTRUCTION}
    ${APP_KNOWLEDGE_BASE}
    ${systemInstruction}
    ${visionSummary ? `[VISION_SCAN_DATA: ${visionSummary}]` : ""}
  `;
  
  const modelConfig = AI_MODELS.find(m => m.id === modelName);
  const provider = modelConfig?.provider || 'google';

  // LOGIKA PROVIDER NON-GOOGLE
  if (['pollinations', 'openrouter', 'openai'].includes(provider)) {
      const apiKey = getApiKeyForProvider(provider);
      
      // Jika apikey provider tidak ada, kita tidak boleh langsung lempar error Gemini
      if (!apiKey && provider !== 'pollinations') {
          return `Error: API Key untuk ${provider} tidak ditemukan di .env.`;
      }

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
                  ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}),
                  ...(provider === 'openrouter' ? { "HTTP-Referer": SITE_URL, "X-Title": SITE_NAME } : {}) 
              }, 
              body: JSON.stringify({ model: modelName, messages, temperature: 1.0 }) 
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "Neural feedback empty.";
      } catch (e) { 
          return `Resonance Error (${provider}): Koneksi gagal. Periksa API Key di .env.`;
      }
  } else {
      // LOGIKA GOOGLE GEMINI
      try {
          const ai = getAI(); 
          const canUseTools = modelName.includes('gemini-3');
          
          const response = await ai.models.generateContent({
              model: modelName, 
              contents: [...history, { role: 'user', parts: [...images, { text: safeMessage }] }],
              config: { 
                  systemInstruction: finalInstruction, 
                  temperature: 1.0, 
                  ...(canUseTools ? { tools: [{ googleSearch: {} }] } : {}) 
              }
          });

          let textOutput = response.text || "";
          const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (grounding && grounding.length > 0) {
              const links = grounding.map((c: any) => c.web?.uri ? `- [${c.web.title || 'Source'}](${c.web.uri})` : null).filter(Boolean);
              if (links.length > 0) textOutput += "\n\n**Fragments found in Irminsul:**\n" + links.join("\n");
          }
          return textOutput || "Resonance achieved, but no data returned.";
      } catch (e: any) { 
          console.error("Gemini Error:", e);
          return `Irminsul Error: API_KEY tidak valid atau limit tercapai.`;
      }
  }
};

export const generateImage = async (prompt: string, personaVisuals: string = "", base64Inputs?: string | string[], referenceImageUrl?: string, preferredModel: string = 'zimage', ratioId: string = "1:1", stylePrompt: string = "", negativePrompt: string = ""): Promise<string | null> => {
  try { checkRateLimit(); } catch(e) { return null; }
  const context = getDynamicVisualContext(prompt);
  const ratio = ASPECT_RATIOS.find(r => r.id === ratioId) || ASPECT_RATIOS[0];
  const finalPrompt = `[STYLE: ${stylePrompt}] [PERSONA: ${personaVisuals}] [CONTEXT: ${context.state}, ${context.outfitType}] Action: ${prompt}. Quality: ${QUALITY_TAGS}. Neg: ${negativePrompt}`;

  try {
    const key = getApiKeyForProvider('pollinations');
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://gen.pollinations.ai/image/prompt/${encodeURIComponent(finalPrompt)}?model=${preferredModel}&width=${ratio.width}&height=${ratio.height}&seed=${seed}&nologo=true`;
    const res = await fetch(url, { headers: key ? { "Authorization": `Bearer ${key}` } : {} });
    if (res.ok) return url;
  } catch (e) { console.warn("Pollinations failed, trying Google..."); }

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
  } catch (e) { console.error("Visual Alchemy failed completely."); }
  return null;
};

export const generateVideo = async (prompt: string, base64Input?: string, model: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
  checkRateLimit();
  const apiKey = process.env.API_KEY;
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
      const response = await fetch(`${videoUri}&key=${apiKey}`);
      return URL.createObjectURL(await response.blob());
    }
  } catch (e) { throw e; }
  return null;
};

export const generateTTS = async (text: string, voiceName: string, voiceConfig?: VoiceConfig) => {
  try {
    const ai = getAI();
    const cleanText = text.replace(/\|\|GEN_IMG:.*?\|\|/g, '').replace(/(https?:\/\/[^\s]+)/g, '').replace(/[*#`_~]/g, '').trim();
    if (!cleanText) return null;
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
  try {
    const ai = getAI(); 
    const response = await ai.models.generateContent({
        model: FALLBACK_GOOGLE_MODEL, 
        contents: `Translate to ${targetLang}: "${text}"`,
        config: { systemInstruction: "Output ONLY translated text.", temperature: 1.0 }
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
        parts: [{ inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/jpeg', data } }, { text: "DEEP_VISION_ANALYSIS: Analyze this character image using Google Vision logic. Extract: {name, description, personality, background, speechStyle, visualSummary, voiceSuggestion}. Format as JSON." }]
      },
      config: { 
          responseMimeType: "application/json", 
          responseSchema: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, personality: { type: Type.STRING }, background: { type: Type.STRING }, speechStyle: { type: Type.STRING }, visualSummary: { type: Type.STRING }, voiceSuggestion: { type: Type.STRING } } }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { throw e; }
};
