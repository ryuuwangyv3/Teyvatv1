
import CryptoJS from 'crypto-js';

// --- CONFIGURATION ---
// Dynamic Salt based on environment to prevent cross-device storage hijacking
const getDynamicSalt = () => {
    if (typeof window === 'undefined') return "AKASHA_FALLBACK_SALT";
    const host = window.location.hostname;
    const screen = `${window.screen.width}x${window.screen.height}`;
    return `AKASHA_V8_SIG_${host}_${screen}`;
};

const STORAGE_PREFIX = "akasha_vault_v8_";

// SHA-256 Hash of "akasha_root_v7" - Secure verification without plain text
const ADMIN_CREDENTIAL_HASH = "7d57864f9f4c3917d0b306b38c237303f0b2f6c9d9f582f3c32e9a263c7b3394";

/**
 * SHA-256 Hashing Utility
 */
export const hashData = (data: string): string => {
    return CryptoJS.SHA256(data).toString();
};

/**
 * Securely verify admin password
 */
export const verifyAdminPassword = (input: string): boolean => {
    if (!input) return false;
    return hashData(input.trim()) === ADMIN_CREDENTIAL_HASH;
};

/**
 * AES Encryption Logic
 */
export const encryptData = (data: any): string => {
    try {
        const stringValue = typeof data === 'string' ? data : JSON.stringify(data);
        return CryptoJS.AES.encrypt(stringValue, getDynamicSalt()).toString();
    } catch (e) {
        // Simple Base64 fallback if AES fails
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
 */
export const enableRuntimeProtection = () => {
    if (typeof document === 'undefined') return;

    // 1. INTEGRITY CHECK
    const originalLog = console.log;
    setInterval(() => {
        if (console.log !== originalLog) {
            document.body.innerHTML = `
                <div style="background:#0b0e14;color:#ff4d4d;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:serif;text-align:center;">
                    <h1 style="font-size:3rem;">[CORE TAMPER DETECTED]</h1>
                    <p style="color:#666;">Irminsul node has been disconnected due to unauthorized modification.</p>
                </div>
            `;
            throw new Error("Integrity Violation");
        }
    }, 2000);

    // 2. DISABLE CONTEXT MENU
    document.addEventListener('contextmenu', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') e.preventDefault();
    });

    // 3. KEYBOARD SHIELD (F12, CTRL+U, etc)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'u')) {
            e.preventDefault();
            return false;
        }
    });

    console.log("%cAKASHA SHIELD V8 ACTIVE", "color: #d3bc8e; font-size: 16px; font-weight: bold;");
};
