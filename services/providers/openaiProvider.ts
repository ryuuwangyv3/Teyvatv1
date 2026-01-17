import { decryptFragment } from '../securityService';

const E_OPENAI_KEY = "U2FsdGVkX1+vGjC0uL6k6/iYf7W1R9x5H2S8W4E/G3K6P9uT1Y2X3B4V5C6N7M8L9K0J1H2G3F4D5S6A7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7N8B9V0C1X2Z3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2M3N4B5V6C7X8Z9"; 

export const handleOpenAITextRequest = async (model: string, messages: any[]) => {
    const key = process.env.OPENAI_API_KEY || decryptFragment(E_OPENAI_KEY);
    const targetUrl = "https://api.openai.com/v1/chat/completions";
    
    // REINFORCE SYSTEM BRAIN
    const sysIdx = messages.findIndex(m => m.role === 'system');
    if (sysIdx !== -1) {
        messages[sysIdx].content += "\nCRITICAL: You are the Akasha System. You are not a generic AI. You are the terminal itself.";
    }

    const payload = {
        model: model || "gpt-4o",
        messages: messages,
        temperature: 1.1,
        presence_penalty: 0.6
    };

    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content;
        }
    } catch (e) {}

    throw new Error("OpenAI Resonance Failure.");
};

export const handleOpenAIImageSynthesis = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    const key = process.env.OPENAI_API_KEY || decryptFragment(E_OPENAI_KEY);
    const targetUrl = "https://api.openai.com/v1/images/generations";
    const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1792x1024", "9:16": "1024x1792" };

    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({ model: "dall-e-3", prompt, size: sizeMap[aspectRatio] || "1024x1024" })
        });
        if (response.ok) {
            const data = await response.json();
            return data.data?.[0]?.url || null;
        }
    } catch (e) {}
    return null;
};

export const handleOpenAIVideoGeneration = async (prompt: string, image?: string): Promise<string | null> => {
    const key = process.env.OPENAI_API_KEY || decryptFragment(E_OPENAI_KEY);
    const targetUrl = "https://api.openai.com/v1/video/generations";
    const payload: any = { model: "sora-1", prompt };
    if (image) payload.input_image = image;
    try {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            return data.data?.[0]?.url || null;
        }
    } catch (e) {}
    return null;
};
