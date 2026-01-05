
import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Cloud,
  AlertTriangle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface AuthModalProps {
  onLogin: () => Promise<{ error?: any } | void>;
  onGuest: () => void;
  isLoading: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onGuest, isLoading }) => {
  const [error, setError] = useState<string | null>(null);

  const normalizeErrorMessage = (err: any): string => {
    if (!err) return 'Unknown authentication error.';
    if (typeof err === 'string') return err;
    return err.message || err.msg || JSON.stringify(err);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const result = await onLogin();
      if (result && (result as any).error) {
        const msg = normalizeErrorMessage((result as any).error).toLowerCase();
        if (msg.includes('provider is not enabled')) setError('Google Login is not enabled in Supabase.');
        else if (msg.includes('redirect_uri_mismatch')) setError('URL Mismatch in Google Console.');
        else setError(`Login Gagal: ${msg}`);
      }
    } catch (e: any) { setError(e?.message || 'Login initialization error.'); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-[#0b0e14]/90 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="relative w-full max-w-md bg-[#13182b] border-2 border-[#d3bc8e] rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(211,188,142,0.3)]">
        <div className="h-32 bg-gradient-to-b from-[#1e2330] to-[#13182b] relative flex items-center justify-center border-b border-[#d3bc8e]/20">
          <div className="w-20 h-20 rounded-full border-2 border-[#d3bc8e] bg-[#0b0e14] flex items-center justify-center shadow-[0_0_20px_rgba(211,188,142,0.5)] z-10 animate-pulse">
            <Cloud className="w-10 h-10 text-[#d3bc8e]" />
          </div>
        </div>

        <div className="p-8 text-center">
          <h2 className="text-2xl font-serif font-bold text-[#ece5d8] mb-2 flex items-center justify-center gap-2">
            Akasha Access <Sparkles className="w-4 h-4 text-amber-500" />
          </h2>
          <p className="text-gray-400 text-xs mb-6 leading-relaxed px-4">Connect your celestial identity to sync fragments across all devices.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-left">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase mb-1"><AlertTriangle className="w-4 h-4" /> Auth Error</div>
              <p className="text-xs text-red-200 font-mono">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button onClick={handleGoogleLogin} disabled={isLoading} className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-70">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
              <span>{isLoading ? 'Connecting...' : 'Manifest with Google'}</span>
            </button>
            <div className="relative py-2"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div><div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#13182b] px-2 text-gray-500">Local Protocol</span></div></div>
            <button onClick={onGuest} className="w-full py-4 bg-[#1e2330] border border-white/10 text-gray-300 font-bold rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:bg-[#252b3d] transition-colors">
              <User className="w-4 h-4" /> <span>Continue as Guest</span>
            </button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-green-400 uppercase tracking-widest font-bold">
            <ShieldCheck className="w-3 h-3" /> Secure Resonance Enabled
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
