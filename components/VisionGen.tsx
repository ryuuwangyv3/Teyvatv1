
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
      {lightboxImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
           <img src={lightboxImage} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" alt="Full view" />
        </div>
      )}

      {/* LEFT PANEL - Sidebar Controls with individual scroll */}
      <aside className="w-full lg:w-[400px] h-1/2 lg:h-full p-6 sm:p-8 bg-[#13182b]/90 border-b lg:border-b-0 lg:border-r border-white/10 custom-scrollbar shrink-0 z-20">
        <header className="mb-8">
            <h1 className="text-xl sm:text-2xl font-black genshin-gold mb-1 font-serif tracking-widest flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" /> Vision Alchemy
            </h1>
            <p className="text-[8px] text-gray-500 uppercase tracking-[0.3em] opacity-60 font-black">Celestial Synthesis Node</p>
        </header>

        <div className="space-y-6 pb-12">
            <section>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">Neural Source</label>
                <div className="grid grid-cols-2 gap-2">
                    {['Google', 'Pollinations', 'openai', 'OpenRouter'].map(p => (
                        <button key={p} onClick={() => setActiveProvider(p as any)} className={`px-3 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${activeProvider.toLowerCase() === p.toLowerCase() ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-black/20 border-white/5 text-gray-600 hover:text-gray-400'}`}>{p}</button>
                    ))}
                </div>
            </section>

            <section>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80 mb-3 block">Synthesis Core</label>
                <div className="space-y-2">
                    {filteredModels.map(model => (
                        <button key={model.id} onClick={() => setSelectedModel(model.id)} className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group ${selectedModel === model.id ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-black/20 border-white/5 text-gray-500'}`}>
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase truncate">{model.label}</div>
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
                            <span className="text-[9px] font-black">{ratio.id}</span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-[11px] focus:border-amber-500 outline-none min-h-[100px] resize-none text-white transition-all select-text" placeholder="Describe the vision..." />
            </section>

            <button onClick={() => handleGenerate()} disabled={isGenerating || (!prompt.trim() && mode === 'create')} className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-black transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] genshin-button disabled:opacity-50">
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                <span className="uppercase tracking-[0.3em] text-[10px]">{isGenerating ? 'Resonating...' : 'Manifest Vision'}</span>
            </button>
        </div>
      </aside>

      {/* RIGHT PANEL - Display results with individual scroll */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center relative bg-[#0b0e14] custom-scrollbar p-6">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(211,188,142,0.03)_0%,_transparent_70%)] pointer-events-none"></div>
         
         <div className="w-full max-w-2xl py-10 flex flex-col items-center">
            {isGenerating ? (
                <div className="flex flex-col items-center gap-6 animate-in fade-in">
                    <div className="relative w-48 h-48 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/20 animate-spin"></div>
                        <span className="text-4xl font-black genshin-gold font-mono">{simulatedProgress}%</span>
                    </div>
                    <h2 className="text-xl font-bold genshin-gold uppercase tracking-[0.4em] font-serif text-center">{statusText}</h2>
                </div>
            ) : resultImage ? (
               <div className="w-full animate-in zoom-in-95 duration-700 flex flex-col items-center">
                 <div className="relative rounded-[2.5rem] overflow-hidden border-2 border-amber-500/30 bg-black/60 p-2 cursor-zoom-in group" onClick={() => setLightboxImage(resultImage)}>
                   <img src={resultImage} className="w-full h-auto max-h-[70vh] object-contain rounded-[2rem]" alt="result" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                     <button onClick={(e) => { e.stopPropagation(); const link = document.createElement('a'); link.href = resultImage!; link.download = `akasha_vision_${Date.now()}.png`; link.click();}} className="p-4 bg-amber-500 text-black rounded-full hover:scale-110 shadow-2xl transition-transform"><Download className="w-6 h-6" /></button>
                     <button onClick={(e) => { e.stopPropagation(); setResultImage(null); }} className="p-4 bg-white/10 text-white rounded-full border border-white/20"><RefreshCcw className="w-6 h-6" /></button>
                   </div>
                 </div>
               </div>
            ) : (
               <div className="text-center opacity-30 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-6">
                      <ImageIcon className="w-10 h-10 text-gray-700" />
                  </div>
                  <h2 className="text-lg font-black genshin-gold uppercase tracking-[0.3em]">Alchemy Portal</h2>
                  <p className="text-[9px] mt-2 text-gray-600 uppercase tracking-widest">Awaiting Directives</p>
               </div>
            )}
         </div>
      </main>
    </div>
  );
};

export default VisionGen;
