
import React, { useState } from 'react';
import { Database, Copy, Check, Server, Terminal, X, ShieldAlert, RefreshCw } from 'lucide-react';
import { checkSchemaHealth } from '../services/supabaseService';

interface DatabaseSetupModalProps {
    onClose: () => void;
}

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

-- 5. FORUM (PUBLIC READ, AUTH WRITE)
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
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

-- 6. SYSTEM LOGS (APPEND ONLY)
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
    message TEXT,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System Write Only" ON public.system_logs;
CREATE POLICY "System Write Only" ON public.system_logs FOR INSERT WITH CHECK (true);

-- 7. DRIVE STORAGE (STRICT PRIVATE)
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
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
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

-- 9. REALTIME CONFIGURATION
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.forum_posts, 
    public.system_logs, 
    public.drive_items,
    public.forum_comments;
COMMIT;
`;

const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ onClose }) => {
    const [copied, setCopied] = useState(false);
    const [checking, setChecking] = useState(false);

    const handleCopy = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(SQL_SCRIPT);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = SQL_SCRIPT;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            document.body.removeChild(textArea);
        }
    };

    const handleCheckAgain = async () => {
        setChecking(true);
        try {
            const status = await checkSchemaHealth();
            if (status === 200) {
                alert("Celestial Resonance established. Database is ready.");
                onClose();
                window.location.reload();
            } else {
                alert("Tables still missing. Please ensure you ran the script in the Supabase SQL Editor.");
            }
        } catch (err) {
            alert("Connection error during diagnostic.");
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-full max-w-3xl bg-[#0b0e14] border-2 border-amber-500/50 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(245,158,11,0.2)] flex flex-col max-h-[90vh]">
                <div className="p-6 md:p-8 bg-gradient-to-r from-[#1a1f2e] to-[#0b0e14] border-b border-white/10 flex items-start justify-between relative">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <Database className="w-8 h-8 text-amber-500" />
                            <h2 className="text-2xl font-bold genshin-gold font-serif tracking-widest uppercase">System Initialization v8.0</h2>
                        </div>
                        <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
                            <span className="text-green-400 font-bold">Sync link detected</span>, but the <span className="text-red-400 font-bold">Encrypted Data Architecture is absent</span>.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all z-10">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-6 bg-[#131823]">
                    <div className="relative group">
                        <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/80">
                                <Terminal className="w-3 h-3" /> Artifact: Secure_Core_v8.sql
                             </div>
                             <button 
                                onClick={handleCopy}
                                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${copied ? 'bg-green-500 text-black' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-black'}`}
                             >
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{copied ? 'Copied' : 'Copy Ritual Code'}</span>
                             </button>
                        </div>
                        <div className="bg-black/60 rounded-2xl border border-white/5 p-4 font-mono text-[10px] leading-relaxed text-blue-300 max-h-60 overflow-y-auto custom-scrollbar select-text">
                            {SQL_SCRIPT}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-black/40 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                    <button onClick={onClose} className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-gray-400 font-bold text-sm">Skip</button>
                    <button onClick={handleCheckAgain} disabled={checking} className="flex-[2] genshin-button px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-white font-bold text-sm">
                        {checking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                        <span>Verify Resonance</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetupModal;
