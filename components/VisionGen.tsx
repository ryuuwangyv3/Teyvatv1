
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ImageIcon, Wand2, Download, RefreshCcw, Layers, Upload, Sparkles, Edit, Box, Check, CloudLightning, Zap, Database, Clock, AlertTriangle, Activity, Loader2, ShieldCheck, Cpu, Trash2, Plus, Users, Layout, Lightbulb, ChevronRight, X, Maximize2 } from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { IMAGE_GEN_MODELS } from '../data';

interface VisionGenProps {
    onError?: (msg: string) => void;
}

const LOADING_MESSAGES = [
    "Initiating Neural Resonance...",
    "Accessing Irminsul Data Repository...",
    "Calibrating Visual Transmuter...",
    "Weaving Elemental Particles...",
    "Reconstituting Pixels to Reality...",
    "Finalizing Aesthetic Nuances...",
    "Coalescing Manifestation..."
];

const VisionGen: React.FC<VisionGenProps> = ({ onError }) => {
  const [activeProvider, setActiveProvider] = useState<'Google' | 'openai' | 'OpenRouter' | 'Pollinations'>('Google');
  const [mode, setMode] = useState<'create' | 'edit' | 'merge'>('create');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const filteredModels = useMemo(() => {
     return IMAGE_GEN_MODELS.filter(m => m.provider.toLowerCase() === activeProvider.toLowerCase());
  }, [activeProvider]);

  const [selectedModel, setSelectedModel] = useState<string>(filteredModels[0]?.id || '');
  
  // Update selectedModel if provider changes and current model is no longer in filtered list
  useEffect(() => {
     if (filteredModels.length > 0) {
        const currentModelExists = filteredModels.some(m => m.id === selectedModel);
        if (!currentModelExists) {
            setSelectedModel(filteredModels[0].id);
        }
     }
  }, [activeProvider, filteredModels, selectedModel]);

  const [prompt, setPrompt] = useState('');
  const [editInstruction, setEditInstruction] = useState(''); // For precise part editing
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [inputImages, setInputImages] = useState<string[]>([]); // Support multiple images
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);

  const simulatedProgress = useMemo(() => {
      const p = Math.floor((elapsedTime / 15) * 100);
      return Math.min(99, p);
  }, [elapsedTime]);

  useEffect(() => {
      if (isGenerating) {
          setElapsedTime(0);
          timerRef.current = setInterval(() => {
              setElapsedTime(prev => prev + 1);
          }, 1000);
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
          
          const fileArray = Array.from(files) as File[];
          fileArray.slice(0, remaining).forEach(file => {
              const reader = new FileReader();
              reader.onload = (event) => {
                  if (event.target?.result) {
                      setInputImages(prev => [...prev, event.target!.result as string]);
                  }
              };
              reader.readAsDataURL(file);
          });
      }
  };

  const removeImage = (index: number) => {
      setInputImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async (isRegen = false) => {
    if (!prompt.trim() && mode === 'create') return;
    if ((mode === 'edit' || mode === 'merge') && inputImages.length === 0) return;
    
    setIsGenerating(true);
    if (!isRegen) setResultImage(null);
    setGenerationError(null);
    
    try {
      let finalPrompt = prompt;
      if (mode === 'edit') {
          finalPrompt = `[MODE: PRECISE_EDIT] Task: ${editInstruction || 'Refine specific details'}. Context: ${prompt}. Maintain identity and background consistency. Enhance specified regions.`;
      } else if (mode === 'merge') {
          finalPrompt = `[MODE: OBJECT_MERGE] Integrate subjects from provided images into a single cohesive scene. ${prompt || 'Combine these characters'}. Adjust lighting, pose, and angle for realistic interaction. masterpiece art.`;
      } else if (isRegen && resultImage) {
          finalPrompt = `[MODE: REGENERATE] Vary the previous manifestation slightly while maintaining core aesthetic. ${prompt}`;
      }

      const img = await generateImage(
          finalPrompt, 
          "", 
          inputImages.length > 0 ? inputImages : (isRegen && resultImage ? [resultImage] : undefined), 
          undefined, 
          selectedModel
      );
      
      if (img) {
          setResultImage(img);
      } else {
          throw new Error("Energy feedback was empty. Synthesis failed.");
      }
    } catch (err: any) {
      const msg = err.message || "Unknown disturbance in the Ley Lines.";
      setGenerationError(msg);
      if (onError) onError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#0b0e14] overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row custom-scrollbar">
      
      {/* LIGHTBOX OVERLAY */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setLightboxImage(null)}>
           <div className="max-w-5xl w-full flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxImage} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10" alt="Full view" />
              <div className="flex gap-4 animate-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = lightboxImage;
                    a.download = `akasha_vision_${Date.now()}.png`;
                    a.click();
                  }} 
                  className="flex items-center gap-3 px-8 py-4 bg-[#d3bc8e] text-black rounded-full font-black uppercase tracking-widest shadow-[0_0_30px_rgba(211,188,142,0.4)] hover:scale-105 hover:bg-white transition-all active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Artifact</span>
                </button>
                <button 
                  onClick={() => setLightboxImage(null)} 
                  className="flex items-center gap-3 px-8 py-4 bg-white/10 text-white rounded-full font-black uppercase tracking-widest border border-white/20 backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                  <span>Dismiss</span>
                </button>
              </div>
           </div>
        </div>
      )}

      {/* LEFT PANEL: CONTROLS */}
      <aside className="w-full lg:w-[420px] p-6 lg:p-8 bg-[#13182b]/80 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto custom-scrollbar shrink-0 z-20 flex flex-col">
        <header className="mb-8">
            <h1 className="text-3xl font-bold genshin-gold mb-1 font-serif tracking-widest flex items-center gap-3">
                <Cpu className="w-8 h-8 text-amber-500 animate-pulse" />
                Vision Alchemy
            </h1>
            <p className="text-xs text-gray-500 italic tracking-wider uppercase opacity-60">Protocol: MULTIMODAL_BLENDING_V11</p>
        </header>

        <div className="space-y-6">
            {/* Provider Selector */}
            <section>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80 mb-3 block flex items-center gap-2">
                    <CloudLightning className="w-3 h-3" /> Core Engine Provider
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { id: 'Google', icon: Box },
                        { id: 'Pollinations', icon: CloudLightning },
                        { id: 'openai', icon: Zap },
                        { id: 'OpenRouter', icon: Database }
                    ].map(p => (
                        <button 
                            key={p.id}
                            onClick={() => setActiveProvider(p.id as any)} 
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                                activeProvider === p.id 
                                ? `bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(0,0,0,0.3)] scale-[1.02]` 
                                : 'bg-black/40 border-white/10 text-gray-500 hover:bg-white/5'
                            }`}
                        >
                            <p.icon className="w-4 h-4" />
                            <span className="text-[8px] font-black uppercase tracking-widest">{p.id}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Model Architecture Selector */}
            <section className="animate-in slide-in-from-left-2 duration-300">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block flex items-center gap-2">
                    <Layout className="w-3 h-3" /> Model Architecture
                </label>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {filteredModels.map(model => (
                        <button
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                                selectedModel === model.id
                                ? 'bg-[#d3bc8e]/10 border-[#d3bc8e]/50 text-[#d3bc8e]'
                                : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'
                            }`}
                        >
                            <div className="flex flex-col min-w-0">
                                <span className="text-[11px] font-black truncate uppercase tracking-tighter">{model.label}</span>
                                <span className="text-[8px] opacity-60 truncate font-medium">{model.desc}</span>
                            </div>
                            {selectedModel === model.id && <div className="w-4 h-4 rounded-full bg-[#d3bc8e] flex items-center justify-center"><Check className="w-2.5 h-2.5 text-black stroke-[4]" /></div>}
                        </button>
                    ))}
                </div>
            </section>

            {/* Mode Switcher */}
            <div className="flex bg-black/60 rounded-2xl p-1 border border-white/10 shadow-inner">
               <button onClick={() => { setMode('create'); setInputImages([]); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'create' ? 'bg-[#d3bc8e] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                 <Sparkles className="w-3 h-3" /> Create
               </button>
               <button onClick={() => { setMode('edit'); setInputImages([]); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'edit' ? 'bg-[#d3bc8e] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                 <Edit className="w-3 h-3" /> Edit Part
               </button>
               <button onClick={() => { setMode('merge'); setInputImages([]); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'merge' ? 'bg-[#d3bc8e] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                 <Users className="w-3 h-3" /> Merge
               </button>
            </div>

            {/* Image Source(s) Area */}
            {mode !== 'create' && (
                <section className="animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 block flex items-center justify-between">
                        <span className="flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Source Ritual Artifacts</span>
                        <span className="text-[8px] opacity-50">{inputImages.length}/{mode === 'merge' ? 2 : 1} Slots</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {inputImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group shadow-xl cursor-zoom-in" onClick={() => setLightboxImage(img)}>
                                <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Maximize2 className="w-5 h-5 text-white" />
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {inputImages.length < (mode === 'merge' ? 2 : 1) && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500/40 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-amber-500 group bg-black/40"
                            >
                                <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Inject Soul Data</span>
                            </button>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" multiple={mode === 'merge'} />
                </section>
            )}

            {/* Precise Instruction for Editing */}
            {mode === 'edit' && (
                 <section className="animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/80 mb-2 block flex items-center gap-2">
                        <Lightbulb className="w-3 h-3" /> Refinement Objective
                    </label>
                    <textarea 
                        value={editInstruction} 
                        onChange={(e) => setEditInstruction(e.target.value)}
                        className="w-full bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4 text-xs focus:outline-none focus:border-cyan-500/50 min-h-[80px] resize-none text-white transition-all italic font-medium"
                        placeholder="e.g. 'Change his eyes to glowing red', 'Add a white lily on the table'..."
                    />
                 </section>
            )}

            {/* Main Prompt */}
            <section>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 block flex items-center gap-2">
                    <Layout className="w-3 h-3" /> Global Scene Context
                </label>
                <textarea 
                    value={prompt} 
                    onChange={(e) => { setPrompt(e.target.value); setGenerationError(null); }} 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs focus:outline-none focus:border-amber-500 min-h-[100px] resize-none text-white transition-all select-text custom-scrollbar" 
                    placeholder={mode === 'merge' ? "Describe how these characters should interact..." : "Describe the environment, lighting, and style..."}
                />
            </section>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
                <button 
                    onClick={() => handleGenerate()} 
                    disabled={isGenerating || (!prompt.trim() && mode === 'create') || (mode !== 'create' && inputImages.length === 0)} 
                    className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-black transition-all shadow-2xl disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] ${
                        mode === 'create' ? 'genshin-button' : mode === 'edit' ? 'bg-gradient-to-r from-cyan-600 to-blue-700' : 'bg-gradient-to-r from-purple-600 to-indigo-700'
                    }`}
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    <span className="uppercase tracking-[0.2em] text-[11px]">
                        {isGenerating ? `RESONATING [${elapsedTime}s]` : mode === 'create' ? 'MANIFEST VISUAL' : mode === 'edit' ? 'RECONSTRUCT OBJECTS' : 'BLEND SOULS'}
                    </span>
                </button>

                {resultImage && !isGenerating && (
                    <button 
                        onClick={() => handleGenerate(true)} 
                        className="w-full py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-[#d3bc8e] hover:border-[#d3bc8e]/30 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <RefreshCcw className="w-3 h-3" />
                        Regenerate Variant
                    </button>
                )}
            </div>

            {generationError && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex gap-3 items-start animate-in shake duration-300">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-200 leading-relaxed font-mono">{generationError}</p>
                </div>
            )}
        </div>
      </aside>

      {/* RIGHT PANEL: PREVIEW AREA */}
      <main className="flex-1 p-4 lg:p-12 flex flex-col items-center justify-start lg:justify-center relative overflow-y-auto custom-scroll-smooth bg-[#0b0e14] min-h-[500px]">
         <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent"></div>
         </div>

         {isGenerating ? (
            <div className="w-full max-w-2xl flex flex-col items-center gap-8 z-10 animate-in fade-in duration-500 py-12">
                <div className="relative w-48 h-48 lg:w-72 lg:h-72 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/20 animate-[spin_30s_linear_infinite]"></div>
                    <div className="absolute inset-4 rounded-full border border-amber-500/10 animate-[spin_20s_linear_infinite_reverse]"></div>
                    <div className="absolute inset-8 rounded-full border-2 border-transparent border-t-amber-500/40 border-l-amber-500/40 animate-spin"></div>
                    <div className="absolute inset-16 rounded-full bg-amber-500/5 backdrop-blur-sm border border-amber-500/10 flex items-center justify-center animate-pulse">
                         <div className="flex flex-col items-center">
                             <span className="text-4xl lg:text-5xl font-black genshin-gold font-mono tracking-tighter">{simulatedProgress}%</span>
                             <span className="text-[8px] text-amber-600 font-bold uppercase tracking-[0.3em] mt-1">Syncing...</span>
                         </div>
                    </div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-500 rounded-full shadow-[0_0_15px_#f59e0b] animate-ping"></div>
                </div>

                <div className="text-center space-y-3">
                    <h2 className="text-2xl font-bold genshin-gold uppercase tracking-[0.3em] font-serif">Synthesizing Archetype</h2>
                    <div className="flex items-center justify-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.4em] animate-pulse">{statusText}</p>
                    </div>
                </div>

                <div className="w-full max-w-xs h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000 ease-out"
                        style={{ width: `${simulatedProgress}%` }}
                    ></div>
                </div>
            </div>
         ) : resultImage ? (
           <div className="w-full max-w-5xl animate-in zoom-in-95 duration-500 z-10 flex flex-col items-center pb-20 pt-10 px-4">
             <div className="relative group rounded-[3rem] overflow-hidden border-2 border-amber-500/30 shadow-[0_0_80px_rgba(0,0,0,0.4)] bg-black/40 p-3 cursor-zoom-in" onClick={() => setLightboxImage(resultImage)}>
               <img src={resultImage} className="w-full h-auto max-h-[80vh] object-contain rounded-[2.5rem]" alt="result" />
               
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 backdrop-blur-sm">
                 <button 
                    onClick={(e) => { e.stopPropagation(); const link = document.createElement('a'); link.href = resultImage!; link.download = `manifest_${Date.now()}.png`; link.click();}} 
                    className="p-6 bg-amber-500 text-black rounded-full hover:scale-110 shadow-2xl transition-transform hover:bg-white"
                 >
                    <Download className="w-8 h-8" />
                 </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); setResultImage(null); setInputImages([]); setEditInstruction(''); }} 
                    className="p-6 bg-white/10 text-white rounded-full hover:scale-110 backdrop-blur-md border border-white/20 transition-transform hover:bg-red-500"
                 >
                    <RefreshCcw className="w-8 h-8" />
                 </button>
               </div>
             </div>
             
             <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                 <div className="flex items-center gap-4 bg-[#13182b]/60 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10">
                     <div className="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center border border-green-500/30">
                         <ShieldCheck className="w-5 h-5 text-green-400" />
                     </div>
                     <div className="text-left">
                         <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Integrity</p>
                         <p className="text-xs text-white font-bold">Resonance Stable</p>
                     </div>
                 </div>

                 <button 
                    onClick={() => { setInputImages([resultImage]); setMode('edit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex items-center gap-4 bg-[#13182b]/60 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 hover:border-cyan-500/50 transition-all group"
                 >
                     <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                         <Edit className="w-5 h-5" />
                     </div>
                     <div className="text-left">
                         <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Inpaint</p>
                         <p className="text-xs text-white font-bold">Edit Details</p>
                     </div>
                 </button>

                 <div className="flex items-center gap-4 bg-[#13182b]/60 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 opacity-60">
                     <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                         <Box className="w-5 h-5 text-amber-400" />
                     </div>
                     <div className="text-left">
                         <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Artifact</p>
                         <p className="text-xs text-white font-bold">1024px Synthesis</p>
                     </div>
                 </div>
             </div>
           </div>
         ) : (
           <div className="text-center opacity-40 z-10 flex flex-col items-center my-auto px-6 py-20 lg:py-0">
              <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5 relative">
                  <ImageIcon className="w-16 h-16 text-gray-600" />
                  <div className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full animate-[spin_20s_linear_infinite]"></div>
              </div>
              <h2 className="text-3xl font-bold genshin-gold font-serif tracking-widest mb-4 uppercase">Awaiting Archetype</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] max-w-xs leading-loose font-bold">
                  Neural transmuter is on standby. Inject conceptual data or artifacts to begin the visualization ritual.
              </p>
           </div>
         )}
      </main>
    </div>
  );
};

export default VisionGen;
