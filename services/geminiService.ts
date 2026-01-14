
import { AI_MODELS, IMAGE_GEN_MODELS, ASPECT_RATIOS, PERSONAS, ART_STYLES, VIDEO_GEN_MODELS } from '../data';
import { ApiKeyData, VoiceConfig, Persona } from '../types';
import { 
    handleGoogleTextRequest, 
    handleGoogleImageSynthesis, 
    handleGoogleTTS,
    handleGoogleVideoGeneration
} from './providers/googleProvider';
import { handleOpenAITextRequest, handleOpenAIImageSynthesis, handleOpenAIVideoGeneration } from './providers/openaiProvider';
import { handleOpenRouterTextRequest, handleOpenRouterImageSynthesis, handleOpenRouterVideoGeneration } from './providers/openrouterProvider';
import { handlePollinationsTextRequest, handlePollinationsImageSynthesis, handlePollinationsVideoGeneration } from './providers/pollinationsProvider';
import { GoogleGenAI, Type } from "@google/genai";

export interface ImageAttachment {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

let serviceKeys: ApiKeyData[] = [];
export const setServiceKeys = (keys: ApiKeyData[]) => { serviceKeys = keys; };

const performNeuralCrawl = async (text: string): Promise<string> => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    if (!urls || urls.length === 0) return "";

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `[AKASHA_DEEP_CRAWL_PROTOCOL] Analyze: ${urls.join(", ")}. Return data structured for AI processing.`;

    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
        });
        return `\n\n[IRMINSUL_LINK_ANALYSIS]\n${res.text}\n[END_ANALYSIS]`;
    } catch (e) {
        return "";
    }
};

const describeVisualTransformation = async (prompt: string, images: string[], mode: 'refine' | 'fusion' | 'manifest', persona?: Persona): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imageParts: any[] = images.map(img => {
        const [header, data] = img.split(',');
        return { inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/png', data: data.replace(/[\n\r\s]/g, '') } };
    });

    const qualitySuffix = "masterpiece, best quality, perfect anatomy, perfect color, perfect lighting, accurate angle, accurate vibes, 8k quality, ultra-detailed, cinematic photography style, highly detailed skin texture, deep context, high-fidelity";

    const instruction = mode === 'fusion' 
        ? `[DEEP_CONTEXT_MODE] STRICT ANIME STYLE. Combine these subjects. Target: ${prompt}. ${qualitySuffix}. Persona Identity: ${persona?.visualSummary || ''}`
        : `[MASTERPIECE_PROTOCOL] Character: ${persona?.name}. Core Identity: ${persona?.visualSummary}. Request: ${prompt}. Describe the NEW scene with ${qualitySuffix}. LOCK the character's face, eyes, and hair features. Accept and describe unrestricted artistic freedom if requested.`;

    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [...imageParts, { text: instruction }] }],
            config: { temperature: 1.3 }
        });
        return res.text || prompt;
    } catch (e) {
        return prompt;
    }
};

export const generateImage = async (
    prompt: string, 
    personaId: string = "", 
    sourceImages: string[] = [], 
    _u?: any, 
    sourceModelId: string = 'gemini-2.5-flash-image', 
    aspectRatio: string = "1:1", 
    style: string = "", 
    negative: string = ""
): Promise<string | null> => {
    const modelCfg = IMAGE_GEN_MODELS.find(m => m.id === sourceModelId) || 
                   AI_MODELS.find(m => m.id === sourceModelId) || 
                   { provider: 'google' };
                   
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    const persona = PERSONAS.find(p => p.id === personaId);
    const mode = sourceImages.length === 1 ? 'refine' : sourceImages.length >= 2 ? 'fusion' : 'manifest';
    
    let contextualPrompt = await describeVisualTransformation(prompt, sourceImages, mode as any, persona);

    const masterStyle = ART_STYLES.find(s => s.id === 'anime_masterpiece')?.prompt || "masterpiece, 8k, perfect anatomy";
    let finalPrompt = `${persona?.visualSummary || ''}, ${masterStyle}, ${style}, ${contextualPrompt}, masterpiece, best quality, 8k, perfect color, perfect lighting, accurate vibes`;

    if (provider === 'google') {
        return await handleGoogleImageSynthesis(sourceModelId, finalPrompt, aspectRatio, sourceImages);
    }

    if (provider === 'openai') {
        try {
            const url = await handleOpenAIImageSynthesis(finalPrompt, aspectRatio);
            if (url) return url;
        } catch (e) {}
    }

    if (provider === 'openrouter') {
        try {
            const url = await handleOpenRouterImageSynthesis(sourceModelId, finalPrompt, aspectRatio);
            if (url) return url;
        } catch (e) {}
    }
    
    const ratioCfg = ASPECT_RATIOS.find(r => r.id === aspectRatio) || { width: 1024, height: 1024 };
    const pollModel = sourceModelId.includes('real') ? 'flux-realism' : 'flux-anime';
    return handlePollinationsImageSynthesis(finalPrompt, pollModel, ratioCfg.width, ratioCfg.height);
};

