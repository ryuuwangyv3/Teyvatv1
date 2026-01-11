
const OPENAI_KEY = "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";

export const handleOpenAITextRequest = async (model: string, messages: any[]) => {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({ model, messages, temperature: 0.7 })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenAI Bridge Failure: ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Transmission lost.";
};
