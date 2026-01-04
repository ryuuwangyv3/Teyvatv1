
import React, { useState, useEffect } from 'react';
import { Key, Database, ShieldAlert, Trash2, Save, Loader2, Copy, FileJson, Lock, Plus, Activity, CheckCircle, XCircle, LogOut, CloudCog, Check } from 'lucide-react';
import { ApiKeyData, UserProfile } from '../types';
import { validateApiKey } from '../services/geminiService';
import { checkDbConnection, saveToSystemDrive, signInWithGoogle, signOut, updateSupabaseCredentials, getSupabaseConfig } from '../services/supabaseService';
import { SecureStorage } from '../services/securityService';
import { AI_MODELS } from '../data';

interface AdminConsoleProps {
    apiKeys: ApiKeyData[];
    setApiKeys: (keys: ApiKeyData[]) => void;
    userProfile: UserProfile;
    selectedModel: string;
    setSelectedModel: (m: string) => void;
}

const AdminConsole: React.FC<AdminConsoleProps> = ({ apiKeys, setApiKeys, userProfile, selectedModel, setSelectedModel }) => {
    const [newKey, setNewKey] = useState('');
    const [keyProvider, setKeyProvider] = useState<'google' | 'openai' | 'openrouter' | 'pollinations'>('google');
    const [isAddingKey, setIsAddingKey] = useState(false);
    
    const [dbUrl, setDbUrl] = useState('');
    const [dbKey, setDbKey] = useState('');
    const [dbStatus, setDbStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

    useEffect(() => {
        const config = getSupabaseConfig();
        if (config) {
            setDbUrl(config.url || '');
            setDbKey(config.key || '');
        }
        checkDb();
    }, []);

    const checkDb = async () => {
        setDbStatus('unknown');
        const ping = await checkDbConnection();
        setDbStatus(ping >= 0 || ping === -2 ? 'connected' : 'error'); 
    };

    const handleUpdateDb = async () => {
        if (!dbUrl || !dbKey) return;
        const success = updateSupabaseCredentials(dbUrl, dbKey);
        if (success) {
            await checkDb();
            alert("Database credentials updated locally.");
        }
    };

    const handleAddKey = async () => {
        if (!newKey.trim()) return;
        setIsAddingKey(true);
        
        let isValid = await validateApiKey(newKey.trim(), keyProvider);
        if (!isValid && keyProvider !== 'pollinations') {
            if (window.confirm("Force save invalid key?")) isValid = true;
        } else if (keyProvider === 'pollinations') {
            isValid = true;
        }

        const keyData: ApiKeyData = {
            key: newKey.trim(),
            provider: keyProvider, 
            isValid: isValid,
            lastChecked: Date.now(),
            label: `Key ${apiKeys.length + 1}`
        };
        
        setApiKeys([...apiKeys, keyData]);
        setNewKey('');
        setIsAddingKey(false);
    };

    const handleDeleteKey = (index: number) => {
        const newKeys = [...apiKeys];
        newKeys.splice(index, 1);
        setApiKeys(newKeys);
    };

    return (
        <div className="h-full p-6 lg:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-10">
                <header className="mb-8">
                    <h2 className="text-3xl font-bold text-red-500 uppercase tracking-widest flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8" />
                        Admin Console
                    </h2>
                    <p className="text-gray-400 text-sm">Restricted Area. Root access granted.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="genshin-panel p-6 rounded-3xl border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Key className="w-5 h-5 text-amber-500" />
                            API Key Vault
                        </h3>
                        <div className="flex gap-2 mb-4">
                            <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Paste Key..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white outline-none font-mono"/>
                            <select value={keyProvider} onChange={(e) => setKeyProvider(e.target.value as any)} className="bg-black/40 border border-white/10 rounded-xl px-2 text-xs text-gray-400">
                                <option value="google">Google</option>
                                <option value="openai">OpenAI</option>
                                <option value="openrouter">OpenRouter</option>
                                <option value="pollinations">Pollinations</option>
                            </select>
                            <button onClick={handleAddKey} disabled={isAddingKey || !newKey} className="bg-amber-500 text-black px-4 rounded-xl font-bold">
                                {isAddingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {apiKeys.map((k, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white uppercase">{k.provider}</span>
                                        <span className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">{k.key.substring(0, 8)}...</span>
                                    </div>
                                    <button onClick={() => handleDeleteKey(i)} className="text-gray-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminConsole;
