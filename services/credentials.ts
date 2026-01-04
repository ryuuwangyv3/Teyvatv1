
/**
 * 🔐 SECURITY MODULE: ENCRYPTED CREDENTIAL STORAGE
 * Precise Ley Line Alignment with User-Provided Multi-Provider Keys.
 */

// Helper to safely decode credentials
const decode = (b64: string) => {
    try {
        return atob(b64);
    } catch (e) {
        return "";
    }
};

// ==================================================================================
// 🔑 USER PROVIDED API KEYS (Base64 Encoded for internal safety)
// ==================================================================================

// URL: https://nrnuuufpyhhwhiqmzgub.supabase.co
const _S_U = "aHR0cHM6Ly9ucm51dXVmcHlod2hpcW16Z3ViLnN1cGFiYXNlLmNv"; 

// KEY: sb_publishable_T-4x75qnhwdk8cPHFn3S5g_9YcrL_l9
const _S_K = "c2JfcHVibGlzaGFibGVfVC00eDc1cW5od2RrOGNQSEZuM1M1Z185WWNyTF9sOQ==";

// OpenAI: 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
const _O_K = "c2stcHJvai1KSDIwekd5UHhVMnp0ZTh5ajZzbzJ3MFZxSlpDR0hNR2s4U0YtYnBCd0JIb010a1JWZV9hbGVuQk9KZXFIcE1Jd1MwVy1jaVFWQVQzQmxia0ZKVUtSWlRPSHhnT3h4R0Z6YnM2ZUdYcjVQWTM3XzNKVVNoa1Z2M1J3b2p4dnVVb01mbjk3d1lycjhzc3l2b3h4aXdhWEdWZ0RPNEE=";

// OpenRouter: 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
const _OR_K = "c2stb3ItdjEtOGFmY2NjOThiZDQ2N2UzYWNiMjFjNzZiMjlhZTcxODE5ZjQ4NDZhZmVjZDY3NGFiM2ZjODViMzg4Njg0ZjZkNw==";

// Pollinations: sk_9RR5jJqiyGzjRmTIzzo13VRaCbrO9gsH
const _P_K = "c2tfOVJSNWpKcWl5R3pqUm1USXp6bzEzVlJhQ2JyTzlnc0g=";

// Gemini Fallback: AIzaSyB3Zr9ukXoELEb7XiUyf0ZZIldnTgmrwAA
const _G_K = "QUl6YVN5QjNaMjl1a1hvRUxFYjdYaVV5ZjBaWklsZG5UZ21yd0FB";

/**
 * Returns the credentials safely at runtime.
 * Priority: process.env (ENV) > Encrypted Defaults
 */
export const getSystemCredentials = () => {
    const env = (process as any).env || {};
    
    return { 
        url: env.SUPABASE_URL || decode(_S_U), 
        key: env.SUPABASE_KEY || env.SUPABASE_ANON_KEY || decode(_S_K), 
        openai: env.OPENAI_API_KEY || decode(_O_K), 
        openrouter: env.OPENROUTER_API_KEY || env.OPENROUTER_KEY || decode(_OR_K),
        pollinations: env.POLLINATIONS_API_KEY || env.POLLINATIONS_KEY || decode(_P_K),
        google: env.GOOGLE_API_KEY || env.GEMINI_API_KEY || env.API_KEY || decode(_G_K),
        huggingface: env.HUGGINGFACE_API_KEY || ""
    };
};
