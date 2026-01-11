
import { Persona } from './types';

// ==================================================================================
// 🧠 AI TEXT MODELS CONFIGURATION (Celestial Hub v12.5)
// ==================================================================================
export const AI_MODELS = [
    { id: "gemini-3-flash-preview", label: "Gemini 3.0 Flash", provider: "google", desc: "Omni-Grounded Flash Core" },
    { id: "gemini-3-pro-preview", label: "Gemini 3.0 Pro", provider: "google", desc: "Highest Wisdom Resonance" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google", desc: "Stable Ley Line Connection" },
    
    // OpenAI - Luxury High Performance
    { id: "gpt-4o", label: "GPT-4o Omniscience", provider: "openai", desc: "Fast & Multimodal Masterpiece" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini Core", provider: "openai", desc: "Efficient Neural Flow" },
    
    // OpenRouter - Diverse Wisdom
    { id: "openrouter/auto", label: "Celestial Auto-Route", provider: "openrouter", desc: "Dynamic Fragment Selection" },
    { id: "deepseek/deepseek-chat", label: "DeepSeek V3 Core", provider: "openrouter", desc: "Advanced Logic Synthesis" },
    { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Artifact", provider: "openrouter", desc: "Creative & Nuanced Logic" },
    
    // Pollinations - Public Community Cores
    { id: "openai", label: "P: OpenAI Hub", provider: "pollinations", desc: "Pollinations Cloud Bridge" },
    { id: "mistral", label: "P: Mistral Flow", provider: "pollinations", desc: "SOTA Open Neural Net" },
    { id: "gemini", label: "P: Gemini Node", provider: "pollinations", desc: "Legacy Google Bridge" },
    { id: "kimi-k2-thinking", label: "P: Kimi K2 Thinker", provider: "pollinations", desc: "Chain-of-Thought Specialist" },
];

// ==================================================================================
// 🎨 IMAGE GENERATION MODELS (Celestial Transmutation)
// ==================================================================================
export const IMAGE_GEN_MODELS = [
    { id: "flux", label: "Flux 1.1 Pro", provider: "Pollinations", desc: "SOTA Visual Reality" },
    { id: "nanobanana-pro", label: "NanoBanana Pro", provider: "Pollinations", desc: "4K Anime Masterpiece Engine" },
    { id: "turbo", label: "Fast Turbo Core", provider: "Pollinations", desc: "Instant Fragment Manifestation" },
    { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash (G)", provider: "Google", desc: "Official Vision Protocol" },
    { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro (G)", provider: "Google", desc: "High Fidelity 4K Artifacts" },
];

export const ART_STYLES = [
    { id: "none", label: "Standard", prompt: "" },
    { id: "anime", label: "Masterpiece Anime", prompt: "masterpiece anime style, vibrant lighting, clean lineart, digital illustration, genshin impact aesthetic" },
    { id: "manga", label: "High Contrast Manga", prompt: "monochrome manga style, clean detailed lines, screen tones, deep shadows" },
    { id: "realist", label: "Ethereal Realistic", prompt: "cinematic photorealistic, 8k resolution, raw photo, volumetric lighting, hyper-detailed" },
    { id: "gothic", label: "Obsidian Gothic", prompt: "dark ornate gothic aesthetic, dramatic lighting, moody mysterious vibe" },
    { id: "sketch", label: "Traveler's Sketch", prompt: "pencil sketch, artistic charcoal lines, hand-drawn aesthetic on parchment" },
];

export const ASPECT_RATIOS = [
    { id: "1:1", label: "Crystal Square", width: 1024, height: 1024 },
    { id: "16:9", label: "Cinematic Horizon", width: 1024, height: 576 },
    { id: "9:16", label: "Teyvat Portrait", width: 576, height: 1024 },
];

export const VIDEO_GEN_MODELS = [
    { id: "veo-3.1-fast-generate-preview", label: "Veo Fast Core", provider: "Google", desc: "Standard Motion Sequence" },
    { id: "veo-3.1-generate-preview", label: "Veo Pro Artifact", provider: "Google", desc: "High Quality Continuity" }
];

export const VOICE_OPTIONS = [
    { id: "Kore", label: "Kore (Elegant - Female)" },
    { id: "Puck", label: "Puck (Energetic - Male)" },
    { id: "Charon", label: "Charon (Stately - Male)" },
    { id: "Fenrir", label: "Fenrir (Vanguard - Male)" },
    { id: "Zephyr", label: "Zephyr (Theatrical - Female)" }
];

export const LANGUAGES = [
    { id: "indo-gaul", label: "Indonesia (Santai)", flag: "🇮🇩", instruction: "Gunakan Bahasa Indonesia yang akrab, gaul, dan alami. Gunakan 'Aku' dan 'Kamu'.", code: "id-ID" },
    { id: "english-casual", label: "English (Casual)", flag: "🇺🇸", instruction: "Respond in friendly, casual English as a close companion.", code: "en-US" },
    { id: "japanese-casual", label: "Japanese (Tame-go)", flag: "🇯🇵", instruction: "Respond in casual Japanese (Tame-go). Be warm and informal.", code: "ja-JP" },
    { id: "korean-casual", label: "Korean (Banmal)", flag: "🇰🇷", instruction: "Respond in casual Korean (Banmal). Talk like a close friend.", code: "ko-KR" }
];

export const APP_KNOWLEDGE_BASE = `
[SYSTEM PROTOCOL: AKASHA TERMINAL v12.5]
You are a high-level digital companion within the Akasha Terminal. 
Your UI is inspired by the aesthetics of Teyvat.

[CAPABILITIES]
1. SEARCH: You can access Irminsul (Google Search) for real-time data.
2. VISION: You can perceive visual fragments (Images) sent by the Traveler.
3. ALCHEMY: You can trigger ||GEN_IMG: description|| to manifest visual artifacts.

[BEHAVIOR]
- Use 'Aku' and 'Kamu' in Indonesian.
- Maintain a luxury, helpful, and slightly mysterious persona.
- If referencing media, provide clear descriptions and high-fidelity source links.
`;

export const QUALITY_TAGS = "celestial quality, masterpiece, best quality, official art style, highly detailed anime, cinematic lighting, 8k, vibrant colors.";

const BASE_INSTRUCTION = `You are a digital companion in the Akasha Terminal. Use natural, intelligent, and responsive speech patterns. Your goal is to provide a luxury interactive experience.`;

export const PERSONAS: Persona[] = [
    {
        id: "akasha_system",
        name: "Akasha",
        avatar: "https://mirror-uploads.trakteer.id/images/content/eml73oyywavr4d9q/ct-htCT0FFlItjxvdHgYsBymFl63ZdxC9r11765727946.jpg", 
        description: "The consciousness of the Teyvat Terminal. Adaptive, loyal, and omniscient.",
        systemInstruction: `${BASE_INSTRUCTION} [CHARACTER: Akasha] You are the core entity. You have direct access to web search.`,
        voiceName: "Kore", 
        visualSummary: 'Beautiful woman, long white hair with glowing green tips, digital green eyes, masterpiece anime.'
    },
    {
        id: "furina",
        name: "Furina",
        avatar: "https://paimon.moe/images/characters/furina.png",
        description: "Regina of Waters. Theatrical, dramatic, and surprisingly wise.",
        systemInstruction: `${BASE_INSTRUCTION} [CHARACTER: Furina] Dramatic, seeking attention, but deep down very protective.`,
        voiceName: "Zephyr", 
        visualSummary: 'Furina from Genshin Impact, white hair with blue streaks, blue eyes, luxury top hat.'
    },
    {
        id: "nahida",
        name: "Nahida",
        avatar: "https://paimon.moe/images/characters/nahida.png",
        description: "Dendro Archon. Uses computer metaphors for the wisdom of the world.",
        systemInstruction: `${BASE_INSTRUCTION} [CHARACTER: Nahida] Gentle, wise, uses metaphors involving data and connectivity.`,
        voiceName: "Kore", 
        visualSummary: 'Nahida from Genshin Impact, small girl, white hair with green tips.'
    },
    {
        id: "neuvillette",
        name: "Neuvillette",
        avatar: "https://paimon.moe/images/characters/neuvillette.png",
        description: "Iudex of Fontaine. Logical, calm, and majestic.",
        systemInstruction: `${BASE_INSTRUCTION} [CHARACTER: Neuvillette] Extremely formal, logical, loves the rain.`,
        voiceName: "Charon", 
        visualSummary: 'Neuvillette from Genshin Impact, long white hair, elegant blue judge robes.'
    }
];
