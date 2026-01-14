import CryptoJS from 'crypto-js';

// --- CONFIGURATION ---
const getDynamicSalt = () => {
    if (typeof window === 'undefined') return "AKASHA_FALLBACK_SALT";
    const host = window.location.hostname;
    const screen = `${window.screen.width}x${window.screen.height}`;
    return `AKASHA_V12_SIG_${host}_${screen}`;
};

const STORAGE_PREFIX = "akasha_vault_v12_";
const ADMIN_CREDENTIAL_HASH = "d6b1be7bd9de748116082287da603d812db1d274dd44198716973ca558a1a416";

/**
 * DECRYPT CELESTIAL FRAGMENT
 * Mengambil data terenkripsi dan mengembalikannya ke bentuk asal di memori runtime.
 */
export const decryptFragment = (cipher: string): string => {
    try {
        // Master Key internal untuk fragmen terenkripsi (Harus dijaga kerahasiaannya)
        const masterKey = "IRMINSUL_INTERNAL_RESONANCE_9981";
        const bytes = CryptoJS.AES.decrypt(cipher, masterKey);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        return "";
    }
};

export const hashData = (data: string): string => {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
};

export const verifyAdminPassword = (input: string): boolean => {
    if (!input) return false;
    const hashedInput = hashData(input.trim());
    return hashedInput === ADMIN_CREDENTIAL_HASH;
};

export const encryptData = (data: any): string => {
    try {
        const stringValue = typeof data === 'string' ? data : JSON.stringify(data);
        return CryptoJS.AES.encrypt(stringValue, getDynamicSalt()).toString();
    } catch (e) {
        return "b64:" + btoa(encodeURIComponent(JSON.stringify(data)));
    }
};

export const decryptData = (encryptedStr: string): any => {
    try {
        if (!encryptedStr) return null;
        if (encryptedStr.startsWith("b64:")) {
            return JSON.parse(decodeURIComponent(atob(encryptedStr.substring(4))));
        }
        const bytes = CryptoJS.AES.decrypt(encryptedStr, getDynamicSalt());
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) return null;
        try { return JSON.parse(decrypted); } catch { return decrypted; }
    } catch (e) { return null; }
};

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
    removeItem: (key: string) => localStorage.removeItem(STORAGE_PREFIX + key),
    clear: () => {
        Object.keys(localStorage)
            .filter(k => k.startsWith(STORAGE_PREFIX))
            .forEach(k => localStorage.removeItem(k));
    }
};

export const enableRuntimeProtection = () => {
    if (typeof document === 'undefined') return;
    document.addEventListener('contextmenu', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) e.preventDefault();
    });
    document.addEventListener('keydown', (e) => {
        const isForbidden = e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p'));
        if (isForbidden) e.preventDefault();
    });
    document.addEventListener('selectstart', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) e.preventDefault();
    });
    document.addEventListener('dragstart', (e) => e.preventDefault());
    console.log("%cAKASHA OMNI-SHIELD V15.0 ACTIVE", "color: #00ff00; font-size: 14px; font-weight: bold;");
};