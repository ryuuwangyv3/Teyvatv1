
import CryptoJS from 'crypto-js';

// --- CONFIGURATION ---
const getDynamicSalt = () => {
    if (typeof window === 'undefined') return "AKASHA_FALLBACK_SALT";
    const host = window.location.hostname;
    const screen = `${window.screen.width}x${window.screen.height}`;
    return `AKASHA_V8_SIG_${host}_${screen}`;
};

const STORAGE_PREFIX = "akasha_vault_v8_";

// SHA-256 Hash of "akasha_root_v7"
const ADMIN_CREDENTIAL_HASH = "7d57864f9f4c3917d0b306b38c237303f0b2f6c9d9f582f3c32e9a263c7b3394";

/**
 * SHA-256 Hashing Utility with explicit Hex encoding
 */
export const hashData = (data: string): string => {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
};

/**
 * Securely verify admin password with enhanced stability
 */
export const verifyAdminPassword = (input: string): boolean => {
    if (!input) return false;
    const hashedInput = hashData(input.trim());
    return hashedInput === ADMIN_CREDENTIAL_HASH;
};

/**
 * AES Encryption Logic
 */
export const encryptData = (data: any): string => {
    try {
        const stringValue = typeof data === 'string' ? data : JSON.stringify(data);
        return CryptoJS.AES.encrypt(stringValue, getDynamicSalt()).toString();
    } catch (e) {
        return "b64:" + btoa(encodeURIComponent(JSON.stringify(data)));
    }
};

/**
 * AES Decryption Logic
 */
export const decryptData = (encryptedStr: string): any => {
    try {
        if (!encryptedStr) return null;
        if (encryptedStr.startsWith("b64:")) {
            return JSON.parse(decodeURIComponent(atob(encryptedStr.substring(4))));
        }
        const bytes = CryptoJS.AES.decrypt(encryptedStr, getDynamicSalt());
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) return null;
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted; 
        }
    } catch (e) {
        return null;
    }
};

/**
 * OBFUSCATION UTILITY: Simple XOR for source-level string protection
 */
export const obf = (str: string, key: number = 42): string => {
    return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join('');
};

/**
 * SECURE STORAGE PROVIDER
 */
export const SecureStorage = {
    setItem: (key: string, value: any): boolean => {
        try {
            const encrypted = encryptData(value);
            localStorage.setItem(STORAGE_PREFIX + key, encrypted);
            return true;
        } catch (e) { return false; }
    },

    getItem: (key: string) => {
        try {
            const encrypted = localStorage.getItem(STORAGE_PREFIX + key);
            if (!encrypted) return null;
            return decryptData(encrypted);
        } catch (e) { return null; }
    },

    removeItem: (key: string) => {
        localStorage.removeItem(STORAGE_PREFIX + key);
    },
    
    clear: () => {
        Object.keys(localStorage)
            .filter(k => k.startsWith(STORAGE_PREFIX))
            .forEach(k => localStorage.removeItem(k));
    }
};

/**
 * Prevent basic SQL Injection and XSS
 */
export const sanitizeInput = (input: string): string => {
    if (!input) return "";
    return input.replace(/[<>'"\/\\;]/g, "");
};

/**
 * SHIELD PROTOCOL: Anti-Debug & Anti-Tamper
 * Adjusted to be less intrusive for production stability
 */
export const enableRuntimeProtection = () => {
    if (typeof document === 'undefined') return;

    // 1. DISABLE CONTEXT MENU (Optional, kept for aesthetic)
    document.addEventListener('contextmenu', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') e.preventDefault();
    });

    // 2. KEYBOARD SHIELD
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'u')) {
            // e.preventDefault(); // Temporarily disabled for debugging if needed
        }
    });

    console.log("%cAKASHA SHIELD V8.1 ACTIVE", "color: #d3bc8e; font-size: 16px; font-weight: bold;");
};
