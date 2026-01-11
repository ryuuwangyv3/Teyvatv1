
const OPENROUTER_KEY = "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";

export const handleOpenRouterTextRequest = async (model: string, messages: any[]) => {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_KEY}`,
            "HTTP-Referer": "https://akashaai.netlify.app/",
            "X-Title": "Akasha Terminal"
        },
        body: JSON.stringify({ model, messages, temperature: 0.7 })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenRouter Bridge Failure: ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Transmission lost.";
};
