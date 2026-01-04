
import React, { useState } from 'react';
import { User, LogIn, ArrowRight, ShieldCheck, Cloud, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';

interface AuthModalProps {
    onLogin: () => Promise<{ error?: any } | void>;
    onGuest: () => void;
    isLoading: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onGuest, isLoading }) => {
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setError(null);
        try {
            const result = await onLogin();
            if (result && result.error) {
                const msg = (result.error.message || result.error.msg || JSON.stringify(result.error)).toLowerCase();
                
                if (msg.includes("provider is not enabled")) {
                    setError("Google Login belum aktif. Masuk ke Supabase > Authentication > Providers > Google, lalu aktifkan.");
                } else if (msg.includes("configuration_not_found")) {
                    setError("Konfigurasi Auth salah. Periksa Project ID dan API Key.");
                } else if (msg.includes("redirect_uri_mismatch") || msg.includes("mismatch")) {
                    setError("URL Mismatch! URL website ini belum didaftarkan di 'Authorized redirect URIs' pada Google Cloud Console.");
                } else {
                    setError(`Login Gagal: ${result.error.message}`);
                }
            }
        } catch (e: any) {
            setError(e.message || "Terjadi kesalahan saat inisialisasi login.");
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-[#0b0e14]/90 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="relative w-full max-w-md bg-[#13182b] border-2 border-[#d3bc8e] rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(211,188,142,0.3)]">
                
                {/* Decorative Top */}
                <div className="h-32 bg-gradient-to-b from-[#1e2330] to-[#13182b] relative flex items-center justify-center border-b border-[#d3bc8e]/20">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
                    <div className="w-20 h-20 rounded-full border-2 border-[#d3bc8e] bg-[#0b0e14] flex items-center justify-center shadow-[0_0_20px_rgba(211,188,142,0.5)] z-10 animate-pulse">
                        <Cloud className="w-10 h-10 text-[#d3bc8e]" />
                    </div>
                </div>

                <div className="p-8 text-center">
                    <h2 className="text-2xl font-serif font-bold text-[#ece5d8] mb-2 flex items-center justify-center gap-2">
                        Akasha Access <Sparkles className="w-4 h-4 text-amber-500" />
                    </h2>
                    <p className="text-gray-400 text-xs mb-6 leading-relaxed px-4">
                        Connect your celestial identity to sync chat history, custom personas, and VFS data across all devices.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex flex-col items-start gap-2 text-left">
                            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                                <AlertTriangle className="w-4 h-4" /> Auth Error
                            </div>
                            <p className="text-xs text-red-200 font-mono leading-relaxed">{error}</p>
                            
                            {/* Helpful Link if it's a URL issue */}
                            {(error.includes("Mismatch") || error.includes("Google")) && (
                                <a 
                                    href="https://console.cloud.google.com/apis/credentials" 
                                    target="_blank" 
                                    className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                                >
                                    Buka Google Cloud Console <ExternalLink className="w-3 h-3"/>
                                </a>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">New or Existing User</p>
                            <button 
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full py-3 bg-white text-black font-bold rounded-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-lg group relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {/* Google Logo */}
                                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" />
                                <span>{isLoading ? 'Connecting...' : 'Login / Register with Google'}</span>
                            </button>
                        </div>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#13182b] px-2 text-gray-500">Local Access</span>
                            </div>
                        </div>

                        <button 
                            onClick={onGuest}
                            className="w-full py-3 bg-[#1e2330] border border-white/10 text-gray-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#252b3d] hover:text-white transition-colors"
                        >
                            <User className="w-4 h-4" />
                            <span>Continue as Guest (No Sync)</span>
                        </button>
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-green-400 uppercase tracking-widest font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        Secure Auto-Save Enabled
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
