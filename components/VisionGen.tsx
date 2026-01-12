
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ImageIcon, Wand2, Download, RefreshCcw, Layers, Upload, Sparkles, Edit, Box, Check, CloudLightning, Zap, Database, Clock, AlertTriangle, Activity, Loader2, ShieldCheck, Cpu, Trash2, Plus, Users, Layout, Lightbulb, ChevronRight, X, Maximize2, Monitor, Smartphone, Square, EyeOff, ShieldAlert, Fingerprint, History, Palette } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { IMAGE_GEN_MODELS, ART_STYLES, ASPECT_RATIOS } from '../data';

interface VisionGenProps {
    onError?: (msg: string) => void;
}

const LOADING_MESSAGES = [
    "Initiating Neural Resonance...",
    "Accessing Irminsul Repository...",
    "Calibrating Transmuter...",
    "Weaving Particles...",
    "Establishing Visual Anchor...",
    "Resolving Dimensional Fragments..."
];

const VisionGen: React.FC<VisionGenProps> = ({ onError }) => {
  const [activeProvider, setActiveProvider] = useState<'Google' | 'Pollinations' | 'openai' | 'OpenRouter'>('Google');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedStyle, setSelectedStyle] = useState('none');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const filteredModels = useMemo(() => IMAGE_GEN_MODELS.filter(m => m.provider.toLowerCase() === activeProvider.toLowerCase()), [activeProvider]);
  const [selectedModel, setSelectedModel] = useState<string>(filteredModels[0]?.id || '');
  
  useEffect(() => {
     if (filteredModels.length > 0 && !filteredModels.some(m => m.id === selectedModel)) {
        setSelectedModel(filteredModels[0].id);
     }
  }, [activeProvider, filteredModels, selectedModel]);

  const timerRef = useRef<any>(null);
  const simulatedProgress = useMemo(() => Math.min(99, Math.floor((elapsedTime / 18) * 100)), [elapsedTime]);

  useEffect(() => {
      if (isGenerating) {
          setElapsedTime(0);
          timerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
      } else {
          if (timerRef.current) clearInterval(timerRef.current);
          setElapsedTime(0);
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isGenerating]);

  const statusText = useMemo(() => LOADING_MESSAGES[Math.min(Math.floor(elapsedTime / 3), LOADING_MESSAGES.length - 1)], [elapsedTime]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResultImage(null);
    try {
      const currentStyle = ART_STYLES.find(s => s.id === selectedStyle);
      const img = await generateImage(prompt, "", [], undefined, selectedModel, selectedRatio, currentStyle?.prompt || "");
      if (img) setResultImage(img);
      else throw new Error("Synthesis failed.");
    } catch (err: any) {
      if (onError) onError(err.message);
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden bg-[#0b0e14] relative">
      
      {/* 1. LIGHTBOX OVERLAY (Highest Z-Index) */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 overflow-y-auto custom-scrollbar animate-in fade-in duration-300" onClick={() => setLightboxImage(null)}>
           <div className="relative group max-w-full flex flex-col items-center">
              <img src={lightboxImage} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-[0_0_80px_rgba(211,188,142,0.4)] border-2 border-[#d3bc8e]/20 animate-in zoom-in duration-500 mb-12" alt="Full view" />
              <button className="flex items-center gap-2 bg-white/10 hover:bg-red-500/20 px-6 py-3 rounded-full border border-white/10 text-white transition-all">
                <X className="w-5 h-5" /> <span className="text-xs font-black uppercase tracking-widest">Close Portal</span>
              </button>
           </div>
        </div>
      )}

      {/* 2. GENERATING OVERLAY (High Priority - Prevents UI overlapping) */}
      {isGenerating && (
        <div className="absolute inset-0 z-[100] bg-[#0b0e14]/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
            {/* Background Magic Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-10 pointer-events-none">
                <div className="w-full h-full rounded-full border-2 border-dashed border-amber-500 animate-[spin_30s_linear_infinite]"></div>
            </div>

            <div className="relative flex flex-col items-center gap-10 z-10">
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                    {/* Pulsing Outer Ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-dashed border-amber-500/20 animate-[spin_15s_linear_infinite]"></div>
                    <div className="absolute inset-8 border-2 border-amber-500/10 rounded-full animate-[spin_10s_linear_infinite_reverse]"></div>
                    
                    {/* Inner Progress */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-6xl font-black genshin-gold font-mono drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                            {simulatedProgress}<span className="text-2xl ml-1 opacity-60">%</span>
                        </span>
                        <div className="h-1.5 w-32 bg-white/5 mt-6 rounded-full overflow-hidden border border-white/10">
                            <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]" style={{ width: `${simulatedProgress}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-4 max-w-sm">
                    <h2 className="text-3xl font-bold genshin-gold uppercase tracking-[0.4em] font-serif drop-shadow-lg animate-pulse">{statusText}</h2>
                    <div className="flex items-center justify-center gap-3">
                        <div className="h-px w-8 bg-amber-500/30"></div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] whitespace-nowrap">Resonating with Akasha</p>
                        <div className="h-px w-8 bg-amber-500/30"></div>
                    </div>
                    <p className="text-[8px] text-gray-600 font-mono tracking-tighter opacity-50">NODE_ID: {selectedModel.toUpperCase()} // LATENCY: 24ms</p>
                </div>
            </div>
        </div>
      )}

      {/* 3. LEFT PANEL: Control Deck */}
      <aside className="w-full lg:w-[420px] h-full flex flex-col bg-[#0d111c] border-r border-[#d3bc8e]/10 shadow-2xl relative z-30">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-[#d3bc8e]/10 bg-black/20 shrink-0">
            <h1 className="text-xl font-black genshin-gold mb-1 font-serif tracking-[0.2em] flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" /> VISION ALCHEMY
            </h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] font-black opacity-60">Celestial Manifestation Node</p>
        </div>

        {/* Scrollable Settings Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            
            {/* 1. Neural Source Selector */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Database className="w-3.5 h-3.5 text-amber-500/70" />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Neural Provider</label>
                </div>
                <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                    {['Google', 'Pollinations', 'openai'].map(p => (
                        <button 
                            key={p} 
                            onClick={() => setActiveProvider(p as any)} 
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeProvider.toLowerCase() === p.toLowerCase() ? 'bg-[#d3bc8e] text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </section>

            {/* 2. Model Selection Grid */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Cpu className="w-3.5 h-3.5 text-amber-500/70" />
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Synthesis Core</label>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {filteredModels.map(model => (
                        <button 
                            key={model.id} 
                            onClick={() => setSelectedModel(model.id)} 
                            className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${selectedModel === model.id ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'}`}
                        >
                            <div className="min-w-0 pr-4">
                                <div className="text-[10px] font-black uppercase truncate">{model.label}</div>
                                <div className="text-[8px] opacity-60 font-mono mt-1 truncate">{model.desc}</div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selectedModel === model.id ? 'border-amber-400 bg-amber-400' : 'border-white/10'}`}>
                                {selectedModel === model.id && <Check className="w-3 h-3 text-black stroke-[4]" />}
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* 3. Configuration (Ratio & Style) */}
            <div className="grid grid-cols-2 gap-4">
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Layout className="w-3.5 h-3.5 text-amber-500/70" />
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Frame</label>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {ASPECT_RATIOS.map(ratio => (
                            <button 
                                key={ratio.id} 
                                onClick={() => setSelectedRatio(ratio.id)} 
                                className={`p-3 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-3 ${selectedRatio === ratio.id ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-black/20 border-white/5 text-gray-600 hover:bg-white/5'}`}
                            >
                                <Square className={`w-3 h-3 ${ratio.id === '1:1' ? 'aspect-square' : ratio.id === '16:9' ? 'aspect-video' : 'h-4 w-2'}`} />
                                {ratio.id}
                            </button>
                        ))}
                    </div>
                </section>
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-3.5 h-3.5 text-amber-500/70" />
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Art Style</label>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {ART_STYLES.map(style => (
                            <button 
                                key={style.id} 
                                onClick={() => setSelectedStyle(style.id)} 
                                className={`p-3 rounded-xl border text-[10px] font-bold transition-all text-left truncate ${selectedStyle === style.id ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-black/20 border-white/5 text-gray-600 hover:bg-white/5'}`}
                            >
                                {style.label}
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* 4. Prompt Input Area */}
            <section className="pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Edit className="w-3.5 h-3.5 text-amber-500/70" />
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Directive</label>
                    </div>
                    <span className="text-[8px] text-gray-600 font-mono">NEURAL_INPUT_V3</span>
                </div>
                <div className="relative group">
                    <textarea 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        className="w-full bg-black/60 border border-white/10 rounded-2xl p-5 text-sm focus:border-amber-500 outline-none min-h-[140px] resize-none text-white transition-all select-text shadow-inner placeholder:text-gray-700 leading-relaxed" 
                        placeholder="Describe the vision you wish to manifest from the Ley Lines..." 
                    />
                    <div className="absolute bottom-4 right-4 text-[9px] text-gray-700 font-black">
                        {prompt.length} CHR
                    </div>
                </div>
            </section>
        </div>

        {/* manifest Action Button */}
        <div className="p-6 bg-black/40 border-t border-[#d3bc8e]/10">
            <button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt.trim()} 
                className="w-full py-5 rounded-2xl flex items-center justify-center gap-4 text-white font-black transition-all shadow-[0_10px_40px_rgba(0,0,0,0.5)] genshin-button disabled:opacity-50 relative group overflow-hidden active:scale-95"
            >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 opacity-10"></div>
                {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                <span className="uppercase tracking-[0.3em] text-xs">{isGenerating ? 'Resonating...' : 'Manifest Vision'}</span>
            </button>
        </div>
      </aside>

      {/* 4. RIGHT PANEL: Result Canvas - FIX: Added overflow-y-auto and min-h-full wrapper */}
      <main className="flex-1 min-h-0 relative bg-[#0b0e14] overflow-y-auto custom-scrollbar">
         {/* Background Decor */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(211,188,142,0.05)_0%,_transparent_70%)] pointer-events-none"></div>
         <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
         
         <div className="min-h-full w-full flex flex-col items-center justify-center relative z-10 p-6 sm:p-12">
            <div className="w-full max-w-4xl flex flex-col items-center justify-center">
                {resultImage ? (
                   <div className="w-full animate-in zoom-in-95 duration-1000 flex flex-col items-center">
                     <div className="relative rounded-[3rem] overflow-hidden border-2 border-amber-500/30 bg-black/60 p-3 cursor-zoom-in group shadow-[0_0_100px_rgba(0,0,0,0.8)]" onClick={() => setLightboxImage(resultImage)}>
                       <img src={resultImage} className="w-full h-auto max-h-[75vh] object-contain rounded-[2.5rem] transition-transform duration-1000 group-hover:scale-[1.01]" alt="result" />
                       
                       {/* Result Actions Overlay */}
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                         <button 
                            onClick={(e) => { e.stopPropagation(); const link = document.createElement('a'); link.href = resultImage!; link.download = `akasha_vision_${Date.now()}.png`; link.click();}} 
                            className="p-5 bg-amber-500 text-black rounded-full hover:scale-110 shadow-2xl transition-all active:scale-90"
                            title="Download Artifact"
                         >
                            <Download className="w-7 h-7" />
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); setLightboxImage(resultImage); }} 
                            className="p-5 bg-white text-black rounded-full hover:scale-110 shadow-2xl transition-all active:scale-90"
                            title="Expand Portal"
                         >
                            <Maximize2 className="w-7 h-7" />
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); setResultImage(null); }} 
                            className="p-5 bg-red-500/80 text-white rounded-full hover:scale-110 shadow-2xl transition-all active:scale-90"
                            title="Clear Display"
                         >
                            <RefreshCcw className="w-7 h-7" />
                         </button>
                       </div>

                       {/* Subtle Corner Accents */}
                       <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-amber-400/50 rounded-tl-lg pointer-events-none"></div>
                       <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-amber-400/50 rounded-br-lg pointer-events-none"></div>
                     </div>

                     <div className="mt-8 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-1000 delay-300">
                        <div className="h-px w-12 bg-amber-500/20"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Artifact Synthesized Successfully</span>
                        <div className="h-px w-12 bg-amber-500/20"></div>
                     </div>
                   </div>
                ) : (
                   <div className="text-center opacity-40 flex flex-col items-center group animate-in fade-in duration-1000">
                      <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-8 group-hover:border-amber-500/40 group-hover:bg-amber-500/5 transition-all duration-700">
                          <ImageIcon className="w-12 h-12 text-gray-700 group-hover:text-amber-500/60 transition-colors" />
                      </div>
                      <h2 className="text-xl font-black genshin-gold uppercase tracking-[0.4em] font-serif">Alchemy Portal Idle</h2>
                      <p className="text-[10px] mt-3 text-gray-600 uppercase tracking-[0.2em] max-w-xs leading-relaxed">
                        Offer your directives to the Irminsul network to project visual fragments of Teyvat.
                      </p>
                      
                      <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-sm">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5"><Monitor className="w-3.5 h-3.5" /></div>
                            <span className="text-[7px] font-black uppercase text-gray-700 tracking-widest">High Res</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5"><Fingerprint className="w-3.5 h-3.5" /></div>
                            <span className="text-[7px] font-black uppercase text-gray-700 tracking-widest">Neural Sign</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5"><ShieldCheck className="w-3.5 h-3.5" /></div>
                            <span className="text-[7px] font-black uppercase text-gray-700 tracking-widest">Secure</span>
                        </div>
                      </div>
                   </div>
                )}
            </div>
         </div>
      </main>
    </div>
  );
};

export default VisionGen;
