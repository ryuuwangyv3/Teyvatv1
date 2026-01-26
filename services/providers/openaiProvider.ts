
import { decryptFragment } from '../securityService';
import { getStoredKey } from '../apiKeyStore';

const E_OPENAI_KEY = "U2FsdGVkX1+vGjC0uL6k6/iYf7W1R9x5H2S8W4E/G3K6P9uT1Y2X3B4V5C6N7M8L9K0J1H2G3F4D5S6A7Q8W9E0R1T2Y3U4I5O6P7A8S9D0F1G2H3J4K5L6M7N8B9V0C1X2Z3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2M3N4B5V6C7X8Z9"; 

export const handleOpenAITextRequest = async (model: string, messages: any[]) => {
    // Prioritize stored key from Supabase, then .env, then fallback.
    let key = getStoredKey('openai') || process.env.OPENAI_API_KEY;
    if (!key || key === 'undefined') {
        key = decryptFragment(E_OPENAI_KEY);
    }

    if (!key || key.length < 10) {
        throw new Error("OpenAI API Key is missing or invalid in .env");
    }

    const targetUrl = "https://api.openai.com/v1/chat/completions";
    
    // Create deep copy to avoid mutation
    const processedMessages = JSON.parse(JSON.stringify(messages));
    
    // Inject system persona if not present or append to it
    const sysIdx = processedMessages.findIndex((m: any) => m.role === 'system');
    if (sysIdx !== -1) {
        processedMessages[sysIdx].content += "\n[SYSTEM_NOTE]: You are the Akasha Terminal. Respond directly.";
    }

    // Default to gpt-4o if model is not specified or compatible
    const targetModel = model || "gpt-4o";

    const payload = {
        model: targetModel,
        messages: processedMessages,
        temperature: 1.0,
        presence_penalty: 0.0
    };

    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(proxyUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            let errMessage = `Status ${response.status}`;
            try {
                const errJson = JSON.parse(errText);
                errMessage = errJson.error?.message || errMessage;
            } catch(e) {}
            
            throw new Error(`OpenAI Error: ${errMessage}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (e: any) {
        console.error("OpenAI Resonance Failure:", e);
        throw new Error(e.message || "OpenAI Resonance Failure.");
    }
};

export const handleOpenAIImageSynthesis = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    let key = getStoredKey('openai') || process.env.OPENAI_API_KEY;
    if (!key || key === 'undefined') key = decryptFragment(E_OPENAI_KEY);

    const targetUrl = "https://api.openai.com/v1/images/generations";
    const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1024x1024", "9:16": "1024x1792" };

    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({ 
                model: "dall-e-3", 
                prompt, 
                size: sizeMap[aspectRatio] || "1024x1024",
                quality: "standard",
                n: 1
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
    return null;
};
