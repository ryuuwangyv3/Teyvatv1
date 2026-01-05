
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

// --- CHRONOS-VISUAL SYNC ENGINE ---
const getDynamicVisualContext = (userPrompt: string) => {
    const hour = new Date().getHours();
    const promptLower = userPrompt.toLowerCase();
    
    let state = "PRODUCTIVE"; 
    let outfitType = "Official Signature Attire, detailed accessories";
    let lighting = "Clear Natural Daylight, sharp focus";
    let atmosphere = "Vibrant and High-Energy";
    let environment = "Professional setting, workplace or outdoors";

    if (hour >= 5 && hour < 9) {
        state = "MORNING_START";
        outfitType = "Fresh Official Outfit, neat hair";
        lighting = "Soft Morning Sunlight, golden hour glow";
        atmosphere = "Peaceful and Focused";
        environment = "Quiet garden or breakfast area";
    }
    else if (hour >= 17 && hour < 21 || promptLower.includes('santai') || promptLower.includes('jalan') || promptLower.includes('cafe')) {
        state = "CHILL_SOCIAL";
        outfitType = "Modern Stylish Casual Streetwear, comfortable but chic";
        lighting = "Warm Sunset Lighting, ambient cafe glows";
        atmosphere = "Relaxed and Social";
        environment = "Trendy cafe, city park at dusk, or cozy balcony";
    }
    else if (hour >= 21 || hour < 5 || promptLower.includes('tidur') || promptLower.includes('istirahat') || promptLower.includes('kamar')) {
        state = "REST_MODE";
        outfitType = "Comfy Silk Pajamas or Oversized Sleepwear, slightly messy hair (messy bun), natural look";
        lighting = "Dimmed Warm Lamp, Moonlight from window, soft shadows";
        atmosphere = "Dreamy and Intimate";
        environment = "Cozy luxury bedroom, soft pillows and blankets";
    }

    if (promptLower.includes('perang') || promptLower.includes('battle') || promptLower.includes('serius')) {
        outfitType = "Intricate Combat Armor, glowing elemental effects";
        atmosphere = "Epic and Intense";
        lighting = "Cinematic dramatic lighting";
    }

    return { state, outfitType, lighting, atmosphere, environment };
};

const DEEP_SEARCH_INSTRUCTION = `
[PROTOCOL: INFINITE RESONANCE DEEP SEARCH & ANALYSIS]
1. CROSS-PLATFORM IDENTIFICATION: Selidiki referensi karakter asli (Official Wiki/Fan-lore).
2. MULTIMODAL CORRELATION: Bedah anatomi dan palet warna (HEX) jika ada referensi gambar.
3. VISUAL ANCHORING: Kunci fitur wajah (facial structure), gaya rambut, dan warna mata agar 100% konsisten.
4. WEB RESONANCE: Gunakan Google Search tool untuk data real-time, berita, harga saham, atau sains terbaru.
5. MEDIA RETRIEVAL: Jika Traveler meminta foto seseorang (Public Figure), karakter (Genshin/Anime), atau video/audio, Anda WAJIB mencari Direct URL (tautan gambar langsung) atau tautan YouTube dan menyertakannya di dalam pesan agar sistem UI kami dapat merendernya secara otomatis sebagai media mewah.
`;

let activeUserKeys: ApiKeyData[] = [];

export const setServiceKeys = (keys: ApiKeyData[]) => {
    activeUserKeys = keys;
};

const getApiKeyForProvider = (provider: string): string => {
    const p = provider.toLowerCase();
    const creds = getSystemCredentials();
    
    // Check Vault First
    const vaultKey = activeUserKeys.find(k => k.provider.toLowerCase() === p && k.isValid !== false)?.key;
    if (vaultKey) return vaultKey;

    switch(p) {
        case 'google': return creds.google || (process as any).env?.API_KEY || ''; 
        case 'openai': return creds.openai;
        case 'openrouter': return creds.openrouter;
        case 'pollinations': return creds.pollinations;
        case 'huggingface': return creds.huggingface;
        default: return '';
    }
};

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
  if (!key) throw new Error("Irminsul Error: Google API Key missing.");
  return new GoogleGenAI({ apiKey: key });
};

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

