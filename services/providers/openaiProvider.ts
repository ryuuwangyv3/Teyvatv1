
const OPENAI_KEY = "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";

export const handleOpenAITextRequest = async (model: string, messages: any[]) => {
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI Bridge Failure: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Transmission lost.";
    } catch (e: any) {
        if (e.message.includes('fetch')) {
            throw new Error("OpenAI Local Link Blocked: CORS anomaly detected. Try using Google or Pollinations engine.");
        }
        throw e;
    }
};

export const handleOpenAIImageSynthesis = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    try {
        const enhancedPrompt = `Masterpiece, best quality, 8k, ${prompt}`;
        const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1792x1024", "9:16": "1024x1792" };
        
        const response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: enhancedPrompt,
                n: 1,
                size: sizeMap[aspectRatio] || "1024x1024",
                quality: "hd"
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.data?.[0]?.url || null;
    } catch (e) {
        return null;
    }
};
