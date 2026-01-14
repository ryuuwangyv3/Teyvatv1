
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  ImageIcon, Wand2, Download, RefreshCcw, Sparkles, Edit, 
  Check, Database, Loader2, Cpu, Plus, Palette, 
  Layers2, Merge, Maximize2, X, Zap, Square, Info, ShieldCheck,
  Compass, FlaskConical, Settings2, Trash2, Layout, ScanEye, GitCompare, Binary
} from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { IMAGE_GEN_MODELS, ART_STYLES, ASPECT_RATIOS } from '../data';

interface VisionGenProps {
    onError?: (msg: string) => void;
}

type TransmutationMode = 'manifest' | 'refine' | 'fusion';

const MANIFESTATION_STEPS = [
  "Harmonizing Ley Lines...",
  "Extracting Subject Essences...",
  "Encoding Neural Fragments...",
  "Anchoring Visual Geometry...",
  "Stabilizing Transmutation..."
];

const VisionGen: React.FC<VisionGenProps> = ({ onError }) => {
  const [activeProvider, setActiveProvider] = useState<'Google' | 'Pollinations' | 'openai' | 'OpenRouter'>('Google');
  const [mode, setMode] = useState<TransmutationMode>('manifest');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedStyle, setSelectedStyle] = useState('none');
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [essence1, setEssence1] = useState<string | null>(null);
  const [essence2, setEssence2] = useState<string | null>(null);
  const fileInput1 = useRef<HTMLInputElement>(null);
  const fileInput2 = useRef<HTMLInputElement>(null);

  const models = useMemo(() => 
    IMAGE_GEN_MODELS.filter(m => m.provider.toLowerCase() === activeProvider.toLowerCase()), 
    [activeProvider]
  );

  useEffect(() => {
    if (models.length > 0 && !models.some(m => m.id === selectedModel)) {
      setSelectedModel(models[0].id);
    }
  }, [activeProvider, models, selectedModel]);

  const timer = useRef<any>(null);
  useEffect(() => {
    if (isGenerating) {
      setElapsedTime(0);
      timer.current = setInterval(() => setElapsedTime(p => p + 1), 1000);
    } else if (timer.current) {
      clearInterval(timer.current);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [isGenerating]);

  const progress = useMemo(() => Math.min(99, Math.floor((elapsedTime / 18) * 100)), [elapsedTime]);
  const status = useMemo(() => MANIFESTATION_STEPS[Math.min(Math.floor(elapsedTime / 4), MANIFESTATION_STEPS.length - 1)], [elapsedTime]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          if (slot === 1) setEssence1(ev.target.result as string);
          else setEssence2(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearAll = () => {
    setEssence1(null);
    setEssence2(null);
    setResultImage(null);
    setPrompt('');
  };

  const handleManifest = async () => {
    if (!prompt.trim() && !essence1) return;
    setIsGenerating(true);
    setResultImage(null);
    
    try {
      const currentStyle = ART_STYLES.find(s => s.id === selectedStyle);
      const inputs = [];
      if (mode === 'refine' && essence1) inputs.push(essence1);
      if (mode === 'fusion') {
          if (essence1) inputs.push(essence1);
          if (essence2) inputs.push(essence2);
      }
      
      const imageUrl = await generateImage(
        prompt,
        "",
        inputs,
        undefined,
        selectedModel,
        selectedRatio,
        currentStyle?.prompt || ""
      );
      
      if (imageUrl) {
          const img = new Image();
          img.src = imageUrl;
          img.onload = () => {
              setResultImage(imageUrl);
              setIsGenerating(false);
          };
          img.onerror = () => {
              setIsGenerating(false);
              if (onError) onError("Transmutation unstable: The visual fragment was rejected by the gateway or is malformed.");
          };
      } else {
          setIsGenerating(false);
          if (onError) onError("Resonance failure: Could not stabilize visual anchor. No image URL returned.");
      }
    } catch (err: any) {
      setIsGenerating(false);
      if (onError) onError(err.message || "Celestial interference detected during manifestation.");
    }
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-[#0b0e14] relative overflow-hidden select-none">
      
      {/* 1. LEFT SIDE: COMPACT ALCHEMY CONTROL PANEL */}
      <aside className="w-full lg:w-[420px] h-[45%] lg:h-full flex flex-col bg-[#0d111c]/98 border-b lg:border-b-0 lg:border-r border-[#d3bc8e]/20 z-40 relative backdrop-blur-3xl shrink-0 shadow-[15px_0_40px_rgba(0,0,0,0.5)]">
        
        <div className="p-4 border-b border-[#d3bc8e]/10 bg-black/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/30 shadow-[0_0_10px_rgba(211,188,142,0.1)]">
                <FlaskConical className="w-4 h-4 text-[#d3bc8e]" />
             </div>
             <div>
                <h1 className="text-xs font-black text-[#d3bc8e] tracking-widest font-serif uppercase leading-none">Alchemist Node</h1>
                <p className="text-[6px] text-gray-500 uppercase tracking-[0.3em] font-black mt-1">Refinement Lab</p>
             </div>
          </div>
          <button onClick={handleClearAll} className="p-2 text-gray-600 hover:text-red-400 transition-all rounded-lg hover:bg-white/5" title="Purge Chamber">
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 pb-10">
          
          {/* STEP 1: TRANSMUTATION MODES */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Zap className="w-3 h-3 text-[#d3bc8e]/60" />
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">I. Transmutation Mode</label>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                {[
                  { id: 'manifest', label: 'Manifest', icon: Sparkles, desc: 'T2I' },
                  { id: 'refine', label: 'Refine', icon: ScanEye, desc: 'Edit' },
                  { id: 'fusion', label: 'Fusion', icon: GitCompare, desc: 'Merge' }
                ].map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => { setMode(m.id as any); if(m.id === 'manifest') { setEssence1(null); setEssence2(null); } }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all border duration-300 ${mode === m.id ? 'bg-[#d3bc8e] text-black border-[#d3bc8e] shadow-lg' : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5'}`}
                  >
                    <m.icon className={`w-3.5 h-3.5 mb-1 ${mode === m.id ? 'animate-pulse' : ''}`} />
                    <span className="text-[8px] font-black uppercase tracking-tight">{m.label}</span>
                    <span className={`text-[5px] font-bold uppercase opacity-60 ${mode === m.id ? 'text-black' : 'text-gray-600'}`}>{m.desc}</span>
                  </button>
                ))}
            </div>
          </section>

          {/* STEP 2: PRIMARY ACTION AREA */}
          <section className="space-y-3 pt-2 border-t border-[#d3bc8e]/10">
            <div className="flex items-center justify-between px-1">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 flex items-center gap-2">
                <Compass className="w-3.5 h-3.5" /> II. Divine Directive
              </label>
              <span className="text-[6px] text-[#d3bc8e]/60 uppercase font-black">Sync Ready</span>
            </div>
            
            <textarea 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              className="w-full bg-black/60 border border-[#d3bc8e]/20 rounded-2xl p-4 text-[11px] focus:border-[#d3bc8e] outline-none min-h-[100px] max-h-[140px] resize-none text-white select-text placeholder:text-gray-700 leading-relaxed transition-all shadow-inner custom-scrollbar" 
              placeholder={
                mode === 'manifest' ? "Describe the vision to manifest..." :
                mode === 'refine' ? "Specify object to transmute..." :
                "Combine subjects (e.g. selfie in Liyue)..."
              } 
            />

            <button 
                onClick={handleManifest} 
                disabled={isGenerating || (!prompt.trim() && !essence1)} 
                className="w-full py-4 rounded-xl flex items-center justify-center gap-3 text-black font-black transition-all genshin-button disabled:opacity-50 disabled:grayscale active:scale-95 group shadow-xl border border-white/10"
            >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                <span className="uppercase tracking-[0.2em] text-[10px]">
                    {isGenerating ? 'Resonating...' : mode === 'manifest' ? 'Manifest Vision' : 'Transmute Essence'}
                </span>
            </button>
          </section>

          {/* STEP 3: ARTIFACT ESSENCE SLOTS */}
          {(mode === 'refine' || mode === 'fusion') && (
            <section className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Layers2 className="w-3 h-3 text-[#d3bc8e]/60" />
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                    III. {mode === 'refine' ? 'Base Artifact' : 'Source Essences'}
                  </label>
                </div>
              </div>
              <div className={`grid gap-3 ${mode === 'fusion' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {[1, 2].map(slot => {
                  if (mode === 'refine' && slot === 2) return null;
                  const currentEssence = slot === 1 ? essence1 : essence2;
                  return (
                    <div 
                      key={slot}
                      onClick={() => slot === 1 ? fileInput1.current?.click() : fileInput2.current?.click()}
                      className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 group cursor-pointer ${ currentEssence ? 'border-[#d3bc8e] bg-[#d3bc8e]/5' : 'border-white/10 hover:border-[#d3bc8e]/30 bg-black/40' }`}
                    >
                      {currentEssence ? (
                        <>
                            <img src={currentEssence} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="input" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                <Edit className="w-5 h-5 text-white" />
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); slot === 1 ? setEssence1(null) : setEssence2(null); }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-red-500 transition-all z-10 border border-white/10">
                                <X className="w-3 h-3 text-white" />
                            </button>
                            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-[#d3bc8e] rounded text-black text-[6px] font-black uppercase tracking-widest">
                               Slot {slot}
                            </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-2 mx-auto group-hover:bg-[#d3bc8e]/20 transition-all duration-300">
                            {slot === 1 ? <Plus className="w-5 h-5 text-gray-600 group-hover:text-[#d3bc8e]" /> : <Merge className="w-5 h-5 text-gray-600 group-hover:text-[#d3bc8e]" />}
                          </div>
                          <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest block">{slot === 1 ? 'Source' : 'Fusion'}</span>
                        </div>
                      )}
                      <input type="file" ref={slot === 1 ? fileInput1 : fileInput2} className="hidden" onChange={(e) => handleUpload(e, slot as 1 | 2)} accept="image/*" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* STEP 4: CONFIGURATION */}
          <section className="space-y-4 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 px-1">
              <Database className="w-3 h-3 text-[#d3bc8e]/60" />
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">IV. Calibration</label>
            </div>
            
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              {['Google', 'Pollinations', 'openai', 'OpenRouter'].map(p => (
                <button key={p} onClick={() => setActiveProvider(p as any)} className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${activeProvider.toLowerCase() === p.toLowerCase() ? 'bg-[#d3bc8e] text-black shadow-md' : 'text-gray-500 hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
              {models.map(m => (
                <button key={m.id} onClick={() => setSelectedModel(m.id)} className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group ${selectedModel === m.id ? 'bg-[#d3bc8e]/10 border-[#d3bc8e] text-[#d3bc8e]' : 'bg-black/20 border-white/5 text-gray-600 hover:border-white/10'}`}>
                  <div className="min-w-0 pr-4">
                    <div className="text-[9px] font-black uppercase tracking-widest truncate">{m.label}</div>
                  </div>
                  {selectedModel === m.id ? <Check className="w-3 h-3" /> : <Binary className="w-2.5 h-2.5 opacity-0 group-hover:opacity-20" />}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[8px] font-black uppercase tracking-widest text-gray-600 block ml-1">Ratio</label>
                 <div className="grid grid-cols-1 gap-1">
                    {ASPECT_RATIOS.map(r => (
                        <button key={r.id} onClick={() => setSelectedRatio(r.id)} className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold transition-all flex items-center gap-2 ${selectedRatio === r.id ? 'border-[#d3bc8e] bg-[#d3bc8e]/10 text-[#d3bc8e]' : 'bg-black/20 border-white/5 text-gray-600'}`}>
                           <Square className={`w-2.5 h-2.5 ${r.id === '16:9' ? 'scale-x-150' : r.id === '9:16' ? 'scale-y-150' : ''}`} />
                           {r.id}
                        </button>
                    ))}
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-[8px] font-black uppercase tracking-widest text-gray-600 block ml-1">Style</label>
                 <div className="grid grid-cols-1 gap-1">
                    {ART_STYLES.map(s => (
                        <button key={s.id} onClick={() => setSelectedStyle(s.id)} className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold transition-all text-left truncate ${selectedStyle === s.id ? 'border-[#d3bc8e] bg-[#d3bc8e]/10 text-[#d3bc8e]' : 'bg-black/20 border-white/5 text-gray-600'}`}>
                           {s.label}
                        </button>
                    ))}
                 </div>
               </div>
            </div>
          </section>
        </div>

        <div className="p-3 bg-black/40 border-t border-[#d3bc8e]/10 text-center">
            <span className="text-[7px] font-bold text-gray-600 uppercase tracking-[0.4em]">Neural Forge • Akasha V8.2</span>
        </div>
      </aside>

      {/* 2. RIGHT SIDE: THE COMPACT PORTAL */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-6 lg:p-10 overflow-hidden bg-[#0b0e14] z-10 min-h-0">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(211,188,142,0.1)_0%,_transparent_70%)]"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        </div>

        <div className="w-full max-w-4xl h-full flex flex-col items-center justify-center relative">
            <div className="relative w-full aspect-square lg:aspect-auto lg:h-[75%] flex items-center justify-center rounded-[2.5rem] lg:rounded-[3.5rem] overflow-hidden border border-[#d3bc8e]/15 bg-black/70 shadow-[0_40px_100px_rgba(0,0,0,0.8)] transition-all group/portal backdrop-blur-sm">
                
                {/* Decorative Corners */}
                <div className="absolute top-8 left-8 w-10 h-10 border-t border-l border-[#d3bc8e]/30 rounded-tl-[1.5rem] z-20 pointer-events-none"></div>
                <div className="absolute top-8 right-8 w-10 h-10 border-t border-r border-[#d3bc8e]/30 rounded-tr-[1.5rem] z-20 pointer-events-none"></div>
                <div className="absolute bottom-8 left-8 w-10 h-10 border-b border-l border-[#d3bc8e]/30 rounded-bl-[1.5rem] z-20 pointer-events-none"></div>
                <div className="absolute bottom-8 right-8 w-10 h-10 border-b border-r border-[#d3bc8e]/30 rounded-br-[1.5rem] z-20 pointer-events-none"></div>

                {isGenerating && (
                    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#0b0e14]/90 backdrop-blur-3xl animate-in fade-in duration-500">
                        <div className="relative w-36 h-36 sm:w-48 sm:h-48 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#d3bc8e]/20 animate-[spin_20s_linear_infinite]"></div>
                            <div className="absolute inset-6 rounded-full border border-[#d3bc8e]/10 animate-[spin_10s_linear_infinite_reverse]"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-4xl font-black text-[#d3bc8e] font-serif drop-shadow-[0_0_15px_rgba(211,188,142,0.4)]">{progress}%</span>
                                <span className="text-[7px] font-bold text-gray-600 uppercase tracking-[0.3em] mt-4 px-6 text-center leading-loose max-w-[160px]">{status}</span>
                            </div>
                        </div>
                    </div>
                )}

                {resultImage && !isGenerating ? (
                    <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-700 relative">
                        <div className="relative w-full h-full p-6 lg:p-10 cursor-zoom-in group/img flex items-center justify-center" onClick={() => setLightboxImage(resultImage)}>
                            <img src={resultImage} className="max-w-full max-h-full object-contain rounded-[1.5rem] shadow-2xl transition-all duration-700 group-hover/img:scale-[1.01]" alt="Result" />
                            
                            {/* Compact Floating Toolbar */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-3xl border border-[#d3bc8e]/30 px-8 py-3 rounded-full flex items-center gap-8 opacity-0 group-hover/portal:opacity-100 transition-all duration-500 translate-y-4 group-hover/portal:translate-y-0 shadow-2xl z-40">
                                <button onClick={(e) => { e.stopPropagation(); const l = document.createElement('a'); l.href = resultImage; l.download = `artifact_${Date.now()}.png`; l.click(); }} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-[#d3bc8e] transition-all group/btn">
                                    <Download className="w-5 h-5" />
                                    <span className="text-[6px] font-black uppercase tracking-widest">Extract</span>
                                </button>
                                <div className="w-px h-8 bg-[#d3bc8e]/20"></div>
                                <button onClick={(e) => { e.stopPropagation(); handleManifest(); }} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-all group/btn">
                                    <RefreshCcw className="w-5 h-5" />
                                    <span className="text-[6px] font-black uppercase tracking-widest">Resonate</span>
                                </button>
                                <div className="w-px h-8 bg-[#d3bc8e]/20"></div>
                                <button onClick={(e) => { e.stopPropagation(); setLightboxImage(resultImage); }} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-[#d3bc8e] transition-all group/btn">
                                    <Maximize2 className="w-5 h-5" />
                                    <span className="text-[6px] font-black uppercase tracking-widest">Expand</span>
                                </button>
                            </div>
                        </div>
                        <div className="absolute top-10 flex items-center gap-2.5 bg-[#d3bc8e] px-6 py-2 rounded-full shadow-xl animate-in slide-in-from-top-6 z-20 border border-white/20">
                            <ShieldCheck className="w-4 h-4 text-black" />
                            <span className="text-[9px] font-black text-black uppercase tracking-[0.2em]">Success</span>
                        </div>
                    </div>
                ) : !isGenerating ? (
                    <div className="flex flex-col items-center justify-center opacity-20 text-center px-10 group/idle transition-all hover:opacity-40 duration-700">
                        <div className="relative w-20 h-20 mb-8">
                            <ImageIcon className="w-full h-full text-gray-600 group-hover/idle:text-[#d3bc8e] transition-all duration-1000" />
                            <Sparkles className="absolute -top-3 -right-3 w-8 h-8 text-[#d3bc8e] animate-pulse" />
                        </div>
                        <h2 className="text-xl font-bold text-[#d3bc8e] uppercase tracking-[0.5em] font-serif mb-3">Exhibition Portal</h2>
                        <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-black max-w-xs leading-loose">Awaiting Alchemical Signal.</p>
                    </div>
                ) : null}
            </div>
            
            {/* Minimal Footnote */}
            <div className="mt-8 flex items-center gap-10 opacity-20 text-gray-600 uppercase tracking-[0.4em] text-[8px] font-black">
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-current rounded-full"></div> Fidelity Optimized</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-current rounded-full"></div> Multi-Sync</span>
            </div>
        </div>
      </main>

      {/* EXPANDED VIEW LIGHTBOX */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[500] bg-black/99 backdrop-blur-[40px] flex flex-col items-center justify-center p-6 animate-in fade-in duration-500" onClick={() => setLightboxImage(null)}>
           <div className="relative max-w-full flex flex-col items-center animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
              <img src={lightboxImage} className="max-w-full max-h-[80vh] object-contain rounded-[2rem] border border-[#d3bc8e]/40 shadow-[0_0_100px_rgba(211,188,142,0.2)]" alt="Expanded Artifact" />
              <div className="mt-8 flex items-center gap-5">
                <button onClick={() => {const a = document.createElement('a'); a.href = lightboxImage; a.download = `artifact_${Date.now()}.png`; a.click();}} className="genshin-button px-10 py-4 rounded-xl flex items-center justify-center gap-3 text-black font-black uppercase text-[10px] tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl">
                    <Download className="w-5 h-5" />
                    <span>Download</span>
                </button>
                <button onClick={() => setLightboxImage(null)} className="flex items-center gap-3 bg-white/5 hover:bg-red-500/20 px-8 py-4 rounded-xl text-gray-500 hover:text-red-400 border border-white/10 font-black uppercase text-[10px] tracking-[0.3em] transition-all group active:scale-95">
                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform" /> 
                    <span>Close</span>
                </button>
              </div>
           </div>
        </div>
      )}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]"></div>
    </div>
  );
};

export default VisionGen;
