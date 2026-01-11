
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AI_MODELS, ASPECT_RATIOS, QUALITY_TAGS } from '../data';
import { ApiKeyData, VoiceConfig } from '../types';
import { addWavHeader } from '../utils/audioUtils';

// --- TYPES ---
// Export ImageAttachment for multimodal parts
export interface ImageAttachment {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

// --- CONFIGURATION ---
const SITE_URL = "https://akashaai.netlify.app/";
const SITE_NAME = "Akasha Terminal";

// Runtime storage for non-google keys
let runtimeKeys: ApiKeyData[] = [];
export const setServiceKeys = (keys: ApiKeyData[]) => {
    runtimeKeys = keys;
};

// Helper to get key for specific provider
const getKey = (provider: string): string => {
    if (provider.toLowerCase() === 'google') return process.env.API_KEY || '';
    const found = runtimeKeys.find(k => k.provider.toLowerCase() === provider.toLowerCase());
    return found ? found.key : '';
};

/**
 * GOOGLE GEMINI PROTOCOL (SDK BASED)
 */
const handleGoogleText = async (model: string, contents: any[], systemInstruction: string) => {
    const ai = new GoogleGenAI({ apiKey: getKey('google') });
    const response = await ai.models.generateContent({
        model,
        contents,
        config: {
            systemInstruction,
            temperature: 1.0,
            // Search Grounding for Gemini 3
            ...(model.includes('gemini-3') ? { tools: [{ googleSearch: {} }] } : {})
        }
    });

    let text = response.text || "";
    
    // Extract Grounding Metadata
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
        const links = chunks
            .map((c: any) => c.web?.uri ? `- [${c.web.title || 'Source'}](${c.web.uri})` : null)
            .filter(Boolean);
        if (links.length > 0) {
            text += "\n\n**Fragments recovered from Irminsul:**\n" + Array.from(new Set(links)).join("\n");
        }
    }
    return text;
};

/**
 * REST PROTOCOL (OpenAI / OpenRouter / Pollinations)
 */
