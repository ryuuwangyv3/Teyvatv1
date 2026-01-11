
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
    "Finalizing Nuances...",
    "Establishing Visual Anchor...",
    "Resolving Dimensional Fragments..."
];

const NEGATIVE_PRESETS = [
    { id: 'bad_anatomy', label: 'Anatomy', prompt: 'mutated hands, deformed fingers, extra limbs' },
    { id: 'bad_quality', label: 'Quality', prompt: 'low quality, blurry, pixelated, artifacts' },
    { id: 'over_saturated', label: 'OverSat', prompt: 'oversaturated, neon colors, excessive glow' }
];

const VisionGen: React.FC<VisionGenProps> = ({ onError }) => {
  const [activeProvider, setActiveProvider] = useState<'Google' | 'Pollinations' | 'openai' | 'OpenRouter'>('Google');
  const [mode, setMode] = useState<'create' | 'edit' | 'merge'>('create');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedStyle, setSelectedStyle] = useState('none');
  const [activeNegatives, setActiveNegatives] = useState<string[]>(['bad_anatomy', 'bad_quality']);
  const [prompt, setPrompt] = useState('');
  const [editInstruction, setEditInstruction] = useState(''); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [inputImages, setInputImages] = useState<string[]>([]); 
  const [elapsedTime, setElapsedTime] = useState(0);

  const filteredModels = useMemo(() => IMAGE_GEN_MODELS.filter(m => m.provider.toLowerCase() === activeProvider.toLowerCase()), [activeProvider]);
  const [selectedModel, setSelectedModel] = useState<string>(filteredModels[0]?.id || '');
  
  useEffect(() => {
     if (filteredModels.length > 0 && !filteredModels.some(m => m.id === selectedModel)) {
        setSelectedModel(filteredModels[0].id);
     }
  }, [activeProvider, filteredModels, selectedModel]);

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
          const maxFiles = mode === 'merge' ? 2 : 1;
          Array.from(files).slice(0, maxFiles - inputImages.length).forEach((file: File) => {
              const reader = new FileReader();
              reader.onload = (event) => { if (event.target?.result) setInputImages(prev => [...prev, event.target!.result as string]); };
              reader.readAsDataURL(file);
          });
      }
  };

  const handleGenerate = async (isRegen = false) => {
    if (!prompt.trim() && mode === 'create') return;
    setIsGenerating(true);
    if (!isRegen) setResultImage(null);
    try {
      let finalPrompt = prompt;
      const currentStyle = ART_STYLES.find(s => s.id === selectedStyle);
      const currentNegative = activeNegatives.map(id => NEGATIVE_PRESETS.find(n => n.id === id)?.prompt).join(", ");
      
      if (mode === 'edit') finalPrompt = `[EDIT] ${editInstruction}. Context: ${prompt}`;
      else if (mode === 'merge') finalPrompt = `[MERGE] ${prompt || 'Combine characters'}`;
      
      const img = await generateImage(finalPrompt, "", inputImages, undefined, selectedModel, selectedRatio, currentStyle?.prompt || "", currentNegative);
      if (img) setResultImage(img);
      else throw new Error("Synthesis failed.");
    } catch (err: any) {
      if (onError) onError(err.message);
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden bg-[#0b0e14]">
      <style>{`
        @keyframes orbit { from { transform: rotate(0deg) translateX(50px) rotate(0deg); } to { transform: rotate(360deg) translateX(50px) rotate(-360deg); } }
        @keyframes rotate-runes { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-ring { 0% { transform: scale(0.9); opacity: 0.1; } 50% { transform: scale(1.1); opacity: 0.3; } 100% { transform: scale(0.9); opacity: 0.1; } }
        .animate-orbit { animation: orbit 6s linear infinite; }
        .animate-rotate-runes { animation: rotate-runes 40s linear infinite; }
        .animate-pulse-ring { animation: pulse-ring 4s ease-in-out infinite; }
        .synthesis-orb { box-shadow: 0 0 60px rgba(211, 188, 142, 0.4), inset 0 0 30px rgba(211, 188, 142, 0.2); }
        .celestial-loader {
            background: radial-gradient(circle, rgba(211, 188, 142, 0.1) 0%, transparent 70%);
        }
      `}</style>

      {lightboxImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
           <img src={lightboxImage} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" alt="Full view" />
        </div>
      )}

      {/* LEFT PANEL */}
      <aside className="w-full lg:w-[400px] p-6 sm:p-8 bg-[#13182b]/90 border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto custom-scrollbar shrink-0 z-20">
        <header className="mb-8">
            <h1 className="text-xl sm:text-2xl font-black genshin-gold mb-1 font-serif tracking-widest flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" /> Vision Alchemy
            </h1>
            <p className="text-[8px] text-gray-500 uppercase tracking-[0.3em] opacity-60 font-black">Celestial Synthesis Node</p>
        </header>

        <div className="space-y-6">
            <section>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">Neural Source</label>
                <div className="grid grid-cols-2 gap-2">
                    {['Google', 'Pollinations', 'openai', 'OpenRouter'].map(p => (
                        <button key={p} onClick={() => setActiveProvider(p as any)} className={`px-3 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${activeProvider.toLowerCase() === p.toLowerCase() ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-black/20 border-white/5 text-gray-600 hover:text-gray-400'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80 mb-3 block">Synthesis Core (Models)</label>
                <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                    {filteredModels.map(model => (
                        <button key={model.id} onClick={() => setSelectedModel(model.id)} className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group ${selectedModel === model.id ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-black/20 border-white/5 text-gray-500 hover:bg-white/5'}`}>
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-tighter truncate">{model.label}</div>
                                <div className="text-[8px] opacity-60 font-mono mt-0.5 truncate">{model.desc}</div>
                            </div>
                            {selectedModel === model.id && <Check className="w-3 h-3 shrink-0" />}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80 mb-3 block">Frame Aspect</label>
                <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map(ratio => (
                        <button key={ratio.id} onClick={() => setSelectedRatio(ratio.id)} className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${selectedRatio === ratio.id ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black/40 border-white/5 text-gray-500'}`}>
                            <div className="border-2 rounded" style={{ width: '12px', height: ratio.id === '1:1' ? '12px' : ratio.id === '16:9' ? '8px' : '16px' }}></div>
                            <span className="text-[9px] font-black">{ratio.id}</span>
                        </button>
                    ))}
                </div>
            </section>

            <div className="flex bg-black/60 rounded-2xl p-1 border border-white/10">
               {['create', 'edit', 'merge'].map(m => (
                   <button key={m} onClick={() => { setMode(m as any); setInputImages([]); }} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${mode === m ? 'bg-[#d3bc8e] text-black shadow-xl' : 'text-gray-500'}`}>{m}</button>
               ))}
            </div>

            <section className="space-y-4">
                <div className="relative group">
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-[11px] focus:border-amber-500 outline-none min-h-[100px] resize-none text-white transition-all select-text placeholder:text-gray-800" placeholder="Describe the vision..." />
                    <div className="absolute bottom-3 right-3 opacity-20"><Fingerprint className="w-4 h-4 text-amber-500" /></div>
                </div>
            </section>

            <button onClick={() => handleGenerate()} disabled={isGenerating || (!prompt.trim() && mode === 'create')} className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-black transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] genshin-button disabled:opacity-50">
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                <span className="uppercase tracking-[0.3em] text-[10px]">{isGenerating ? 'Resonating...' : 'Manifest Vision'}</span>
            </button>
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <main className="flex-1 flex flex-col items-center justify-center relative bg-[#0b0e14]">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(211,188,142,0.03)_0%,_transparent_70%)] pointer-events-none"></div>
         {isGenerating ? (
            <div className="flex flex-col items-center gap-10 animate-in fade-in duration-700 w-full h-full relative overflow-hidden">
                <div className="absolute inset-0 celestial-loader animate-pulse-ring opacity-20 pointer-events-none"></div>
                
                {/* Advanced Luxury Loader */}
                <div className="relative w-64 h-64 sm:w-96 sm:h-96 flex items-center justify-center">
                    {/* Outer Rune Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/20 animate-rotate-runes">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="absolute text-[10px] text-amber-500/40 font-serif" style={{ top: '50%', left: '50%', transform: `rotate(${i * 30}deg) translate(0, -170px) rotate(-${i * 30}deg)` }}>
                                ⌘
                            </div>
                        ))}
                    </div>
                    
                    {/* Intermediate Orbit Ring */}
                    <div className="absolute inset-8 rounded-full border border-amber-500/10 animate-[spin_20s_linear_infinite_reverse]"></div>
                    
                    {/* Synthesis Core */}
                    <div className="absolute inset-24 sm:inset-32 rounded-full synthesis-orb bg-amber-500/5 backdrop-blur-3xl border border-amber-500/30 flex flex-col items-center justify-center animate-pulse z-10">
                         <div className="text-xs font-black text-amber-500/40 uppercase tracking-[0.2em] mb-1">Stability</div>
                         <span className="text-4xl sm:text-7xl font-black genshin-gold font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(211,188,142,0.5)]">{simulatedProgress}%</span>
                         <span className="text-[9px] sm:text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] mt-3">Synthesizing</span>
                    </div>

                    {/* Orbiting Particles */}
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="absolute w-1.5 h-1.5 bg-amber-500 rounded-full animate-orbit shadow-[0_0_10px_#f59e0b]" style={{ animationDuration: `${3 + i}s`, animationDelay: `${i * 0.7}s` }}></div>
                    ))}
                    
                    {/* Glowing Flare */}
                    <div className="absolute w-1 h-full bg-gradient-to-t from-transparent via-amber-500/20 to-transparent animate-pulse blur-xl"></div>
                </div>

                <div className="text-center z-20 space-y-3">
                    <h2 className="text-xl sm:text-3xl font-bold genshin-gold uppercase tracking-[0.4em] font-serif drop-shadow-lg">{statusText}</h2>
                    <div className="flex items-center justify-center gap-4 text-[9px] sm:text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">
                        <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3" /> Core: {IMAGE_GEN_MODELS.find(m => m.id === selectedModel)?.label}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/30"></span>
                        <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Node: {activeProvider}</span>
                    </div>
                </div>
            </div>
         ) : resultImage ? (
           <div className="w-full max-w-3xl animate-in zoom-in-95 duration-700 flex flex-col items-center p-6">
             <div className="relative rounded-[2.5rem] overflow-hidden border-2 border-amber-500/30 bg-black/60 p-2 cursor-zoom-in group" onClick={() => setLightboxImage(resultImage)}>
               <img src={resultImage} className="w-full h-auto max-h-[70vh] object-contain rounded-[2rem]" alt="result" />
               <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-500/40 text-[9px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3 h-3 animate-pulse" /> Synthesis Success
               </div>
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                 <button onClick={(e) => { e.stopPropagation(); const link = document.createElement('a'); link.href = resultImage!; link.download = `akasha_vision_${Date.now()}.png`; link.click();}} className="p-4 bg-amber-500 text-black rounded-full hover:scale-110 shadow-2xl transition-transform"><Download className="w-6 h-6" /></button>
                 <button onClick={(e) => { e.stopPropagation(); setResultImage(null); }} className="p-4 bg-white/10 text-white rounded-full border border-white/20"><RefreshCcw className="w-6 h-6" /></button>
               </div>
             </div>
             <div className="mt-8 flex gap-4">
                <div className="flex items-center gap-3 bg-[#13182b] px-6 py-3 rounded-2xl border border-amber-500/10">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Fragment Verified</span>
                </div>
             </div>
           </div>
         ) : (
           <div className="text-center opacity-30 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-8 animate-[spin_60s_linear_infinite]">
                  <ImageIcon className="w-12 h-12 text-gray-700" />
              </div>
              <h2 className="text-xl font-black genshin-gold uppercase tracking-[0.3em]">Alchemy Portal</h2>
           </div>
         )}
      </main>
    </div>
  );
};

export default VisionGen;
