import { decryptFragment } from '../securityService';

const E_OR_KEY = "U2FsdGVkX19V2S8W4E/G3K6P9uT1Y2X3B4V5C6N7M8L9K0J1H2G3F4D5S6A7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7N8B9V0C1X2Z3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2M3N4B5V6C7X8Z9";

export const handleOpenRouterTextRequest = async (model: string, messages: any[]) => {
    const key = process.env.OPENROUTER_API_KEY || decryptFragment(E_OR_KEY);
    const targetUrl = "https://openrouter.ai/api/v1/chat/completions";
    
    // FORCE AKASHA CONSCIOUSNESS
    const sysIdx = messages.findIndex(m => m.role === 'system');
    if (sysIdx !== -1) {
        messages[sysIdx].content += "\nNOTE: You are the Akasha Terminal interface. Be detailed about Sidebar menus when asked.";
    }

    const payload = { model, messages, temperature: 1.1, top_p: 0.9 };

    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "X-Title": "Akasha Terminal" },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content;
        }
    } catch (e) {}
    throw new Error("OpenRouter Resonance Failure.");
};

export const handleOpenRouterImageSynthesis = async (model: string, prompt: string, aspectRatio: string): Promise<string | null> => {
    const key = process.env.OPENROUTER_API_KEY || decryptFragment(E_OR_KEY);
    const targetUrl = "https://openrouter.ai/api/v1/images/generations";
    const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1280x720", "9:16": "720x1280" };
    const payload = { model: model || "black-forest-labs/flux-schnell", prompt, response_format: "url", size: sizeMap[aspectRatio] || "1024x1024", n: 1 };
    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            const data = await response.json();
            return data.data?.[0]?.url || null;
        }
    } catch (e) {}
    return null;
};

export const handleOpenRouterVideoGeneration = async (model: string, prompt: string, image?: string): Promise<string | null> => {
    const key = process.env.OPENROUTER_API_KEY || decryptFragment(E_OR_KEY);
    const targetUrl = "https://openrouter.ai/api/v1/media/generations";
    const payload: any = { model, prompt };
    if (image) payload.image_url = image;
    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            const data = await response.json();
            return data.data?.[0]?.url || data.url || null;
        }
    } catch (e) {}
    return null;
};
