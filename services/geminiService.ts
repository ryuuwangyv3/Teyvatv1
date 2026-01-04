
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { APP_KNOWLEDGE_BASE, QUALITY_TAGS, AI_MODELS, IMAGE_GEN_MODELS, VIDEO_GEN_MODELS } from '../data';
import { VoiceConfig, ApiKeyData } from '../types';
import { addWavHeader } from '../utils/audioUtils';
import { getSystemCredentials } from './credentials';
import { sanitizeInput } from './securityService';

const SITE_URL = "https://akashaai.netlify.app/";
const SITE_NAME = "AkashaAI V7.8";
const FALLBACK_GOOGLE_MODEL = 'gemini-3-flash-preview'; 

// --- SECURITY: RATE LIMITING ---
const requestLogs: number[] = [];
const MAX_REQUESTS = 15; // Increased for better user experience
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

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
 * Enhanced Prompt Engineering
 */
const enhancePrompt = (prompt: string, type: 'image' | 'video', personaVisuals: string = "") => {
    const basePrompt = sanitizeInput(prompt).trim();
    
    if (type === 'image') {
        const qualityCore = "masterpiece, best quality, ultra-detailed, 8k resolution, highly polished, professional digital art, sharp focus, aesthetic excellence";
        const lightingAtmosphere = "cinematic lighting, dynamic shadows, vibrant colors, ray tracing reflections, glowing elemental particles";
        const styleTags = "official anime art style, genshin impact aesthetic, beautiful rendering, trending on pixiv";
        const characterBlock = personaVisuals ? `(Character Traits: ${personaVisuals}), ` : "";
        return `${qualityCore}, ${characterBlock}Scene: ${basePrompt}, ${lightingAtmosphere}, ${styleTags}, 8k wallpaper.`;
    } else {
        return `masterpiece, high-quality cinematic video, 4k, ${personaVisuals ? `subject: ${personaVisuals},` : ""} scene: ${basePrompt}, smooth motion, volumetric lighting, unreal engine 5 render, cinematic 8k.`;
    }
};

const robustFetch = async (url: string, options: RequestInit) => {
    try {
        const response = await fetch(url, options);
        // If API returns an error status (like 429 or 503), try to proxy it as a last resort
        if (!response.ok && response.status !== 401 && response.status !== 404) {
            throw new Error(`HTTP_${response.status}`);
        }
        return response;
    } catch (e: any) {
        const isNetworkError = e.message === 'Failed to fetch' || e.message.includes('NetworkError') || e.message.startsWith('HTTP_');
        
        if (isNetworkError) {
            try {
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                const proxyResponse = await fetch(proxyUrl, options);
                if (!proxyResponse.ok) throw new Error("Proxy failed");
                return proxyResponse;
            } catch (proxyErr) {
                throw new Error("Irminsul connection lost. Please check your internet or API Key status.");
            }
        }
        throw e;
    }
};

export const validateApiKey = async (key: string, provider: 'google' | 'openai' | 'huggingface' | 'openrouter' | 'pollinations'): Promise<boolean> => {
    if (provider === 'google') return validateGoogleKey(key);
    if (provider === 'pollinations') return true; 
    if (provider === 'huggingface') return validateHFKey(key);
    if (provider === 'openrouter') return validateOpenRouterKey(key);
    return validateOpenAIKey(key);
};

const validateGoogleKey = async (key: string): Promise<boolean> => {
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    await ai.models.generateContent({ model: FALLBACK_GOOGLE_MODEL, contents: 'ping' });
    return true;
  } catch (e: any) { return false; }
};

const validateOpenAIKey = async (key: string): Promise<boolean> => {
    try {
        const response = await fetch("https://api.openai.com/v1/models", { 
            method: "GET", 
            headers: { "Authorization": `Bearer ${key}` } 
        });
        return response.ok;
    } catch (e) { return true; }
};

const validateOpenRouterKey = async (key: string): Promise<boolean> => {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/auth/key", { 
            method: "GET", 
            headers: getAuthHeaders(key, 'openrouter') 
        });
        return response.ok;
    } catch (e) { return true; }
};

