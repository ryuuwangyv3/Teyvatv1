
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AI_MODELS, ASPECT_RATIOS, QUALITY_TAGS } from '../data';
import { ApiKeyData, VoiceConfig } from '../types';
import { addWavHeader } from '../utils/audioUtils';

// --- ACTIVATED CREDENTIALS (CELESTIAL HUB) ---
const DEFAULTS = {
    GOOGLE: "AIzaSyCWFLagWil_s7OFUsBAjBrGsp5OYKLsb6U",
    OPENAI: "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",
    OPENROUTER: "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",
    POLLINATIONS: "sk_qM87JYMwNGfqoGKf6vQ5iHEIEUhBDu3x"
};

export interface ImageAttachment {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

let runtimeKeys: ApiKeyData[] = [];
export const setServiceKeys = (keys: ApiKeyData[]) => { runtimeKeys = keys; };

const getProviderKey = (provider: string): string => {
    const p = provider.toLowerCase();
    // Prioritas: Hardcoded Defaults -> Runtime Keys -> Env
    if (p === 'google') return DEFAULTS.GOOGLE || process.env.API_KEY || '';
    if (p === 'openai') return DEFAULTS.OPENAI;
    if (p === 'openrouter') return DEFAULTS.OPENROUTER;
    if (p === 'pollinations') return DEFAULTS.POLLINATIONS;
    
    const found = runtimeKeys.find(k => k.provider.toLowerCase() === p);
    return found ? found.key : '';
};

/**
 * GOOGLE SDK PROTOCOL (GEMINI 3.0)
 */
const handleGoogleRequest = async (model: string, contents: any[], systemInstruction: string) => {
    const ai = new GoogleGenAI({ apiKey: getProviderKey('google') });
    const response = await ai.models.generateContent({
        model,
        contents,
        config: {
            systemInstruction,
            temperature: 1.0,
            ...(model.includes('gemini-3') ? { tools: [{ googleSearch: {} }] } : {})
        }
    });

    let text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
        const links = chunks.map((c: any) => c.web?.uri ? `- [${c.web.title || 'Source'}](${c.web.uri})` : null).filter(Boolean);
        if (links.length > 0) text += "\n\n**Fragments recovered from Irminsul:**\n" + Array.from(new Set(links)).join("\n");
    }
    return text;
};

/**
 * REST PROTOCOL (OPENAI / OPENROUTER / POLLINATIONS)
 */
const handleRestRequest = async (provider: string, model: string, messages: any[]) => {
    const apiKey = getProviderKey(provider);
    let endpoint = "https://api.openai.com/v1/chat/completions";
    
    if (provider === 'pollinations') endpoint = "https://text.pollinations.ai/v1/chat/completions";
    else if (provider === 'openrouter') endpoint = "https://openrouter.ai/api/v1/chat/completions";

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}),
            ...(provider === 'openrouter' ? { "HTTP-Referer": "https://akashaai.netlify.app/", "X-Title": "Akasha Terminal" } : {})
        },
        body: JSON.stringify({
            model: provider === 'pollinations' ? (model === 'openai' ? 'gpt-4o' : model) : model,
            messages,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Celestial Bridge Failure: ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Transmission lost.";
};

/**
 * TEXT & CHAT INTERFACE
 */
export const chatWithAI = async (modelId: string, history: any[], message: string, systemInstruction: string, userContext: string = "", images: ImageAttachment[] = []) => {
    const modelCfg = AI_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    const finalSystem = `${systemInstruction}\nContext: ${userContext}`;

    if (provider === 'google') {
        const contents = [...history, { role: 'user', parts: [...images, { text: message }] }];
        return await handleGoogleRequest(modelId, contents, finalSystem);
    } else {
        const messages: any[] = [{ role: "system", content: finalSystem }];
        history.forEach(h => messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts?.[0]?.text || "" }));
        
        let userContent: any = message;
        if (images.length > 0 && (modelId.includes('gpt-4o') || provider === 'pollinations')) {
            userContent = [{ type: "text", text: message }];
            images.forEach(img => userContent.push({ type: "image_url", image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` } }));
        }
        messages.push({ role: "user", content: userContent });
        return await handleRestRequest(provider, modelId, messages);
    }
};

/**
 * IMAGE SYNTHESIS
 */
export const generateImage = async (prompt: string, personaVisuals: string = "", inputImages?: string[], _u?: any, modelId: string = 'flux', aspectRatio: string = "1:1", style: string = "", negative: string = ""): Promise<string | null> => {
    const isGoogle = modelId.includes('gemini');
    const finalPrompt = `[SUBJECT: ${personaVisuals}] Action: ${prompt}. Style: ${style}. Quality: ${QUALITY_TAGS} ${negative ? `[NEG: ${negative}]` : ''}`;

    if (isGoogle) {
        try {
            const ai = new GoogleGenAI({ apiKey: getProviderKey('google') });
            const response = await ai.models.generateContent({
                model: modelId,
                contents: { parts: [{ text: finalPrompt }] },
                config: { imageConfig: { aspectRatio: aspectRatio as any } }
            });
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        } catch (e) { console.error("Google Alchemy Fail:", e); }
    }

    const ratio = ASPECT_RATIOS.find(r => r.id === aspectRatio) || { width: 1024, height: 1024 };
    const seed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?model=${modelId}&width=${ratio.width}&height=${ratio.height}&seed=${seed}&nologo=true`;
};

/**
 * TTS INTERFACE
 */
export const generateTTS = async (text: string, voiceName: string, config?: VoiceConfig) => {
    try {
        const ai = new GoogleGenAI({ apiKey: getProviderKey('google') });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text.substring(0, 1500) }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } }
            }
        });
        const rawPcm = response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
        if (rawPcm) return addWavHeader(rawPcm, 24000, 1);
    } catch (e) { console.error("TTS Synthesis Break:", e); }
    return null;
};

// Added generateVideo to geminiService.ts to resolve import error in VideoGen.tsx
export const generateVideo = async (prompt: string, image?: string, modelId: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    try {
        const apiKey = getProviderKey('google');
        const ai = new GoogleGenAI({ apiKey });
        
        const generateParams: any = {
            model: modelId,
            prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        };

        if (image) {
            const [header, data] = image.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            generateParams.image = {
                imageBytes: data,
                mimeType
            };
        }

        let operation = await ai.models.generateVideos(generateParams);
        
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) return null;

        return `${downloadLink}&key=${apiKey}`;
    } catch (e) {
        console.error("Video Synthesis Failure:", e);
        return null;
    }
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: getProviderKey('google') });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate to ${targetLanguage}. Return ONLY result:\n\n${text}`,
    });
    return response.text || text;
};

export const analyzePersonaFromImage = async (base64Data: string) => {
    const ai = new GoogleGenAI({ apiKey: getProviderKey('google') });
    const [header, data] = base64Data.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [{ inlineData: { mimeType, data } }, { text: "Extract character data JSON: name, description, personality, background, speechStyle, voiceSuggestion(Kore/Zephyr/Charon/Fenrir), visualSummary." }]
        },
        config: { responseMimeType: 'application/json' }
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
