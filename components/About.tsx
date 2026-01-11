
import React, { useEffect, useState } from 'react';
import { Info, Terminal, Heart, Coffee, Crown, ExternalLink } from 'lucide-react';
import { fetchTopDonators } from '../services/supabaseService';
import { Donator } from '../types';
import LazyImage from './LazyImage';
import AdminLoginModal from './AdminLoginModal';

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
    <div className="h-full overflow-y-auto custom-scrollbar p-6 lg:p-12 flex flex-col items-center relative bg-[#0b0e14]">
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
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#d3bc8e]/5 rounded-full blur-[80px]"></div>
          <Terminal className="w-20 h-20 text-white mx-auto mb-6 relative z-10" />
          <h1 className="text-5xl font-black genshin-gold mb-4 relative z-10 font-serif tracking-[0.2em]">AKASHA SYSTEM</h1>
          <p className="text-sm text-gray-500 tracking-[0.4em] uppercase font-bold">Resonance Protocol V8.0</p>
        </div>

        <div className="genshin-panel p-8 rounded-[2.5rem] border border-[#d3bc8e]/20 mb-12 text-center relative overflow-hidden bg-black/40">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#d3bc8e] to-transparent opacity-50"></div>
           <p className="text-gray-300 leading-loose italic font-serif text-lg">
             "Connecting the wisdom of Irminsul with the advanced neural algorithms of another world. 
             This terminal is designed to bridge the gap between Traveler and Companion through 
             resonance frequencies and visual manifestation."
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <a href="https://saweria.co/ryuuwangy" target="_blank" rel="noopener noreferrer" className="p-8 rounded-[2rem] bg-[#13182b] border border-[#d3bc8e]/10 hover:border-[#d3bc8e]/40 transition-all group flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#d3bc8e]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Heart className="w-8 h-8 text-[#d3bc8e] fill-current" />
                </div>
                <h3 className="font-black genshin-gold text-lg mb-2 uppercase tracking-widest">Saweria</h3>
                <p className="text-xs text-gray-500 mb-6 italic">Local Support (QRIS, E-Wallet)</p>
                <div className="genshin-button px-8 py-3 rounded-full text-[10px]">Donate Ritual <ExternalLink className="w-3 h-3 inline ml-1" /></div>
            </a>
            <a href="https://trakteer.id/ryuuwangy" target="_blank" rel="noopener noreferrer" className="p-8 rounded-[2rem] bg-[#13182b] border border-[#d3bc8e]/10 hover:border-red-500/40 transition-all group flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Coffee className="w-8 h-8 text-red-500 fill-current" />
                </div>
                <h3 className="font-black text-red-400 text-lg mb-2 uppercase tracking-widest">Trakteer</h3>
                <p className="text-xs text-gray-500 mb-6 italic">Support with Primogems</p>
                <div className="bg-red-500/20 text-red-400 border border-red-500/30 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Support Admin</div>
            </a>
        </div>

        <div className="mb-16">
            <h2 className="text-xl font-black genshin-gold mb-8 flex items-center gap-3 justify-center uppercase tracking-[0.3em] font-serif">
                <Crown className="w-6 h-6" /> Hall of Resonance
            </h2>
            <div className="genshin-panel p-6 rounded-[2rem] border border-[#d3bc8e]/10 bg-black/20 space-y-4">
                {loading ? (
                    <p className="text-center text-gray-600 py-4 font-black uppercase text-[10px] tracking-widest">Syncing Fragments...</p>
                ) : donators.length === 0 ? (
                    <p className="text-center text-gray-600 py-4 italic text-sm">No data in archive.</p>
                ) : (
                    donators.map((d, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                            <LazyImage src={d.avatar || `https://ui-avatars.com/api/?name=${d.name}`} className="w-12 h-12 rounded-full border border-[#d3bc8e]/30" alt="av" />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-white truncate text-sm">{d.name}</h4>
                                    <span className="text-[#d3bc8e] font-black text-xs">{d.amount}</span>
                                </div>
                                <p className="text-[10px] text-gray-500 italic line-clamp-1 mt-1">"{d.message}"</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="text-center pb-20">
           <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest flex items-center justify-center gap-2">
             Created with 
             <button 
                onClick={() => setShowAdminLogin(true)} 
                className="focus:outline-none hover:scale-150 transition-all cursor-pointer p-2"
                title="Root Access Protocol"
             >
                <Heart className="w-4 h-4 text-red-600 fill-current opacity-40 hover:opacity-100 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
             </button>
             by Akasha Developers
           </p>
           <p className="text-[9px] text-gray-800 mt-4 font-mono tracking-widest">AD ASTRA ABYSSOSQUE</p>
        </div>
      </div>
    </div>
  );
};

export default About;
