
import { AI_MODELS, IMAGE_GEN_MODELS, ASPECT_RATIOS, PERSONAS, ART_STYLES, VIDEO_GEN_MODELS, APP_KNOWLEDGE_BASE } from '../data';
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
import { handleGeminigenVideoGeneration } from './providers/geminigenProvider';
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
    if (prompt.includes('http') || !prompt.trim()) return prompt;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imageParts: any[] = images.map(img => {
        const [header, data] = img.split(',');
        return { inlineData: { mimeType: header.match(/:(.*?);/)?.[1] || 'image/png', data: data.replace(/[\n\r\s]/g, '') } };
    });

    const instruction = `[VISUAL DNA ENCODER - IRMINSUL PROJECTOR] 
Subject Character: ${persona?.name || 'Character'}. 
MANDATORY VISUAL DNA: ${persona?.visualSummary || 'Anime character'}. 
Current Activity/Context: ${prompt}. 

Task: Create a hyper-detailed image generation prompt in English.
CRITICAL REQUIREMENTS FOR LIFE SIMULATION & CONTINUITY:
1. FACIAL DNA: Hair texture/color, eye color/pupils, and face structure MUST be 100% identical to the DNA Anchor.
2. CONTINUITY: Use the provided reference image(s) to maintain the exact same outfit details and background environment unless the character has explicitly moved or changed clothes.
3. ADAPTATION: If eating, show them holding specific food; if sleeping, show them in bed with matching bedding; if bathing, show them in a hot spring/bath with the same hair style but wet.
4. STYLE: ALWAYS follow "official genshin impact 2.3D anime render style, masterpiece, high quality cel shading, sharp lineart".
Return ONLY the expanded prompt string.`;

    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ role: 'user', parts: [...imageParts, { text: instruction }] }],
            config: { temperature: 0.8, thinkingConfig: { thinkingBudget: 0 } } 
        });
        return res.text?.trim() || prompt;
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
    
    let enrichedPrompt = prompt;
    if (personaId) {
        const visualContext = await describeVisualTransformation(prompt, sourceImages, 'manifest', persona);
        enrichedPrompt = visualContext;
    }

    const masterStyle = ART_STYLES.find(s => s.id === 'none')?.prompt || "official genshin impact style, masterpiece anime";
    let finalPrompt = `${persona?.visualSummary || ''}, ${enrichedPrompt}, ${masterStyle}, ${style}, high quality cel shading, vivid colors, 4k resolution.`;

    if (provider === 'google') return await handleGoogleImageSynthesis(sourceModelId, finalPrompt, aspectRatio, sourceImages);
    if (provider === 'openai') return await handleOpenAIImageSynthesis(finalPrompt, aspectRatio);
    if (provider === 'openrouter') return await handleOpenRouterImageSynthesis(sourceModelId, finalPrompt, aspectRatio);
    
    const ratioCfg = ASPECT_RATIOS.find(r => r.id === aspectRatio) || { width: 1024, height: 1024 };
    return await handlePollinationsImageSynthesis(finalPrompt, 'flux-anime', ratioCfg.width, ratioCfg.height);
};

export const chatWithAI = async (modelId: string, history: any[], message: string, systemInstruction: string, userContext: string = "", images: ImageAttachment[] = []) => {
    const modelCfg = AI_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();
    
    const finalSystemPrompt = `${APP_KNOWLEDGE_BASE}\n\n[USER_CONTEXT]\n${userContext}\n\n[ACTIVE_PERSONA_PROTOCOL]\n${systemInstruction}`;

    // Logika Khusus untuk Provider Google
    if (provider === 'google') {
        const formattedHistory = history.map(h => ({
            role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.content || h.parts?.[0]?.text || "" }]
        }));
        
        // JANGAN gunakan fallback otomatis di sini agar user tahu jika Google error
        const userContent = { role: 'user', parts: [...images, { text: message }] };
        const contents = [...formattedHistory, userContent];
        return await handleGoogleTextRequest(modelId, contents, finalSystemPrompt);
    } 
    
    // Logika untuk Provider Lain (OpenAI, OpenRouter, Pollinations)
    const messages: any[] = [
        { role: "system", content: finalSystemPrompt }, 
        ...history.map(h => ({ 
            role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user', 
            content: h.parts?.[0]?.text || h.content || "" 
        })), 
        { role: "user", content: message }
    ];

    try {
        let text = "";
        switch(provider) {
            case 'openai': 
                text = await handleOpenAITextRequest(modelId, messages); 
                break;
            case 'openrouter': 
                text = await handleOpenRouterTextRequest(modelId, messages); 
                break;
            case 'pollinations':
            default: 
                text = await handlePollinationsTextRequest(modelId, messages); 
                break;
        }
        return { text, metadata: null };
    } catch (e: any) {
        // Hanya berikan fallback ke Pollinations jika provider utama benar-benar gagal
        // Namun kita kirimkan error aslinya ke console agar bisa di-debug
        console.error(`[Akasha] Provider ${provider} failed:`, e);
        throw e; // Lemparkan error agar UI bisa menampilkan DonationModal/Error log
    }
};

export const generateTTS = async (text: string, voiceName: string) => {
    const audibleText = text
        .replace(/(https?:\/\/[^\s]+)/g, 'link')
        .replace(/\|\|GEN_IMG:[\s\S]*?\|\|/g, '')
        .trim();
    return await handleGoogleTTS(audibleText, voiceName);
};

export const generateVideo = async (prompt: string, image?: string, modelId: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    const modelCfg = VIDEO_GEN_MODELS.find(m => m.id === modelId);
    const provider = (modelCfg?.provider || 'google').toLowerCase();

    if (provider === 'geminigen') return await handleGeminigenVideoGeneration(modelId, prompt, image);
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
            contents: [{ role: 'user', parts: [{ text: `Task: Translate the text below to ${targetLanguage}.\nRules: \n- Output ONLY the raw translation.\n- NO introductions (e.g. "Berikut adalah...").\n- NO conversational filler.\n- NO explanations.\n- NO quotes around the result unless they are part of the original text.\n\nText to translate: \n${text}` }] }],
            config: { 
                temperature: 0.0, 
                thinkingConfig: { thinkingBudget: 0 } 
            }
        });
        
        let result = res.text?.trim() || text;
        // Anti-filler cleanup just in case
        result = result.replace(/^(Berikut adalah|Ini adalah|Translation:|Translated text:)/i, '').trim();
        return result;
    } catch { return text; }
};

export const validateApiKey = async (key: string, provider: string): Promise<boolean> => {
    if (provider === 'google') {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            await ai.models.generateContent({ 
                model: 'gemini-3-flash-preview', 
                contents: [{ role: 'user', parts: [{ text: 'ping' }] }], 
                config: { maxOutputTokens: 5, thinkingConfig: { thinkingBudget: 0 } } 
            });
            return true;
        } catch { return false; }
    }
    return key.length > 10;
};

export const analyzePersonaFromImage = async (base64Image: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const [header, data] = base64Image.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    const prompt = `Analyze this character image and extract their essence for a roleplay persona. Return a JSON object.`;
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType, data: data.replace(/[\n\r\s]/g, '') } },
                    { text: prompt }
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
                        voiceSuggestion: { type: Type.STRING, enum: ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] },
                        visualSummary: { type: Type.STRING }
                    },
                    required: ['name', 'description', 'personality', 'background', 'speechStyle', 'voiceSuggestion', 'visualSummary']
                }
            }
        });
        return JSON.parse(res.text || "{}");
    } catch (e) {
        throw e;
    }
};
