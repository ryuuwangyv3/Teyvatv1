
import { GoogleGenAI, Modality } from "@google/genai";
import { addWavHeader } from "../../utils/audioUtils";

const GOOGLE_KEY = process.env.API_KEY || "AIzaSyCWFLagWil_s7OFUsBAjBrGsp5OYKLsb6U";

export const handleGoogleTextRequest = async (model: string, contents: any[], systemInstruction: string) => {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_KEY });
    const response = await ai.models.generateContent({
        model,
        contents,
        config: {
            systemInstruction,
            temperature: 1.0,
            ...(model.includes('gemini-3') ? { tools: [{ googleSearch: {} }] } : {})
        }
    });

    let text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
        const links = chunks.map((c: any) => c.web?.uri ? `- [${c.web.title || 'Source'}](${c.web.uri})` : null).filter(Boolean);
        if (links.length > 0) text += "\n\n**Fragments recovered from Irminsul:**\n" + Array.from(new Set(links)).join("\n");
    }
    return text;
};

export const handleGoogleImageSynthesis = async (modelId: string, prompt: string, aspectRatio: string): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: GOOGLE_KEY });
        const response = await ai.models.generateContent({
            model: modelId,
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
    } catch (e) {
        console.error("Google Alchemy Fail:", e);
    }
    return null;
};

export const handleGoogleTTS = async (text: string, voiceName: string) => {
    try {
        const ai = new GoogleGenAI({ apiKey: GOOGLE_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text.substring(0, 1500) }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' } } }
            }
        });
        const rawPcm = response.candidates?.[0]?.content?.parts[0]?.inlineData?.data;
        if (rawPcm) return addWavHeader(rawPcm, 24000, 1);
    } catch (e) {
        console.error("TTS Synthesis Break:", e);
    }
    return null;
};

export const handleGoogleVideo = async (prompt: string, image?: string, modelId: string = 'veo-3.1-fast-generate-preview'): Promise<string | null> => {
    try {
        const ai = new GoogleGenAI({ apiKey: GOOGLE_KEY });
        const generateParams: any = {
            model: modelId,
            prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        };

        if (image) {
            const [header, data] = image.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            generateParams.image = { imageBytes: data, mimeType };
        }

        let operation = await ai.models.generateVideos(generateParams);
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) return null;
        return `${downloadLink}&key=${GOOGLE_KEY}`;
    } catch (e) {
        console.error("Video Synthesis Failure:", e);
        return null;
    }
};
