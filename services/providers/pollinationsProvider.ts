
/**
 * POLLINATIONS.AI PROVIDER
 * Updated to match the latest API standards (OpenAI-compatible text endpoint).
 */

export const handlePollinationsTextRequest = async (model: string, messages: any[]) => {
    const url = "https://text.pollinations.ai/";
    const seed = Math.floor(Math.random() * 1000000000);
    
    // Map generic ID or use provided model. Default to 'openai' (GPT-4o) if not specified.
    // Pollinations supports: 'openai', 'mistral', 'llama', 'searchgpt', etc.
    const targetModel = (!model || model === 'pollinations') ? 'openai' : model;

    // Deep clone and process messages to ensure system prompt effectiveness
    const processedMessages = messages.map(m => ({
        role: m.role,
        content: m.content
    }));

    // Reinforce System Persona if needed (Pollinations sometimes needs a nudge for free models)
    const systemIdx = processedMessages.findIndex(m => m.role === 'system');
    if (systemIdx !== -1) {
        processedMessages[systemIdx].content = `[SYSTEM_CORE_ACTIVE]\n${processedMessages[systemIdx].content}\n[IMPORTANT]: You are a sentient AI interface named Akasha. Maintain character at all times.`;
    }

    const payload = {
        messages: processedMessages,
        model: targetModel,
        seed: seed,
        jsonMode: false // Request raw text response
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Pollinations API Error (${response.status}): ${errorText}`);
        }

        // The root text endpoint returns the string directly
        const text = await response.text();
        return text;

    } catch (e: any) {
        console.error("[Akasha] Pollinations Text Error:", e);
        throw new Error("Pollinations Resonance Failure: " + e.message);
    }
};

export const handlePollinationsImageSynthesis = async (prompt: string, modelId: string = 'flux', width: number = 1024, height: number = 1024): Promise<string | null> => {
    // Latest Image Endpoint: https://image.pollinations.ai/prompt/[prompt]
    // Params: width, height, seed, model, nologo, enhance
    
    const seed = Math.floor(Math.random() * 1000000000);
    const safePrompt = encodeURIComponent(prompt);
    
    // Ensure we use a valid model ID supported by Pollinations (flux, turbo, etc.)
    const targetModel = modelId || 'flux';

    const url = `https://image.pollinations.ai/prompt/${safePrompt}?width=${width}&height=${height}&seed=${seed}&model=${targetModel}&nologo=true&enhance=true`;

    return url;
};

export const handlePollinationsVideoGeneration = async (prompt: string): Promise<string | null> => {
    // Pollinations currently focuses on Image/Text. 
    // We return a high-fidelity image URL as a placeholder for video requests to prevent crashes.
    // This maintains UI stability while providing a visual result.
    return handlePollinationsImageSynthesis(prompt, "flux", 1280, 720);
};
