import React, { useState, useEffect } from 'react';
/* Added Save to resolved compilation error */
import { Cookie, Check, X, ShieldCheck, Sparkles, Settings2, Database, Activity, Lock, ChevronRight, Info, Save } from 'lucide-react';

interface CookieSettings {
  essential: boolean;
  resonance: boolean;
  analytics: boolean;
  version: string;
}

const DEFAULT_SETTINGS: CookieSettings = {
  essential: true, // Always required
  resonance: true,
  analytics: false,
  version: '1.2'
};

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [tempSettings, setTempSettings] = useState<CookieSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const savedConsent = localStorage.getItem('akasha_cookie_protocol');
    if (!savedConsent) {
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSave = (settings: CookieSettings) => {
    localStorage.setItem('akasha_cookie_protocol', JSON.stringify(settings));
    localStorage.setItem('akasha_cookie_consent', 'granted');
    setIsVisible(false);
    setIsCustomizing(false);
  };

  const toggleSetting = (key: keyof CookieSettings) => {
    if (key === 'essential') return; // Cannot toggle essential
    setTempSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center p-4 sm:p-8 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-500">
      <div className={`genshin-panel w-full max-w-2xl border border-amber-500/40 shadow-[0_0_60px_rgba(0,0,0,0.6)] bg-[#0b0e14]/98 backdrop-blur-2xl relative overflow-hidden transition-all duration-500 ${isCustomizing ? 'mb-4' : 'mb-0'}`}>
        
        {/* Animated Background Decor */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-60"></div>
        <div className={`absolute -right-20 -bottom-20 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] transition-opacity duration-1000 ${isCustomizing ? 'opacity-100' : 'opacity-40'}`}></div>

        {!isCustomizing ? (
          /* SIMPLE VIEW */
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="shrink-0 relative">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner group">
                 <Cookie className="w-8 h-8 text-amber-500 animate-float group-hover:scale-110 transition-transform" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-400 animate-pulse" />
            </div>

            <div className="flex-1 text-center md:text-left">
              <h4 className="text-sm font-black genshin-gold uppercase tracking-[0.2em] mb-1.5 flex items-center justify-center md:justify-start gap-2">
                 <ShieldCheck className="w-4 h-4" /> Celestial Trace Protocol
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed italic">
                "Traveler, Akasha Terminal memerlukan fragmen data (cookies) untuk mensinkronisasi resonansi identitasmu dan mengoptimalkan aliran energi Irminsul. Bagaimana kamu ingin mengaturnya?"
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setIsCustomizing(true)}
                className="flex-1 md:flex-none px-5 py-3 rounded-xl border border-white/10 text-gray-500 hover:text-amber-500 hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Sesuaikan
              </button>
              <button 
                onClick={() => handleSave({ ...DEFAULT_SETTINGS, resonance: true, analytics: true })}
                className="flex-1 md:flex-none genshin-button px-8 py-3 rounded-xl flex items-center justify-center gap-2 shadow-xl group/btn min-w-[140px]"
              >
                <Check className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Terima Semua</span>
              </button>
            </div>
          </div>
        ) : (
          /* CUSTOMIZE VIEW */
          <div className="p-6 md:p-8 relative z-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Settings2 className="w-5 h-5 text-amber-500" />
                    <h4 className="text-lg font-black genshin-gold uppercase tracking-widest font-serif">Protocol Calibration</h4>
                </div>
                <button onClick={() => setIsCustomizing(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            <div className="space-y-3 mb-8">
                {/* ESSENTIAL */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 opacity-80">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <Lock className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-200">Terminal Core (Essential)</span>
                            <span className="text-[8px] font-black text-blue-400 uppercase bg-blue-400/10 px-1.5 py-0.5 rounded">Required</span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">Autentikasi, enkripsi, dan stabilitas ley line dasar.</p>
                    </div>
                    <div className="w-12 h-6 rounded-full bg-blue-500/40 relative border border-blue-500/50 cursor-not-allowed">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-lg"></div>
                    </div>
                </div>

                {/* RESONANCE */}
                <div 
                    onClick={() => toggleSetting('resonance')}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${tempSettings.resonance ? 'bg-amber-500/5 border-amber-500/30' : 'bg-black/20 border-white/5 opacity-60'}`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-all ${tempSettings.resonance ? 'bg-amber-500/20 border-amber-500/40' : 'bg-white/5 border-white/10'}`}>
                        <Database className={`w-5 h-5 ${tempSettings.resonance ? 'text-amber-500' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold transition-colors ${tempSettings.resonance ? 'text-amber-400' : 'text-gray-400'}`}>Resonance Archive</span>
                        <p className="text-[10px] text-gray-500 truncate">Menyimpan riwayat chat, persona kustom, dan preferensi VFS.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative border transition-all ${tempSettings.resonance ? 'bg-amber-500/40 border-amber-500/50' : 'bg-white/5 border-white/20'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all ${tempSettings.resonance ? 'right-1' : 'left-1 bg-gray-600'}`}></div>
                    </div>
                </div>

                {/* ANALYTICS */}
                <div 
                    onClick={() => toggleSetting('analytics')}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${tempSettings.analytics ? 'bg-green-500/5 border-green-500/30' : 'bg-black/20 border-white/5 opacity-60'}`}
                >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-all ${tempSettings.analytics ? 'bg-green-500/20 border-green-500/40' : 'bg-white/5 border-white/10'}`}>
                        <Activity className={`w-5 h-5 ${tempSettings.analytics ? 'text-green-500' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold transition-colors ${tempSettings.analytics ? 'text-green-400' : 'text-gray-400'}`}>Ley Line Analytics</span>
                        <p className="text-[10px] text-gray-500 truncate">Data performa sistem dan pemantauan latensi kognitif real-time.</p>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative border transition-all ${tempSettings.analytics ? 'bg-green-500/40 border-green-500/50' : 'bg-white/5 border-white/20'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all ${tempSettings.analytics ? 'right-1' : 'left-1 bg-gray-600'}`}></div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-gray-500">
                    <Info className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Protocol Version {tempSettings.version}</span>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button onClick={() => setIsCustomizing(false)} className="flex-1 sm:flex-none px-6 py-3 rounded-xl border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/5">Kembali</button>
                    <button 
                        onClick={() => handleSave(tempSettings)} 
                        className="flex-1 sm:flex-none genshin-button px-10 py-3 rounded-xl shadow-2xl flex items-center justify-center gap-2 group/save"
                    >
                        <Save className="w-4 h-4 group-hover/save:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Simpan Kalibrasi</span>
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CookieConsent;