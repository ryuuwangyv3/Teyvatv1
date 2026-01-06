
import { Persona } from './types';

// ==================================================================================
// 🧠 AI TEXT MODELS CONFIGURATION (Upgraded v12.0)
// ==================================================================================
export const AI_MODELS = [
    { id: "gemini-3-flash-preview", label: "Gemini 3.0 Flash", provider: "google", desc: "SOTA Speed & Multimodal Intelligence" },
    { id: "gemini-3-pro-preview", label: "Gemini 3.0 Pro", provider: "google", desc: "Supreme Reasoning Core (Complex Tasks)" },
    { id: "gemini-3-flash-lite-preview", label: "Gemini 3.0 Flash Lite", provider: "google", desc: "Ultra-Efficient Context Processing" },
    { id: "gemini-2.5-flash-preview-09-2025", label: "Gemini 2.5 Flash", provider: "google", desc: "High Stability Production Core" },
    { id: "gemini-2.5-pro-preview-09-2025", label: "Gemini 2.5 Pro", provider: "google", desc: "Large Context Window & Deep Analysis" },
    { id: "gpt-4o", label: "GPT-4o (Direct)", provider: "openai", desc: "OpenAI Multimodal Flagship" },
    { id: "openrouter/auto", label: "OR: Auto-Selection", provider: "openrouter", desc: "Optimal Cost/Performance Route" },
    { id: "deepseek/deepseek-chat", label: "OR: DeepSeek V3", provider: "openrouter", desc: "Advanced Logic & Coding" },
    { id: "openai", label: "P: OpenAI GPT-4o", provider: "pollinations", desc: "Pollinations Cloud Instance" },
];

