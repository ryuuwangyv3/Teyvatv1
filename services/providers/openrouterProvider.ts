
const OPENROUTER_KEY = "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";

const PROXIES = [
    "https://api.allorigins.win/get?url=",
    "https://corsproxy.io/?",
    "" // Direct fallback
];

export const handleOpenRouterTextRequest = async (model: string, messages: any[]) => {
    const targetUrl = "https://openrouter.ai/api/v1/chat/completions";
    const payload = {
        model: model,
        messages: messages,
        temperature: 0.8
    };

    // Kita gunakan logic proksi yang lebih tangguh
    for (const proxy of PROXIES) {
        try {
            const isAllOrigins = proxy.includes('allorigins');
            const finalUrl = isAllOrigins ? `${proxy}${encodeURIComponent(targetUrl)}` : `${proxy}${targetUrl}`;
            
            const response = await fetch(finalUrl, {
                method: isAllOrigins ? "GET" : "POST", // AllOrigins often needs special handling for POST
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENROUTER_KEY}`,
                    "X-Title": "Akasha Terminal"
                },
                ...(isAllOrigins ? {} : { body: JSON.stringify(payload) })
            });

            if (response.ok) {
                const data = await response.json();
                const result = isAllOrigins ? JSON.parse(data.contents) : data;
                return result.choices?.[0]?.message?.content;
            }
        } catch (e) {
            console.warn(`[Akasha] OpenRouter Proxy ${proxy} failed, trying next...`);
        }
    }

    throw new Error("Celestial Handshake Failed: All Ley Lines to OpenRouter are unstable.");
};

export const handleOpenRouterImageSynthesis = async (model: string, prompt: string, aspectRatio: string): Promise<string | null> => {
    const targetUrl = "https://openrouter.ai/api/v1/images/generations";
    const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1280x720", "9:16": "720x1280" };
    
    const payload = {
        model: model || "black-forest-labs/flux-schnell",
        prompt: prompt,
        response_format: "url",
        size: sizeMap[aspectRatio] || "1024x1024",
        n: 1
    };

    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return data.data?.[0]?.url || null;
        }
    } catch (e) {}
    return null;
};

/**
 * Handle Video Generation via OpenRouter (SVD, MiniMax, etc.)
 */
export const handleOpenRouterVideoGeneration = async (model: string, prompt: string, image?: string): Promise<string | null> => {
    const targetUrl = "https://openrouter.ai/api/v1/media/generations";
    
    const payload: any = {
        model: model,
        prompt: prompt,
    };
    if (image) payload.image_url = image;

    // Mencoba fetch dengan penanganan error yang sangat detail
    const attemptFetch = async (proxyBase: string): Promise<any> => {
        const url = proxyBase ? `${proxyBase}${encodeURIComponent(targetUrl)}` : targetUrl;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "X-Title": "Akasha Video Forge",
                "HTTP-Referer": window.location.origin
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            let errJson;
            try { errJson = JSON.parse(text); } catch(e) {}
            throw new Error(errJson?.error?.message || `Provider Error ${response.status}: ${text.substring(0, 50)}`);
        }
        return await response.json();
    };

    try {
        let data;
        try {
            data = await attemptFetch("https://corsproxy.io/?");
        } catch (e) {
            console.warn("[Akasha] OpenRouter Proxy failed, trying direct...");
            data = await attemptFetch("");
        }

        const videoUrl = data.data?.[0]?.url || data.data?.[0]?.uri || data.url || data.uri;
        if (videoUrl) return videoUrl;
        
        if (data.id || data.data?.[0]?.id) {
            throw new Error("Generation queued. Polling not supported in this cycle. Please try again in a few moments.");
        }
        
        throw new Error("The neural network synthesized an empty sequence. Try a simpler prompt.");
    } catch (e: any) {
        console.error("[Akasha] OpenRouter Video Forge Critical Failure:", e);
        throw e;
    }
};
