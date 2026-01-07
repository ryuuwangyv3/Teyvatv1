
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ImageIcon, Wand2, Download, RefreshCcw, Layers, Upload, Sparkles, Edit, Box, Check, CloudLightning, Zap, Database, Clock, AlertTriangle, Activity, Loader2, ShieldCheck, Cpu, Trash2, Plus, Users, Layout, Lightbulb, ChevronRight, X, Maximize2, Monitor, Smartphone, Square, EyeOff, ShieldAlert } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { IMAGE_GEN_MODELS, ART_STYLES, ASPECT_RATIOS } from '../data';

interface VisionGenProps {
    onError?: (msg: string) => void;
}

const LOADING_MESSAGES = [
    "Initiating Neural Resonance...",
    "Accessing Irminsul Data Repository...",
    "Calibrating Visual Transmuter...",
    "Weaving Elemental Particles...",
    "Finalizing Aesthetic Nuances..."
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
          // Fix: Explicitly type 'file' as File to avoid 'unknown' type error in TS when passing it to readAsDataURL.
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
      const img = await generateImage(finalPrompt, "", inputImages.length > 0 ? inputImages : (isRegen && resultImage ? [resultImage] : undefined), undefined, selectedModel, selectedRatio, currentStyle?.prompt || "", currentNegative);
      if (img) setResultImage(img);
      else throw new Error("Synthesis failed: Neural feedback empty.");
    } catch (err: any) {
      setGenerationError(err.message);
      if (onError) onError(err.message);
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden bg-[#0b0e14]">
      {lightboxImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
           <div className="max-w-5xl w-full flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxImage} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10" alt="Full view" />
              <div className="flex gap-4">
                <button onClick={() => { const a = document.createElement('a'); a.href = lightboxImage; a.download = `vision_${Date.now()}.png`; a.click(); }} className="px-6 py-3 bg-[#d3bc8e] text-black rounded-full font-black uppercase text-xs tracking-widest transition-all">Download</button>
                <button onClick={() => setLightboxImage(null)} className="px-6 py-3 bg-white/10 text-white rounded-full font-black uppercase text-xs tracking-widest border border-white/20">Close</button>
              </div>
           </div>
        </div>
      )}

      {/* LEFT PANEL: CONTROLS */}
      <aside className="w-full lg:w-[400px] p-4 sm:p-6 lg:p-8 bg-[#13182b]/80 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto custom-scrollbar shrink-0 z-20">
        <header className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold genshin-gold mb-1 font-serif tracking-widest flex items-center gap-3">
                <Cpu className="w-6 h-6 lg:w-8 lg:h-8 text-amber-500" /> Vision Alchemy
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider opacity-60">Protocol: V11_MULTIMODAL</p>
        </header>

        <div className="space-y-6">
            <section>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80 mb-3 block">Ratio</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {ASPECT_RATIOS.map(ratio => (
                        <button key={ratio.id} onClick={() => setSelectedRatio(ratio.id)} className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedRatio === ratio.id ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black/40 border-white/10 text-gray-500'}`}>
                            <span className="text-[10px] font-black">{ratio.id}</span>
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">Archetype</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ART_STYLES.slice(0, 6).map(style => (
                        <button key={style.id} onClick={() => setSelectedStyle(style.id)} className={`p-2 rounded-xl border text-[9px] font-bold uppercase transition-all truncate ${selectedStyle === style.id ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black/20 border-white/5 text-gray-500'}`}>
                            {style.label}
                        </button>
                    ))}
                </div>
            </section>

            <div className="flex bg-black/60 rounded-2xl p-1 border border-white/10">
               <button onClick={() => { setMode('create'); setInputImages([]); }} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${mode === 'create' ? 'bg-[#d3bc8e] text-black shadow-lg' : 'text-gray-500'}`}>Create</button>
               <button onClick={() => { setMode('edit'); setInputImages([]); }} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${mode === 'edit' ? 'bg-[#d3bc8e] text-black shadow-lg' : 'text-gray-500'}`}>Edit</button>
               <button onClick={() => { setMode('merge'); setInputImages([]); }} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${mode === 'merge' ? 'bg-[#d3bc8e] text-black shadow-lg' : 'text-gray-500'}`}>Merge</button>
            </div>

            <section className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block">Provider</label>
                   <select value={activeProvider} onChange={(e) => setActiveProvider(e.target.value as any)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-[10px] font-bold text-amber-500 outline-none uppercase">
                       <option value="Google">Google</option>
                       <option value="Pollinations">Pollinations</option>
                       <option value="openai">OpenAI</option>
                   </select>
                </div>
                <div>
                   <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block">Model</label>
                   <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-[10px] font-bold text-amber-500 outline-none uppercase">
                       {filteredModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                   </select>
                </div>
            </section>

            {mode !== 'create' && (
                <section>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-3 block">Source Artifacts</label>
                    <div className="grid grid-cols-2 gap-3">
                        {inputImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group cursor-zoom-in" onClick={() => setLightboxImage(img)}>
                                <img src={img} className="w-full h-full object-cover" />
                                <button onClick={(e) => { e.stopPropagation(); setInputImages(prev => prev.filter((_, i) => i !== idx)); }} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg"><Trash2 className="w-3 h-3" /></button>
                            </div>
                        ))}
                        {inputImages.length < (mode === 'merge' ? 2 : 1) && (
                            <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500/40 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-amber-500 transition-all bg-black/40">
                                <Plus className="w-6 h-6" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Add Soul</span>
                            </button>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" multiple={mode === 'merge'} />
                </section>
            )}

            <section>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 block">Directives</label>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs focus:border-amber-500 outline-none min-h-[80px] resize-none text-white transition-all select-text" placeholder="Describe the vision..." />
            </section>

            <button onClick={() => handleGenerate()} disabled={isGenerating || (!prompt.trim() && mode === 'create') || (mode !== 'create' && inputImages.length === 0)} className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black transition-all shadow-xl disabled:opacity-50 ${mode === 'create' ? 'genshin-button' : 'bg-gradient-to-r from-blue-600 to-indigo-700'}`}>
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                <span className="uppercase tracking-[0.2em] text-[10px]">{isGenerating ? 'Resonating...' : 'Manifest'}</span>
            </button>
        </div>
      </aside>

      {/* RIGHT PANEL: PREVIEW */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 flex flex-col items-center justify-center relative overflow-y-auto custom-scrollbar bg-[#0b0e14]">
         {isGenerating ? (
            <div className="flex flex-col items-center gap-6 animate-in fade-in py-10">
                <div className="relative w-40 h-40 sm:w-56 sm:h-56 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/20 animate-[spin_20s_linear_infinite]"></div>
                    <div className="absolute inset-8 rounded-full bg-amber-500/5 backdrop-blur-sm border border-amber-500/10 flex items-center justify-center animate-pulse">
                         <span className="text-3xl sm:text-4xl font-black genshin-gold font-mono">{simulatedProgress}%</span>
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-lg sm:text-xl font-bold genshin-gold uppercase tracking-[0.3em] font-serif">Synthesizing</h2>
                    <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.3em] animate-pulse">{statusText}</p>
                </div>
            </div>
         ) : resultImage ? (
           <div className="w-full max-w-4xl animate-in zoom-in-95 duration-500 flex flex-col items-center pb-20 px-2">
             <div className="relative rounded-3xl overflow-hidden border-2 border-amber-500/20 shadow-2xl bg-black/40 p-2 cursor-zoom-in group" onClick={() => setLightboxImage(resultImage)}>
               <img src={resultImage} className="w-full h-auto max-h-[75vh] object-contain rounded-2xl" alt="result" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                 <button onClick={(e) => { e.stopPropagation(); const link = document.createElement('a'); link.href = resultImage!; link.download = `akasha_${Date.now()}.png`; link.click();}} className="p-4 bg-amber-500 text-black rounded-full hover:scale-110 transition-transform"><Download className="w-6 h-6" /></button>
                 <button onClick={(e) => { e.stopPropagation(); setResultImage(null); }} className="p-4 bg-white/10 text-white rounded-full hover:bg-red-500 transition-all"><RefreshCcw className="w-6 h-6" /></button>
               </div>
             </div>
             <div className="mt-8 flex flex-wrap justify-center gap-4 w-full">
                 <div className="flex items-center gap-3 bg-[#13182b]/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/5">
                     <ShieldCheck className="w-4 h-4 text-green-400" />
                     <span className="text-[10px] text-white font-bold uppercase">Stable Resonance</span>
                 </div>
                 <button onClick={() => { setInputImages([resultImage]); setMode('edit'); }} className="flex items-center gap-3 bg-[#13182b]/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/5 hover:border-amber-500/50 transition-all">
                     <Edit className="w-4 h-4 text-amber-500" />
                     <span className="text-[10px] text-white font-bold uppercase">Edit Fragment</span>
                 </button>
             </div>
           </div>
         ) : (
           <div className="text-center opacity-30 flex flex-col items-center py-20 px-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full flex items-center justify-center mb-6 relative">
                  <ImageIcon className="w-10 h-10 sm:w-16 sm:h-16 text-gray-600" />
                  <div className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full animate-[spin_30s_linear_infinite]"></div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold genshin-gold font-serif tracking-widest mb-2 uppercase">Core Standby</h2>
              <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-[0.2em] max-w-xs font-bold leading-loose">Neural transmuter is awaiting conceptual seed data to begin visual ritual.</p>
           </div>
         )}
      </main>
    </div>
  );
};

export default VisionGen;
