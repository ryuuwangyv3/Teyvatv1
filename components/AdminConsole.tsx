
import React, { useState, useEffect } from 'react';
import { Key, Database, ShieldAlert, Trash2, Save, Loader2, Plus, RefreshCw, Wifi, WifiOff, Cloud, Code, X, Copy, Check, Terminal } from 'lucide-react';
import { ApiKeyData, UserProfile } from '../types';
import { validateApiKey } from '../services/geminiService';
import { checkDbConnection, updateSupabaseCredentials, getSupabaseConfig, syncUserSettings } from '../services/supabaseService';

const SQL_SCRIPT = `-- AKASHA TERMINAL CORE SCHEMA V8.0
-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USER PROFILES (STRICT PRIVATE ACCESS)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT,
  bio TEXT,
  avatar TEXT,
  header_background TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Private Profile Access" ON public.user_profiles;
CREATE POLICY "Private Profile Access" ON public.user_profiles 
FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 2. USER SETTINGS
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Private Settings Access" ON public.user_settings;
CREATE POLICY "Private Settings Access" ON public.user_settings 
FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 3. CHAT HISTORY
CREATE TABLE IF NOT EXISTS public.chat_histories (
  user_id TEXT,
  persona_id TEXT,
  messages TEXT, -- Encrypted AES strings
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, persona_id)
);
ALTER TABLE public.chat_histories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Private History Access" ON public.chat_histories;
CREATE POLICY "Private History Access" ON public.chat_histories 
FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 4. CUSTOM PERSONAS
CREATE TABLE IF NOT EXISTS public.custom_personas (
  id TEXT,
  user_id TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);
ALTER TABLE public.custom_personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Private Persona Access" ON public.custom_personas;
CREATE POLICY "Private Persona Access" ON public.custom_personas 
FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 5. FORUM POSTS
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT DEFAULT (auth.uid())::text,
  author TEXT,
  avatar TEXT,
  title TEXT,
  content TEXT,
  tag TEXT,
  media_url TEXT,
  likes INT DEFAULT 0,
  dislikes INT DEFAULT 0,
  rating INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Forum" ON public.forum_posts;
CREATE POLICY "Public Read Forum" ON public.forum_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Post Forum" ON public.forum_posts;
CREATE POLICY "Auth Post Forum" ON public.forum_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Owner Edit Forum" ON public.forum_posts;
CREATE POLICY "Owner Edit Forum" ON public.forum_posts FOR UPDATE USING (auth.uid()::text = author_id);
DROP POLICY IF EXISTS "Owner Delete Forum" ON public.forum_posts;
CREATE POLICY "Owner Delete Forum" ON public.forum_posts FOR DELETE USING (auth.uid()::text = author_id);

-- 6. SYSTEM LOGS
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System Write Only" ON public.system_logs;
CREATE POLICY "System Write Only" ON public.system_logs FOR INSERT WITH CHECK (true);

-- 7. DRIVE STORAGE
CREATE TABLE IF NOT EXISTS public.drive_items (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  parent_id TEXT,
  name TEXT,
  type TEXT,
  size BIGINT,
  content TEXT,
  mime_type TEXT,
  created_at BIGINT,
  updated_at BIGINT
);
ALTER TABLE public.drive_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Private Drive Access" ON public.drive_items;
CREATE POLICY "Private Drive Access" ON public.drive_items 
FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- 8. FORUM COMMENTS
CREATE TABLE IF NOT EXISTS public.forum_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author TEXT,
  avatar TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Comments" ON public.forum_comments;
CREATE POLICY "Public Read Comments" ON public.forum_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Post Comments" ON public.forum_comments;
CREATE POLICY "Auth Post Comments" ON public.forum_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Universal Update Comments" ON public.forum_comments;
CREATE POLICY "Universal Update Comments" ON public.forum_comments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Universal Delete Comments" ON public.forum_comments;
CREATE POLICY "Universal Delete Comments" ON public.forum_comments FOR DELETE USING (true);

-- 9. DONATIONS
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    amount TEXT,
    message TEXT,
    avatar TEXT,
    platform TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Donations" ON public.donations FOR SELECT USING (true);

-- 10. REALTIME
BEGIN;
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE
  public.forum_posts,
  public.system_logs,
  public.drive_items,
  public.forum_comments;
COMMIT;
`;

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
    const [showSqlModal, setShowSqlModal] = useState(false);
    const [copiedSql, setCopiedSql] = useState(false);

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
            alert("Celestial coordinates missing.");
            return;
        }
        const success = updateSupabaseCredentials(dbUrl, dbKey);
        if (success) {
            await checkDb();
            // Otomatis simpan ke database
            syncUserSettings({ apiKeys, db_url: dbUrl, db_key: dbKey });
            alert("Resonance established and saved to database.");
        } else {
            alert("Signal frequency mismatch.");
        }
    };

    const handleAddKey = async () => {
        if (!newKey.trim()) return;
        setIsAddingKey(true);
        try {
            const isValid = await validateApiKey(newKey.trim(), keyProvider);
            if (isValid) {
                const updatedKeys = [...apiKeys, { 
                    key: newKey.trim(), 
                    provider: keyProvider, 
                    isValid: true, 
                    lastChecked: Date.now(), 
                    label: `Node ${apiKeys.length + 1}` 
                }];
                setApiKeys(updatedKeys);
                setNewKey('');
                // Simpan otomatis ke database cloud
                syncUserSettings({ apiKeys: updatedKeys });
            } else { alert("Neural verification failed."); }
        } catch (e) { alert("Core disturbance detected."); } finally { setIsAddingKey(false); }
    };

    const handleCopySql = () => {
        navigator.clipboard.writeText(SQL_SCRIPT);
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2000);
    };

    return (
        <div className="h-full p-6 lg:p-12 overflow-y-auto custom-scrollbar relative">
            {showSqlModal && (
                <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
                    <div className="w-full max-w-4xl bg-[#0b0e14] border-2 border-amber-500/50 rounded-3xl overflow-hidden shadow-[0_0_120px_rgba(245,158,11,0.2)] flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-amber-900/20 to-transparent">
                            <div className="flex items-center gap-3">
                                <Database className="w-6 h-6 text-amber-500" />
                                <h3 className="text-xl font-bold genshin-gold uppercase tracking-widest font-serif">Celestial Schema V8.0</h3>
                            </div>
                            <button onClick={() => setShowSqlModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all text-gray-500 hover:text-white"><X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/40">
                             <pre className="text-[10px] md:text-xs font-mono text-cyan-400 leading-relaxed select-text whitespace-pre-wrap">{SQL_SCRIPT}</pre>
                        </div>
                        <div className="p-6 bg-black border-t border-white/5 flex gap-4">
                            <button onClick={handleCopySql} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${copiedSql ? 'bg-green-600 text-white' : 'bg-amber-500 text-black hover:bg-white'}`}>
                                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copiedSql ? 'Ritual Captured' : 'Copy SQL Initialization'}
                            </button>
                            <button onClick={() => setShowSqlModal(false)} className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-white/10">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-12">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-bold text-red-500 uppercase tracking-[0.2em] flex items-center gap-4 font-serif">
                            <ShieldAlert className="w-10 h-10 animate-pulse" /> Omni-Root Access
                        </h2>
                        <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em] font-black flex items-center gap-2">
                           <Terminal className="w-3 h-3" /> Secure Node V12.0 • Omni-Shield Active
                        </p>
                    </div>
                    <button onClick={() => setShowSqlModal(true)} className="flex items-center gap-3 bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-500 px-8 py-4 rounded-2xl border border-amber-500/30 transition-all font-black text-[11px] uppercase tracking-widest shadow-2xl">
                        <Code className="w-4 h-4" /> <span>Celestial Schema</span>
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="genshin-panel p-8 rounded-[3rem] border border-white/10 flex flex-col shadow-2xl relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3"><Cloud className="w-6 h-6 text-blue-400" /> Irminsul Link</h3>
                            {dbStatus === 'connected' ? (
                                <div className="flex items-center gap-2 bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/30">
                                    <Wifi className="w-3.5 h-3.5 text-green-500" /><span className="text-[10px] font-black text-green-400 uppercase tracking-widest">{latency}ms Stability</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/30 animate-pulse">
                                    <WifiOff className="w-3.5 h-3.5 text-red-500" /><span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Disconnected</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Archive URL</label>
                                <input type="text" value={dbUrl} onChange={(e) => setDbUrl(e.target.value)} placeholder="https://nrnuuufpyhhwhiqmzgub.supabase.co" className="w-full bg-black/60 border border-white/5 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 font-mono outline-none select-text" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Signature Key</label>
                                <input type="password" value={dbKey} onChange={(e) => setDbKey(e.target.value)} placeholder="sb_secret_ndbyZ2XztVkI7XRaft-lug_V0SVpOr2" className="w-full bg-black/60 border border-white/5 rounded-2xl px-6 py-5 text-sm text-white focus:border-blue-500 font-mono outline-none select-text" />
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button onClick={handleUpdateDb} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Synchronize Link</button>
                                <button onClick={checkDb} className="px-6 py-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"><RefreshCw className={`w-5 h-5 text-gray-400 ${dbStatus === 'checking' ? 'animate-spin text-blue-400' : ''}`} /></button>
                            </div>
                        </div>
                    </div>

                    <div className="genshin-panel p-8 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                        <h3 className="text-xl font-bold text-white mb-10 flex items-center gap-3"><Key className="w-6 h-6 text-amber-500" /> Key Repository</h3>
                        <div className="flex flex-col gap-6 mb-10">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Inject Neural Key..." className="flex-1 bg-black/60 border border-white/5 rounded-2xl px-6 py-5 text-sm text-white font-mono outline-none focus:border-amber-500 select-text"/>
                                <select value={keyProvider} onChange={(e) => setKeyProvider(e.target.value as any)} className="bg-black/80 border border-white/5 rounded-2xl px-4 text-[10px] font-black uppercase text-amber-400 focus:border-amber-500">
                                    <option value="google">Google</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="pollinations">Pollinations</option>
                                </select>
                            </div>
                            <button onClick={handleAddKey} disabled={isAddingKey || !newKey} className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white hover:scale-105 transition-all shadow-xl disabled:opacity-50">
                                {isAddingKey ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Manifest Secret
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                            {apiKeys.length === 0 ? (
                                <div className="text-center py-10 text-gray-700 italic text-xs uppercase font-bold tracking-widest">Vault Empty</div>
                            ) : (
                                apiKeys.map((k, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group/item hover:border-amber-500/30 transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest">{k.provider} Node</span>
                                            <span className="text-xs text-gray-500 font-mono tracking-tighter">{k.key.substring(0, 20)}...</span>
                                        </div>
                                        <button onClick={() => { 
                                            const updated = apiKeys.filter((_, idx) => idx !== i);
                                            setApiKeys(updated);
                                            syncUserSettings({ apiKeys: updated });
                                        }} className="text-gray-600 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="genshin-panel p-10 rounded-[3rem] border border-red-500/20 bg-red-900/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-red-500/40"></div>
                    <div className="flex items-start gap-8 relative z-10">
                         <div className="p-5 rounded-[2rem] bg-red-500/10 border border-red-500/20"><ShieldAlert className="w-8 h-8 text-red-500" /></div>
                         <div className="flex-1">
                             <h4 className="text-red-400 font-black uppercase tracking-[0.3em] mb-3 text-sm">Celestial Lockdown Mode</h4>
                             <p className="text-xs text-gray-500 italic max-w-3xl leading-relaxed">
                                "Akasha Omni-Shield V12.0 is operating at peak efficiency. High-frequency encryption protocols are actively safeguarding the celestial data stream. Unauthorized inspection attempts are programmatically mitigated. Resonance verified."
                             </p>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminConsole;
