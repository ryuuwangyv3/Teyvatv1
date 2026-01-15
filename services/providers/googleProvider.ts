
import { GoogleGenAI, Modality } from "@google/genai";
import { addWavHeader } from "../../utils/audioUtils";

/**
 * Handle Text & Chat requests via Gemini SDK
 */
export const handleGoogleTextRequest = async (model: string, contents: any[], systemInstruction: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const targetModel = model.includes('gemini') ? model : 'gemini-3-flash-preview';
    const supportSearch = !targetModel.includes('image') && !targetModel.includes('tts');
    
    try {
        const response = await ai.models.generateContent({
            model: targetModel,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.6,
                topP: 0.95,
                ...(supportSearch ? { tools: [{ googleSearch: {} }] } : {})
            }
        });

        const text = response.text || "";
        const metadata = response.candidates?.[0]?.groundingMetadata;

        // Return both text and metadata
        return { text, metadata };
    } catch (error: any) {
        console.error("[Akasha] Google Provider Error:", error);
        if (error?.message?.includes("Requested entity was not found")) {
            if (typeof window !== 'undefined' && (window as any).aistudio) {
                await (window as any).aistudio.openSelectKey();
            }
        }
        throw error;
    }
};

/**
 * Handle Image Synthesis (Generation/Editing/Merging)
 */
export const handleGoogleImageSynthesis = async (modelId: string, prompt: string, aspectRatio: string, base64Images?: string[]): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
            config: { imageConfig: { aspectRatio: (aspectRatio as any) || "1:1", imageSize: targetModel.includes('pro') ? "1K" : undefined } } 
        });
        
        const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imgPart?.inlineData?.data) {
            return `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`;
        }
        return null;
    } catch (e: any) {
        console.error("Vision Protocol Failure:", e);
        return null;
    }
};

/**
 * Handle Text-to-Speech via Gemini TTS
 */
export const handleGoogleTTS = async (text: string, voiceName: string) => {
    if (!text || !text.trim()) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const cleanText = text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\|\|GEN_IMG:.*?\|\|/g, '') 
        .replace(/[*#~>|\\-]/g, ' ')
        .trim();

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
    } catch (e) {
        console.error("TTS Failure:", e);
    }
    return null;
};

/**
 * Handle Video Generation via Veo Models
 */
export const handleGoogleVideoGeneration = async (prompt: string, image?: string, modelId: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const config: any = { model: modelId, prompt: prompt, config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' } };
        if (image) {
            const [header, data] = image.split(',');
            config.image = { imageBytes: data.replace(/[\n\r\s]/g, ''), mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' };
        }
        
        let operation = await ai.models.generateVideos(config);
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 8000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        return downloadLink ? `${downloadLink}&key=${process.env.API_KEY}` : null;
    } catch (e) {
        console.error("Video synthesis error:", e);
        return null;
    }
};
