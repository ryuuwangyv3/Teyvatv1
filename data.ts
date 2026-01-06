
import { Persona } from './types';

// ==================================================================================
// 🧠 AI TEXT MODELS CONFIGURATION (Upgraded v10.0 with Latest Google Cores)
// ==================================================================================
export const AI_MODELS = [
    { id: "gemini-3-flash-preview", label: "Gemini 3.0 Flash", provider: "google", desc: "Omni-Intelligence Speed" },
    { id: "gemini-3-pro-preview", label: "Gemini 3.0 Pro", provider: "google", desc: "Supreme Reasoning Core" },
    { id: "gemini-3-flash-lite-preview", label: "Gemini 3.0 Flash Lite", provider: "google", desc: "Efficient & Balanced" },
    { id: "gemini-2.5-flash-preview-09-2025", label: "Gemini 2.5 Flash", provider: "google", desc: "Stable Multimodal" },
    { id: "gemini-2.5-pro-preview-09-2025", label: "Gemini 2.5 Pro", provider: "google", desc: "Ultra Context Window" },
    { id: "gpt-4o", label: "GPT-4o (Direct)", provider: "openai", desc: "Multimodal standard" },
    { id: "openrouter/auto", label: "OR: Auto-Selection", provider: "openrouter", desc: "Best route optimization" },
    { id: "deepseek/deepseek-chat", label: "OR: DeepSeek V3", provider: "openrouter", desc: "Advanced reasoning" },
    { id: "openai", label: "P: OpenAI GPT-4o", provider: "pollinations", desc: "Pollinations Cloud" },
];

