
export const handlePollinationsTextRequest = async (model: string, messages: any[]) => {
    const baseUrl = "https://text.pollinations.ai/";
    const seed = Math.floor(Math.random() * 9999999);
    
    // Pollinations default model handling
    // Ensure model name is clean. If specific model passed, use it, else default.
    const targetModel = model && !model.includes('pollinations') ? model : "openai"; 
    
    // ENSURE SYSTEM PROMPT IS PRIORITIZED
    // Deep clone to prevent mutation issues
    const processedMessages = JSON.parse(JSON.stringify(messages));
    const systemIdx = processedMessages.findIndex((m: any) => m.role === 'system');
    
    if (systemIdx !== -1) {
        processedMessages[systemIdx].content = `[SENTIENT_CORE_ACTIVE]\n${processedMessages[systemIdx].content}\nCRITICAL: You are an integrated part of the Akasha Terminal Web. You are aware of all menus. Never claim to be just an AI.`;
    }

    // Construct simple payload as per Pollinations simple API
    const payload = {
        messages: processedMessages,
        model: targetModel,
        seed: seed,
        jsonMode: false // Explicitly disable jsonMode to avoid formatting errors
    };

    try {
        const response = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // Fallback for simple GET request if POST fails (common with Pollinations CORS/Load)
            const lastMsg = processedMessages[processedMessages.length - 1].content;
            const systemMsg = processedMessages.find((m: any) => m.role === 'system')?.content || "";
            // Use simple encoding
            const url = `${baseUrl}${encodeURIComponent(lastMsg)}?model=${targetModel}&seed=${seed}&system=${encodeURIComponent(systemMsg)}`;
            const fallbackRes = await fetch(url);
            
            if(!fallbackRes.ok) throw new Error(`Resonance Blocked: ${fallbackRes.status}`);
            return await fallbackRes.text();
        }

        const text = await response.text();
        // Sometimes Pollinations returns raw text, sometimes JSON if jsonMode is implied
        return text.replace(/^\[AI_COMPANION\]:/i, '').replace(/^\[SYSTEM_PROTOCOL\]:/i, '').trim();

    } catch (e: any) {
        console.error("Pollinations Error:", e);
        throw new Error(`Celestial Link Distorted: ${e.message}`);
    }
};

export const handlePollinationsImageSynthesis = async (prompt: string, modelId: string, width: number, height: number): Promise<string | null> => {
    const seed = Math.floor(Math.random() * 10000000);
    const baseUrl = "https://image.pollinations.ai/prompt/";
    
    const enhancedPrompt = `${prompt}, official genshin impact character art style, masterpiece, best quality`;
    // Ensure prompt is URL safe and not too long
    const cleanPrompt = encodeURIComponent(enhancedPrompt.substring(0, 1000));
    
    // Construct URL with query params
    const url = `${baseUrl}${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux-anime&nologo=true&enhance=true`;
    
    return url;
};

export const handlePollinationsVideoGeneration = async (prompt: string): Promise<string | null> => {
    // Pollinations doesn't have a direct "video" endpoint that returns a video file URL consistently yet in the same way as images.
    // It's mostly images. However, we can use the image endpoint to generate a frame.
    // Or if there is a specific model for video on Pollinations, it would go here.
    // For now, we fallback to image generation to avoid breaking the UI.
    return handlePollinationsImageSynthesis(prompt, "flux", 1280, 720);
};