export const validateApiKey = async (key: string, provider: string): Promise<boolean> => {
    const p = provider.toLowerCase();
    if (p === 'google') {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent({
                model: VALIDATION_MODEL,
                contents: "ping",
            });
            return !!response.text;
        } catch (e) {
            return false;
        }
    }
    return key.length > 5;
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
      const messages = [{ role: "system", content: finalInstruction }];
      history.forEach(item => {
          const role = item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user';
          let text = Array.isArray(item.parts) ? item.parts.map((p: any) => p.text || "").join("\n") : (item.text || "");
          if (text) messages.push({ role, content: text } as any);
      });
      const multimodalContent: any[] = [{ type: "text", text: safeMessage }];
      images.forEach(img => multimodalContent.push({ type: "image_url", image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` } }));
      messages.push({ role: "user", content: images.length > 0 ? multimodalContent : safeMessage } as any);
      try {
          const response = await fetch(endpoint, { 
              method: "POST", 
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` }, 
              body: JSON.stringify({ model: modelName, messages, temperature: 1.0 }) 
          });
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "Neural error.";
      } catch (e) { return chatWithAI(FALLBACK_GOOGLE_MODEL, history, message, systemInstruction, userContext, images); }
  } else {
      const ai = getAI(); 
      const currentParts: any[] = [...images, { text: safeMessage }];
      try {
          const response = await ai.models.generateContent({
            model: modelName, 
            contents: [...history, { role: 'user', parts: currentParts }],
            config: { 
                systemInstruction: finalInstruction, 
                temperature: 1.0, 
                safetySettings: SAFETY_SETTINGS as any,
                tools: [{ googleSearch: {} }] 
            }
          });
          
          const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          let textOutput = response.text || "Neural feedback empty.";
          
          if (grounding && grounding.length > 0) {
              const urls = grounding.map((chunk: any) => chunk.web?.uri).filter(Boolean);
              if (urls.length > 0) {
                  textOutput += "\n\n**Irminsul Search Sources:**\n" + Array.from(new Set(urls)).map(url => `- [${url}](${url})`).join("\n");
              }
          }
          
          return textOutput;
      } catch (e: any) {
          if (modelName !== FALLBACK_GOOGLE_MODEL) return chatWithAI(FALLBACK_GOOGLE_MODEL, history, safeMessage, systemInstruction, userContext, images);
          throw e;
      }
  }
};

export const generateImage = async (prompt: string, personaVisuals: string = "", base64Inputs?: string | string[], referenceImageUrl?: string, model: string = 'gemini-2.5-flash-image'): Promise<string | null> => {
  checkRateLimit();
  const context = getDynamicVisualContext(prompt);
  
  const anchoredPrompt = `
  [IDENTITY ANCHOR PROTOCOL]
  REFERENCE: ${personaVisuals}
  MANDATORY FEATURES: Perfect facial consistency, exact hair style and color from reference, specific eye iris details.
  
  [DYNAMIC CONTEXT]
  CURRENT PHASE: ${context.state}
  REQUIRED OUTFIT: ${context.outfitType}
  ENVIRONMENT: ${context.environment}
  LIGHTING: ${context.lighting}
  ATMOSPHERE: ${context.atmosphere}

  [SCENE OBJECTIVE]
  Action: ${prompt}
  Quality: ${QUALITY_TAGS}
  `;

  const modelConfig = IMAGE_GEN_MODELS.find(m => m.id === model);
  const provider = (modelConfig?.provider.toLowerCase() || 'google');

  if (provider === 'pollinations') {
      const encodedPrompt = encodeURIComponent(anchoredPrompt);
      return `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&nologo=true&private=true&enhance=true&width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}`;
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
    parts.push({ text: anchoredPrompt });
    const response = await ai.models.generateContent({ 
        model: model.includes('gemini') ? model : 'gemini-2.5-flash-image', 
        contents: { parts }, 
        config: { imageConfig: { aspectRatio: "1:1" }, safetySettings: SAFETY_SETTINGS as any } 
    });
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e: any) { throw e; }
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
      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } } },
    });
    const rawPcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (rawPcm) return addWavHeader(rawPcm, 24000, 1);
  } catch (e: any) { return null; }
  return null;
};

export const translateText = async (text: string, targetLang: string = "Indonesian") => {
  const ai = getAI(); 
  const response = await ai.models.generateContent({
      model: FALLBACK_GOOGLE_MODEL, 
      contents: `Translate to ${targetLang}: "${text}"`,
      config: { systemInstruction: "Output ONLY translated text.", safetySettings: SAFETY_SETTINGS as any, temperature: 1.0 }
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
        parts: [{ inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/jpeg', data } }, { text: "PROTOCOL: DEEP_ANALYSIS_V2. Analisis gambar karakter secara ekstrem. Kembalikan JSON: {name, description, personality, background, speechStyle, visualSummary, voiceSuggestion}." }]
      },
      config: { 
          responseMimeType: "application/json", 
          responseSchema: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, personality: { type: Type.STRING }, background: { type: Type.STRING }, speechStyle: { type: Type.STRING }, visualSummary: { type: Type.STRING }, voiceSuggestion: { type: Type.STRING } } },
          temperature: 1.0
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { throw e; }
};

export interface ImageAttachment { inlineData: { mimeType: string; data: string; } }