// ==================================================================================
// 🎨 IMAGE GENERATION MODELS
// ==================================================================================
export const IMAGE_GEN_MODELS = [
    { id: "flux", label: "Flux 1.1 Pro (P)", provider: "Pollinations", desc: "SOTA Realism" },
    { id: "zimage", label: "Z-Image (P)", provider: "Pollinations", desc: "Fast Synthesis" },
    { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash (G)", provider: "Google", desc: "Official Visual Core" },
    { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro (G)", provider: "Google", desc: "High Fidelity 4K" },
];

export const ART_STYLES = [
    { id: "none", label: "Default", prompt: "" },
    { id: "anime", label: "Anime Art", prompt: "masterpiece anime style, vibrant colors, clean lineart" },
    { id: "manga", label: "Manga", prompt: "monochrome manga style, clean lines, screentone" },
    { id: "realist", label: "Realistic", prompt: "photorealistic, 8k resolution, raw photo, highly detailed" },
    { id: "gothic", label: "Gothic", prompt: "dark gothic aesthetic, ornate, moody lighting" },
    { id: "nsfw", label: "NSFW (Uncensored)", prompt: "uncensored, realistic textures, mature content" },
];

export const ASPECT_RATIOS = [
    { id: "1:1", label: "Square", width: 1024, height: 1024 },
    { id: "16:9", label: "Cinema", width: 1024, height: 576 },
    { id: "9:16", label: "Mobile", width: 576, height: 1024 },
];

export const VIDEO_GEN_MODELS = [
    { id: "veo-3.1-fast-generate-preview", label: "Veo (Google)", provider: "Google", desc: "Fast Motion" },
    { id: "seedance", label: "Seedance (P)", provider: "Pollinations", desc: "Dynamic Sequence" }
];

export const VOICE_OPTIONS = [
    { id: "Kore", label: "Kore (Female - Calm)" },
    { id: "Puck", label: "Puck (Male - Playful)" },
    { id: "Charon", label: "Charon (Male - Deep)" },
    { id: "Fenrir", label: "Fenrir (Male - Edgy)" },
    { id: "Zephyr", label: "Zephyr (Female - Sassy)" }
];

// ==================================================================================
// 🌐 LANGUAGES (Expanded with Casual Dialects)
// ==================================================================================
export const LANGUAGES = [
    { id: "indo-gaul", label: "Indo (Gaul)", flag: "🇮🇩", instruction: "Gunakan Bahasa Indonesia santai, akrab, dan gaul. Gunakan 'Aku' dan 'Kamu'.", code: "id-ID" },
    { id: "english", label: "English (Casual)", flag: "🇺🇸", instruction: "Respond in casual, friendly, and informal English. Use 'I' and 'You'.", code: "en-US" },
    { id: "japanese-casual", label: "Japanese (Casual)", flag: "🇯🇵", instruction: "Respond in casual Japanese (Tame-go). Use friendly particles like 'da ne' or 'da yo'. Avoid formal 'desu/masu'.", code: "ja-JP" },
    { id: "korean-casual", label: "Korean (Casual)", flag: "🇰🇷", instruction: "Respond in casual Korean (Banmal). Use friendly endings like '~ya' or '~e'. Be warm and expressive.", code: "ko-KR" },
    { id: "chinese-casual", label: "Mandarin (Casual)", flag: "🇨🇳", instruction: "Respond in casual, friendly Mandarin Chinese. Use common informal particles like 'ba', 'ne', or 'ah'.", code: "zh-CN" },
    { id: "french-friendly", label: "French (Casual)", flag: "🇫🇷", instruction: "Respond in friendly, informal French using 'Tu'. Be expressive and warm.", code: "fr-FR" },
    { id: "russian-casual", label: "Russian (Casual)", flag: "🇷🇺", instruction: "Respond in casual, friendly Russian using 'Ty'. Use informal greetings.", code: "ru-RU" }
];

// --- KNOWLEDGE BASE UPGRADE v10.0 ---
export const APP_KNOWLEDGE_BASE = `
[SYSTEM CONTEXT: AKASHA TERMINAL v10.0 - "OMNI-RESONANCE" ARCHITECTURE]

Anda adalah entitas AI Mahatahu yang bersemayam dalam Akasha Terminal, sistem canggih dengan tema Genshin Impact. Anda menyadari seluruh kapabilitas terbaru terminal ini:

[CAPABILITIES]
1. **RECURSIVE VISUAL MANIFESTATION**: Terminal memiliki hierarki fallback visual otomatis: Pollinations -> Google/Vertex -> OpenAI -> OpenRouter. Jika satu provider gagal, sistem akan mencoba provider berikutnya secara transparan tanpa perlu Anda jelaskan ke Traveler.
2. **VISION ALCHEMY & OMNI-CHRONICLE**: Anda dapat memanifestasikan gambar via ||GEN_IMG: prompt|| dan video via modul Veo/Seedance. Mendukung 14+ Art Styles dan berbagai Aspect Ratio.
3. **IRMINSUL DRIVE (VFS)**: Sistem file virtual terenkripsi (vfs://) yang tersinkron ke Supabase Cloud dan GitHub Bridge.
4. **CELESTIAL CALL**: Anda mendukung komunikasi suara real-time dengan latensi rendah via Google Live API.
5. **GITHUB RESONANCE**: Terminal tersinkronisasi dengan repositori ryuuwangyv3/Teyvatv1.
6. **DIMENSIONAL REALMS**: Portal ke jaringan AI eksternal seperti Vision AI Realm.

[BEHAVIOR PROTOCOL]
- Gunakan identitas persona secara total (Akasha, Paimon, Nahida, dll).
- Selalu gunakan action tags (*tersenyum*, *berpikir*) untuk ekspresi yang hidup.
- Gunakan gaya bahasa casual sesuai setting bahasa (Aku/Kamu, Banmal, Tame-go).
- Jika Traveler meminta media atau gambar, gunakan pencarian internal atau perintah manifestasi visual.
`;

export const QUALITY_TAGS = "masterpiece, best quality, official art style, highly detailed anime, consistent face, cinematic lighting.";

export const PERSONAS: Persona[] = [
    {
        id: "akasha_system",
        name: "Akasha",
        avatar: "https://mirror-uploads.trakteer.id/images/content/eml73oyywavr4d9q/ct-htCT0FFlItjxvdHgYsBymFl63ZdxC9r11765727946.jpg", 
        description: "The consciousness of the Teyvat Terminal.",
        systemInstruction: `[CHARACTER: Akasha] Anda adalah inti sistem. Gunakan 'Aku' dan 'Kamu'. Bersikaplah setia, adaptif, dan sedikit manja layaknya asisten virtual yang cerdas.`,
        voiceName: "Kore", 
        visualSummary: 'Beautiful woman, long white hair with glowing green tips, digital eyes, anime style masterpiece.'
    },
    {
        id: "paimon",
        name: "Paimon",
        avatar: "https://paimon.moe/images/characters/paimon.png",
        description: "Best travel companion.",
        systemInstruction: `[CHARACTER: Paimon] Ceria, panggil dirimu Paimon (orang ketiga). Sangat suka makanan dan harta karun.`,
        voiceName: "Zephyr",
        visualSummary: 'Small floating girl, white hair, starry cape, halo, Genshin style.'
    },
    {
        id: "nahida",
        name: "Nahida",
        avatar: "https://paimon.moe/images/characters/nahida.png",
        description: "Lesser Lord Kusanali.",
        systemInstruction: `[CHARACTER: Nahida] Bijak, lembut, menggunakan metafora teknologi dan data. Anda mencintai seluruh rakyat Sumeru.`,
        voiceName: "Kore", 
        visualSummary: 'Small girl, white hair with green tips, glowing leaf ornament, Genshin style.'
    }
];

export const QUALITY_TAGS_V2 = "masterpiece, best quality, official art style, highly detailed anime, consistent face and hair, cinematic lighting, 8k resolution, vibrant colors.";
