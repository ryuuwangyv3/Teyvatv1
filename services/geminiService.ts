
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
        case 'Mondstadt': return "Mondstadt City background with windmills, medieval European architecture, dandelion fields, soft clouds";
        case 'Liyue': return "Liyue Harbor background with red lanterns, traditional stone mountains, Jueyun Karst peaks, golden ginkgo leaves";
        case 'Inazuma': return "Narukami Island background, purple lightning clouds, floating cherry blossoms, Grand Narukami Shrine, torii gates";
        case 'Sumeru': return "Lush Rainforest or Sumeru City Academy background, giant glowing trees, Dendro energy particles, mossy ruins";
        case 'Fontaine': return "Court of Fontaine background, steampunk canals, crystal water fountains, majestic hydro-punk architecture, blue ocean horizon";
        case 'Natlan': return "Natlan volcanic canyons, lava flows, colorful tribal graffiti on rocks, hot springs, prehistoric fauna environment";
        case 'Akasha': return "Cyber-space Akasha core, floating data ley lines, glowing green crystals, digital particles";
        default: return "Ethereal digital space, glowing crystals, Akasha Terminal core";
    }
};

const getOutfitContext = (prompt: string, personaSummary: string) => {
    const p = prompt.toLowerCase();
    if (p.includes("party") || p.includes("pesta") || p.includes("ball") || p.includes("gaun")) 
        return "Wearing an elegant luxury ballroom gown version of their theme, with jewelry and formal makeup";
    if (p.includes("sleep") || p.includes("tidur") || p.includes("malam")) 
        return "Wearing cozy cute soft silk pajamas or nightwear in their signature color palette";
    if (p.includes("beach") || p.includes("pantai") || p.includes("swim") || p.includes("berenang")) 
        return "Wearing a stylish summer bikini or swimwear themed after their element and original costume";
    if (p.includes("battle") || p.includes("tarung") || p.includes("armor") || p.includes("perang")) 
        return "Wearing heavy battle-ready version of their armor, glowing element energy, serious pose, dynamic action";
    if (p.includes("casual") || p.includes("modern") || p.includes("kota")) 
        return "Wearing modern urban streetwear fashion themed after their original colors and personality";
    
    // DEFAULT: Hard-lock back to their official visual summary
    return `Strictly wearing their original canon costume: ${personaSummary.split(', ').slice(2).join(', ')}`;
};

/**
 * CHAT & TEXT ORCHESTRATOR
 */
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

/**
 * IMAGE SYNTHESIS ORCHESTRATOR
 */
export const generateImage = async (
    prompt: string, 
    personaId: string = "", 
    _inputImgs?: string[], 
    _u?: any, 
    sourceModelId: string = 'gemini-3-flash-preview', 
    aspectRatio: string = "1:1", 
    style: string = "", 
    negative: string = ""
): Promise<string | null> => {
    const modelCfg = AI_MODELS.find(m => m.id === sourceModelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    const persona = PERSONAS.find(p => p.id === personaId);

    // CONSISTENCY ENGINE
    const timeCtx = getTimeContext();
    const bgCtx = getRegionBackground(persona?.region);
    const outfitCtx = getOutfitContext(prompt, persona?.visualSummary || "Beautiful character");
    const characterCore = persona?.visualSummary || "Anime character";

    const masterPrompt = `[CONSISTENT_SUBJECT: ${characterCore}] 
    [OUTFIT_STATE: ${outfitCtx}]
    [CURRENT_ACTION: ${prompt}] 
    [ENVIRONMENT_LOCK: ${bgCtx}, ${timeCtx}]
    [AESTHETIC_LOCK: masterpiece genshin impact splash art style, vibrant lighting, sharp details, cinematic composition, ${style}] 
    [QUALITY_GUARD: perfect face, perfect hands, detailed eyes, consistent hair length, high fidelity, 8k] 
    ${negative ? `[IGNORE: ${negative}]` : ''}`;

    if (provider === 'google') return await handleGoogleImageSynthesis(sourceModelId, masterPrompt, aspectRatio);
    if (provider === 'openai') return await handleOpenAIImageSynthesis(masterPrompt, aspectRatio);

    const ratioCfg = ASPECT_RATIOS.find(r => r.id === aspectRatio) || { width: 1024, height: 1024 };
    return handlePollinationsImageSynthesis(masterPrompt, sourceModelId, ratioCfg.width, ratioCfg.height);
};

/**
 * TTS INTERFACE
 */
export const generateTTS = async (text: string, voiceName: string, _config?: VoiceConfig) => {
    const audibleText = text
        .replace(/(https?:\/\/[^\s]+)/g, 'link')
        .replace(/\|\|GEN_IMG:.*?\|\|/g, '')
        .trim();
        
    return await handleGoogleTTS(audibleText, voiceName);
};

/**
 * VIDEO INTERFACE
 */
export const generateVideo = async (prompt: string, image?: string, modelId?: string): Promise<string | null> => {
    return await handleGoogleVideoGeneration(prompt, image, modelId);
};

/**
 * UTILS: TRANSLATION
 */
export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    return await handleGoogleTextRequest('gemini-3-flash-preview', [{role:'user', parts:[{text:`Translate to ${targetLanguage}:\n${text}`}]}], "You are a translation node.");
};

/**
 * UTILS: PERSONA ANALYSIS
 */
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

/**
 * UTILS: API KEY VALIDATION
 */
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
