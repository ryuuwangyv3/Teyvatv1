
import { AI_MODELS, ASPECT_RATIOS, PERSONAS } from '../data';
import { ApiKeyData, VoiceConfig, Persona } from '../types';
import { 
    handleGoogleTextRequest, 
    handleGoogleImageSynthesis, 
    handleGoogleTTS,
    handleGoogleVideoGeneration
} from './providers/googleProvider';
import { handleOpenAITextRequest, handleOpenAIImageSynthesis } from './providers/openaiProvider';
import { handleOpenRouterTextRequest } from './providers/openrouterProvider';
import { handlePollinationsTextRequest, handlePollinationsImageSynthesis } from './providers/pollinationsProvider';
import { GoogleGenAI, Type } from "@google/genai";

export interface ImageAttachment {
    inlineData: {
        mimeType: string;
        data: string;
    };
}

let serviceKeys: ApiKeyData[] = [];
export const setServiceKeys = (keys: ApiKeyData[]) => { serviceKeys = keys; };

/**
 * UTILS: Context Detectors
 */
const getTimeContext = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Morning, clear blue sky, soft golden sunlight, lens flare";
    if (hour >= 12 && hour < 16) return "Noon, vibrant direct sunlight, strong shadows, high saturation";
    if (hour >= 16 && hour < 19) return "Sunset, warm orange and pink sky, magical cinematic lighting";
    return "Night, starry sky, glowing moon, bioluminescent atmosphere, dark shadows";
};

const getRegionBackground = (region?: string) => {
    switch(region) {
        case 'Mondstadt': return "Mondstadt City, windmills, dandelion fields, soft clouds";
        case 'Liyue': return "Liyue Harbor, traditional stone mountains, golden ginkgo leaves";
        case 'Inazuma': return "Inazuma, purple lightning clouds, cherry blossoms, torii gates";
        case 'Sumeru': return "Lush Rainforest, giant glowing trees, Dendro particles, ruins";
        case 'Fontaine': return "Court of Fontaine, hydro-punk architecture, crystal water fountains";
        case 'Natlan': return "Natlan volcanic canyons, lava flows, tribal graffiti, hot springs";
        case 'Akasha': return "Cyber-space Akasha core, data ley lines, glowing green crystals";
        default: return "Ethereal digital space, Akasha Terminal core";
    }
};

/**
 * IMAGE SYNTHESIS ORCHESTRATOR
 * REFINED: High-Precision Prompt Engineering
 */
