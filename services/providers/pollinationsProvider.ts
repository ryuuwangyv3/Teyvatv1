import { decryptFragment } from '../securityService';

/**
 * CELESTIAL RELAY: Pollinations Node (V30.0 - Neural Anchor Synchronized)
 * Dioptimalkan dengan Brain Anchor untuk memastikan kepatuhan sistem Akasha 100%.
 */

export const handlePollinationsTextRequest = async (model: string, messages: any[]) => {
    const baseUrl = "https://text.pollinations.ai/";
    const seed = Math.floor(Math.random() * 9999999);
    
    // Sinkronisasi model target
    const targetModel = model || "openai";
    
    // Payload untuk metode POST (Paling stabil untuk sinkronisasi OTAK AI)
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

        // Fallback GET jika POST gagal (Node Disturbance)
        if (!response.ok) {
            const lastMsg = messages[messages.length - 1].content;
            const systemMsg = messages.find(m => m.role === 'system')?.content || "";
            
            const queryParams = new URLSearchParams({
                model: targetModel,
                seed: seed.toString(),
                system: systemMsg, 
                temperature: "1.3",
                jsonMode: "false"
            });
            
            const getUrl = `${baseUrl}${encodeURIComponent(lastMsg)}?${queryParams.toString()}`;
            response = await fetch(getUrl);
        }

        if (!response.ok) {
            const errorMsg = await response.text().catch(() => "Node Disturbance");
            throw new Error(`Resonance Blocked: ${response.status} - ${errorMsg.substring(0, 30)}`);
        }

        const data = await response.text();
        if (data && data.trim().length > 0) {
            // Pembersihan output agresif agar tidak ada format bocor
            return data
                .replace(/^\[AI_COMPANION\]:/i, '')
                .replace(/^\[SYSTEM_PROTOCOL\]:/i, '')
                .replace(/^AI_COMPANION:/i, '')
                .trim();
        }
        
        throw new Error("Empty Resonance: No data returned from Irminsul.");
    } catch (e: any) {
        console.error("[Akasha] Pollinations Text Failure:", e);
        throw new Error(`Celestial Link Distorted: ${e.message}`);
    }
};

/**
 * Image Synthesis Protocol (Fidelity: Masterpiece)
 */
export const handlePollinationsImageSynthesis = async (prompt: string, modelId: string, width: number, height: number): Promise<string | null> => {
    const seed = Math.floor(Math.random() * 10000000);
    const baseUrl = "https://image.pollinations.ai/prompt/{prompt}";
    
    const enhancedPrompt = `${prompt}, official genshin impact character art style, high quality anime render, vibrant coloring, masterpiece`;
    const cleanPrompt = enhancedPrompt.replace(/[^\w\s,]/gi, '').substring(0, 1500);

    const queryParams = new URLSearchParams({
        width: width.toString(),
        height: height.toString(),
        seed: seed.toString(),
        model: "flux-anime", 
        nologo: "true",
        enhance: "true"
    });

    return baseUrl.replace('{prompt}', encodeURIComponent(cleanPrompt)) + `?${queryParams.toString()}`;
};

export const handlePollinationsVideoGeneration = async (prompt: string): Promise<string | null> => {
    const seed = Math.floor(Math.random() * 1000000);
    const baseUrl = "https://image.pollinations.ai/prompt/{prompt}";
    const animationPrompt = `${prompt}, cinematic movement, high fidelity anime animation, fluid motion`;
    
    const queryParams = new URLSearchParams({
        model: "flux",
        seed: seed.toString(),
        width: "1280",
        height: "720",
        nologo: "true"
    });

    return baseUrl.replace('{prompt}', encodeURIComponent(animationPrompt)) + `?${queryParams.toString()}`;
};