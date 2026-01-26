
import { ApiKeyData } from '../types';

let storedKeys: ApiKeyData[] = [];

export const setStoredKeys = (keys: ApiKeyData[]) => {
    storedKeys = keys;
};

export const getStoredKey = (provider: string): string | undefined => {
    const target = provider.toLowerCase();
    // Cari key yang provider-nya cocok dan statusnya valid (atau belum dicek)
    const entry = storedKeys.find(k => k.provider.toLowerCase() === target && k.isValid !== false);
    return entry?.key;
};
