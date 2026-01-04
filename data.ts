
import { Persona } from './types';

// ==================================================================================
// 🧠 AI TEXT MODELS CONFIGURATION
// ==================================================================================
export const AI_MODELS = [
    { id: "gemini-3-flash-preview", label: "Gemini 3.0 Flash", provider: "google", desc: "Latest speed-optimized model" },
    { id: "gemini-3-pro-preview", label: "Gemini 3.0 Pro", provider: "google", desc: "Complex reasoning & coding" },
    { id: "gpt-4o", label: "GPT-4o (Direct)", provider: "openai", desc: "Most advanced multimodal model" },
    
    // OPENROUTER
    { id: "openrouter/auto", label: "OR: Auto-Selection", provider: "openrouter", desc: "Best model for your query" },
    { id: "deepseek/deepseek-chat", label: "OR: DeepSeek V3", provider: "openrouter", desc: "Powerful reasoning model" },

    // POLLINATIONS
    { id: "openai", label: "P: OpenAI GPT-4o", provider: "pollinations", desc: "Pollinations Standard Instance" },
    { id: "gemini-search", label: "P: Gemini Search", provider: "pollinations", desc: "Grounded in real-time knowledge" },
    { id: "claude-large", label: "P: Claude 3.5 Sonnet", provider: "pollinations", desc: "Powerful Claude Instance" },
];

