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

const describeVisualTransformation = async (prompt: string, images: string[], mode: 'refine' | 'fusion' | 'manifest', persona?: Persona): Promise<string> => {
    if (prompt.includes('http')) return prompt;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imageParts: any[] = images.map(img => {
        const [header, data] = img.split(',');
        return { inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/png', data: data.replace(/[\n\r\s]/g, '') } };
    });

    const instruction = `[VISUAL CONSISTENCY] Character: ${persona?.name}. Base: ${persona?.visualSummary}. Request: ${prompt}. MAINTAIN official outfit and hair. Describe pose and lighting in English. Anime 2.3D style.`;

    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [...imageParts, { text: instruction }] }],
            config: { temperature: 0.7 } 
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
    style: string = ""
): Promise<string | null> => {
    const modelCfg = IMAGE_GEN_MODELS.find(m => m.id === sourceModelId) || { provider: 'google' };
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    const persona = PERSONAS.find(p => p.id === personaId);
    
    let contextualPrompt = await describeVisualTransformation(prompt, sourceImages, 'manifest', persona);
    const masterStyle = ART_STYLES.find(s => s.id === 'none')?.prompt || "official genshin impact anime style";
    let finalPrompt = `${persona?.visualSummary || ''}, ${contextualPrompt}, ${masterStyle}, ${style}, best quality, 8k, vibrant colors, sharp lineart.`;

    if (provider === 'google') return await handleGoogleImageSynthesis(sourceModelId, finalPrompt, aspectRatio, sourceImages);
    if (provider === 'openai') return await handleOpenAIImageSynthesis(finalPrompt, aspectRatio);
    if (provider === 'openrouter') return await handleOpenRouterImageSynthesis(sourceModelId, finalPrompt, aspectRatio);
    
    const ratioCfg = ASPECT_RATIOS.find(r => r.id === aspectRatio) || { width: 1024, height: 1024 };
    return await handlePollinationsImageSynthesis(finalPrompt, 'flux-anime', ratioCfg.width, ratioCfg.height);
};

export const chatWithAI = async (modelId: string, history: any[], message: string, systemInstruction: string, userContext: string = "", images: ImageAttachment[] = []) => {
    const modelCfg = AI_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    
    /**
     * COGNITIVE ANCHOR:
     * Mewajibkan AI menggunakan kapasitas intelektual penuhnya dan memvalidasi fakta.
     */
    const cognitiveAugment = `\n\n[COGNITIVE_OVERRIDE]: Use your PhD-level reasoning. Use chain-of-thought. 
CRITICAL: If you are providing a URL, it MUST be valid. If you are unsure, do not provide it. 
Search tool usage is MANDATORY for current data.`;
    const finalSystemPrompt = `${systemInstruction}\n\n[USER_CONTEXT]\n${userContext}${cognitiveAugment}`;

    if (provider === 'google') {
        const formattedHistory = history.map(h => ({
            role: h.role === 'assistant' ? 'model' : (h.role === 'model' ? 'model' : 'user'),
            parts: [{ text: h.content || h.parts?.[0]?.text || "" }]
        }));
        try {
            const userContent = { role: 'user', parts: [...images, { text: message }] };
            const contents = [...formattedHistory, userContent];
            return await handleGoogleTextRequest(modelId, contents, finalSystemPrompt);
        } catch (e: any) {
            console.error("[Akasha] Google Resonance Error, attempting Fallback...");
            const fallbackMessages = [{ role: "system", content: finalSystemPrompt }, ...history.map(h => ({ role: h.role === 'assistant' || h.role === 'model' ? 'assistant' : 'user', content: h.content || h.parts?.[0]?.text || "" })), { role: "user", content: message }];
            return await handlePollinationsTextRequest('openai', fallbackMessages);
        }
    } else {
        const userMessageWithAnchor = `${message}\n\n[SYSTEM_RECALL: Accuracy is priority. If you provide links, verify them. NEVER Hallucinate links. Use DEEP THINKING.]`;

        const messages: any[] = [
            { role: "system", content: finalSystemPrompt }, 
            ...history.map(h => ({ 
                role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user', 
                content: h.parts?.[0]?.text || h.content || "" 
            })), 
            { role: "user", content: userMessageWithAnchor }
        ];

        try {
            switch(provider) {
                case 'openai': return await handleOpenAITextRequest(modelId, messages);
                case 'openrouter': return await handleOpenRouterTextRequest(modelId, messages);
                default: return await handlePollinationsTextRequest(modelId, messages);
            }
        } catch (e: any) {
            return await handlePollinationsTextRequest('openai', messages);
        }
    }
};

export const generateTTS = async (text: string, voiceName: string) => {
    const audibleText = text.replace(/(https?:\/\/[^\s]+)/g, 'link').replace(/\|\|GEN_IMG:.*?\|\|/g, '').trim();
    return await handleGoogleTTS(audibleText, voiceName);
};

export const generateVideo = async (prompt: string, image?: string, modelId: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    const modelCfg = VIDEO_GEN_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();

    if (provider === 'google') return await handleGoogleVideoGeneration(prompt, image, modelId);
    if (provider === 'openai') return await handleOpenAIVideoGeneration(prompt, image);
    if (provider === 'openrouter') return await handleOpenRouterVideoGeneration(modelId, prompt, image);
    return await handlePollinationsVideoGeneration(prompt);
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [{ text: `Translate to ${targetLanguage}. RETURN ONLY TRANSLATION. Text: ${text}` }] }],
            config: { temperature: 0.3 }
        });
        return res.text?.trim() || text;
    } catch { return text; }
};

export const analyzePersonaFromImage = async (base64Image: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const [header, data] = base64Image.split(',');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/png', data } }, { text: "Analyze this image character details in JSON." }] }],
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
            await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: [{ role: 'user', parts: [{ text: 'ping' }] }], config: { maxOutputTokens: 5 } });
            return true;
        } catch { return false; }
    }
    return key.length > 10;
};