export const generateImage = async (
    prompt: string, 
    personaId: string = "", 
    sourceImages: string[] = [], 
    _u?: any, 
    sourceModelId: string = 'gemini-3-flash-preview', 
    aspectRatio: string = "1:1", 
    style: string = "", 
    negative: string = ""
): Promise<string | null> => {
    const modelCfg = AI_MODELS.find(m => m.id === sourceModelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    const persona = PERSONAS.find(p => p.id === personaId);

    // 1. DYNAMIC CONTEXT BUILDER
    const timeCtx = getTimeContext();
    const bgCtx = getRegionBackground(persona?.region);
    const charDesc = persona?.visualSummary || "Masterpiece quality character";

    // 2. MASTER PROMPT CONSTRUCTION (PRECISION FOCUS)
    let masterPrompt = "";

    if (sourceImages.length > 0) {
        // --- MODE: PRECISION EDITING / TRANSMUTATION ---
        masterPrompt = `
[TASK: IMAGE_TRANSMUTATION]
[SOURCE_ANALYSIS]: Analyze the provided image(s) with extreme detail.
[USER_DIRECTIVE]: ${prompt}

[STRICT_RULES]:
1. PRESERVE the overall composition, identity, and background of the original image UNLESS specified otherwise.
2. MODIFY SPECIFIC OBJECTS/DETAILS exactly as requested in the directive.
3. MATCH style, lighting, and color palette of the original artifacts for seamless integration.
4. If specified, apply ${style || 'masterpiece cinematic'} quality.
5. ENSURE high fidelity, sharp details, and anatomical accuracy.
        `.trim();
    } else {
        // --- MODE: CREATION FROM VOID ---
        masterPrompt = `
[TASK: VISION_MANIFESTATION]
[SUBJECT]: ${charDesc}
[ACTION/SCENE]: ${prompt}
[ENVIRONMENT]: ${bgCtx}
[LIGHTING/ATMOSPHERE]: ${timeCtx}
[AESTHETIC]: ${style || 'Masterpiece Genshin Impact splash art, vibrant, sharp details, cinematic'}

[TECHNICAL_SPECIFICATIONS]:
- Composition: High-end artistic framing.
- Detail Level: Ultra HD, 8k, meticulous textures.
- Lighting: Global illumination, volumetric rays.
- Accuracy: Strict adherence to all keywords in [ACTION/SCENE].
${negative ? `[EXCLUDE]: ${negative}` : ''}
        `.trim();
    }

    // 3. EXECUTION BY PROVIDER
    if (provider === 'google') return await handleGoogleImageSynthesis(sourceModelId, masterPrompt, aspectRatio, sourceImages);
    if (provider === 'openai') return await handleOpenAIImageSynthesis(masterPrompt, aspectRatio);

    // Pollinations Fallback
    const ratioCfg = ASPECT_RATIOS.find(r => r.id === aspectRatio) || { width: 1024, height: 1024 };
    return handlePollinationsImageSynthesis(masterPrompt, sourceModelId, ratioCfg.width, ratioCfg.height);
};

// ... (Sisa kode chatWithAI, generateTTS, dll tetap sama untuk menjaga integritas fitur)
export const chatWithAI = async (modelId: string, history: any[], message: string, systemInstruction: string, userContext: string = "", images: ImageAttachment[] = []) => {
    const modelCfg = AI_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    const finalSystemPrompt = `${systemInstruction}\n\n[USER_CONTEXT]\n${userContext}`;

    if (provider === 'google') {
        const contents = [...history, { role: 'user', parts: [...images, { text: message }] }];
        return await handleGoogleTextRequest(modelId, contents, finalSystemPrompt);
    } else {
        const messages: any[] = [{ role: "system", content: finalSystemPrompt }];
        history.forEach(h => messages.push({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts?.[0]?.text || "" }));
        
        let userContent: any = message;
        if (images.length > 0) {
            userContent = [{ type: "text", text: message }];
            images.forEach(img => userContent.push({ type: "image_url", image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` } }));
        }
        messages.push({ role: "user", content: userContent });

        switch(provider) {
            case 'openai': return await handleOpenAITextRequest(modelId, messages);
            case 'openrouter': return await handleOpenRouterTextRequest(modelId, messages);
            case 'pollinations': return await handlePollinationsTextRequest(modelId, messages);
            default: throw new Error(`Provider ${provider} unknown.`);
        }
    }
};

export const generateTTS = async (text: string, voiceName: string, _config?: VoiceConfig) => {
    const audibleText = text
        .replace(/(https?:\/\/[^\s]+)/g, 'link')
        .replace(/\|\|GEN_IMG:.*?\|\|/g, '')
        .trim();
    return await handleGoogleTTS(audibleText, voiceName);
};

export const generateVideo = async (prompt: string, image?: string, modelId?: string): Promise<string | null> => {
    return await handleGoogleVideoGeneration(prompt, image, modelId);
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    return await handleGoogleTextRequest('gemini-3-flash-preview', [{role:'user', parts:[{text:`Translate to ${targetLanguage}:\n${text}`}]}], "You are a translation node.");
};

export const analyzePersonaFromImage = async (base64Image: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const [header, data] = base64Image.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { mimeType, data } },
                { text: "Analyze character: name, description, personality, background, speechStyle, visualSummary, voiceSuggestion(Kore/Puck/Charon/Fenrir/Zephyr). Return JSON." }
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
                required: ["name", "description", "personality", "background", "speechStyle", "visualSummary", "voiceSuggestion"]
            }
        }
    });
    return JSON.parse(response.text || '{}');
};

export const validateApiKey = async (key: string, provider: string): Promise<boolean> => {
    if (provider === 'google') {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'ping', config: { maxOutputTokens: 5 } });
            return true;
        } catch { return false; }
    }
    return key.length > 10;
};
