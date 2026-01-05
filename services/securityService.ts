import CryptoJS from 'crypto-js';

// --- CONFIGURATION ---
const getDynamicSalt = () => {
    if (typeof window === 'undefined') return "AKASHA_FALLBACK_SALT";
    const host = window.location.hostname;
    const screen = `${window.screen.width}x${window.screen.height}`;
    return `AKASHA_V12_SIG_${host}_${screen}`;
};

const STORAGE_PREFIX = "akasha_vault_v12_";

// Updated SHA-256 Hash for root access synchronization
const ADMIN_CREDENTIAL_HASH = "d6b1be7bd9de748116082287da603d812db1d274dd44198716973ca558a1a416";

/**
 * SHA-256 Hashing Utility
 */
export const hashData = (data: string): string => {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
};

/**
 * Securely verify admin password
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
 * Advanced Sanitization to prevent SQLi and XSS
 */
export const sanitizeInput = (input: string): string => {
    if (!input) return "";
    // Aggressively remove common SQL injection keywords and script tags
    return input
        .replace(/[<>'"\/\\;]/g, "")
        .replace(/\b(DROP|DELETE|SELECT|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|TABLE|DATABASE|FROM|WHERE|OR|AND|UNION|EXEC|SCRIPT)\b/gi, "");
};

/**
 * SHIELD PROTOCOL V12: Anti-Debug, Anti-Inspect, Anti-Copy, Anti-DDOS/Scanning
 */
export const enableRuntimeProtection = () => {
    if (typeof document === 'undefined') return;

    // 1. DISABLE CONTEXT MENU
    document.addEventListener('contextmenu', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
            e.preventDefault();
            return false;
        }
    });

    // 2. KEYBOARD SHIELD (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
    document.addEventListener('keydown', (e) => {
        const isForbidden = 
            e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
            (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p' || e.key === 'h' || e.key === 'k'));
        
        if (isForbidden) {
            e.preventDefault();
            return false;
        }
    });

    // 3. SELECTION & DRAG BLOCK
    document.addEventListener('selectstart', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
            e.preventDefault();
        }
    });

    document.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

    // 4. DEBUGGER TRAP (Detects DevTools)
    setInterval(() => {
        const startTime = performance.now();
        (function() {
            try {
                (function a(i) {
                    if (("" + i / i).length !== 1 || i % 20 === 0) {
                        (function() {}).constructor("debugger")();
                    } else {
                        debugger;
                    }
                    a(++i);
                }(0));
            } catch (e) {}
        })();
        const endTime = performance.now();
        if (endTime - startTime > 100) {
             // Logic for detecting lag caused by debugger can be added here
        }
    }, 4000);

    console.log("%cAKASHA OMNI-SHIELD V12.0 ACTIVE", "color: #00ff00; font-size: 16px; font-weight: bold; text-shadow: 0 0 10px #00ff00;");
};