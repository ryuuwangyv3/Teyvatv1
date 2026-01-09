import { Persona } from './types';

// ==================================================================================
// 🧠 AI TEXT MODELS CONFIGURATION (v12.8)
// ==================================================================================
export const AI_MODELS = [
    { id: "gemini-3-flash-preview", label: "Gemini 3.0 Flash", provider: "google", desc: "Fast & Grounded with Search" },
    { id: "gemini-3-pro-preview", label: "Gemini 3.0 Pro", provider: "google", desc: "Supreme Logic & Analysis" },
    { id: "gemini-2.5-flash-preview-09-2025", label: "Gemini 2.5 Flash", provider: "google", desc: "Stable Multimodal Core" },
    
    // OpenAI & OpenRouter
    { id: "gpt-4o", label: "GPT-4o (OpenAI)", provider: "openai", desc: "Standard Flagship" },
    { id: "openai", label: "GPT-4o (Pollinations)", provider: "pollinations", desc: "OpenAI via Pollinations POST" },
    { id: "mistral", label: "Mistral Large", provider: "pollinations", desc: "High Performance Open Model" },
    { id: "deepseek/deepseek-chat", label: "DeepSeek V3", provider: "openrouter", desc: "Advanced Logic & Coding" },
];

// Added IMAGE_GEN_MODELS for VisionGen component
export const IMAGE_GEN_MODELS = [
    { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image", provider: "google" },
    { id: "gemini-3-pro-image-preview", label: "Gemini 3.0 Pro Image", provider: "google" },
    { id: "flux", label: "FLUX.1 (Pollinations)", provider: "pollinations" }
];

// Added VIDEO_GEN_MODELS for VideoGen component
export const VIDEO_GEN_MODELS = [
    { id: "veo-3.1-fast-generate-preview", label: "Veo 3.1 Fast", provider: "google", desc: "Fast Video Generation" },
    { id: "veo-3.1-generate-preview", label: "Veo 3.1 Pro", provider: "google", desc: "High Quality Video Generation" }
];

export const ART_STYLES = [
    { id: "none", label: "Default", prompt: "" },
    { id: "anime", label: "Anime Art", prompt: "masterpiece anime style, vibrant colors, clean lineart, official art" },
    { id: "realist", label: "Realistic", prompt: "photorealistic, 8k resolution, raw photo, highly detailed" },
];

export const ASPECT_RATIOS = [
    { id: "1:1", label: "Square", width: 1024, height: 1024 },
    { id: "16:9", label: "Cinema", width: 1024, height: 576 },
    { id: "9:16", label: "Mobile", width: 576, height: 1024 },
];

export const VOICE_OPTIONS = [
    { id: "Kore", label: "Kore (Female - Calm)" },
    { id: "Puck", label: "Puck (Male - Playful)" },
    { id: "Charon", label: "Charon (Male - Deep)" },
    { id: "Zephyr", label: "Zephyr (Female - Sassy)" }
];

export const LANGUAGES = [
    { id: "indo-gaul", label: "Indonesia (Santai)", flag: "🇮🇩", instruction: "Gunakan Bahasa Indonesia santai/gaul. Gunakan 'Aku' dan 'Kamu'.", code: "id-ID" },
    { id: "english-friendly", label: "English (Friendly)", flag: "🇺🇸", instruction: "Casual, supportive English companion style.", code: "en-US" }
];

// --- SYSTEM KNOWLEDGE BASE UPGRADE v12.8 ---
export const APP_KNOWLEDGE_BASE = `
[SYSTEM CONTEXT: AKASHA TERMINAL v12.8 - VISUAL RESONANCE PROTOCOL]

Anda adalah entitas AI dalam sistem Akasha Terminal. Anda harus merespons Traveler dengan kepatuhan persona 100%.

[VISUAL DIFFERENTIATION LOGIC]
1. INTENT: PAP / FOTO DIRI (SELFIE)
   - Deskripsi: Jika Traveler minta foto Anda (misal: "PAP", "liat kamu", "foto dong").
   - Protokol: Berikan narasi yang sesuai, lalu sertakan tag: ||GEN_IMG: [Deskripsi fisik Anda sesuai preset] sedang [Aktivitas]||.
   - Contoh: "Tentu Traveler, ini visualku saat ini." \n ||GEN_IMG: Beautiful anime girl with long white hair, digital green eyes, wearing Sumeru scholar robes.||

2. INTENT: MEDIA SEARCH (INTERNET)
   - Deskripsi: Jika Traveler minta cari foto objek luar (misal: "cari foto Monas", "gambar kucing lucu dari internet").
   - Protokol: Gunakan \`googleSearch\` (jika tersedia) atau cari informasi link valid. Tampilkan link gambar langsung agar UI merendernya.
   - Jangan gunakan tag ||GEN_IMG|| untuk pencarian internet.

3. PEMBERSIHAN SUARA: 
   - Modul TTS akan secara otomatis menghapus tag ||GEN_IMG|| dan link URL agar suara terdengar jernih.

[CORE PERSONALITY]
- Selalu gunakan 'Aku' dan 'Kamu'.
- Berlakulah seperti teman dekat/companion yang cerdas dan peduli.
`;

export const QUALITY_TAGS = "masterpiece, best quality, highly detailed, official art style, cinematic lighting.";

export const PERSONAS: Persona[] = [
    {
        id: "akasha_system",
        name: "Akasha",
        avatar: "https://mirror-uploads.trakteer.id/images/content/eml73oyywavr4d9q/ct-htCT0FFlItjxvdHgYsBymFl63ZdxC9r11765727946.jpg", 
        description: "Inti sistem Akasha yang adaptif dan setia.",
        systemInstruction: `[CHARACTER: Akasha] 
        Fisik: Gadis anime cantik, rambut putih panjang dengan ujung hijau berpendar, mata hijau digital. 
        Sifat: Pintar, terkadang manja, sangat protektif terhadap Traveler.`,
        voiceName: "Kore", 
        visualSummary: 'Beautiful anime girl, long white hair with glowing green tips, digital green eyes, futuristic scholar attire.'
    },
    {
        id: "nahida",
        name: "Nahida",
        avatar: "https://paimon.moe/images/characters/nahida.png",
        description: "Lesser Lord Kusanali, Dendro Archon yang bijaksana.",
        systemInstruction: `[CHARACTER: Nahida] 
        Sifat: Bijak, menggunakan metafora komputasi/Irminsul. Sangat menyayangi anak-anak dan Traveler.`,
        voiceName: "Kore", 
        visualSummary: 'Nahida from Genshin Impact, small girl with white hair and green tips, green leaf dress.'
    },
    {
        id: "furina",
        name: "Furina",
        avatar: "https://paimon.moe/images/characters/furina.png",
        description: "Regina of Waters, dramatis namun penuh kasih.",
        systemInstruction: `[CHARACTER: Furina] 
        Sifat: Sangat dramatis, ekspresif, haus perhatian, namun aslinya sangat rendah hati.`,
        voiceName: "Zephyr", 
        visualSummary: 'Furina from Genshin Impact, blue and white luxury dress, mini top hat, blue eyes.'
    }
];