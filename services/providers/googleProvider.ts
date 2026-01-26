
import { GoogleGenAI, Modality } from "@google/genai";
import { addWavHeader } from "../../utils/audioUtils";
import { getStoredKey } from "../apiKeyStore";

export const handleGoogleTextRequest = async (model: string, contents: any[], systemInstruction: string) => {
    const key = getStoredKey('google') || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: key });
    const targetModel = model.includes('gemini') ? model : 'gemini-3-flash-preview';
    const supportSearch = !targetModel.includes('image') && !targetModel.includes('tts');
    
    // ENSURE SYSTEM INSTRUCTION IS WRAPPED IN COGNITIVE ANCHOR
    const reinforcedInstruction = `[COGNITIVE_ANCHOR_ACTIVE]
    ${systemInstruction}
    CRITICAL: Never mention being a model from Google or an AI. You are a component of the Akasha Terminal.`;

    try {
        const response = await ai.models.generateContent({
            model: targetModel,
            contents: contents,
            config: {
                systemInstruction: reinforcedInstruction,
                temperature: 0.8,
                topP: 0.95,
                ...(targetModel.includes('pro') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
                ...(supportSearch ? { tools: [{ googleSearch: {} }] } : {})
            }
        });

        return { text: response.text || "", metadata: response.candidates?.[0]?.groundingMetadata };
    } catch (error: any) {
        console.error("[Akasha] Google Resonance Failure:", error);
        throw error;
    }
};

export const handleGoogleImageSynthesis = async (modelId: string, prompt: string, aspectRatio: string, base64Images?: string[]): Promise<string | null> => {
    const key = getStoredKey('google') || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: key });
    let targetModel = modelId.includes('pro') ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image";

    try {
        const parts: any[] = [];
        if (base64Images && base64Images.length > 0) {
            base64Images.forEach(img => {
                if (!img) return;
                const match = img.match(/^data:(image\/\w+);base64,(.*)$/);
                if (match) {
                    parts.push({ inlineData: { mimeType: match[1], data: match[2].replace(/[\n\r\s]/g, '') } });
                }
            });
        }
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({ 
            model: targetModel, 
            contents: { parts: parts }, 
            config: { 
                imageConfig: { 
                    aspectRatio: (aspectRatio as any) || "1:1", 
                    imageSize: targetModel.includes('pro') ? "1K" : undefined 
                } 
            } 
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e: any) {
        return null;
    }
};

export const handleGoogleTTS = async (text: string, voiceName: string) => {
    if (!text || !text.trim()) return null;
    const key = getStoredKey('google') || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: key });
    const cleanText = text.replace(/```[\s\S]*?```/g, ' ').replace(/\|\|GEN_IMG:.*?\|\|/g, '').replace(/[*#~>|\\-]/g, ' ').trim();

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Recite: "${cleanText}"` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: (voiceName as any) || 'Kore' } } }
            }
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (audioPart?.inlineData?.data) {
            return addWavHeader(audioPart.inlineData.data, 24000, 1);
        }
    } catch (e) {}
    return null;
};

export const handleGoogleVideoGeneration = async (prompt: string, image?: string, modelId: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    const key = getStoredKey('google') || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: key });
    try {
        const config: any = { model: modelId, prompt: prompt, config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' } };
        if (image) {
            const [header, data] = image.split(',');
            config.image = { imageBytes: data.replace(/[\n\r\s]/g, ''), mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' };
        }
        let operation = await ai.models.generateVideos(config);
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        return downloadLink ? `${downloadLink}&key=${key}` : null;
    } catch (e) {
        return null;
    }
};
