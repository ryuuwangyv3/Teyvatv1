
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  ImageIcon, Wand2, Download, RefreshCcw, Sparkles, Edit, 
  Check, Database, Loader2, Cpu, Plus, Palette, 
  Layers2, Merge, Maximize2, X, Zap, Square, Info, ShieldCheck,
  Compass, FlaskConical, Settings2, Trash2, Layout
} from 'lucide-react';
import { generateImage } from '../services/geminiService';
import { IMAGE_GEN_MODELS, ART_STYLES, ASPECT_RATIOS } from '../data';

interface VisionGenProps {
    onError?: (msg: string) => void;
}

const MANIFESTATION_STEPS = [
  "Harmonizing Ley Lines...",
  "Gathering Elemental Particles...",
  "Encoding Irminsul Flow...",
  "Anchoring Visual Fragment...",
  "Stabilizing Projection..."
];

const VisionGen: React.FC<VisionGenProps> = ({ onError }) => {
  // --- CORE STATE ---
  const [activeProvider, setActiveProvider] = useState<'Google' | 'Pollinations' | 'openai'>('Google');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedStyle, setSelectedStyle] = useState('none');
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // --- ARTIFACT ESSENCES ---
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
      const inputs = [essence1, essence2].filter(Boolean) as string[];
      
      const manifest = await generateImage(
        prompt,
        "",
        inputs,
        undefined,
        selectedModel,
        selectedRatio,
        currentStyle?.prompt || ""
      );
      
      if (manifest) setResultImage(manifest);
      else throw new Error("Manifestation failed to stabilize.");
    } catch (err: any) {
      if (onError) onError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-[#0b0e14] relative overflow-hidden select-none">
      
      {/* 1. LEFT SIDE: PANEL */}
      <aside className="w-full lg:w-[420px] h-[50%] lg:h-full flex flex-col bg-[#0d111c]/98 border-b lg:border-b-0 lg:border-r border-[#d3bc8e]/20 z-40 relative backdrop-blur-3xl shrink-0">
        
        <div className="p-5 border-b border-[#d3bc8e]/10 bg-black/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/30">
                <FlaskConical className="w-4 h-4 text-[#d3bc8e]" />
             </div>
             <div>
                <h1 className="text-sm font-black text-[#d3bc8e] tracking-widest font-serif uppercase">Alchemist Node</h1>
                <p className="text-[7px] text-gray-500 uppercase tracking-[0.4em] font-black mt-0.5">Neural Transmutation</p>
             </div>
          </div>
          <button onClick={handleClearAll} className="p-2 text-gray-600 hover:text-red-400 transition-colors" title="Purge Chamber">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-7 pb-10">
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Layers2 className="w-3 h-3 text-[#d3bc8e]/60" />
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Artifact Essences</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map(slot => (
                <div 
                  key={slot}
                  onClick={() => slot === 1 ? fileInput1.current?.click() : fileInput2.current?.click()}
                  className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 group cursor-pointer ${ (slot === 1 ? essence1 : essence2) ? 'border-[#d3bc8e] bg-[#d3bc8e]/5 shadow-[0_0_15px_rgba(211,188,142,0.1)]' : 'border-white/5 hover:border-[#d3bc8e]/30 bg-black/40' }`}
                >
                  {(slot === 1 ? essence1 : essence2) ? (
                    <>
                        <img src={slot === 1 ? essence1! : essence2!} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="input" />
                        <button onClick={(e) => { e.stopPropagation(); slot === 1 ? setEssence1(null) : setEssence2(null); }} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3 text-red-400" />
                        </button>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center mb-1.5 mx-auto group-hover:bg-[#d3bc8e]/20 transition-colors">
                        {slot === 1 ? <Plus className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#d3bc8e]" /> : <Merge className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#d3bc8e]" />}
                      </div>
                      <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">{slot === 1 ? 'Primary Base' : 'Flux Modifier'}</span>
                    </div>
                  )}
                  <input type="file" ref={slot === 1 ? fileInput1 : fileInput2} className="hidden" onChange={(e) => handleUpload(e, slot as 1 | 2)} accept="image/*" />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Database className="w-3 h-3 text-[#d3bc8e]/60" />
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Celestial Wisdom</label>
            </div>
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
              {['Google', 'Pollinations', 'openai'].map(p => (
                <button key={p} onClick={() => setActiveProvider(p as any)} className={`flex-1 py-2 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${activeProvider.toLowerCase() === p.toLowerCase() ? 'bg-[#d3bc8e] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                  {p}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
             <div className="flex items-center gap-2 px-1">
              <Cpu className="w-3 h-3 text-[#d3bc8e]/60" />
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Manifestation Core</label>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {models.map(m => (
                <button key={m.id} onClick={() => setSelectedModel(m.id)} className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group ${selectedModel === m.id ? 'bg-[#d3bc8e]/10 border-[#d3bc8e] text-[#d3bc8e]' : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/10'}`}>
                  <div className="min-w-0 pr-4">
                    <div className="text-[9px] font-black uppercase tracking-widest truncate">{m.label}</div>
                    <div className="text-[7px] opacity-50 font-mono truncate">{m.desc}</div>
                  </div>
                  {selectedModel === m.id && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
             <section className="space-y-2.5">
               <label className="text-[8px] font-black uppercase tracking-widest text-gray-600 block ml-1">Aspect Ratio</label>
               <div className="grid grid-cols-1 gap-1">
                  {ASPECT_RATIOS.map(r => (
                      <button key={r.id} onClick={() => setSelectedRatio(r.id)} className={`px-3 py-2 rounded-lg border text-[9px] font-bold transition-all flex items-center gap-2 ${selectedRatio === r.id ? 'border-[#d3bc8e] bg-[#d3bc8e]/10 text-[#d3bc8e]' : 'bg-black/20 border-white/5 text-gray-600 hover:border-white/10'}`}>
                         <Square className={`w-2.5 h-2.5 ${r.id === '16:9' ? 'scale-x-150' : r.id === '9:16' ? 'scale-y-150' : ''}`} />
                         {r.label.split(' ')[1] || r.id}
                      </button>
                  ))}
               </div>
             </section>
             <section className="space-y-2.5">
               <label className="text-[8px] font-black uppercase tracking-widest text-gray-600 block ml-1">Art Style</label>
               <div className="grid grid-cols-1 gap-1">
                  {ART_STYLES.map(s => (
                      <button key={s.id} onClick={() => setSelectedStyle(s.id)} className={`px-3 py-2 rounded-lg border text-[9px] font-bold transition-all text-left truncate ${selectedStyle === s.id ? 'border-[#d3bc8e] bg-[#d3bc8e]/10 text-[#d3bc8e]' : 'bg-black/20 border-white/5 text-gray-600 hover:border-white/10'}`}>
                         {s.label}
                      </button>
                  ))}
               </div>
             </section>
          </div>

          <section className="space-y-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2"><Compass className="w-3 h-3" /> Divine Directive</label>
              <span className="text-[7px] text-gray-700 uppercase font-black">Specify Lighting, Angle, & Colors</span>
            </div>
            <textarea 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-[11px] focus:border-[#d3bc8e] outline-none min-h-[120px] resize-none text-white select-text placeholder:text-gray-800 leading-relaxed transition-all shadow-inner" 
              placeholder={essence1 ? "E.g. Change her eyes to red, add fire in background, dynamic low angle lighting..." : "E.g. Full body shot, Raiden Shogun in a modern cyberpunk city, neon purple lighting, volumetric fog, cinematic angle..."} 
            />
          </section>
        </div>

        <div className="p-5 bg-[#0d111c] border-t border-[#d3bc8e]/10 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
             <button onClick={handleManifest} disabled={isGenerating || (!prompt.trim() && !essence1)} className="w-full py-4 rounded-xl flex items-center justify-center gap-3 text-black font-black transition-all genshin-button disabled:opacity-50 disabled:grayscale active:scale-95 group shadow-xl">
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                <span className="uppercase tracking-[0.2em] text-[10px]">{isGenerating ? 'Resonating...' : 'Manifest Vision'}</span>
             </button>
        </div>
      </aside>

      {/* 2. RIGHT SIDE: PORTAL */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-4 lg:p-12 overflow-hidden bg-[#0b0e14] z-10 min-h-0">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(211,188,142,0.1)_0%,_transparent_70%)]"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        </div>

        <div className="w-full max-w-5xl h-full flex flex-col items-center justify-center relative">
            <div className="relative w-full aspect-square lg:aspect-auto lg:h-[85%] flex items-center justify-center rounded-[2.5rem] lg:rounded-[3.5rem] overflow-hidden border-2 border-[#d3bc8e]/15 bg-black/60 shadow-[0_40px_100px_rgba(0,0,0,0.8)] transition-all group/portal">
                <div className="absolute top-8 left-8 w-14 h-14 border-t-2 border-l-2 border-[#d3bc8e]/30 rounded-tl-3xl z-20 pointer-events-none"></div>
                <div className="absolute top-8 right-8 w-14 h-14 border-t-2 border-r-2 border-[#d3bc8e]/30 rounded-tr-3xl z-20 pointer-events-none"></div>
                <div className="absolute bottom-8 left-8 w-14 h-14 border-b-2 border-l-2 border-[#d3bc8e]/30 rounded-bl-3xl z-20 pointer-events-none"></div>
                <div className="absolute bottom-8 right-8 w-14 h-14 border-b-2 border-r-2 border-[#d3bc8e]/30 rounded-br-3xl z-20 pointer-events-none"></div>

                {isGenerating && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0b0e14]/80 backdrop-blur-2xl animate-in fade-in duration-500">
                        <div className="relative w-40 h-40 sm:w-56 sm:h-56 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#d3bc8e]/20 animate-[spin_20s_linear_infinite]"></div>
                            <div className="absolute inset-4 rounded-full border-2 border-[#d3bc8e]/10 animate-[spin_10s_linear_infinite_reverse]"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-4xl font-black text-[#d3bc8e] font-serif drop-shadow-[0_0_15px_rgba(211,188,142,0.4)]">{progress}%</span>
                                <span className="text-[7px] font-bold text-gray-500 uppercase tracking-[0.4em] mt-3 px-4 text-center leading-relaxed">{status}</span>
                            </div>
                        </div>
                    </div>
                )}

                {resultImage ? (
                    <div className="w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-1000 relative">
                        <div className="relative w-full h-full p-6 lg:p-12 cursor-zoom-in group/img flex items-center justify-center" onClick={() => setLightboxImage(resultImage)}>
                            <img src={resultImage} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-all duration-1000 group-hover/img:scale-[1.01]" alt="Synthesis Result" />
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/20 px-8 py-3 rounded-full flex items-center gap-8 opacity-0 group-hover/portal:opacity-100 transition-all duration-500 translate-y-4 group-hover/portal:translate-y-0 shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-40">
                                <button onClick={(e) => { e.stopPropagation(); const l = document.createElement('a'); l.href = resultImage; l.download = `artifact_${Date.now()}.png`; l.click(); }} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-[#d3bc8e] transition-colors"><Download className="w-5 h-5" /><span className="text-[7px] font-black uppercase tracking-widest">Extract</span></button>
                                <div className="w-px h-8 bg-white/10"></div>
                                <button onClick={(e) => { e.stopPropagation(); handleManifest(); }} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors"><RefreshCcw className="w-5 h-5" /><span className="text-[7px] font-black uppercase tracking-widest">Resonate</span></button>
                                <div className="w-px h-8 bg-white/10"></div>
                                <button onClick={(e) => { e.stopPropagation(); setLightboxImage(resultImage); }} className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-[#d3bc8e] transition-colors"><Maximize2 className="w-5 h-5" /><span className="text-[7px] font-black uppercase tracking-widest">Portal</span></button>
                            </div>
                        </div>
                        <div className="absolute top-12 flex items-center gap-3 bg-[#d3bc8e] px-6 py-2.5 rounded-full shadow-2xl animate-in slide-in-from-top-4 z-20">
                            <ShieldCheck className="w-4 h-4 text-black" />
                            <span className="text-[9px] font-black text-black uppercase tracking-[0.2em]">Synchronized</span>
                        </div>
                    </div>
                ) : !isGenerating ? (
                    <div className="flex flex-col items-center justify-center opacity-30 text-center px-10 group/idle transition-all hover:opacity-50">
                        <div className="relative w-28 h-28 mb-8">
                            <ImageIcon className="w-full h-full text-gray-700 group-hover/idle:text-[#d3bc8e] transition-all duration-1000" />
                            <Sparkles className="absolute -top-3 -right-3 w-8 h-8 text-[#d3bc8e] animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#d3bc8e] uppercase tracking-[0.5em] font-serif mb-3">Exhibition Portal</h2>
                        <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-black">Awaiting Alchemical Seeds with Detail Consistency</p>
                    </div>
                ) : null}
            </div>
            <div className="mt-8 flex items-center gap-10 opacity-20 text-gray-500 uppercase tracking-[0.4em] text-[7px] font-black">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-current rounded-full"></div> Fidelity Enhanced</span>
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-current rounded-full"></div> Context Aware</span>
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-current rounded-full"></div> Irminsul Secure</span>
            </div>
        </div>
      </main>

      {lightboxImage && (
        <div className="fixed inset-0 z-[500] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-4 animate-in fade-in" onClick={() => setLightboxImage(null)}>
           <div className="relative max-w-full flex flex-col items-center animate-in zoom-in-95 duration-500">
              <img src={lightboxImage} className="max-w-full max-h-[82vh] object-contain rounded-3xl border-2 border-[#d3bc8e]/30 shadow-[0_0_100px_rgba(211,188,142,0.4)]" alt="Expanded Artifact" />
              <button className="mt-10 flex items-center gap-3 bg-[#d3bc8e] hover:bg-white px-12 py-4 rounded-full text-black font-black uppercase text-[11px] tracking-[0.3em] transition-all group shadow-2xl">
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" /> 
                <span>Collapse Portal</span>
              </button>
           </div>
        </div>
      )}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]"></div>
    </div>
  );
};

export default VisionGen;
