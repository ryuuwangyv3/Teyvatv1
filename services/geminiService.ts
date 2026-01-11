
import { GoogleGenAI } from "@google/genai";
import { AI_MODELS, ASPECT_RATIOS, QUALITY_TAGS } from '../data';
import { ApiKeyData, VoiceConfig } from '../types';
import { 
    handleGoogleTextRequest, 
    handleGoogleImageSynthesis, 
    handleGoogleTTS, 
    handleGoogleVideo 
} from './providers/googleProvider';
import { handleOpenAITextRequest } from './providers/openaiProvider';
import { handleOpenRouterTextRequest } from './providers/openrouterProvider';
import { handlePollinationsTextRequest, handlePollinationsImageSynthesis } from './providers/pollinationsProvider';

export interface ImageAttachment {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

let runtimeKeys: ApiKeyData[] = [];
export const setServiceKeys = (keys: ApiKeyData[]) => { runtimeKeys = keys; };

/**
 * TEXT & CHAT INTERFACE (ORCHESTRATOR)
 */
export const chatWithAI = async (modelId: string, history: any[], message: string, systemInstruction: string, userContext: string = "", images: ImageAttachment[] = []) => {
    const modelCfg = AI_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    const finalSystem = `${systemInstruction}\nContext: ${userContext}`;

    if (provider === 'google') {
        const contents = [...history, { role: 'user', parts: [...images, { text: message }] }];
        return await handleGoogleTextRequest(modelId, contents, finalSystem);
    } else {
        const messages: any[] = [{ role: "system", content: finalSystem }];
        history.forEach(h => messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts?.[0]?.text || "" }));
        
        let userContent: any = message;
        if (images.length > 0 && (modelId.includes('gpt-4o') || provider === 'pollinations')) {
            userContent = [{ type: "text", text: message }];
            images.forEach(img => userContent.push({ type: "image_url", image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` } }));
        }
        messages.push({ role: "user", content: userContent });

        switch(provider) {
            case 'openai': return await handleOpenAITextRequest(modelId, messages);
            case 'openrouter': return await handleOpenRouterTextRequest(modelId, messages);
            case 'pollinations': return await handlePollinationsTextRequest(modelId, messages);
            default: throw new Error(`Unknown provider: ${provider}`);
        }
    }
};

/**
 * IMAGE SYNTHESIS (ORCHESTRATOR)
 */
export const generateImage = async (prompt: string, personaVisuals: string = "", inputImages?: string[], _u?: any, modelId: string = 'flux', aspectRatio: string = "1:1", style: string = "", negative: string = ""): Promise<string | null> => {
    const isGoogle = modelId.includes('gemini');
    const finalPrompt = `[SUBJECT: ${personaVisuals}] Action: ${prompt}. Style: ${style}. Quality: ${QUALITY_TAGS} ${negative ? `[NEG: ${negative}]` : ''}`;

    if (isGoogle) {
        return await handleGoogleImageSynthesis(modelId, finalPrompt, aspectRatio);
    }

    const ratio = ASPECT_RATIOS.find(r => r.id === aspectRatio) || { width: 1024, height: 1024 };
    return handlePollinationsImageSynthesis(finalPrompt, modelId, ratio.width, ratio.height);
};

/**
 * TTS INTERFACE
 */
export const generateTTS = async (text: string, voiceName: string, config?: VoiceConfig) => {
    return await handleGoogleTTS(text, voiceName);
};

/**
 * VIDEO INTERFACE
 */
export const generateVideo = async (prompt: string, image?: string, modelId: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    return await handleGoogleVideo(prompt, image, modelId);
};

/**
 * TRANSLATION
 */
export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    return await handleGoogleTextRequest('gemini-3-flash-preview', [{role: 'user', parts: [{text: `Translate to ${targetLanguage}. Return ONLY result:\n\n${text}`}]}], "You are a specialized translation node.");
};

/**
 * VISION ANALYSIS
 */
export const analyzePersonaFromImage = async (base64Data: string) => {
    const [header, data] = base64Data.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    const responseText = await handleGoogleTextRequest('gemini-3-flash-preview', [
        { role: 'user', parts: [{ inlineData: { mimeType, data } }, { text: "Extract character data JSON: name, description, personality, background, speechStyle, voiceSuggestion(Kore/Zephyr/Charon/Fenrir), visualSummary." }] }
    ], "You are a character extraction specialist. Respond ONLY with JSON.");
    
    return JSON.parse(responseText || "{}");
};

/**
 * VALIDATION
 */
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
