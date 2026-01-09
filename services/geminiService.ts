import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { APP_KNOWLEDGE_BASE, QUALITY_TAGS, AI_MODELS, ASPECT_RATIOS } from '../data';
import { VoiceConfig, ApiKeyData } from '../types';
import { addWavHeader } from '../utils/audioUtils';
import { sanitizeInput } from './securityService';

export interface ImageAttachment {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

const SITE_URL = "https://akashaai.netlify.app/";
const SITE_NAME = "Akasha AI Terminal";

// 🌐 CELESTIAL CONSTANTS (FALLBACK KEYS)
const GLOBAL_FALLBACK_GEMINI = "AIzaSyCWFLagWil_s7OFUsBAjBrGsp5OYKLsb6U";
const GLOBAL_FALLBACK_POLLINATIONS = "sk_qM87JYMwNGfqoGKf6vQ5iHEIEUhBDu3x";

let activeUserKeys: ApiKeyData[] = [];
export const setServiceKeys = (keys: ApiKeyData[]) => { activeUserKeys = keys; };

const getApiKeyForProvider = (provider: string): string => {
    const p = provider.toLowerCase();
    
    // Prioritas 1: process.env.API_KEY (Sesuai Pedoman)
    if (p === 'google' || p === 'gemini') {
        return process.env.API_KEY || GLOBAL_FALLBACK_GEMINI;
    }
    
    // Prioritas 2: User-defined keys from UI
    const userKey = activeUserKeys.find(k => k.provider.toLowerCase() === p)?.key;
    if (userKey) return userKey;

    // Prioritas 3: Fallback Constants
    if (p === 'pollinations') return GLOBAL_FALLBACK_POLLINATIONS;
    return "";
};

/**
 * LOGIKA CHAT AI (TEXT & MULTIMODAL)
 */
export const chatWithAI = async (
    modelName: string, 
    history: any[], 
    message: string, 
    systemInstruction: string, 
    userContext: string = "", 
    images: any[] = []
): Promise<string> => {
    const safeMessage = sanitizeInput(message);
    const provider = AI_MODELS.find(m => m.id === modelName)?.provider || 'google';
    const apiKey = getApiKeyForProvider(provider);

    const finalInstruction = `
        ${APP_KNOWLEDGE_BASE}
        [ACTIVE PERSONA CONFIG]
        ${systemInstruction}
        [ENVIRONMENT]
        Context: ${userContext}
    `;

    // --- PROVIDER: GOOGLE (Gemini SDK Standar Terbaru) ---
    if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey });
        const isGemini3 = modelName.includes('gemini-3');

        try {
            const result = await ai.models.generateContent({
                model: modelName,
                contents: [
                    ...history,
                    { role: 'user', parts: [...images, { text: safeMessage }] }
                ],
                config: {
                    systemInstruction: finalInstruction,
                    temperature: 0.9,
                    topP: 0.95,
                    // Gunakan Google Search Grounding jika model mendukung (Gemini 3)
                    ...(isGemini3 ? { tools: [{ googleSearch: {} }] } : {})
                }
            });

            const responseText = result.text || "";
            let groundingInfo = "";

            // Ekstraksi Link dari Google Search Grounding
            const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (chunks && chunks.length > 0) {
                const links = chunks
                    .map((c: any) => c.web?.uri ? `- [${c.web.title || 'Fragmen Memori'}](${c.web.uri})` : null)
                    .filter(Boolean);
                if (links.length > 0) {
                    groundingInfo = "\n\n**Fragments found in Irminsul:**\n" + links.join("\n");
                }
            }

            return responseText + groundingInfo;
        } catch (e: any) {
            console.error("Gemini Resonance Error:", e);
            return `Irminsul Communication Error: ${e.message || "Unknown Anomaly"}`;
        }
    } 
    
    // --- PROVIDER: NON-GOOGLE (POST Method - OpenAI Compatible) ---
    else {
        const endpoint = provider === 'pollinations' 
            ? "https://text.pollinations.ai/v1/chat/completions" 
            : provider === 'openrouter' 
                ? "https://openrouter.ai/api/v1/chat/completions"
                : "https://api.openai.com/v1/chat/completions";

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
                        ...history.map(h => ({ 
                            role: h.role === 'model' ? 'assistant' : 'user', 
                            content: h.parts[0].text 
                        })),
                        { role: "user", content: safeMessage }
                    ]
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.choices?.[0]?.message?.content || "Neural feedback empty.";
        } catch (e: any) {
            return `Resonance Error (${provider.toUpperCase()}): Jalur transmisi terganggu.`;
        }
    }
};

