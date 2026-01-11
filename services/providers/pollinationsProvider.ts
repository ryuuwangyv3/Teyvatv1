
const POLLINATIONS_KEY = "sk_qM87JYMwNGfqoGKf6vQ5iHEIEUhBDu3x";

export const handlePollinationsTextRequest = async (model: string, messages: any[]) => {
    try {
        const response = await fetch("https://text.pollinations.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${POLLINATIONS_KEY}`
            },
            body: JSON.stringify({
                model: model === 'openai' ? 'gpt-4o' : model,
                messages: messages,
                temperature: 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            // Fallback ke endpoint publik tanpa key jika sk gagal
            const publicResp = await fetch("https://text.pollinations.ai/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages, model: "openai", json: true })
            });
            const pubData = await publicResp.json();
            return pubData.choices?.[0]?.message?.content || pubData.text || "Transmission lost.";
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Transmission lost.";
    } catch (e) {
        throw new Error("Pollinations Resonance Failure: Connection unstable.");
    }
};

export const handlePollinationsImageSynthesis = (prompt: string, modelId: string, width: number, height: number): string => {
    const seed = Math.floor(Math.random() * 10000000);
    
    // Masterpiece prompt injection
    const enhancedPrompt = `${prompt}, masterpiece, best quality, ultra high resolution, 8k, beautiful lighting, cinematic, highly detailed anime style`;

    let engine = "flux";
    if (modelId.toLowerCase().includes('anime')) engine = "flux-anime";
    else if (modelId.toLowerCase().includes('real')) engine = "flux-realism";
    else if (modelId.toLowerCase().includes('3d')) engine = "flux-3d";

    return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?model=${engine}&width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&quality=100`;
};
