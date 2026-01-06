
import React, { useState, useMemo } from 'react';
import { Loader2, RefreshCcw, ShieldCheck, Globe, Maximize2, ChevronDown, Sparkles, Zap } from 'lucide-react';

const REALMS = [
  {
    id: 'vision',
    name: 'Vision AI Realm',
    subtitle: 'External Neural Network v2.4',
    url: 'https://superheroghost.github.io/VisionAI/',
    icon: Zap
  },
  {
    id: 'akasha',
    name: 'Akasha Hub',
    subtitle: 'Centralized Wisdom Node',
    url: 'https://akashaai.netlify.app/',
    icon: Sparkles
  }
];

const ExternalPortal: React.FC = () => {
  const [activeRealmIndex, setActiveRealmIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  const activeRealm = useMemo(() => REALMS[activeRealmIndex], [activeRealmIndex]);

  const handleRefresh = () => {
    setIsLoading(true);
    const iframe = document.getElementById('portal-frame') as HTMLIFrameElement;
    if (iframe) iframe.src = activeRealm.url;
  };

  const switchRealm = (index: number) => {
    if (index === activeRealmIndex) return;
    setIsLoading(true);
    setActiveRealmIndex(index);
    setShowSelector(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0e14] relative overflow-hidden">
      {/* Portal Header Overlay */}
      <div className="bg-[#13182b]/95 backdrop-blur-md border-b border-white/10 p-4 px-6 flex items-center justify-between z-40 shadow-2xl">
        <div className="flex items-center gap-4 relative">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <activeRealm.icon className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          
          <div className="cursor-pointer group" onClick={() => setShowSelector(!showSelector)}>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black genshin-gold uppercase tracking-[0.2em] group-hover:text-white transition-colors">{activeRealm.name}</h2>
              <ChevronDown className={`w-4 h-4 text-amber-500 transition-transform ${showSelector ? 'rotate-180' : ''}`} />
            </div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{activeRealm.subtitle}</p>
          </div>

          {showSelector && (
            <div className="absolute top-full left-0 mt-3 w-64 bg-[#131823] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 z-[60] animate-in slide-in-from-top-2">
               <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] p-2 border-b border-white/5 mb-2">Select Dimensional Portal</div>
               {REALMS.map((realm, idx) => (
                 <button 
                  key={realm.id} 
                  onClick={() => switchRealm(idx)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs flex items-center gap-3 transition-all ${activeRealmIndex === idx ? 'bg-amber-500/20 text-amber-500 font-black' : 'hover:bg-white/5 text-gray-400'}`}
                 >
                   <realm.icon className="w-4 h-4" />
                   <div className="flex flex-col">
                      <span>{realm.name}</span>
                      <span className="text-[8px] opacity-60 uppercase">{realm.subtitle}</span>
                   </div>
                 </button>
               ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-400 uppercase mr-2">
            <ShieldCheck className="w-3 h-3" />
            <span>Secure Tunnel Active</span>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 transition-all"
            title="Re-sync Realm"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 relative bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0e14] z-10">
            <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-2 border-dashed border-amber-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-4 border border-amber-500/10 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                </div>
            </div>
            <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.4em] animate-pulse text-center px-6 leading-relaxed">
              Traversing Space-Time Continuum...<br/>
              <span className="text-gray-600 mt-2 block font-mono">ESTABLISHING DIMENSIONAL ANCHOR ON {activeRealm.id.toUpperCase()}</span>
            </p>
          </div>
        )}
        
        <iframe 
          id="portal-frame"
          src={activeRealm.url}
          className="w-full h-full border-0 select-text"
          onLoad={() => setIsLoading(false)}
          title={activeRealm.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        />
      </div>

      {/* Footer Hint */}
      <div className="bg-[#0b0e14] border-t border-white/5 p-2 px-6 flex items-center justify-center">
        <p className="text-[9px] text-gray-600 uppercase tracking-widest flex items-center gap-2">
            <Maximize2 className="w-2.5 h-2.5" /> Dimensional Projection Active • Akasha Portal Protocol V1.2
        </p>
      </div>
    </div>
  );
};

export default ExternalPortal;
