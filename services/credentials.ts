
/**
 * 🔐 SECURITY MODULE: DIRECT CREDENTIAL STORAGE
 * Synchronized with User-Provided Multi-Provider Keys.
 */

// ==================================================================================
// 🔑 USER PROVIDED API KEYS (Plain Text as requested)
// ==================================================================================

// Supabase Configuration
const _S_U = "https://nrnuuufpyhhwhiqmzgub.supabase.co"; 
const _S_K = "sb_publishable_T-4x75qnhwdk8cPHFn3S5g_9YcrL_l9";

// OpenAI
const _O_K = "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";

// OpenRouter
const _OR_K = "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";

// Pollinations
const _P_K = "sk_9RR5jJqiyGzjRmTIzzo13VRaCbrO9gsH";

// Google Gemini
const _G_K = "AIzaSyB3Zr9ukXoELEb7XiUyf0ZZIldnTgmrwAA";

/**
 * Returns the credentials safely at runtime.
 * Priority: process.env (ENV) > Static Plain Keys
 */
export const getSystemCredentials = () => {
    const env = (process as any).env || {};
    
    return { 
        url: env.SUPABASE_URL || _S_U, 
        key: env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || _S_K, 
        openai: env.OPENAI_API_KEY || _O_K, 
        openrouter: env.OPENROUTER_API_KEY || env.OPENROUTER_KEY || _OR_K,
        pollinations: env.POLLINATIONS_API_KEY || env.POLLINATIONS_KEY || _P_K,
        google: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.REACT_APP_API_KEY || env.NEXT_PUBLIC_API_KEY || env.API_KEY || _G_K,
        huggingface: env.HUGGINGFACE_API_KEY || ""
    };
};
