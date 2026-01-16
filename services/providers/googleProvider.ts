
import { GoogleGenAI, Modality } from "@google/genai";
import { addWavHeader } from "../../utils/audioUtils";

/**
 * Handle Text & Chat requests via Gemini SDK
 * Optimized to handle "Rpc failed due to xhr error" and "Requested entity was not found"
 */
export const handleGoogleTextRequest = async (model: string, contents: any[], systemInstruction: string) => {
    // CRITICAL: Always create a new instance right before the call to ensure fresh API Key context
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Validate model name from AI_MODELS or fallback to standard
    const targetModel = model.includes('gemini') ? model : 'gemini-3-flash-preview';
    
    // Tools logic - only googleSearch is allowed for text models
    const supportSearch = !targetModel.includes('image') && !targetModel.includes('tts');
    
    try {
        const response = await ai.models.generateContent({
            model: targetModel,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
                topP: 0.95,
                // Thinking budget is optional, but helps with complex tasks in v3
                ...(targetModel.includes('pro') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
                ...(supportSearch ? { tools: [{ googleSearch: {} }] } : {})
            }
        });

        // Use direct .text property as per guidelines
        const text = response.text || "";
        const metadata = response.candidates?.[0]?.groundingMetadata;

        return { text, metadata };
    } catch (error: any) {
        console.error("[Akasha] Google Resonance Protocol Failure:", error);
        
        const errorMsg = error?.message || JSON.stringify(error);
        
        // Handle specific "Requested entity was not found" or "XHR error"
        if (errorMsg.includes("Requested entity was not found") || errorMsg.includes("xhr error")) {
            console.warn("[Akasha] Potential API Key or Proxy blockage detected. Prompting re-calibration.");
            if (typeof window !== 'undefined' && (window as any).aistudio) {
                // If using AI Studio environment, attempt to re-open key selector
                await (window as any).aistudio.openSelectKey();
            }
            throw new Error("Ley Line Signal Distorted (XHR/Network Failure). Please check your connection or calibrate your API Key in Admin Console.");
        }
        
        throw error;
    }
};

/**
 * Handle Image Synthesis (Generation/Editing)
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
            config: { 
                imageConfig: { 
                    aspectRatio: (aspectRatio as any) || "1:1", 
                    imageSize: targetModel.includes('pro') ? "1K" : undefined 
                } 
            } 
        });
        
        // Find image part among candidates
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e: any) {
        console.error("[Akasha] Vision Manifestation Failure:", e);
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
            contents: [{ parts: [{ text: `Recite cheerfully: "${cleanText}"` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: (voiceName as any) || 'Kore' } } }
            }
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (audioPart?.inlineData?.data) {
            // Audio bytes are raw PCM, need WAV header for browser playback
            return addWavHeader(audioPart.inlineData.data, 24000, 1);
        }
    } catch (e) {
        console.error("[Akasha] TTS Resonance Failure:", e);
    }
    return null;
};

/**
 * Handle Video Generation via Veo Models
 */
export const handleGoogleVideoGeneration = async (prompt: string, image?: string, modelId: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const config: any = { 
            model: modelId, 
            prompt: prompt, 
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' } 
        };
        
        if (image) {
            const [header, data] = image.split(',');
            config.image = { 
                imageBytes: data.replace(/[\n\r\s]/g, ''), 
                mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' 
            };
        }
        
        let operation = await ai.models.generateVideos(config);
        
        // Wait for generation
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        return downloadLink ? `${downloadLink}&key=${process.env.API_KEY}` : null;
    } catch (e) {
        console.error("[Akasha] Video Synthesis Error:", e);
        return null;
    }
};
