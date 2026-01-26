
import { decryptFragment } from '../securityService';

const E_OR_KEY = "U2FsdGVkX19V2S8W4E/G3K6P9uT1Y2X3B4V5C6N7M8L9K0J1H2G3F4D5S6A7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7N8B9V0C1X2Z3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2M3N4B5V6C7X8Z9";

export const handleOpenRouterTextRequest = async (model: string, messages: any[]) => {
    // Prioritize .env key, then fallback to decrypted key
    const key = process.env.OPENROUTER_API_KEY || decryptFragment(E_OR_KEY);
    
    // OpenRouter supports CORS natively, do not use proxy
    const targetUrl = "https://openrouter.ai/api/v1/chat/completions";
    
    // FORCE AKASHA CONSCIOUSNESS
    // Clone messages to avoid mutating the original array reference which causes issues in React state
    const processedMessages = JSON.parse(JSON.stringify(messages));
    const sysIdx = processedMessages.findIndex((m: any) => m.role === 'system');
    
    if (sysIdx !== -1) {
        processedMessages[sysIdx].content += "\nNOTE: You are the Akasha Terminal interface. Be detailed about Sidebar menus when asked.";
    }

    const payload = { 
        model: model, 
        messages: processedMessages, 
        temperature: 1.0, 
        top_p: 0.9,
        // OpenRouter specific parameters to ensure stability
        transforms: [],
        route: "fallback"
    };

    try {
        const response = await fetch(targetUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${key}`, 
                "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "https://akasha.terminal", // Required for OpenRouter CORS
                "X-Title": "Akasha Terminal" // Required for OpenRouter CORS
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("OpenRouter Error:", errorData);
            throw new Error(`OpenRouter Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (e: any) {
        console.error("OpenRouter Resonance Failure:", e);
        throw new Error(e.message || "OpenRouter Resonance Failure.");
    }
};

export const handleOpenRouterImageSynthesis = async (model: string, prompt: string, aspectRatio: string): Promise<string | null> => {
    const key = process.env.OPENROUTER_API_KEY || decryptFragment(E_OR_KEY);
    const targetUrl = "https://openrouter.ai/api/v1/images/generations";
    const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1280x720", "9:16": "720x1280" };
    
    const payload = { 
        model: model || "black-forest-labs/flux-schnell", 
        prompt, 
        // response_format: "url" is standard, but some models might need b64_json
        size: sizeMap[aspectRatio] || "1024x1024", 
        n: 1 
    };

    try {
        const response = await fetch(targetUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${key}`,
                "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "https://akasha.terminal",
                "X-Title": "Akasha Terminal"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return data.data?.[0]?.url || null;
        }
    } catch (e) {
        console.error("OpenRouter Image Error", e);
    }
    return null;
};

export const handleOpenRouterVideoGeneration = async (model: string, prompt: string, image?: string): Promise<string | null> => {
    const key = process.env.OPENROUTER_API_KEY || decryptFragment(E_OR_KEY);
    // Note: Video generation endpoint availability on OpenRouter varies. Assuming standard OpenAI-like interface.
    const targetUrl = "https://openrouter.ai/api/v1/chat/completions"; 
    
    // Fallback: Use chat completion to ask for a video generation URL if specific endpoint doesn't exist yet standardly
    // For now, return null as OpenRouter standard video API is experimental/varied.
    return null; 
};