const validateHFKey = async (key: string): Promise<boolean> => {
    try {
        const response = await fetch("https://huggingface.co/api/whoami-v2", { headers: { Authorization: `Bearer ${key}` } });
        return response.ok;
    } catch (e) { return false; }
};

export interface ImageAttachment {
  inlineData: {
    mimeType: string;
    data: string;
  }
}

const urlToBase64 = async (url: string): Promise<string | null> => {
    try {
        let response = await fetch(url).catch(() => null);
        if (!response || !response.ok) response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error("Fetch failed");
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) { return null; }
};

const getDynamicUserContext = (): string => {
    const now = new Date();
    const day = now.toLocaleDateString(undefined, { weekday: 'long' });
    return `[REAL-TIME] Time: ${now.toLocaleTimeString()}, Day: ${day}.`;
};

const convertHistoryToOpenAI = (history: any[], systemInstruction: string) => {
    const messages: { role: string; content: any }[] = [
        { role: "system", content: systemInstruction }
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
  const finalInstruction = `${APP_KNOWLEDGE_BASE}\n${getDynamicUserContext()}\n${systemInstruction}`;
  const modelConfig = AI_MODELS.find(m => m.id === modelName);
  const provider = modelConfig?.provider || 'google';
  const credentials = getSystemCredentials();

  // Prepare multimodal content for OpenAI-compatible providers
  const multimodalContent: any[] = [{ type: "text", text: safeMessage }];
  images.forEach(img => {
      multimodalContent.push({
          type: "image_url",
          image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` }
      });
  });

  if (provider === 'pollinations' || provider === 'openrouter' || provider === 'openai') {
      const apiKey = provider === 'pollinations' ? credentials.pollinations : 
                     provider === 'openrouter' ? credentials.openrouter : credentials.openai;
      
      const endpoint = provider === 'pollinations' ? "https://gen.pollinations.ai/v1/chat/completions" : 
                       provider === 'openrouter' ? "https://openrouter.ai/api/v1/chat/completions" : 
                       "https://api.openai.com/v1/chat/completions";

      const messages = convertHistoryToOpenAI(history, finalInstruction);
      messages.push({ 
          role: "user", 
          content: images.length > 0 ? multimodalContent : safeMessage 
      });

      try {
          const response = await robustFetch(endpoint, {
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
          if (!response.ok) throw new Error(data.error?.message || `${provider} Connection Fault (${response.status})`);
          
          const content = data.choices?.[0]?.message?.content;
          if (!content) throw new Error("Energy response from Irminsul was empty.");
          
          return content;
      } catch (e: any) {
          console.error(`${provider} Error:`, e);
          // If external provider fails, try fallback to Google Gemini
          return chatWithAI(FALLBACK_GOOGLE_MODEL, history, message, systemInstruction, userContext, images);
      }
  } else {
      // DEFAULT: GOOGLE NATIVE
      const ai = getAI(); 
      const currentParts: any[] = [...images, { text: safeMessage }];
      try {
          const response = await ai.models.generateContent({
            model: modelName, 
            contents: [...history, { role: 'user', parts: currentParts }],
            config: { systemInstruction: finalInstruction, temperature: 0.9, safetySettings: SAFETY_SETTINGS as any }
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
  const highFidelityPrompt = enhancePrompt(prompt, 'image', personaVisuals);
  const modelConfig = IMAGE_GEN_MODELS.find(m => m.id === model);
  const provider = modelConfig?.provider.toLowerCase() || 'google';

  if (provider === 'pollinations') {
      const credentials = getSystemCredentials();
      const apiKey = credentials.pollinations;
      const encodedPrompt = encodeURIComponent(highFidelityPrompt);
      const authParam = apiKey ? `&auth=${apiKey}` : "";
      return `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&nologo=true&private=true&enhance=true&width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}${authParam}`;
  }

  if (provider === 'openrouter') {
      const credentials = getSystemCredentials();
      const apiKey = credentials.openrouter;
      const contents: any[] = [{ type: 'text', text: highFidelityPrompt }];
      if (base64Inputs) {
          const inputs = Array.isArray(base64Inputs) ? base64Inputs : [base64Inputs];
          inputs.forEach(base64 => { contents.push({ type: 'image_url', image_url: { url: base64 } }); });
      }
      const response = await robustFetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: getAuthHeaders(apiKey, 'openrouter'),
          body: JSON.stringify({
              model: model,
              messages: [{ role: 'user', content: contents }],
              max_tokens: 1024,
              modalities: ['image', 'text'],
          }),
      });
      const data = await response.json();
      if (data.choices?.[0]?.message?.images?.[0]?.image_url?.url) return data.choices[0].message.images[0].image_url.url;
      throw new Error(data.error?.message || "OpenRouter Visual Resonance Failure");
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
    } else if (referenceImageUrl) {
        const avatarBase64 = await urlToBase64(referenceImageUrl);
        if (avatarBase64) {
            const [header, data] = avatarBase64.split(',');
            parts.push({ inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/png', data } });
        }
    }
    parts.push({ text: highFidelityPrompt });
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
  } catch (e: any) {
      if (model.includes('gemini')) return generateImage(prompt, personaVisuals, base64Inputs, referenceImageUrl, 'turbo');
      throw e;
  }
  return null;
};

export const generateVideo = async (prompt: string, base64Input?: string, model: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
  checkRateLimit();
  const credentials = getSystemCredentials();
  const highFidelityPrompt = enhancePrompt(prompt, 'video');
  const modelConfig = VIDEO_GEN_MODELS.find(m => m.id === model);
  const isPollinations = modelConfig?.provider.toLowerCase() === 'pollinations';

  if (isPollinations) {
       const response = await robustFetch("https://gen.pollinations.ai/v1/chat/completions", {
           method: "POST",
           headers: getAuthHeaders(credentials.pollinations, 'pollinations'),
           body: JSON.stringify({ 
               model: model, 
               messages: [{ role: "user", content: highFidelityPrompt }], 
               modalities: ['video'],
               temperature: 0.7
           })
       });
       const data = await response.json();
       if (data.choices?.[0]?.message?.content) return data.choices[0].message.content; 
       return null;
  }

  const ai = getAI();
  try {
    let imageInput: any = undefined;
    if (base64Input) {
        const [header, data] = base64Input.split(',');
        imageInput = { imageBytes: data, mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' };
    }
    let operation = await ai.models.generateVideos({ 
      model: 'veo-3.1-fast-generate-preview', 
      prompt: highFidelityPrompt, 
      image: imageInput, 
      config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' } 
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation});
    }
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
      const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) { throw e; }
  return null;
};

export const generateTTS = async (text: string, voiceName: string, voiceConfig?: VoiceConfig) => {
  const ai = getAI();
  const cleanText = text.replace(/\|\|GEN_IMG:.*?\|\|/g, '').replace(/(https?:\/\/[^\s]+)/g, '').replace(/[*#`_~]/g, '').trim();
  if (!cleanText || cleanText.length < 1) return null;

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
  const cleanText = text.replace(/\|\|GEN_IMG:.*?\|\|/g, '').trim();
  try {
    const response = await ai.models.generateContent({
      model: FALLBACK_GOOGLE_MODEL, 
      contents: `Translate to ${targetLang}: "${cleanText}"`,
      config: { 
          systemInstruction: "Highly precise translator. Output ONLY translated text.",
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
        parts: [{ inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/jpeg', data } }, { text: "Analyze character image. Return JSON: {name, description, personality, background, speechStyle, visualSummary, voiceSuggestion}." }]
      },
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, personality: { type: Type.STRING }, background: { type: Type.STRING }, speechStyle: { type: Type.STRING }, visualSummary: { type: Type.STRING }, voiceSuggestion: { type: Type.STRING, enum: ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"] } } } }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) { throw e; }
};
