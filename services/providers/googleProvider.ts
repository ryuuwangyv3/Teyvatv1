
import { GoogleGenAI, Modality } from "@google/genai";
import { addWavHeader } from "../../utils/audioUtils";

/**
 * Handle Text & Chat requests via Gemini SDK
 */
export const handleGoogleTextRequest = async (model: string, contents: any[], systemInstruction: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
 * Handle Image Synthesis (Generation/Editing/Merging)
 * FIXED: Recursive scanner to find inlineData across all candidates and parts.
 */
export const handleGoogleImageSynthesis = async (modelId: string, prompt: string, aspectRatio: string, base64Images?: string[]): Promise<string | null> => {
    let targetModel = modelId;
    
    // Auto-select model based on capabilities
    if (modelId.includes('pro')) {
        targetModel = "gemini-3-pro-image-preview";
        // Check for session-based key selection
        if (typeof window !== 'undefined' && (window as any).aistudio) {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            if (!hasKey) await (window as any).aistudio.openSelectKey();
        }
    } else if (!modelId.includes('imagen')) {
        targetModel = "gemini-2.5-flash-image";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const parts: any[] = [];
        
        // 1. Ingest Base Artifacts (Source Images)
        if (base64Images && base64Images.length > 0) {
            base64Images.forEach(img => {
                if (!img) return;
                // Parse MIME and strip header
                const match = img.match(/^data:(image\/\w+);base64,(.*)$/);
                if (match) {
                    parts.push({
                        inlineData: {
                            mimeType: match[1],
                            data: match[2].replace(/[\n\r\s]/g, '') // Clean base64 string
                        }
                    });
                }
            });
        }

        // 2. Add Directive (Prompt)
        parts.push({ text: prompt });

        const config: any = { 
            imageConfig: { 
                aspectRatio: (aspectRatio as any) || "1:1"
            } 
        };
        
        if (targetModel.includes('pro')) {
            config.imageConfig.imageSize = "1K";
        }

        const response = await ai.models.generateContent({
            model: targetModel,
            contents: { parts: parts },
            config: config
        });
        
        // 3. Robust Part Extraction
        // Search all candidates for valid image parts
        if (response.candidates) {
            for (const candidate of response.candidates) {
                if (candidate.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.inlineData?.data) {
                            const mime = part.inlineData.mimeType || 'image/png';
                            // Successfully extracted visual fragment
                            return `data:${mime};base64,${part.inlineData.data}`;
                        }
                    }
                }
            }
        }
        
        console.warn("Vision Protocol: Image data not found in Irminsul response.");
        return null;
    } catch (e: any) {
        console.error("Vision Protocol Failure:", e);
        if (e?.message?.includes("Requested entity was not found") && typeof window !== 'undefined' && (window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
        }
        return null;
    }
};

/**
 * Handle Text-to-Speech via Gemini TTS
 */
export const handleGoogleTTS = async (text: string, voiceName: string) => {
    if (!text || !text.trim()) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Clean text for optimal TTS resonance
    const cleanText = text
        .replace(/```[\s\S]*?```/g, ' [Data Fragment] ')
        .replace(/\|\|GEN_IMG:.*?\|\|/g, '') 
        .replace(/[*#~>|\\-]/g, ' ')         
        .substring(0, 3000) 
        .trim();

    if (!cleanText) return null;

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
        if (audioPart?.inlineData?.data) {
            return addWavHeader(audioPart.inlineData.data, 24000, 1);
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
            config.image = { imageBytes: data.replace(/[\n\r\s]/g, ''), mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' };
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
