
import React, { useEffect, useState } from 'react';
import { Info, Github, Twitter, Code, Terminal, Heart, Coffee, ShieldCheck, Crown, ExternalLink, Lock } from 'lucide-react';
import { fetchTopDonators } from '../services/supabaseService';
import { Donator, MenuType } from '../types';
import LazyImage from './LazyImage';
import AdminLoginModal from './AdminLoginModal';

// Optional prop if parent allows switching menu
interface AboutProps {
    onSwitchToAdmin?: () => void;
}

const About: React.FC<AboutProps> = ({ onSwitchToAdmin }) => {
  const [donators, setDonators] = useState<Donator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
      fetchTopDonators().then(data => {
          setDonators(data);
          setLoading(false);
      });
  }, []);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 lg:p-12 flex flex-col items-center relative">
      {showAdminLogin && (
          <AdminLoginModal 
            onClose={() => setShowAdminLogin(false)}
            onSuccess={() => {
                setShowAdminLogin(false);
                if (onSwitchToAdmin) onSwitchToAdmin();
            }}
          />
      )}

      <div className="max-w-4xl w-full">
        
        {/* Header Logo Area */}
        <div className="text-center mb-16 relative group">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]"></div>
          <Terminal className="w-20 h-20 text-white mx-auto mb-6 relative z-10" />
          <h1 className="text-5xl font-bold genshin-gold mb-4 relative z-10 font-serif tracking-widest">TEYVAT.AI</h1>
          <p className="text-xl text-gray-400 tracking-[0.3em] uppercase font-light">Akasha Terminal Project</p>
          
          <div className="mt-6 flex flex-col items-center gap-2">
              <div className="inline-block px-4 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-widest">
                Version 7.1.0-Release
              </div>
          </div>
        </div>

        {/* Introduction */}
        <div className="genshin-panel p-8 rounded-3xl border border-white/10 mb-8 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>
           <p className="text-gray-300 leading-loose italic font-serif text-lg">
             "Connecting the wisdom of Irminsul with the advanced algorithms of another world. 
             This terminal is designed to bridge the gap between Traveler and Companion through 
             resonance frequencies (Voice), visual manifestation (Vision), and infinite knowledge."
           </p>
        </div>

        {/* DONATION SECTION */}
        <div className="mb-12">
            <h2 className="text-2xl font-bold genshin-gold mb-6 flex items-center gap-2 justify-center uppercase tracking-widest">
                <Coffee className="w-6 h-6 text-amber-500" /> Support the Admin
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="https://saweria.co/ryuuwangy" target="_blank" rel="noopener noreferrer" className="p-6 rounded-2xl bg-gradient-to-br from-[#1e2330] to-[#13182b] border border-white/10 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all group flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Heart className="w-6 h-6 text-yellow-500 fill-current" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Saweria</h3>
                    <p className="text-xs text-gray-400 mb-4">Local Indonesian Support (QRIS, GoPay, OVO)</p>
                    <span className="text-amber-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                        Donate Now <ExternalLink className="w-3 h-3" />
                    </span>
                </a>
                <a href="https://trakteer.id/ryuuwangy" target="_blank" rel="noopener noreferrer" className="p-6 rounded-2xl bg-gradient-to-br from-[#1e2330] to-[#13182b] border border-white/10 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all group flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Coffee className="w-6 h-6 text-red-500 fill-current" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Trakteer</h3>
                    <p className="text-xs text-gray-400 mb-4">Treat a coffee or primogems</p>
                    <span className="text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                        Donate Now <ExternalLink className="w-3 h-3" />
                    </span>
                </a>
            </div>
        </div>

        {/* TOP DONATORS HALL OF FAME */}
        <div className="mb-12">
            <h2 className="text-2xl font-bold genshin-gold mb-6 flex items-center gap-2 justify-center uppercase tracking-widest">
                <Crown className="w-6 h-6 text-yellow-400" /> Hall of Fame
            </h2>
            <div className="genshin-panel p-6 rounded-3xl border border-amber-500/30 bg-[#0b0e14]/50">
                <div className="space-y-4">
                    {loading ? (
                        <p className="text-center text-gray-500 py-4">Syncing Ley Lines...</p>
                    ) : donators.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No data available yet.</p>
                    ) : (
                        donators.map((d, index) => (
                            <div key={d.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                <div className="relative shrink-0">
                                    <LazyImage src={d.avatar || `https://ui-avatars.com/api/?name=${d.name}`} className="w-12 h-12 rounded-full border-2 border-amber-500/30" alt={d.name} />
                                    {index < 3 && (
                                        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[#0b0e14] ${
                                            index === 0 ? 'bg-yellow-400 text-black' : 
                                            index === 1 ? 'bg-gray-300 text-black' : 
                                            'bg-orange-700 text-white'
                                        }`}>
                                            {index + 1}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-white truncate">{d.name}</h4>
                                        <span className="text-amber-400 font-mono text-xs font-bold">{d.amount}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 italic line-clamp-1">"{d.message}"</p>
                                </div>
                                <div className="hidden md:block text-[10px] px-2 py-1 rounded bg-black/40 border border-white/10 uppercase text-gray-500">
                                    {d.platform}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Footer with Secret Admin Access */}
        <div className="text-center pb-10">
           <p className="text-xs text-gray-600 flex items-center justify-center gap-2">
             Made with 
             <button 
                onClick={() => setShowAdminLogin(true)} 
                className="focus:outline-none hover:scale-125 transition-transform cursor-pointer"
                title="Root Access"
             >
                <Heart className="w-3 h-3 text-red-500 fill-current opacity-50 hover:opacity-100 transition-opacity" />
             </button>
             by the Akasha Developers
           </p>
           <p className="text-[10px] text-gray-700 mt-2 uppercase tracking-widest">
             Ad Astra Abyssosque
           </p>
        </div>

      </div>
    </div>
  );
};

export default About;