const handleRestText = async (provider: string, model: string, messages: any[]) => {
    const apiKey = getKey(provider);
    let endpoint = "";
    
    if (provider === 'pollinations') endpoint = "https://text.pollinations.ai/v1/chat/completions";
    else if (provider === 'openrouter') endpoint = "https://openrouter.ai/api/v1/chat/completions";
    else endpoint = "https://api.openai.com/v1/chat/completions";

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}),
            ...(provider === 'openrouter' ? { "HTTP-Referer": SITE_URL, "X-Title": SITE_NAME } : {})
        },
        body: JSON.stringify({
            model: provider === 'pollinations' ? (model === 'openai' ? 'gpt-4o' : model) : model,
            messages,
            temperature: 0.8
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Celestial Link Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
};

/**
 * UNIFIED CHAT INTERFACE
 */
export const chatWithAI = async (
    modelId: string, 
    history: any[], 
    message: string, 
    systemInstruction: string,
    userContext: string = "",
    images: any[] = []
): Promise<string> => {
    const modelCfg = AI_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();

    // Prepare system prompt
    const finalSystem = `${systemInstruction}\nContext: ${userContext}`;

    if (provider === 'google') {
        // SDK Format
        const contents = [
            ...history,
            { role: 'user', parts: [...images, { text: message }] }
        ];
        return await handleGoogleText(modelId, contents, finalSystem);
    } else {
        // OpenAI Format
        const messages = [{ role: "system", content: finalSystem }];
        history.forEach(h => {
            messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text });
        });

        // Handle multimodal for REST (simple check)
        let userContent: any = message;
        if (images.length > 0 && (modelId.includes('gpt-4o') || provider === 'pollinations')) {
            userContent = [{ type: "text", text: message }];
            images.forEach(img => {
                userContent.push({ 
                    type: "image_url", 
                    image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` } 
                });
            });
        }
        messages.push({ role: "user", content: userContent });

        return await handleRestText(provider, modelId, messages);
    }
};

/**
 * IMAGE GENERATION INTERFACE
 */
export const generateImage = async (
    prompt: string, 
    personaVisuals: string = "", 
    inputImages?: string[], 
    _unused?: any, 
    modelId: string = 'flux', 
    aspectRatio: string = "1:1",
    stylePrompt: string = "",
    negativePrompt: string = ""
): Promise<string | null> => {
    const isGoogle = modelId.includes('gemini');
    let finalPrompt = `[SUBJECT: ${personaVisuals}] Action: ${prompt}. Style: ${stylePrompt}. Quality: ${QUALITY_TAGS}`;
    if (negativePrompt) {
        finalPrompt += ` [NEGATIVE: ${negativePrompt}]`;
    }

    if (isGoogle) {
        try {
            const ai = new GoogleGenAI({ apiKey: getKey('google') });
            const response = await ai.models.generateContent({
                model: modelId,
                contents: { parts: [{ text: finalPrompt }] },
                config: { imageConfig: { aspectRatio: aspectRatio as any } }
            });
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        } catch (e) { console.error("Google Image Error:", e); }
    }

    // Pollinations Fallback
    const ratio = ASPECT_RATIOS.find(r => r.id === aspectRatio) || { width: 1024, height: 1024 };
    const seed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?model=${modelId}&width=${ratio.width}&height=${ratio.height}&seed=${seed}&nologo=true`;
};

/**
 * VIDEO GENERATION INTERFACE
 */
export const generateVideo = async (prompt: string, base64Image?: string, model: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    const key = getKey('google');
    if (!key) return null;
    const ai = new GoogleGenAI({ apiKey: key });

    try {
        let imagePart = undefined;
        if (base64Image) {
            const [header, data] = base64Image.split(',');
            imagePart = { imageBytes: data, mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' };
        }

        let operation = await ai.models.generateVideos({
            model,
            prompt: `Cinematic animation of: ${prompt}`,
            image: imagePart,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });

        while (!operation.done) {
            await new Promise(r => setTimeout(r, 10000));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            const res = await fetch(`${videoUri}&key=${key}`);
            const blob = await res.blob();
            return URL.createObjectURL(blob);
        }
    } catch (e) { console.error("Veo Synthesis Failure:", e); }
    return null;
};

/**
 * TTS INTERFACE
 */
export const generateTTS = async (text: string, voiceName: string, config?: VoiceConfig) => {
    try {
        const ai = new GoogleGenAI({ apiKey: getKey('google') });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text.substring(0, 1000) }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } }
                }
            }
        });
        const rawPcm = response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
        if (rawPcm) return addWavHeader(rawPcm, 24000, 1);
    } catch (e) { console.error("TTS Node Offline:", e); }
    return null;
};

/**
 * TRANSLATION INTERFACE
 * Added missing translation utility for the terminal.
 */
export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getKey('google') });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following text to ${targetLanguage}. Return ONLY the translated text without explanations:\n\n${text}`,
    });
    return response.text || text;
};

/**
 * PERSONA ANALYSIS INTERFACE
 * Extracted missing utility for character manifestation from images.
 */
export const analyzePersonaFromImage = async (base64Data: string) => {
    const ai = new GoogleGenAI({ apiKey: getKey('google') });
    const [header, data] = base64Data.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType, data } },
                { text: "Analyze the character in this image. Extract their name, a short description, their personality traits, background lore, and a suitable speech style. Also suggest a voice name from: Kore, Puck, Charon, Fenrir, Zephyr. Provide a visual summary for image generation." }
            ]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    personality: { type: Type.STRING },
                    background: { type: Type.STRING },
                    speechStyle: { type: Type.STRING },
                    voiceSuggestion: { type: Type.STRING },
                    visualSummary: { type: Type.STRING }
                },
                required: ['name', 'description', 'personality', 'background', 'speechStyle', 'voiceSuggestion', 'visualSummary']
            }
        }
    });
    
    return JSON.parse(response.text || "{}");
};

export const validateApiKey = async (key: string, provider: string): Promise<boolean> => {
    if (provider === 'google') {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'ping', config: { maxOutputTokens: 10 } });
            return true;
        } catch { return false; }
    }
    return key.length > 5;
};
