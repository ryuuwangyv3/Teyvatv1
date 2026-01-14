
/**
 * CELESTIAL RELAY: Pollinations Node Optimized (V10.2)
 */

export const handlePollinationsTextRequest = async (model: string, messages: any[]) => {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    const promptText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : "Ping";
    const targetModel = model || "openai";

    try {
        const response = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "*/*"
            },
            body: JSON.stringify({
                messages: messages,
                model: targetModel,
                stream: false,
                seed: Math.floor(Math.random() * 1000000)
            })
        });

        if (response.ok) {
            const data = await response.text();
            if (data && data.trim().length > 0) return data;
        }
    } catch (e) {}

    // Light-speed GET Fallback
    try {
        const getUrl = `https://text.pollinations.ai/${encodeURIComponent(promptText)}?model=${targetModel}&seed=${Date.now()}`;
        const response = await fetch(getUrl);
        if (response.ok) return await response.text();
    } catch (e) {}

    throw new Error("Resonance Blocked: Pollinations could not synchronize.");
};

export const handlePollinationsImageSynthesis = (prompt: string, modelId: string, width: number, height: number): string => {
    const seed = Math.floor(Math.random() * 10000000);
    let slug = "flux";
    if (modelId.toLowerCase().includes('anime')) slug = "flux-anime";
    else if (modelId.toLowerCase().includes('real')) slug = "flux-realism";

    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${slug}&width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
};

/**
 * Handle Video Generation via Pollinations (Motion Synthesis)
 * Menggunakan sistem prompt animasi tingkat lanjut untuk Pollinations.
 */
export const handlePollinationsVideoGeneration = async (prompt: string): Promise<string | null> => {
    const seed = Math.floor(Math.random() * 1000000);
    // Pollinations GIF synthesis bekerja paling baik dengan model 'flux' dan prompt gerakan eksplisit
    const animationPrompt = `${prompt}, masterpiece anime style, animated gif, highly dynamic motion, smooth loop, high frame rate`;
    const videoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(animationPrompt)}.gif?model=flux&seed=${seed}&width=1280&height=720&nologo=true`;
    
    // Memberikan delay kecil untuk memastikan gateway siap
    await new Promise(r => setTimeout(r, 600));
    
    return videoUrl;
};
