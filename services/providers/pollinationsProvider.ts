
/**
 * CELESTIAL RELAY: Pollinations Node Optimized (V10.0)
 * Focusing on direct transmission stability and minimal latency.
 */

export const handlePollinationsTextRequest = async (model: string, messages: any[]) => {
    // 1. Prepare Content
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    const promptText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : "Ping";
    
    // Normalize model ID for Pollinations
    const targetModel = model || "openai";

    // --- CIRCUIT A: DIRECT POST (Standard Protocol) ---
    try {
        const response = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "*/*"
            },
            body: JSON.stringify({
                messages: messages,
                model: targetModel,
                stream: false,
                seed: Math.floor(Math.random() * 1000000)
            }),
            mode: 'cors'
        });

        if (response.ok) {
            const data = await response.text();
            if (data && data.trim().length > 0) return data;
        }
    } catch (postError) {
        console.warn("[Akasha] POST Resonance failed, switching to GET Protocol...");
    }

    // --- CIRCUIT B: DIRECT GET (Lightweight Fallback) ---
    // This is often more reliable for CORS issues in browser environments
    try {
        const encodedPrompt = encodeURIComponent(promptText);
        const getUrl = `https://text.pollinations.ai/${encodedPrompt}?model=${targetModel}&json=false&seed=${Math.floor(Math.random() * 1000000)}`;
        
        const response = await fetch(getUrl, {
            method: "GET",
            headers: { "Accept": "text/plain" }
        });

        if (response.ok) {
            const data = await response.text();
            if (data && data.trim().length > 0) return data;
        }
    } catch (getError) {
        console.error("[Akasha] GET Resonance failed.", getError);
    }

    // --- FINAL EMERGENCY PATH: ALLORIGINS PROXY ---
    // Only used if both direct paths are completely blocked by the user's environment
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://text.pollinations.ai/${promptText}?model=${targetModel}`)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const json = await response.json();
            if (json.contents) return json.contents;
        }
    } catch (proxyError) {
        console.error("[Akasha] All paths severed.");
    }

    throw new Error("Resonance Blocked: Akasha could not synchronize with Pollinations. Check your Ley Line (Internet) connection.");
};

export const handlePollinationsImageSynthesis = (prompt: string, modelId: string, width: number, height: number): string => {
    const seed = Math.floor(Math.random() * 10000000);
    const negativeContext = "blurry, low quality, distorted, bad proportions, watermark, extra limbs, realism, photorealistic, 3d render, messy face";
    
    let slug = "flux";
    const lowerId = modelId.toLowerCase();
    if (lowerId.includes('anime')) slug = "flux-anime";
    else if (lowerId.includes('real')) slug = "flux-realism";
    else if (lowerId.includes('turbo')) slug = "turbo";

    // Pollinations images are always GET requests (Images), very stable.
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${slug}&width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=false&safe=false&negative_prompt=${encodeURIComponent(negativeContext)}`;
};