/**
 * LOGIKA GENERATOR GAMBAR (VISUAL ALCHEMY)
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
    const ratio = ASPECT_RATIOS.find(r => r.id === ratioId) || ASPECT_RATIOS[0];
    
    // Membangun prompt yang kuat berdasarkan konteks (PAP vs Imajinasi)
    const finalPrompt = `[STYLE: ${stylePrompt}] [SUBJECT_CORE: ${personaVisuals}] Action: ${prompt}. Quality: ${QUALITY_TAGS}. Neg: ${negativePrompt}`;

    // Gunakan Pollinations Image sebagai primary karena stabilitas endpoint URL-nya
    try {
        const seed = Math.floor(Math.random() * 1000000);
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?model=${preferredModel}&width=${ratio.width}&height=${ratio.height}&seed=${seed}&nologo=true`;
    } catch (e) {
        // Fallback ke Gemini Image jika Pollinations gagal
        try {
            const ai = new GoogleGenAI({ apiKey: getApiKeyForProvider('google') });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: finalPrompt }] },
                config: { imageConfig: { aspectRatio: ratioId as any } }
            });
            
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        } catch (err) {
            console.error("Visual Alchemy failure.");
        }
    }
    return null;
};

/**
 * LOGIKA TTS (VOCAL RESONANCE)
 */
export const generateTTS = async (text: string, voiceName: string, voiceConfig?: VoiceConfig) => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKeyForProvider('google') });
        // Bersihkan teks dari tag internal sebelum disuarakan
        const cleanText = text.replace(/\|\|GEN_IMG:.*?\|\|/g, '').replace(/(https?:\/\/[^\s]+)/g, '').trim();
        if (!cleanText) return null;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: cleanText.substring(0, 1500) }] }],
            config: { 
                responseModalities: [Modality.AUDIO], 
                speechConfig: { 
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } 
                } 
            },
        });

        const rawPcm = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (rawPcm) return addWavHeader(rawPcm, 24000, 1);
    } catch (e) { 
        return null; 
    }
    return null;
};

/**
 * ANALISIS PERSONA DARI GAMBAR
 */
export const analyzePersonaFromImage = async (base64WithHeader: string) => {
    const ai = new GoogleGenAI({ apiKey: getApiKeyForProvider('google') });
    const [header, data] = base64WithHeader.split(',');
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: {
                parts: [
                    { inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/jpeg', data } }, 
                    { text: "Analyze this character image. Output JSON: {name, description, personality, background, speechStyle, visualSummary, voiceSuggestion}." }
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
    } catch (e) { 
        throw e; 
    }
};

/**
 * TERJEMAHAN TEKS (LINGUISTIC PROTOCOL)
 */
export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getApiKeyForProvider('google') });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Translate the following text to ${targetLanguage}. Provide only the translated text: ${text}`,
        });
        return response.text?.trim() || text;
    } catch (e) {
        console.error("Translation Error:", e);
        return text;
    }
};

/**
 * GENERATOR VIDEO (OMNI-CHRONICLE)
 */
export const generateVideo = async (prompt: string, image?: string, model?: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: getApiKeyForProvider('google') });
    try {
        const modelName = model || 'veo-3.1-fast-generate-preview';
        let operation = await ai.models.generateVideos({
            model: modelName,
            prompt: prompt,
            image: image ? {
                imageBytes: image.split(',')[1],
                mimeType: image.split(',')[0].split(':')[1].split(';')[0]
            } : undefined,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            // Append API key for retrieval as per Veo video generation guidelines
            return `${downloadLink}&key=${getApiKeyForProvider('google')}`;
        }
    } catch (e) {
        console.error("Video Generation Error:", e);
        throw e;
    }
    return null;
};

/**
 * VALIDASI API KEY
 */
export const validateApiKey = async (key: string, provider: string): Promise<boolean> => {
    if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey: key });
        try {
            // Test key by calling a simple prompt
            await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: 'Hello',
            });
            return true;
        } catch (e) {
            return false;
        }
    }
    // Simple length check for other providers
    return key.length > 5;
};