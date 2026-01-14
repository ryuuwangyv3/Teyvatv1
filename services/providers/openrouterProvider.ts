
const OPENROUTER_KEY = "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";

const PROXIES = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/get?url="
];

export const handleOpenRouterTextRequest = async (model: string, messages: any[]) => {
    const targetUrl = "https://openrouter.ai/api/v1/chat/completions";
    const payload = {
        model: model,
        messages: messages,
        temperature: 0.8
    };

    // --- CIRCUIT A: PRIMARY PROXY ---
    try {
        const response = await fetch(`${PROXIES[0]}${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "X-Title": "Akasha Terminal",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content || "Signal lost in the Ley Lines.";
        }
    } catch (e) {
        console.warn("[Akasha] OpenRouter Primary Link severed.");
    }

    // --- CIRCUIT B: DIRECT RESONANCE ---
    try {
        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "X-Title": "Akasha Terminal"
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content;
        }
    } catch (e) {}

    throw new Error("Celestial Handshake Failed: All Ley Lines to OpenRouter are unstable.");
};

/**
 * Handle Image Synthesis via OpenRouter
 * Enhanced for Masterpiece Quality
 */
export const handleOpenRouterImageSynthesis = async (model: string, prompt: string, aspectRatio: string): Promise<string | null> => {
    const targetUrl = "https://openrouter.ai/api/v1/images/generations";
    
    // Size mapping for OpenRouter models
    const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1280x720", "9:16": "720x1280" };
    
    const payload = {
        model: model || "black-forest-labs/flux-schnell",
        prompt: prompt,
        response_format: "url",
        size: sizeMap[aspectRatio] || "1024x1024",
        quality: "hd",
        n: 1
    };

    try {
        const response = await fetch(`${PROXIES[0]}${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_KEY}`,
                "X-Title": "Akasha Terminal"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return data.data?.[0]?.url || null;
        }
    } catch (e) {
        console.warn("[Akasha] OpenRouter Vision Link failed via proxy.");
    }

    // Direct Attempt
    try {
        const response = await fetch(targetUrl, {
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
