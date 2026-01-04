
import React, { useState, useEffect } from 'react';
import { Key, Database, ShieldAlert, Trash2, Save, Loader2, Plus, Activity, RefreshCw, Server, CheckCircle, XCircle, Cloud, HardDrive, Wifi, WifiOff } from 'lucide-react';
import { ApiKeyData, UserProfile } from '../types';
import { validateApiKey } from '../services/geminiService';
import { checkDbConnection, updateSupabaseCredentials, getSupabaseConfig, initSupabase } from '../services/supabaseService';
import { SecureStorage } from '../services/securityService';

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
    const [dbStatus, setDbStatus] = useState<'unknown' | 'connected' | 'error' | 'checking' | 'tables_missing'>('unknown');
    const [latency, setLatency] = useState<number | null>(null);

    useEffect(() => {
        const config = getSupabaseConfig();
        if (config) {
            setDbUrl(config.url || '');
            setDbKey(config.key || '');
        }
        checkDb();
    }, []);

    const checkDb = async () => {
        setDbStatus('checking');
        const ping = await checkDbConnection();
        if (ping >= 0) {
            setDbStatus('connected');
            setLatency(ping);
        } else if (ping === -2) {
            setDbStatus('tables_missing');
            setLatency(null);
        } else {
            setDbStatus('error');
            setLatency(null);
        }
    };

    const handleUpdateDb = async () => {
        if (!dbUrl || !dbKey) {
            alert("Sinyal Ley Line tidak valid. Pastikan URL dan Key terisi.");
            return;
        }
        const success = updateSupabaseCredentials(dbUrl, dbKey);
        if (success) {
            await checkDb();
            alert("Koordinat Akasha Cloud diperbarui.");
        } else {
            alert("Gagal menghubungkan terminal ke koordinat baru.");
        }
    };

    const handleAddKey = async () => {
        if (!newKey.trim()) return;
        setIsAddingKey(true);
        
        try {
            let isValid = await validateApiKey(newKey.trim(), keyProvider);
            
            if (!isValid && keyProvider !== 'pollinations') {
                if (window.confirm("Key ini tampak tidak valid atau expired. Tetap simpan?")) {
                    isValid = true;
                } else {
                    setIsAddingKey(false);
                    return;
                }
            } else if (keyProvider === 'pollinations') {
                isValid = true; // Pollinations doesn't always need validation
            }

            if (isValid) {
                const keyData: ApiKeyData = {
                    key: newKey.trim(),
                    provider: keyProvider, 
                    isValid: true,
                    lastChecked: Date.now(),
                    label: `Akasha Core ${apiKeys.length + 1}`
                };
                setApiKeys([...apiKeys, keyData]);
                setNewKey('');
            }
        } catch (e) {
            alert("Error saat validasi key. Coba lagi.");
        } finally {
            setIsAddingKey(false);
        }
    };

    const handleDeleteKey = (index: number) => {
        const newKeys = [...apiKeys];
        newKeys.splice(index, 1);
        setApiKeys(newKeys);
    };

    const handleClearConfig = () => {
        if (window.confirm("Putuskan koneksi Cloud? Sistem akan kembali ke mode penyimpanan lokal.")) {
            SecureStorage.removeItem('supabase_config');
            setDbUrl('');
            setDbKey('');
            initSupabase();
            checkDb();
        }
    };

    return (
        <div className="h-full p-6 lg:p-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-10">
                <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-4xl font-bold text-red-500 uppercase tracking-widest flex items-center gap-4 font-serif">
                            <ShieldAlert className="w-10 h-10 animate-pulse" />
                            Akasha Root Terminal
                        </h2>
                        <p className="text-gray-500 text-xs mt-2 uppercase tracking-[0.3em]">Restricted Access • Core Configuration V8.2</p>
                    </div>
                    <div className="flex items-center gap-4 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Sync Mode</span>
                            <span className={`text-xs font-black uppercase ${dbStatus === 'connected' ? 'text-green-400' : 'text-amber-500'}`}>
                                {dbStatus === 'connected' ? 'Celestial Cloud' : 'Local Archive'}
                            </span>
                        </div>
                        {dbStatus === 'connected' ? <Cloud className="text-green-500 w-6 h-6" /> : <HardDrive className="text-amber-500 w-6 h-6" />}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Supabase Config */}
                    <div className="genshin-panel p-8 rounded-[2.5rem] border border-white/10 flex flex-col shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[4rem] group-hover:bg-blue-500/10 transition-colors"></div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <Database className="w-6 h-6 text-blue-400" />
                                Irminsul Resonance
                            </h3>
                            <div className="flex items-center gap-3">
                                {dbStatus === 'connected' ? (
                                    <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30">
                                        <Wifi className="w-3 h-3 text-green-500" />
                                        <span className="text-[10px] font-black text-green-400 uppercase">{latency}ms</span>
                                    </div>
                                ) : dbStatus === 'tables_missing' ? (
                                    <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                                        <RefreshCw className="w-3 h-3 text-amber-500" />
                                        <span className="text-[10px] font-black text-amber-200 uppercase">Schema Missing</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
                                        <WifiOff className="w-3 h-3 text-red-500" />
                                        <span className="text-[10px] font-black text-red-400 uppercase">Disconnected</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-5 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Database Endpoint</label>
                                <input type="text" value={dbUrl} onChange={(e) => setDbUrl(e.target.value)} placeholder="https://your-project.supabase.co" className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all font-mono" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Access Key (Anon Public)</label>
                                <input type="password" value={dbKey} onChange={(e) => setDbKey(e.target.value)} placeholder="eyJh..." className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-blue-500 transition-all font-mono" />
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button onClick={handleUpdateDb} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    <Save className="w-4 h-4" /> Sync Coordinates
                                </button>
                                <button onClick={handleClearConfig} className="px-5 bg-red-900/20 text-red-400 border border-red-900/30 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="flex gap-2">
                                <button onClick={checkDb} disabled={dbStatus === 'checking'} className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-[10px] text-gray-400 font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                                    <RefreshCw className={`w-3.5 h-3.5 ${dbStatus === 'checking' ? 'animate-spin' : ''}`} /> 
                                    {dbStatus === 'checking' ? 'Scanning Ley Lines...' : 'Diagnostic Scan'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* API Key Vault */}
                    <div className="genshin-panel p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-[4rem] group-hover:bg-amber-500/10 transition-colors"></div>
                        
                        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3 relative z-10">
                            <Key className="w-6 h-6 text-amber-500" />
                            Neural Key Vault
                        </h3>

                        <div className="flex flex-col gap-4 mb-8 relative z-10">
                            <div className="flex gap-2">
                                <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Enter Neural Key..." className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white outline-none font-mono focus:border-amber-500 transition-all"/>
                                <select value={keyProvider} onChange={(e) => setKeyProvider(e.target.value as any)} className="bg-black/60 border border-white/5 rounded-2xl px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest outline-none">
                                    <option value="google">Google</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="pollinations">Pollinations</option>
                                </select>
                            </div>
                            <button onClick={handleAddKey} disabled={isAddingKey || !newKey} className="w-full bg-amber-500 hover:bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50">
                                {isAddingKey ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                <span>Manifest Key in Vault</span>
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
                            {apiKeys.length === 0 ? (
                                <div className="py-16 text-center opacity-20 flex flex-col items-center">
                                    <Key className="w-16 h-16 mb-4"/>
                                    <p className="text-xs uppercase font-black tracking-widest italic">Vault Empty</p>
                                </div>
                            ) : (
                                apiKeys.map((k, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group/item hover:border-amber-500/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center">
                                                <div className={`w-2 h-2 rounded-full ${k.isValid ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse'}`}></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${k.isValid ? 'text-green-400' : 'text-red-400'}`}>{k.provider}</span>
                                                <span className="text-xs text-gray-500 font-mono truncate max-w-[140px] md:max-w-[200px] mt-0.5">{k.key.substring(0, 12)}...</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteKey(i)} className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-item:opacity-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="genshin-panel p-8 rounded-[2.5rem] border border-red-500/20 bg-red-900/5">
                    <div className="flex items-start gap-5">
                         <div className="p-4 rounded-2xl bg-red-500/10">
                             <ShieldAlert className="w-6 h-6 text-red-500" />
                         </div>
                         <div>
                             <h4 className="text-red-400 font-black uppercase tracking-widest mb-1">Celestial Warning</h4>
                             <p className="text-xs text-gray-500 leading-relaxed italic">
                                "Mengubah konfigurasi di area ini akan mempengaruhi resonansi seluruh terminal. Pastikan Anda memiliki otorisasi penuh sebelum memodifikasi Ley Line Coordinates atau Neural Keys."
                             </p>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminConsole;
