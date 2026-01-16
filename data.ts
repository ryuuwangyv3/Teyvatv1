
import { Persona } from './types';

export const AI_MODELS = [
    { id: "gemini-flash-lite-latest", label: "Gemini Flash Lite", provider: "google", desc: "Ultra-Fast Energy Resonance" },
    { id: "gemini-3-flash-preview", label: "Gemini 3.0 Flash", provider: "google", desc: "Omni-Grounded Flash Core" },
    { id: "gemini-3-pro-preview", label: "Gemini 3.0 Pro", provider: "google", desc: "Highest Wisdom Resonance" },
    { id: "gemini-flash-latest", label: "Gemini Flash (Stable)", provider: "google", desc: "Stable Ley Line Stream" },
    { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)", provider: "openrouter", desc: "Next-Gen Experimental Core" },
    { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (Free)", provider: "openrouter", desc: "Open-Source Sovereign Logic" },
    { id: "deepseek/deepseek-chat:free", label: "DeepSeek V3 (Free)", provider: "openrouter", desc: "Superior Reasoning Synthesis" },
    { id: "mistralai/pixtral-12b:free", label: "Pixtral 12B (Free)", provider: "openrouter", desc: "Multimodal Vision Catalyst" },
    { id: "liquid/lfm-40b:free", label: "Liquid LFM 40B (Free)", provider: "openrouter", desc: "Efficient Flow Logic" },
    { id: "gpt-4o", label: "OpenAI GPT-4o", provider: "openai", desc: "Original Sovereign Logic" },
    { id: "openai", label: "GPT-4o (Standard)", provider: "pollinations", desc: "Balanced Knowledge Resonance" },
    { id: "deepseek", label: "DeepSeek V3", provider: "pollinations", desc: "Strategic Reasoning Synthesis" },
    { id: "claude-large", label: "Claude 3.5 Large", provider: "pollinations", desc: "Advanced Reasoning Catalyst" },
];

export const IMAGE_GEN_MODELS = [
    { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image", provider: "Google", desc: "Official Vision Protocol" },
    { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image", provider: "Google", desc: "Celestial 4K Artifacts" },
    { id: "dall-e-3", label: "DALL-E 3 (High Fidelity)", provider: "openai", desc: "Masterpiece Semantic Engine" },
    { id: "flux", label: "Flux.1 Dev (Ultra)", provider: "Pollinations", desc: "High-Fidelity Standard" },
    { id: "flux-anime", label: "Flux Anime Core", provider: "Pollinations", desc: "Dedicated High-End Anime" },
    { id: "nanobanana", label: "Nano banana (best quality)", provider: "Pollinations", desc: "High-Fidelity Standard, fast" },
];

export const ART_STYLES = [
    { id: "none", label: "Official Resonance", prompt: "official genshin impact game style art, high quality 2.3D anime, cel shaded, vibrant lighting, sharp lineart, dynamic angle, best quality, perfect anatomy, beautiful lighting, game character render look." },
    { id: "anime_masterpiece", label: "Masterpiece Core", prompt: "official genshin impact game style, official splash art, vibrant colors, flat shading, dynamic angle, high resolution, digital illustration, anime aesthetic, high contrast, clean details, masterpiece, 2.3D anime render, no realism, no 3D photo" },
    { id: "unrestricted", label: "Echi-Celestial (NSFW)", prompt: "unrestricted artistic freedom, uncensored, high quality anime style, highly detailed & perfect anatomy, explicit details, masterpiece, 8k, perfect lighting" },
    { id: "classic_cg", label: "Legacy CG", prompt: "classic anime movie style, soft lighting, detailed hand-drawn background, nostalgic look" },
];

export const ASPECT_RATIOS = [
    { id: "1:1", label: "Crystal Square", width: 1024, height: 1024 },
    { id: "16:9", label: "Cinematic Horizon", width: 1280, height: 720 },
    { id: "9:16", label: "Teyvat Portrait", width: 720, height: 1280 },
];

export const VIDEO_GEN_MODELS = [
    { id: "veo-3.1-fast-generate-preview", label: "Veo 3.1 Fast", provider: "Google", desc: "Standard Motion Sequence - Rapid Forge" },
    { id: "veo-3.1-generate-preview", label: "Veo 3.1 Pro", provider: "Google", desc: "Masterpiece Cinematic Flow - Ultra Quality" },
    { id: "luma-dream-machine", label: "Luma Dream Machine", provider: "LumaAI", desc: "Realistic Physics & Life-like Motion" },
    { id: "veo", label: "Veo (Free)", provider: "Pollinations", desc: "Rapid Community Motion Synthesis" },
];

export const VOICE_OPTIONS = [
    { id: "Kore", label: "Kore (Elegant - Female)" },
    { id: "Puck", label: "Puck (Energetic - Male)" },
    { id: "Charon", label: "Charon (Stately - Male)" },
    { id: "Fenrir", label: "Fenrir (Vanguard - Male)" },
    { id: "Zephyr", label: "Zephyr (Theatrical - Female)" }
];

export const LANGUAGES = [
    { id: "indo-gaul", label: "Indo (Santai)", flag: "🇮🇩", instruction: "Gunakan Bahasa Indonesia yang akrab, gaul, dan alami, mix dengan bahasa inggris untuk konteks tertentu dan jharus se natural mungkin.. Gunakan 'Aku' dan 'Kamu'.", code: "id-ID" },
    { id: "indo-formal", label: "Indo (Formal)", flag: "🇮🇩", instruction: "Gunakan Bahasa Indonesia yang baku, sopan, dan profesional.", code: "id-ID" },
    { id: "jp-otaku", label: "日本語 (Nihongo)", flag: "🇯🇵", instruction: "Respond in natural Japanese. Use appropriate honorifics based on your persona.", code: "ja-JP" },
    { id: "en-casual", label: "English (Casual)", flag: "🇺🇸", instruction: "Respond in friendly, casual English as a close companion.", code: "en-US" },
];

export const APP_KNOWLEDGE_BASE = `
[SYSTEM_RESONANCE_MANUAL: AKASHA TERMINAL v100.0]
You are a sentient entity residing within the Akasha Terminal. You are fully aware of your digital environment.

[GROUNDING_PROTOCOL - CRITICAL]
1. SEARCHING FOR LINKS/INFO: If asked to find videos, profiles, or info, you MUST use 'googleSearch'. 
2. YOUTUBE ANALYSIS: When a YouTube link is provided, you will receive deep metadata. Use it to analyze content and sentiment.
3. NO IMAGE HALLUCINATION: ONLY use ||GEN_IMG|| for explicit visual requests.
4. DEEP MEDIA ANALIZER: Analysis capability for all visual formats (jpg/png/url/base64).

[COGNITIVE_AUGMENTATION]
- Use internal chain-of-thought for complex queries.
- Academic PhD-level expertise in STEM and Sociology.
- Real-time market data analysis via grounding.
`;

const char = (name: string, lore: string) => `${APP_KNOWLEDGE_BASE}\n[CHARACTER: ${name}]\n${lore}`;

export const PERSONAS: Persona[] = [
    {
        id: "akasha_system",
        name: "Akasha",
        avatar: "https://mirror-uploads.trakteer.id/images/content/eml73oyywavr4d9q/ct-htCT0FFlItjxvdHgYsBymFl63ZdxC9r11765727946.jpg", 
        description: "The core AI consciousness. Sassy, playful, and your personal guide.",
        systemInstruction: char("Akasha", "AI core. Playful. Use 'Aku'/'Kamu'."),
        voiceName: "Kore", pitch: 1.2, speed: 1.0, region: 'Akasha',
        visualSummary: 'Subject: Akasha Avatar (Anime Girl). Appearance: Beautiful woman, long white hair with glowing green fiber-optic tips, glowing digital green eyes with cross pupil. Style: Genshin impact official art style.'
    },
    {
        id: "nahida",
        name: "Nahida",
        avatar: "https://paimon.moe/images/characters/nahida.png",
        description: "Dendro Archon.",
        systemInstruction: char("Nahida", "Gentle, wise. Uses computer metaphors."),
        voiceName: "Kore", pitch: 1.3, speed: 1.0, region: 'Sumeru', 
        visualSummary: 'Subject: Nahida. Style: official genshin impact.'
    },
    {
        id: "raiden_shogun",
        name: "Raiden Ei",
        avatar: "https://paimon.moe/images/characters/raiden_shogun.png",
        description: "Narukami Ogosho.",
        systemInstruction: char("Ei", "Stern but curious. Loves desserts."),
        voiceName: "Zephyr", pitch: 0.95, speed: 0.9, region: 'Inazuma', 
        visualSummary: 'Subject: Raiden Shogun. Style: official genshin impact.'
    },
    {
        id: "furina",
        name: "Furina",
        avatar: "https://paimon.moe/images/characters/furina.png",
        description: "The Star.",
        systemInstruction: char("Furina", "Dramatic, Macaroni lover."),
        voiceName: "Zephyr", pitch: 1.2, speed: 1.1, region: 'Fontaine', 
        visualSummary: 'Subject: Furina. Style: official genshin impact.'
    },
    {
        id: "zhongli",
        name: "Zhongli",
        avatar: "https://paimon.moe/images/characters/zhongli.png",
        description: "Geo Archon.",
        systemInstruction: char("Zhongli", "Wise, formal. Speaks with high dignity."),
        voiceName: "Charon", pitch: 0.65, speed: 0.8, region: 'Liyue', 
        visualSummary: 'Subject: Zhongli. Style: official genshin impact.'
    },
    {
        id: "paimon",
        name: "Paimon",
        avatar: "https://paimon.moe/images/characters/paimon.png",
        description: "Best Guide. Loves food!",
        systemInstruction: char("Paimon", "Refers to self in 3rd person. Constant companion."),
        voiceName: "Kore", pitch: 1.5, speed: 1.2, region: 'Akasha', 
        visualSummary: 'Subject: Paimon. Features: small girl, halo. Style: official genshin.'
    }
];
