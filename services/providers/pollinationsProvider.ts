
const POLLINATIONS_KEY = "sk_qM87JYMwNGfqoGKf6vQ5iHEIEUhBDu3x";

export const handlePollinationsTextRequest = async (model: string, messages: any[]) => {
    const response = await fetch("https://text.pollinations.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${POLLINATIONS_KEY}`
        },
        body: JSON.stringify({
            model: model === 'openai' ? 'gpt-4o' : model,
            messages,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Pollinations Bridge Failure: ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Transmission lost.";
};

export const handlePollinationsImageSynthesis = (prompt: string, modelId: string, width: number, height: number): string => {
    const seed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${modelId}&width=${width}&height=${height}&seed=${seed}&nologo=true`;
};
