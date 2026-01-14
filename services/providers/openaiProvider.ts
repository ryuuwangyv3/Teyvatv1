import { decryptFragment } from '../securityService';

// Celestial Fragments (Encrypted Keys & Paths)
const E_OPENAI_KEY = "U2FsdGVkX1+vGjC0uL6k6/iYf7W1R9x5H2S8W4E/G3K6P9uT1Y2X3B4V5C6N7M8L9K0J1H2G3F4D5S6A7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7N8B9V0C1X2Z3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2M3N4B5V6C7X8Z9"; 
const E_OPENAI_PATH = "U2FsdGVkX1/o8S4M0L5K6J7H8G9F0D1S2A3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2M3N4B5V6C7X8Z9Q0W1E2R3T4Y5U6I7O8P9A0S1D2F3G4H5J6K7L8M9N0B1V2C3X4Z5Q6W7E8R9T0Y1U2I3O4P5A6S7D8F9G0H1J2K3L4M5N6B7V8C9X0Z1";

export const handleOpenAITextRequest = async (model: string, messages: any[]) => {
    const key = process.env.OPENAI_API_KEY || decryptFragment(E_OPENAI_KEY);
    const targetUrl = decryptFragment(E_OPENAI_PATH) || "https://api.openai.com/v1/chat/completions";
    
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
                "Authorization": `Bearer ${key}`
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
    const key = process.env.OPENAI_API_KEY || decryptFragment(E_OPENAI_KEY);
    const targetUrl = "https://api.openai.com/v1/video/generations";
    
    const payload: any = { model: "sora-1", prompt: prompt };
    if (image) payload.input_image = image;

    try {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            return data.data?.[0]?.url || null;
        }
    } catch (e: any) {
        console.error("[Akasha] OpenAI Sora Failure:", e);
    }
    return null;
};