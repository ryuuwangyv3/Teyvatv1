
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ImageIcon, Wand2, Download, RefreshCcw, Layers, Upload, Sparkles, Edit, Box, Check, CloudLightning, Zap, Database, Clock, AlertTriangle, Activity, Loader2, ShieldCheck, Cpu, Trash2, Plus, Users, Layout, Lightbulb, ChevronRight, X, Maximize2, Monitor, Smartphone, Square, EyeOff, ShieldAlert, Fingerprint } from 'lucide-react';
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
    "Finalizing Nuances..."
];

const NEGATIVE_PRESETS = [
    { id: 'bad_anatomy', label: 'Anatomy', prompt: 'mutated hands, deformed fingers, extra limbs' },
    { id: 'bad_quality', label: 'Quality', prompt: 'low quality, blurry, pixelated, artifacts' },
    { id: 'over_saturated', label: 'OverSat', prompt: 'oversaturated, neon colors, excessive glow' }
];

const VisionGen: React.FC<VisionGenProps> = ({ onError }) => {
  const [activeProvider, setActiveProvider] = useState<'Google' | 'openai' | 'OpenRouter' | 'Pollinations'>('Google');
  const [mode, setMode] = useState<'create' | 'edit' | 'merge'>('create');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedStyle, setSelectedStyle] = useState('none');
  const [activeNegatives, setActiveNegatives] = useState<string[]>(['bad_anatomy', 'bad_quality']);

  const filteredModels = useMemo(() => {
     return IMAGE_GEN_MODELS.filter(m => m.provider.toLowerCase() === activeProvider.toLowerCase());
  }, [activeProvider]);

  const [selectedModel, setSelectedModel] = useState<string>(filteredModels[0]?.id || '');
  
  useEffect(() => {
     if (filteredModels.length > 0) {
        const currentModelExists = filteredModels.some(m => m.id === selectedModel);
        if (!currentModelExists) setSelectedModel(filteredModels[0].id);
     }
  }, [activeProvider, filteredModels, selectedModel]);

  const [prompt, setPrompt] = useState('');
  const [editInstruction, setEditInstruction] = useState(''); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [inputImages, setInputImages] = useState<string[]>([]); 
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  const simulatedProgress = useMemo(() => Math.min(99, Math.floor((elapsedTime / 15) * 100)), [elapsedTime]);

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

  const statusText = useMemo(() => {
      const index = Math.min(Math.floor(elapsedTime / 4), LOADING_MESSAGES.length - 1);
      return LOADING_MESSAGES[index];
  }, [elapsedTime]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
          const maxFiles = mode === 'merge' ? 2 : 1;
          const currentCount = inputImages.length;
          const remaining = maxFiles - currentCount;
          Array.from(files).slice(0, remaining).forEach((file: File) => {
              const reader = new FileReader();
              reader.onload = (event) => {
                  if (event.target?.result) setInputImages(prev => [...prev, event.target!.result as string]);
              };
              reader.readAsDataURL(file);
          });
      }
  };

  const handleGenerate = async (isRegen = false) => {
    if (!prompt.trim() && mode === 'create') return;
    if ((mode === 'edit' || mode === 'merge') && inputImages.length === 0) return;
    setIsGenerating(true);
    if (!isRegen) setResultImage(null);
    setGenerationError(null);
    try {
      let finalPrompt = prompt;
      const currentStyle = ART_STYLES.find(s => s.id === selectedStyle);
      const currentNegative = activeNegatives.map(id => NEGATIVE_PRESETS.find(n => n.id === id)?.prompt).join(", ");
      
      if (mode === 'edit') finalPrompt = `[EDIT] ${editInstruction}. Context: ${prompt}`;
      else if (mode === 'merge') finalPrompt = `[MERGE] ${prompt || 'Combine characters'}`;
      
      const img = await generateImage(
          finalPrompt, 
          "", 
          inputImages.length > 0 ? inputImages : (isRegen && resultImage ? [resultImage] : undefined), 
          undefined, 
          selectedModel, 
          selectedRatio, 
          currentStyle?.prompt || "", 
          currentNegative
      );
      
      if (img) {
          setResultImage(img);
          // Add a subtle success pulse sound effect if needed or visual flash
      } else {
          throw new Error("Synthesis failed: Neural feedback empty.");
      }
    } catch (err: any) {
      setGenerationError(err.message);
      if (onError) onError(err.message);
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden bg-[#0b0e14]">
      <style>{`
        @keyframes orbit {
            from { transform: rotate(0deg) translateX(40px) rotate(0deg); }
            to { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
        }
        @keyframes shine {
            0% { left: -100%; opacity: 0; }
            50% { opacity: 0.5; }
            100% { left: 100%; opacity: 0; }
        }
        .animate-orbit { animation: orbit 4s linear infinite; }
        .synthesis-orb {
            box-shadow: 0 0 40px rgba(211, 188, 142, 0.2), inset 0 0 20px rgba(211, 188, 142, 0.1);
        }
        .result-shimmer::after {
            content: '';
            position: absolute;
            top: 0; left: -100%; width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(211, 188, 142, 0.2), transparent);
            animation: shine 2s infinite;
        }
      `}</style>

      {lightboxImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
           <div className="max-w-5xl w-full flex flex-col items-center gap-4 sm:gap-6" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxImage} className="max-w-full max-h-[70vh] sm:max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10" alt="Full view" />
              <div className="flex gap-3 sm:gap-4">
                <button onClick={() => { const a = document.createElement('a'); a.href = lightboxImage; a.download = `vision_${Date.now()}.png`; a.click(); }} className="px-5 py-2.5 sm:px-6 sm:py-3 bg-[#d3bc8e] text-black rounded-full font-black uppercase text-[10px] sm:text-xs tracking-widest transition-all hover:scale-105">Download</button>
                <button onClick={() => setLightboxImage(null)} className="px-5 py-2.5 sm:px-6 sm:py-3 bg-white/10 text-white rounded-full font-black uppercase text-[10px] sm:text-xs tracking-widest border border-white/20">Close</button>
              </div>
           </div>
        </div>
      )}

      {/* LEFT PANEL: CONTROLS */}
      <aside className="w-full lg:w-[400px] p-4 sm:p-8 bg-[#13182b]/90 backdrop-blur-3xl border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto custom-scrollbar shrink-0 z-20">
        <header className="mb-8 flex justify-between items-start">
            <div>
                <h1 className="text-xl sm:text-3xl font-black genshin-gold mb-1 font-serif tracking-widest flex items-center gap-3">
                    <Sparkles className="w-5 h-5 sm:w-8 sm:h-8 text-amber-500 animate-pulse" /> Vision Alchemy
                </h1>
                <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-[0.3em] opacity-60 font-black">Celestial Synthesis Node</p>
            </div>
            <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-amber-500/40 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
                ))}
            </div>
        </header>

        <div className="space-y-6">
            {/* PROVIDER BADGE SELECTOR */}
            <section>
                <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">Neural Source</ts-label>
                <div className="grid grid-cols-2 gap-2">
                    {['Google', 'Pollinations', 'openai', 'OpenRouter'].map(p => (
                        <button key={p} onClick={() => setActiveProvider(p as any)} className={`px-3 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center justify-between transition-all ${activeProvider === p ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-black/20 border-white/5 text-gray-600 hover:text-gray-400'}`}>
                            <span>{p}</span>
                            {activeProvider === p && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></div>}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <label className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80 mb-3 block">Frame Aspect</label>
                <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map(ratio => (
                        <button key={ratio.id} onClick={() => setSelectedRatio(ratio.id)} className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${selectedRatio === ratio.id ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black/40 border-white/5 text-gray-500'}`}>
                            <div className={`border-2 rounded ${selectedRatio === ratio.id ? 'border-amber-500' : 'border-gray-700'}`} style={{ width: '12px', height: ratio.id === '1:1' ? '12px' : ratio.id === '16:9' ? '8px' : '16px' }}></div>
                            <span className="text-[9px] font-black">{ratio.id}</span>
                        </button>
                    ))}
                </div>
            </section>

            <div className="flex bg-black/60 rounded-2xl p-1 border border-white/10">
               {['create', 'edit', 'merge'].map(m => (
                   <button key={m} onClick={() => { setMode(m as any); setInputImages([]); }} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] transition-all ${mode === m ? 'bg-[#d3bc8e] text-black shadow-xl' : 'text-gray-500 hover:text-gray-400'}`}>{m}</button>
               ))}
            </div>

            <section className="space-y-4">
                <div>
                   <label className="text-[8px] sm:text-[9px] font-black uppercase text-gray-500 mb-2 block">Resonance Core (Model)</label>
                   <div className="relative group">
                       <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-[10px] font-black text-amber-500 outline-none uppercase appearance-none cursor-pointer focus:border-amber-500 transition-colors">
                           {filteredModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                       </select>
                       <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none rotate-90" />
                   </div>
                </div>
            </section>

            {mode !== 'create' && (
                <section className="animate-in fade-in slide-in-from-left-4">
                    <label className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3 block">Dimensional Fragments</label>
                    <div className="grid grid-cols-2 gap-3">
                        {inputImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-amber-500/20 group cursor-zoom-in hover:border-amber-500 transition-all" onClick={() => setLightboxImage(img)}>
                                <img src={img} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Trash2 onClick={(e) => { e.stopPropagation(); setInputImages(prev => prev.filter((_, i) => i !== idx)); }} className="w-5 h-5 text-red-500" />
                                </div>
                            </div>
                        ))}
                        {inputImages.length < (mode === 'merge' ? 2 : 1) && (
                            <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500/50 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-amber-500 transition-all bg-black/40 group">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500/10 transition-colors">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest">Inject Soul</span>
                            </button>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" multiple={mode === 'merge'} />
                </section>
            )}

            <section className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Divine Directive</label>
                        <span className="text-[7px] text-amber-500/50 uppercase font-mono">Input: TEYVAT_ALCH_V12</span>
                    </div>
                    <div className="relative group">
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-[11px] sm:text-xs focus:border-amber-500 outline-none min-h-[100px] resize-none text-white transition-all select-text placeholder:text-gray-800" placeholder="Describe the vision you wish to manifest across the Ley Lines..." />
                        <div className="absolute bottom-3 right-3 opacity-20 group-focus-within:opacity-100 transition-opacity">
                            <Fingerprint className="w-4 h-4 text-amber-500" />
                        </div>
                    </div>
                </div>
            </section>

            <button onClick={() => handleGenerate()} disabled={isGenerating || (!prompt.trim() && mode === 'create') || (mode !== 'create' && inputImages.length === 0)} className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-black transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-95 disabled:opacity-50 disabled:grayscale ${mode === 'create' ? 'genshin-button' : 'bg-gradient-to-r from-indigo-600 to-purple-700'}`}>
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                <span className="uppercase tracking-[0.3em] text-[10px]">{isGenerating ? 'Resonating...' : 'Manifest Vision'}</span>
            </button>
        </div>
      </aside>

      {/* RIGHT PANEL: PREVIEW */}
      <main className="flex-1 p-4 sm:p-10 flex flex-col items-center justify-center relative overflow-y-auto custom-scrollbar bg-[#0b0e14]">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(211,188,142,0.03)_0%,_transparent_70%)] pointer-events-none"></div>

         {isGenerating ? (
            <div className="flex flex-col items-center gap-10 animate-in fade-in duration-700 py-10 relative z-10">
                <div className="relative w-48 h-48 sm:w-72 sm:h-72 flex items-center justify-center">
                    {/* Spinning Rings */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/20 animate-[spin_15s_linear_infinite]"></div>
                    <div className="absolute inset-4 rounded-full border border-amber-500/10 animate-[spin_10s_linear_infinite_reverse]"></div>
                    <div className="absolute inset-10 rounded-full border-2 border-amber-500/30 animate-[spin_5s_linear_infinite]"></div>
                    
                    {/* Holographic Synthesis Orb */}
                    <div className="absolute inset-16 rounded-full synthesis-orb bg-amber-500/5 backdrop-blur-xl border border-amber-500/20 flex flex-col items-center justify-center animate-pulse overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent"></div>
                         <span className="text-4xl sm:text-6xl font-black genshin-gold font-mono tracking-tighter z-10">{simulatedProgress}%</span>
                         <div className="w-full h-px bg-amber-500/20 mt-2 z-10"></div>
                         <span className="text-[8px] sm:text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mt-2 z-10 animate-pulse">Syncing</span>
                    </div>

                    {/* Orbiting Runes (Simulated with points) */}
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="absolute w-2 h-2 bg-amber-500 rounded-full animate-orbit shadow-[0_0_10px_#f59e0b]" style={{ animationDelay: `${i * 0.5}s` }}></div>
                    ))}
                </div>
                
                <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-3">
                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                        <h2 className="text-lg sm:text-2xl font-bold genshin-gold uppercase tracking-[0.4em] font-serif">{statusText}</h2>
                    </div>
                    <div className="flex justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-12 h-1 rounded-full transition-all duration-1000 ${i / 5 < simulatedProgress / 100 ? 'bg-amber-500' : 'bg-white/5'}`}></div>
                        ))}
                    </div>
                </div>
            </div>
         ) : resultImage ? (
           <div className="w-full max-w-4xl animate-in zoom-in-95 duration-700 flex flex-col items-center pb-20 px-4 relative z-10">
             <div className="relative rounded-[2.5rem] overflow-hidden border-2 border-amber-500/30 shadow-[0_0_80px_rgba(211,188,142,0.15)] bg-black/60 p-2 cursor-zoom-in group result-shimmer" onClick={() => setLightboxImage(resultImage)}>
               <img src={resultImage} className="w-full h-auto max-h-[60vh] sm:max-h-[75vh] object-contain rounded-[2rem] transition-transform duration-700 group-hover:scale-[1.02]" alt="result" />
               
               {/* Floating Badges */}
               <div className="absolute top-6 left-6 flex gap-2">
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-500/40 text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3 animate-pulse" /> Synthesis Success
                    </div>
               </div>

               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                 <button onClick={(e) => { e.stopPropagation(); const link = document.createElement('a'); link.href = resultImage!; link.download = `akasha_vision_${Date.now()}.png`; link.click();}} className="p-4 bg-amber-500 text-black rounded-full hover:scale-110 transition-transform shadow-2xl"><Download className="w-6 h-6" /></button>
                 <button onClick={(e) => { e.stopPropagation(); setResultImage(null); }} className="p-4 bg-white/10 text-white rounded-full hover:bg-red-500 transition-all border border-white/20"><RefreshCcw className="w-6 h-6" /></button>
               </div>
             </div>
             
             <div className="mt-10 flex flex-wrap justify-center gap-3 sm:gap-6 w-full">
                 <div className="flex items-center gap-3 bg-[#13182b]/60 backdrop-blur-xl px-6 py-3 rounded-2xl border border-amber-500/10 hover:border-amber-500/40 transition-all">
                     <ShieldCheck className="w-4 h-4 text-green-400" />
                     <span className="text-[10px] sm:text-xs text-white font-black uppercase tracking-widest">Artifact Verified</span>
                 </div>
                 <button onClick={() => { setInputImages([resultImage]); setMode('edit'); }} className="flex items-center gap-3 bg-[#13182b]/60 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/5 hover:border-amber-500/50 transition-all hover:bg-amber-500/10 group">
                     <Edit className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                     <span className="text-[10px] sm:text-xs text-white font-black uppercase tracking-widest">Edit Resonance</span>
                 </button>
                 <button onClick={() => handleGenerate(true)} className="flex items-center gap-3 bg-white/5 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                     <RefreshCcw className="w-4 h-4 text-gray-400" />
                     <span className="text-[10px] sm:text-xs text-white font-black uppercase tracking-widest">Re-Transmute</span>
                 </button>
             </div>
           </div>
         ) : (
           <div className="text-center opacity-30 flex flex-col items-center py-20 px-6 relative z-10">
              <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full flex items-center justify-center mb-10 relative">
                  {/* Decorative dashed circle */}
                  <div className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full animate-[spin_60s_linear_infinite]"></div>
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                      <ImageIcon className="w-10 h-10 sm:w-16 sm:h-16 text-gray-700" />
                  </div>
                  {/* Floating particles around empty state */}
                  {[...Array(4)].map((_, i) => (
                      <div key={i} className="absolute w-1.5 h-1.5 bg-amber-500/40 rounded-full animate-float" style={{ top: `${20+i*20}%`, left: `${10+i*25}%`, animationDelay: `${i*0.5}s` }}></div>
                  ))}
              </div>
              <h2 className="text-xl sm:text-3xl font-black genshin-gold font-serif tracking-[0.3em] mb-4 uppercase">Chamber of Transmutation</h2>
              <p className="text-[9px] sm:text-[11px] text-gray-500 uppercase tracking-[0.2em] max-w-sm font-black leading-loose italic">"Traveler, provide a neural seed to begin the visual manifestation protocol."</p>
              
              <div className="mt-12 flex gap-10">
                  <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-gray-700"><Monitor className="w-5 h-5" /></div>
                      <span className="text-[8px] font-black text-gray-700 uppercase">8K Ready</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-gray-700"><Zap className="w-5 h-5" /></div>
                      <span className="text-[8px] font-black text-gray-700 uppercase">Instant Sync</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-gray-700"><ShieldCheck className="w-5 h-5" /></div>
                      <span className="text-[8px] font-black text-gray-700 uppercase">VFS Encrypted</span>
                  </div>
              </div>
           </div>
         )}
      </main>
    </div>
  );
};

export default VisionGen;