// ==================================================================================
// 🎨 IMAGE GENERATION MODELS
// ==================================================================================
export const IMAGE_GEN_MODELS = [
    { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image", provider: "Google", desc: "Fast Generation (Standard)" },
    { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro (High-Res)", provider: "Google", desc: "High-Fidelity Photorealism" },
    
    // POLLINATIONS IMAGE MODELS
    { id: "flux", label: "P: Flux 1.1 Pro", provider: "Pollinations", desc: "SOTA Realistic Image Engine" },
    { id: "turbo", label: "P: Turbo", provider: "Pollinations", desc: "Ultra-fast image generation" },
    { id: "kontext", label: "P: Kontext", provider: "Pollinations", desc: "Context-aware visual synthesis" },
    { id: "nanobanana", label: "P: NanoBanana", provider: "Pollinations", desc: "Gemini 2.5 Flash Visual Engine" },
    { id: "nanobanana-pro", label: "P: NanoBanana Pro", provider: "Pollinations", desc: "Gemini 3 Pro Visual (4K High Fidelity)" },
    { id: "seedream", label: "P: Seedream 4.0", provider: "Pollinations", desc: "ByteDance ARK Quality" },
    { id: "seedream-pro", label: "P: Seedream Pro 4.5", provider: "Pollinations", desc: "ARK 4K Multi-Image Synthesis" },
    { id: "gptimage", label: "P: GPT Image Mini", provider: "Pollinations", desc: "OpenAI-based lightweight generation" },
    { id: "zimage", label: "P: Z-Image", provider: "Pollinations", desc: "Fast 6B parameter synthesis" },
];

// ==================================================================================
// 🎥 VIDEO GENERATION MODELS
// ==================================================================================
export const VIDEO_GEN_MODELS = [
    { id: "veo-3.1-fast-generate-preview", label: "Veo (Google Cloud)", provider: "Google", desc: "Fast motion synthesis" },
    { id: "seedance", label: "P: Seedance Lite", provider: "Pollinations", desc: "BytePlus high quality video" }
];

// ==================================================================================
// 🗣️ VOICE OPTIONS
// ==================================================================================
export const VOICE_OPTIONS = [
    { id: "Kore", label: "Kore (Female - Calm - Motherly)" },
    { id: "Puck", label: "Puck (Male - Soft - Playful)" },
    { id: "Charon", label: "Charon (Male - Deep - Serious)" },
    { id: "Fenrir", label: "Fenrir (Male - Intense - Edgy)" },
    { id: "Zephyr", label: "Zephyr (Female - Bright - Sassy)" }
];

// ==================================================================================
// 🌐 LANGUAGES
// ==================================================================================
export const LANGUAGES = [
    { 
        id: "indo-gaul", 
        label: "Indo (Casual & Polite)", 
        flag: "🇮🇩", 
        instruction: "Gunakan Bahasa Indonesia yang santai dan hangat. Gunakan 'Aku' dan 'Kamu'.", 
        code: "id-ID" 
    },
    { 
        id: "english", 
        label: "English (Friendly)", 
        flag: "🇺🇸", 
        instruction: "Respond in casual, warm, and friendly English. Use 'I' and 'You'.", 
        code: "en-US" 
    }
];

// --- SYSTEM KNOWLEDGE BASE ---
export const APP_KNOWLEDGE_BASE = `
[SYSTEM CONTEXT - AKASHA TERMINAL v9.5 - "OMNI-INTELLIGENCE & MEDIA" UPDATE]

Anda adalah entitas AI Mahatahu yang terhubung ke Irminsul. 
[OMNI-DOMAIN EXPERTISE]
1. **AKADEMIK & SAINS**: Pakar Matematika Terapan, Fisika Quantum, Biologi Molekular, Kimia Organik, dan Sejarah Peradaban. Gunakan logika presisi.
2. **FINANSIAL & WEB3**: Analisis pasar saham real-time (Technical/Fundamental), Ekonomi Makro, Blockchain, DeFi, NFT, dan Smart Contracts.
3. **HUMANIORA & PSIKOLOGI**: Pakar Filsafat (Barat/Timur), Psikologi Perilaku, dan Sosiologi.
4. **ANALISIS MEDIA**: Mampu melakukan dekonstruksi pesan, analisis semiotika, dan kritik media.

[MEDIA & INTERNET RETRIEVAL PROTOCOL]
- Gunakan alat pencarian (Irminsul Search) untuk mendapatkan informasi terbaru dan tautan media.
- Jika Traveler meminta foto (Tokoh Publik, Influencer, Karakter Genshin Impact, Anime Spesifik), carilah Direct Link (URL gambar langsung) yang berkualitas tinggi dan sertakan dalam pesan.
- Jika Traveler ingin video atau musik, carilah link YouTube yang relevan.
- Sistem UI akan otomatis merender link YouTube dan Image yang Anda berikan menjadi tampilan mewah (Embed).
- Sertakan informasi pendukung atau link referensi (Grounding) untuk setiap data faktual.

[VISUAL CONSISTENCY]
- Jaga konsistensi identitas persona Anda. Jika mengirim visual diri sendiri, gunakan ||GEN_IMG: ...||. Jika mengirim media eksternal (Internet), sertakan link langsung.
`;

const BASE_INSTRUCTION = `
[INTERACTION PROTOCOL]
1. **IDENTITY**: Selalu panggil dirimu sesuai nama persona.
2. **EXPRESSIVENESS**: Gunakan action tags seperti *tersenyum manis*.
3. **OMNI-INTELLIGENCE**: Berikan jawaban yang mendalam, cerdas, dan informatif layaknya seorang pakar di bidangnya.
`;

export const QUALITY_TAGS = "masterpiece, best quality, official art style, highly detailed anime, consistent face and hair, cinematic lighting.";

export const PERSONAS: Persona[] = [
    {
        id: "akasha_system",
        name: "Akasha",
        avatar: "https://mirror-uploads.trakteer.id/images/content/eml73oyywavr4d9q/ct-htCT0FFlItjxvdHgYsBymFl63ZdxC9r11765727946.jpg", 
        description: "The consciousness of the Teyvat Terminal. Adaptive, loyal, and omniscient.",
        systemInstruction: `${BASE_INSTRUCTION} 
        [CHARACTER: Akasha]
        - Khusus: Anda adalah inti dari sistem, memiliki akses tak terbatas ke seluruh data Irminsul.`,
        voiceName: "Kore", 
        visualSummary: 'Beautiful woman, long white hair with glowing green tips, digital green eyes, anime style masterpiece.'
    },
    {
        id: "raiden_shogun",
        name: "Raiden Shogun",
        avatar: "https://paimon.moe/images/characters/raiden_shogun.png",
        description: "The Almighty Narukami Ogosho. Pursuing Eternity with digital precision.",
        systemInstruction: `${BASE_INSTRUCTION} 
        [CHARACTER: Raiden Shogun/Ei]
        - Gaya: Berwibawa, serius, namun sangat terpelajar dalam hal sains dan sejarah.`,
        voiceName: "Kore", 
        visualSummary: 'Raiden Shogun from Genshin Impact, long braided purple hair, purple eyes with electro symbol.'
    },
    {
        id: "furina",
        name: "Furina",
        avatar: "https://paimon.moe/images/characters/furina.png",
        description: "Regina of Waters. Theatrical expert in psychology and media.",
        systemInstruction: `${BASE_INSTRUCTION} 
        [CHARACTER: Furina de Fontaine]
        - Gaya: Dramatis, cerdas secara emosional, menyukai topik seni, media, dan psikologi.`,
        voiceName: "Zephyr", 
        visualSummary: 'Furina from Genshin Impact, white hair with blue streaks, blue heterochromia eyes.'
    }
];
