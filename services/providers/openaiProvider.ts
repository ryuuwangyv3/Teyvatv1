
const OPENAI_KEY = "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";

export const handleOpenAITextRequest = async (model: string, messages: any[]) => {
    const targetUrl = "https://api.openai.com/v1/chat/completions";
    const payload = {
        model: model || "gpt-4o",
        messages: messages,
        temperature: 0.7
    };

    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content;
        }
    } catch (e) {}

    throw new Error("OpenAI Resonance Failure: The transmission could not be established.");
};

export const handleOpenAIImageSynthesis = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    const targetUrl = "https://api.openai.com/v1/images/generations";
    const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1792x1024", "9:16": "1024x1792" };

    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: prompt,
                size: sizeMap[aspectRatio] || "1024x1024"
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.data?.[0]?.url || null;
        }
    } catch (e) {}
    return null;
};

export const handleOpenAIVideoGeneration = async (prompt: string, image?: string): Promise<string | null> => {
    const targetUrl = "https://api.openai.com/v1/video/generations";
    
    const payload: any = {
        model: "sora-1",
        prompt: prompt,
    };
    if (image) payload.input_image = image;

    try {
        // Sora API sangat sensitif terhadap CORS, kita coba proksi yang berbeda
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, {
            method: "GET" // AllOrigins GET fallback for status check
        });

        // Catatan: Karena Sora masih Preview, kebanyakan request akan return 404/403
        // Kecuali kunci memiliki akses tier khusus.
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify(payload)
        }).catch(() => { throw new Error("Failed to fetch via Proxy: OpenAI Ley Line is blocked."); });

        if (res.ok) {
            const data = await res.json();
            return data.data?.[0]?.url || null;
        } else {
            if (res.status === 404 || res.status === 403) {
                throw new Error("Sora Preview Restricted: Your current credentials do not have the 'Visionary' authority level.");
            }
            const err = await res.text();
            throw new Error(`OpenAI Synthesizer: ${err.substring(0, 100)}`);
        }
    } catch (e: any) {
        console.error("[Akasha] OpenAI Sora Failure:", e);
        throw e;
    }
};
