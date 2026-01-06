
import React, { useState, useEffect } from 'react';
import { Cookie, Check, X, ShieldCheck, Sparkles } from 'lucide-react';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('akasha_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('akasha_cookie_consent', 'granted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-2xl animate-in slide-in-from-bottom-10 duration-700">
      <div className="genshin-panel p-5 md:p-6 border border-amber-500/40 shadow-[0_0_50px_rgba(211,188,142,0.2)] bg-[#0b0e14]/95 backdrop-blur-2xl relative overflow-hidden group">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-5 relative z-10">
          <div className="shrink-0 relative">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner">
               <Cookie className="w-7 h-7 text-amber-500 animate-float" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-pulse" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h4 className="text-sm font-black genshin-gold uppercase tracking-[0.2em] mb-1 flex items-center justify-center md:justify-start gap-2">
               <ShieldCheck className="w-3 h-3" /> Celestial Trace Protocol
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed italic">
              "Traveler, Akasha Terminal memerlukan fragmen data (cookies) untuk mensinkronisasi resonansi identitasmu dan mengoptimalkan aliran energi Irminsul. Apakah kamu mengizinkan protokol ini?"
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsVisible(false)}
              className="flex-1 md:flex-none px-5 py-2.5 rounded-xl border border-white/10 text-gray-500 hover:text-white hover:bg-white/5 transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              Nanti saja
            </button>
            <button 
              onClick={handleAccept}
              className="flex-1 md:flex-none genshin-button px-8 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 group/btn"
            >
              <Check className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Izinkan</span>
            </button>
          </div>
        </div>

        {/* Small Close Icon */}
        <button 
          onClick={() => setIsVisible(false)} 
          className="absolute top-2 right-2 p-1 text-gray-600 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
