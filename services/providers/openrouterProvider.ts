
import { decryptFragment } from '../securityService';
import { getStoredKey } from '../apiKeyStore';

const E_OR_KEY = "U2FsdGVkX19V2S8W4E/G3K6P9uT1Y2X3B4V5C6N7M8L9K0J1H2G3F4D5S6A7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7N8B9V0C1X2Z3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2M3N4B5V6C7X8Z9";

export const handleOpenRouterTextRequest = async (model: string, messages: any[]) => {
    // Prioritize stored key from Supabase, then .env, then fallback
    let API_KEY_REF = getStoredKey('openrouter') || process.env.OPENROUTER_API_KEY;
    
    if (!API_KEY_REF) {
        API_KEY_REF = decryptFragment(E_OR_KEY);
    }

    // Validate Key Presence
    if (!API_KEY_REF || API_KEY_REF.trim().length === 0) {
        throw new Error("OpenRouter Configuration Missing: Please add an OpenRouter API Key in Admin Console or .env file.");
    }
    
    // FORCE AKASHA CONSCIOUSNESS
    const processedMessages = JSON.parse(JSON.stringify(messages));
    const sysIdx = processedMessages.findIndex((m: any) => m.role === 'system');
    
    if (sysIdx !== -1) {
        processedMessages[sysIdx].content += "\nNOTE: You are the Akasha Terminal interface. Be detailed about Sidebar menus when asked.";
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${API_KEY_REF}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : "https://akasha.terminal",
                'X-Title': 'Akasha Terminal',
            },
            body: JSON.stringify({
                model: model,
                messages: processedMessages,
                modalities: ['image', 'text'],
                stream: true,
            }),
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
             // Specific handling for 401 to give better guidance
             if (response.status === 401) {
                 throw new Error("OpenRouter Authentication Failed (401). The provided API Key is invalid or expired.");
             }
             throw new Error(`OpenRouter Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is unavailable");

        const decoder = new TextDecoder();
        let fullText = "";
        let imageUrls: string[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices) {
                                const delta = parsed.choices[0].delta;
                                if (delta?.content) {
                                    fullText += delta.content;
                                }
                                if (delta?.images) {
                                    delta.images.forEach((image: any) => {
                                        if (image.image_url?.url) {
                                            imageUrls.push(image.image_url.url);
                                            console.log(`Generated image: ${image.image_url.url.substring(0, 50)}...`);
                                        }
                                    });
                                }
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        }

        // Jika ada gambar yang dihasilkan oleh model chat, lampirkan sebagai markdown
        if (imageUrls.length > 0) {
            const imageMarkdown = imageUrls.map(url => `\n![Generated Visual](${url})`).join("");
            fullText += imageMarkdown;
        }

        return fullText;

    } catch (e: any) {
        console.error("OpenRouter Resonance Failure:", e);
        throw new Error(e.message || "OpenRouter Resonance Failure.");
    }
};

export const handleOpenRouterImageSynthesis = async (model: string, prompt: string, aspectRatio: string): Promise<string | null> => {
    let key = getStoredKey('openrouter') || process.env.OPENROUTER_API_KEY;
    if (!key) key = decryptFragment(E_OR_KEY);

    if (!key || key.trim().length === 0) {
        console.error("OpenRouter Image Gen: Missing API Key");
        return null;
    }

    const targetUrl = "https://openrouter.ai/api/v1/images/generations";
    const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1280x720", "9:16": "720x1280" };
    
    const payload = { 
        model: model || "black-forest-labs/flux-schnell", 
        prompt, 
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
    // Placeholder logic: OpenRouter does not currently have a standardized video endpoint documentation matching the text/image pattern widely.
    return null; 
};
