
import { GoogleGenAI, Modality } from "@google/genai";
import { addWavHeader } from "../../utils/audioUtils";

/**
 * Handle Text & Chat requests via Gemini SDK
 */
export const handleGoogleTextRequest = async (model: string, contents: any[], systemInstruction: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Always enable search for models that support it to facilitate video/web finding
    const supportSearch = model.includes('pro') || model.includes('flash') || model.includes('3-');
    
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.9, 
                topP: 0.95,
                ...(supportSearch ? { tools: [{ googleSearch: {} }] } : {})
            }
        });

        let text = response.text || "";
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
            const links = chunks
                .map((c: any) => c.web?.uri ? `- [${c.web.title || 'Source'}](${c.web.uri})` : null)
                .filter(Boolean);
            if (links.length > 0) {
                const uniqueLinks = Array.from(new Set(links));
                text += "\n\n**Fragments recovered from Irminsul:**\n" + uniqueLinks.join("\n");
            }
        }
        return text;
    } catch (error: any) {
        if (error?.message?.includes("Requested entity was not found") && typeof window !== 'undefined' && (window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
        }
        throw error;
    }
};

/**
 * Handle Image Synthesis via Gemini/Imagen Models
 */
export const handleGoogleImageSynthesis = async (modelId: string, prompt: string, aspectRatio: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let visualModel = "gemini-2.5-flash-image";
    
    if (modelId.includes('pro')) {
        let keySelected = true;
        if (typeof window !== 'undefined' && (window as any).aistudio) {
            keySelected = await (window as any).aistudio.hasSelectedApiKey();
        }
        if (keySelected) visualModel = "gemini-3-pro-image-preview";
    }
    
    try {
        const config: any = { imageConfig: { aspectRatio: aspectRatio as any } };
        if (visualModel === "gemini-3-pro-image-preview") config.imageConfig.imageSize = "1K";

        const response = await ai.models.generateContent({
            model: visualModel,
            contents: { parts: [{ text: prompt }] },
            config: config
        });
        
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    } catch (e: any) {
        if (e?.message?.includes("Requested entity was not found") && typeof window !== 'undefined' && (window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
        }
    }
    return null;
};

/**
 * Handle Text-to-Speech via Gemini TTS
 * Enhanced to handle long text and ensure all content is spoken correctly.
 */
export const handleGoogleTTS = async (text: string, voiceName: string) => {
    if (!text || !text.trim()) return null;
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Clean text more aggressively for speech
    const cleanText = text
        .replace(/```[\s\S]*?```/g, ' [Kode skrip terlampir] ') // Don't speak large code blocks
        .replace(/`([^`]+)`/g, '$1') // Speak inline code
        .replace(/\|\|GEN_IMG:.*?\|\|/g, '') 
        .replace(/\|\|VIDEO_EMBED:.*?\|\|/g, '') 
        .replace(/\|\|WEB_EMBED:.*?\|\|/g, '')   
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Just read link text
        .replace(/[*#~>|\\-]/g, ' ')         
        .replace(/(https?:\/\/[^\s]+)/g, ' tautan ')  
        .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u002E\u002C\u003F\u0021\u003A]/g, ' ') 
        .replace(/\s+/g, ' ')                
        .substring(0, 3000) // Extended limit for full response
        .trim();

    if (!cleanText || cleanText.length < 1) return null;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: cleanText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { 
                    voiceConfig: { 
                        prebuiltVoiceConfig: { voiceName: (voiceName as any) || 'Kore' } 
                    } 
                }
            }
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        const rawPcm = audioPart?.inlineData?.data;
        
        if (rawPcm) {
            // Raw PCM data from gemini-2.5-flash-preview-tts is 24kHz mono
            return addWavHeader(rawPcm, 24000, 1);
        }
    } catch (e: any) {
        console.error("TTS Resonance Failure:", e);
    }
    return null;
};

/**
 * Handle Video Generation via Veo Models
 */
export const handleGoogleVideoGeneration = async (prompt: string, image?: string, modelId: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const config: any = {
            model: modelId,
            prompt: prompt,
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        };
        if (image) {
            const [header, data] = image.split(',');
            config.image = { imageBytes: data, mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' };
        }
        
        let operation = await ai.models.generateVideos(config);
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        return downloadLink ? `${downloadLink}&key=${process.env.API_KEY}` : null;
    } catch (e: any) {
        if (e?.message?.includes("Requested entity was not found") && typeof window !== 'undefined' && (window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
        }
        return null;
    }
};
