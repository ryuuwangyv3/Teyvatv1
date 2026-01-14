import { decryptFragment } from '../securityService';

// Celestial Fragments (Encrypted Keys)
const E_OR_KEY = "U2FsdGVkX19V2S8W4E/G3K6P9uT1Y2X3B4V5C6N7M8L9K0J1H2G3F4D5S6A7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7N8B9V0C1X2Z3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2M3N4B5V6C7X8Z9Q0W1E2R3T4Y5U6I7O8P9A0S1D2F3G4H5J6K7L8M9N0B1V2C3X4Z5Q6W7E8R9T0Y1U2I3O4P5A6S7D8F9G0H1J2K3L4M5N6B7V8C9X0Z1Q2W3E4R5T6Y7U8I9O0P1A2S3D4F5G6H7J8K9L0M1N2B3V4C5X6Z7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7N8B9V0C1X2Z3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2M3N4B5V6C7X8Z9Q0W1E2R3T4Y5U6I7O8P9A0S1D2F3G4H5J6K7L8M9N0B1V2C3X4Z5Q6W7E8R9T0Y1U2I3O4P5A6S7D8F9G0H1J2K3L4M5N6B7V8C9X0Z1Q2W3E4R5T6Y7U8I9O0P1A2S3D4F5G6H7J8K9L0M1N2B3V4C5X6Z7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7N8B9V0C1X2Z3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2M3N4B5V6C7X8Z9";

export const handleOpenRouterTextRequest = async (model: string, messages: any[]) => {
    const key = process.env.OPENROUTER_API_KEY || decryptFragment(E_OR_KEY);
    const targetUrl = "https://openrouter.ai/api/v1/chat/completions";
    
    const payload = {
        model: model,
        messages: messages,
        temperature: 0.8
    };

    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`,
                "X-Title": "Akasha Terminal"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content;
        }
    } catch (e) {}

    throw new Error("Celestial Handshake Failed: OpenRouter Ley Line is unstable.");
};

export const handleOpenRouterImageSynthesis = async (model: string, prompt: string, aspectRatio: string): Promise<string | null> => {
    const key = process.env.OPENROUTER_API_KEY || decryptFragment(E_OR_KEY);
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
                "Authorization": `Bearer ${key}`
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

export const handleOpenRouterVideoGeneration = async (model: string, prompt: string, image?: string): Promise<string | null> => {
    const key = process.env.OPENROUTER_API_KEY || decryptFragment(E_OR_KEY);
    const targetUrl = "https://openrouter.ai/api/v1/media/generations";
    
    const payload: any = { model: model, prompt: prompt };
    if (image) payload.image_url = image;

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
            return data.data?.[0]?.url || data.url || null;
        }
    } catch (e) {}
    return null;
};