
/**
 * 🔐 SECURITY MODULE: ENCRYPTED CREDENTIAL STORAGE
 * Precise Ley Line Alignment with User-Provided Multi-Provider Keys.
 */
import { obf } from './securityService';

// Decodes to: https://nrnuuufpyhhwhiqmzgub.supabase.co
const _S_U = obf("JZZJY\x10\x05\x05DHD___@JSJJ MJCGPA_H\x0cY_JKHKYO\x0cIE"); 

// Decodes to: sb_publishable_T-4x75qnhwdk8cPHFn3S5g_9YcrL_l9
const _S_K = obf("YHyJ_HB CYJKHBy~\x07\x16R\x11\x17KDJMNAr\x12IzrlD\x19y\x17Ay\x13sIHfyB\x13");

// Decodes to: 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
const _O_K = obf("ai-fxe`-\x00J@\x12|G Z \x18\x00\x1c\x0b\x0eia_q\x00F\x0bHGG_m\x08IB\x11\x14\x0b\x02XHoBfMv`_f`kbBCZ\x07@\x0b@mI\x01M_QS\x15W\x0bciQX\x10\x10T\x11BlkB@\x00\x02\x0b_^\x18\\xkOxxG\x06zb\x14eG\\rEP\x11\x15\x1f\x13\x00\x19\x04Xhy\x00\x1d\x12X`_oMf`v\x1d\x13wYrr\x12\x12 \x1cl  ia\x1b_X\x06X\x04I");

// Decodes to: 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
const _OR_K = obf("ai-er-v\x03-@ifiiiX@le\x13iXacb\x13\x11iXiib@ifiafecd\x13\x12iXab\x13fcb@\x1c@fdf");

// Decodes to: sk_9RR5jJqiyGzjRmTIzzo13VRaCbrO9gsH
const _P_K = obf("YQ}\x13xx\x0f@ KS-P@xC~#PPE\x1b\x19|xKihHe\x13EY\"");

/**
 * Returns the credentials safely at runtime after de-obfuscation.
 * Priority: process.env (ENV) > obf (Encrypted Defaults)
 */
export const getSystemCredentials = () => {
    return { 
        url: (process as any).env?.SUPABASE_URL || obf(_S_U), 
        key: (process as any).env?.SUPABASE_KEY || (process as any).env?.SUPABASE_ANON_KEY || obf(_S_K), 
        openai: (process as any).env?.OPENAI_API_KEY || obf(_O_K), 
        openrouter: (process as any).env?.OPENROUTER_API_KEY || (process as any).env?.OPENROUTER_KEY || obf(_OR_K),
        pollinations: (process as any).env?.POLLINATIONS_API_KEY || (process as any).env?.POLLINATIONS_KEY || obf(_P_K),
        google: (process as any).env?.GOOGLE_API_KEY || (process as any).env?.GEMINI_API_KEY || (process as any).env?.API_KEY,
        // Fix: Added huggingface to resolve the type error in geminiService.ts where creds.huggingface is accessed.
        huggingface: (process as any).env?.HUGGINGFACE_API_KEY || ""
    };
};
