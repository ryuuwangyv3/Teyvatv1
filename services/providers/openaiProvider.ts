
const OPENAI_KEY = "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";
const PROXIES = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/get?url="
];

export const handleOpenAITextRequest = async (model: string, messages: any[]) => {
    const targetUrl = "https://api.openai.com/v1/chat/completions";
    const payload = {
        model: model || "gpt-4o",
        messages: messages,
        temperature: 0.7
    };

    try {
        const response = await fetch(`${PROXIES[0]}${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_KEY}`,
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content || "Transmission lost in deep space.";
        }
    } catch (e) {
        console.warn("[Akasha] OpenAI Link unstable.");
    }

    throw new Error("OpenAI Resonance Failure: The transmission could not be established via available Ley Lines.");
};

export const handleOpenAIImageSynthesis = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    const targetUrl = "https://api.openai.com/v1/images/generations";
    const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1792x1024", "9:16": "1024x1792" };

    try {
        const response = await fetch(`${PROXIES[0]}${encodeURIComponent(targetUrl)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt: `Masterpiece, cinematic anime style, ${prompt}`,
                n: 1,
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