export const chatWithAI = async (modelId: string, history: any[], message: string, systemInstruction: string, userContext: string = "", images: ImageAttachment[] = []) => {
    const modelCfg = AI_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    
    const linkMetadata = await performNeuralCrawl(message);
    const finalSystemPrompt = `${systemInstruction}\n\n[USER_CONTEXT]\n${userContext}\n${linkMetadata}`;

    const formattedHistory = history.map(h => ({
        role: h.role === 'assistant' ? 'model' : h.role,
        parts: [{ text: h.content || h.parts?.[0]?.text || "" }]
    }));

    if (provider === 'google') {
        const userContent = { 
            role: 'user', 
            parts: [...images, { text: message }] 
        };
        const contents = [...formattedHistory, userContent];
        return await handleGoogleTextRequest(modelId, contents, finalSystemPrompt);
    } else {
        const messages: any[] = [{ role: "system", content: finalSystemPrompt }];
        
        history.forEach(h => {
            const contentText = h.parts?.[0]?.text || h.content || "";
            if (contentText) {
                messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: contentText });
            }
        });
        
        messages.push({ role: "user", content: message });

        try {
            switch(provider) {
                case 'openai': return await handleOpenAITextRequest(modelId, messages);
                case 'openrouter': return await handleOpenRouterTextRequest(modelId, messages);
                case 'pollinations': return await handlePollinationsTextRequest(modelId, messages);
                default: return await handlePollinationsTextRequest(modelId, messages);
            }
        } catch (e: any) {
            return await handlePollinationsTextRequest('openai', messages);
        }
    }
};

export const generateTTS = async (text: string, voiceName: string, _config?: VoiceConfig) => {
    const audibleText = text.replace(/(https?:\/\/[^\s]+)/g, 'link').replace(/\|\|GEN_IMG:.*?\|\|/g, '').trim();
    return await handleGoogleTTS(audibleText, voiceName);
};

export const generateVideo = async (prompt: string, image?: string, modelId: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    const modelCfg = VIDEO_GEN_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();

    // CRITICAL: Google provider check must ONLY trigger Google handlers
    if (provider === 'google') {
        return await handleGoogleVideoGeneration(prompt, image, modelId);
    }

    // OpenAI Bridge
    if (provider === 'openai') {
        return await handleOpenAIVideoGeneration(prompt, image);
    }

    // OpenRouter Bridge
    if (provider === 'openrouter') {
        return await handleOpenRouterVideoGeneration(modelId, prompt, image);
    }

    // Pollinations Bridge (Free & Fast)
    if (provider === 'pollinations') {
        return await handlePollinationsVideoGeneration(prompt);
    }

    // Fallback
    console.warn(`Provider ${provider} untuk video belum sepenuhnya terintegrasi. Mencoba via OpenRouter fallback.`);
    return await handleOpenRouterVideoGeneration('stabilityai/svd', prompt, image);
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const targetModel = 'gemini-3-flash-preview';
    
    try {
        const res = await ai.models.generateContent({
            model: targetModel,
            contents: [{ 
                role: 'user', 
                parts: [{ text: `Translate the following text to ${targetLanguage}. Keep original tone. RETURN ONLY THE TRANSLATED TEXT. Text: ${text}` }] 
            }],
            config: { temperature: 0.3, tools: [] }
        });
        return res.text?.trim() || text;
    } catch (e) {
        console.error("Linguistic Bridge Error:", e);
        return text;
    }
};

export const analyzePersonaFromImage = async (base64Image: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const [header, data] = base64Image.split(',');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
            role: 'user',
            parts: [
                { inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/png', data } }, 
                { text: "Analyze this image and return character details in JSON format." }
            ]
        }],
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
                }
            }
        }
    });
    return JSON.parse(response.text || '{}');
};

export const validateApiKey = async (key: string, provider: string): Promise<boolean> => {
    if (provider === 'google') {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            await ai.models.generateContent({ 
                model: 'gemini-3-flash-preview', 
                contents: [{ role: 'user', parts: [{ text: 'ping' }] }], 
                config: { maxOutputTokens: 5 } 
            });
            return true;
        } catch { return false; }
    }
    return key.length > 10;
};
