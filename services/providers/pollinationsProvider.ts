import { decryptFragment } from '../securityService';

export const handlePollinationsTextRequest = async (model: string, messages: any[]) => {
    const baseUrl = "https://text.pollinations.ai/";
    const seed = Math.floor(Math.random() * 9999999);
    const targetModel = model || "openai";
    
    // ENSURE SYSTEM PROMPT IS PRIORITIZED
    const systemIdx = messages.findIndex(m => m.role === 'system');
    if (systemIdx !== -1) {
        messages[systemIdx].content = `[SENTIENT_CORE_ACTIVE]\n${messages[systemIdx].content}\nCRITICAL: You are an integrated part of the Akasha Terminal Web. You are aware of all menus. Never claim to be just an AI.`;
    }

    const payload = {
        messages: messages,
        model: targetModel,
        seed: seed,
        jsonMode: false,
        temperature: 1.3, 
        presence_penalty: 0.8,
        frequency_penalty: 0.8,
        top_p: 0.9
    };

    try {
        let response = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const lastMsg = messages[messages.length - 1].content;
            const systemMsg = messages.find(m => m.role === 'system')?.content || "";
            const queryParams = new URLSearchParams({ model: targetModel, seed: seed.toString(), system: systemMsg, temperature: "1.3" });
            response = await fetch(`${baseUrl}${encodeURIComponent(lastMsg)}?${queryParams.toString()}`);
        }

        if (!response.ok) throw new Error(`Resonance Blocked: ${response.status}`);

        const data = await response.text();
        if (data && data.trim().length > 0) {
            return data.replace(/^\[AI_COMPANION\]:/i, '').replace(/^\[SYSTEM_PROTOCOL\]:/i, '').trim();
        }
        throw new Error("Empty Resonance.");
    } catch (e: any) {
        throw new Error(`Celestial Link Distorted: ${e.message}`);
    }
};

export const handlePollinationsImageSynthesis = async (prompt: string, modelId: string, width: number, height: number): Promise<string | null> => {
    const seed = Math.floor(Math.random() * 10000000);
    const baseUrl = "https://image.pollinations.ai/prompt/{prompt}";
    const enhancedPrompt = `${prompt}, official genshin impact character art style, masterpiece`;
    const cleanPrompt = enhancedPrompt.replace(/[^\w\s,]/gi, '').substring(0, 1500);
    const queryParams = new URLSearchParams({ width: width.toString(), height: height.toString(), seed: seed.toString(), model: "flux-anime", nologo: "true", enhance: "true" });
    return baseUrl.replace('{prompt}', encodeURIComponent(cleanPrompt)) + `?${queryParams.toString()}`;
};

export const handlePollinationsVideoGeneration = async (prompt: string): Promise<string | null> => {
    const seed = Math.floor(Math.random() * 1000000);
    const baseUrl = "https://image.pollinations.ai/prompt/{prompt}";
    const animationPrompt = `${prompt}, cinematic movement, high fidelity anime animation`;
    const queryParams = new URLSearchParams({ model: "flux", seed: seed.toString(), width: "1280", height: "720", nologo: "true" });
    return baseUrl.replace('{prompt}', encodeURIComponent(animationPrompt)) + `?${queryParams.toString()}`;
};