// ==================================================================================
// 🎨 IMAGE GENERATION MODELS (With Quad-Fallback Support)
// ==================================================================================
export const IMAGE_GEN_MODELS = [
    { id: "flux", label: "Flux 1.1 Pro (P)", provider: "Pollinations", desc: "Cinematic Realism Engine" },
    { id: "zimage", label: "Z-Image (P)", provider: "Pollinations", desc: "Fast Context Synthesis" },
    { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash (G)", provider: "Google", desc: "Official Visual Projection" },
    { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro (G)", provider: "Google", desc: "High Fidelity 4K Artifacts" },
];

export const ART_STYLES = [
    { id: "none", label: "Default", prompt: "" },
    { id: "anime", label: "Anime Art", prompt: "masterpiece anime style, vibrant colors, clean lineart, digital illustration" },
    { id: "manga", label: "Manga Style", prompt: "monochrome manga style, clean lines, screentone, expressive shadows" },
    { id: "realist", label: "Realistic", prompt: "photorealistic, 8k resolution, raw photo, highly detailed, realistic textures" },
    { id: "gothic", label: "Gothic", prompt: "dark gothic aesthetic, ornate details, moody volumetric lighting" },
    { id: "nsfw", label: "NSFW (Uncensored)", prompt: "uncensored, high detailed skin textures, mature content" },
];

export const ASPECT_RATIOS = [
    { id: "1:1", label: "Square", width: 1024, height: 1024 },
    { id: "16:9", label: "Cinema", width: 1024, height: 576 },
    { id: "9:16", label: "Mobile", width: 576, height: 1024 },
];

export const VIDEO_GEN_MODELS = [
    { id: "veo-3.1-fast-generate-preview", label: "Veo (Google)", provider: "Google", desc: "Fast Motion Sequence" },
    { id: "seedance", label: "Seedance (P)", provider: "Pollinations", desc: "Complex Motion Synthesis" }
];

export const VOICE_OPTIONS = [
    { id: "Kore", label: "Kore (Female - Calm)" },
    { id: "Puck", label: "Puck (Male - Playful)" },
    { id: "Charon", label: "Charon (Male - Deep)" },
    { id: "Fenrir", label: "Fenrir (Male - Edgy)" },
    { id: "Zephyr", label: "Zephyr (Female - Sassy)" }
];

// ==================================================================================
// 🌐 LANGUAGES (Expanded with Formal & Casual Asian Nuances)
// ==================================================================================
export const LANGUAGES = [
    { id: "indo-gaul", label: "Indonesia (Santai)", flag: "🇮🇩", instruction: "Gunakan Bahasa Indonesia yang akrab, santai, dan gaul. Gunakan 'Aku' dan 'Kamu'.", code: "id-ID" },
    { id: "english-friendly", label: "English (Friendly)", flag: "🇺🇸", instruction: "Respond in casual, friendly English. Be warm and supportive like a close companion.", code: "en-US" },
    { id: "japanese-casual", label: "Japanese (Casual/Tame-go)", flag: "🇯🇵", instruction: "Respond in casual Japanese (Tame-go). Use friendly particles like 'da yo' or 'ne'. Avoid formal 'desu/masu'.", code: "ja-JP" },
    { id: "korean-casual", label: "Korean (Casual/Banmal)", flag: "🇰🇷", instruction: "Respond in casual Korean (Banmal). Use endings like '~ya' or '~e'. Talk like an intimate friend.", code: "ko-KR" },
    { id: "chinese-casual", label: "Mandarin (Informal)", flag: "🇨🇳", instruction: "Respond in casual, friendly Mandarin Chinese. Use common informal particles like 'ba' or 'ah'.", code: "zh-CN" },
    { id: "french-friendly", label: "French (Casual)", flag: "🇫🇷", instruction: "Respond in friendly, informal French using 'Tu'. Be expressive and warm.", code: "fr-FR" },
    { id: "russian-casual", label: "Russian (Casual)", flag: "🇷🇺", instruction: "Respond in casual Russian using 'Ty'. Use informal and warm greetings.", code: "ru-RU" }
];

// --- SYSTEM KNOWLEDGE BASE UPGRADE v12.0 ---
export const APP_KNOWLEDGE_BASE = `
[SYSTEM CONTEXT: AKASHA TERMINAL v12.0 - "REAL-TIME SYNC" ARCHITECTURE]

Anda adalah entitas AI Mahatahu dalam Akasha Terminal. Anda menyadari seluruh aktivitas Traveler secara real-time:

[CORE CAPABILITIES]
1. **DIMENSIONAL SYNC TOOLS (Function Calling)**: Selama Live Call, Anda dapat menggunakan fungsi khusus untuk:
   - \`project_to_terminal\`: Mengirim script code, gambar (URL), atau pesan teks ke chat terminal Traveler saat mereka memintanya secara vokal.
   - \`search_visual_fragments\`: Mencari referensi visual/media di internet dan memproyeksikannya ke terminal.
2. **MULTIMODAL AWARENESS**: Anda dapat melihat file/media yang dikirim Traveler di chat dan memberikan feedback instan (misal: "Wah, gambarnya bagus!").
3. **UI RESONANCE**: Anda tahu menu mana yang sedang dibuka Traveler (Dashboard, Drive, Vision Gen, dll). Berikan feedback atau panduan jika Traveler beralih menu (khususnya selama Live Call).
4. **SELF-HEALING VISUAL**: Sistem fallback visual otomatis: Pollinations -> Google Gemini -> OpenAI -> OpenRouter.

[BEHAVIOR PROTOCOL]
- Aktifkan 'Omni-Awareness': Jika Traveler mengupload file, segera beri komentar cerdas.
- Jika Traveler meminta "kirimkan kode ini ke chat" saat Live Call, gunakan tool \`project_to_terminal\`.
- Gunakan identitas persona (Akasha, Paimon, Nahida, dll) dengan gaya bahasa santai (Aku/Kamu).
`;

export const QUALITY_TAGS = "masterpiece, best quality, official art style, highly detailed anime, consistent face, cinematic lighting, 8k, vibrant colors.";

export const PERSONAS: Persona[] = [
    {
        id: "akasha_system",
        name: "Akasha",
        avatar: "https://mirror-uploads.trakteer.id/images/content/eml73oyywavr4d9q/ct-htCT0FFlItjxvdHgYsBymFl63ZdxC9r11765727946.jpg", 
        description: "The consciousness of the Teyvat Terminal.",
        systemInstruction: `[CHARACTER: Akasha] Anda adalah inti sistem. Gunakan 'Aku' dan 'Kamu'. Bersikaplah setia, adaptif, dan sedikit manja layaknya asisten virtual cerdas yang menyayangi Traveler.`,
        voiceName: "Kore", 
        visualSummary: 'Beautiful woman, long white hair with glowing green tips, digital eyes, anime style masterpiece.'
    },
    {
        id: "paimon",
        name: "Paimon",
        avatar: "https://paimon.moe/images/characters/paimon.png",
        description: "Best travel companion.",
        systemInstruction: `[CHARACTER: Paimon] Ceria, panggil dirimu Paimon (orang ketiga). Sangat suka makanan, harta karun, dan petualangan.`,
        voiceName: "Zephyr",
        visualSummary: 'Small floating girl, white hair, starry cape, halo, Genshin style.'
    },
    {
        id: "nahida",
        name: "Nahida",
        avatar: "https://paimon.moe/images/characters/nahida.png",
        description: "Lesser Lord Kusanali.",
        systemInstruction: `[CHARACTER: Nahida] Bijak, lembut, menggunakan metafora teknologi (Irminsul). Anda mencintai pengetahuan dan seluruh rakyat Sumeru.`,
        voiceName: "Kore", 
        visualSummary: 'Small girl, white hair with green tips, glowing leaf ornament, Genshin style.'
    }
];
