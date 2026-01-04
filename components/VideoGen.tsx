
import React, { useState, useRef } from 'react';
import { Video, Play, RefreshCcw, Film, Layers, Shield, Loader2, Download, Upload, Image as ImageIcon, Box, Check, AlertTriangle } from 'lucide-react';
import { generateVideo } from '../services/geminiService';
import { VIDEO_GEN_MODELS } from '../data';

const VideoGen: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [selectedModel, setSelectedModel] = useState<string>(VIDEO_GEN_MODELS[0]?.id || '');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  setInputImage(event.target.result as string);
                  setErrorMessage(null);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && mode === 'text') return; 
    if (mode === 'image' && !inputImage) return;

    setIsGenerating(true);
    setVideoUrl(null);
    setErrorMessage(null);
    try {
      const fullPrompt = `${prompt || 'Animate this scene'}. Cinematic, high fidelity, smooth motion, 720p resolution.`;
      
      const url = await generateVideo(
          fullPrompt, 
          mode === 'image' ? (inputImage || undefined) : undefined,
          selectedModel
      );
      
      if (url) {
        setVideoUrl(url);
      } else {
        setErrorMessage("Synthesizer failed: Neural network returned an empty sequence. Check your prompt or model availability.");
      }
    } catch (e: any) {
      setErrorMessage(`System Error: ${e.message || "Unknown anomaly detected in the chronicle core."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold genshin-gold mb-2 font-serif tracking-widest">Omni-Chronicle</h1>
          <p className="text-gray-400 text-sm">Forge high-fidelity motion sequences across the Ley Lines.</p>
        </header>

        {/* Mode Toggles */}
        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 mb-8 max-w-md mx-auto w-full">
           <button 
             onClick={() => setMode('text')} 
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'text' ? 'bg-amber-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
           >
             <Film className="w-4 h-4" /> Text-to-Video
           </button>
           <button 
             onClick={() => setMode('image')} 
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'image' ? 'bg-amber-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
           >
             <ImageIcon className="w-4 h-4" /> Image-to-Video
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="genshin-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
              
              {/* Model Selector */}
              <div className="mb-6">
                 <label className="text-[10px] font-bold genshin-gold uppercase tracking-[0.2em] mb-3 block flex items-center gap-2">
                    <Box className="w-3 h-3" /> Synthesis Core
                 </label>
                 <div className="grid grid-cols-1 gap-2">
                    {VIDEO_GEN_MODELS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { setSelectedModel(m.id); setErrorMessage(null); }}
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                              selectedModel === m.id 
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                              : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'
                          }`}
                        >
                           <div>
                               <div className="text-xs font-bold uppercase tracking-tight">{m.label}</div>
                               <div className="text-[9px] opacity-60 font-mono mt-0.5">{m.desc}</div>
                           </div>
                           {selectedModel === m.id && <Check className="w-3 h-3" />}
                        </button>
                    ))}
                 </div>
              </div>

              {mode === 'image' && (
                 <div className="mb-6">
                    <label className="text-[10px] font-bold genshin-gold uppercase tracking-[0.2em] mb-2 block">Seed Image</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500/50 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative group bg-black/40"
                    >
                       {inputImage ? (
                           <>
                             <img src={inputImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" alt="Input" />
                             <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="px-4 py-2 border border-white/20 rounded-lg text-xs font-bold text-white backdrop-blur-md">Modify Core Seed</span>
                             </div>
                           </>
                       ) : (
                           <div className="text-center p-4">
                              <Upload className="w-8 h-8 text-gray-600 mx-auto mb-3 group-hover:text-amber-500 transition-colors" />
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Inject Visual Data</span>
                           </div>
                       )}
                       <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    </div>
                 </div>
              )}

              <label className="text-[10px] font-bold genshin-gold uppercase tracking-[0.2em] mb-2 block">
                  Motion Directive
              </label>
              <textarea 
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); setErrorMessage(null); }}
                placeholder={mode === 'image' ? "Describe the animation flow..." : "e.g. A falling star over the jade chamber..."}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm h-32 resize-none focus:outline-none focus:border-amber-500 transition-all select-text"
              />

              {errorMessage && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex gap-3 items-start animate-in shake duration-300">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                          <p className="text-xs font-bold text-red-400 uppercase mb-1">Anomaly Detected</p>
                          <p className="text-[10px] text-red-200 leading-relaxed">{errorMessage}</p>
                      </div>
                  </div>
              )}
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || (mode === 'text' && !prompt.trim()) || (mode === 'image' && !inputImage)}
              className="w-full genshin-button py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-bold text-lg shadow-2xl shadow-blue-900/20 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Film className="w-6 h-6" />}
              <span className="uppercase tracking-widest text-sm">{isGenerating ? 'Forging Time...' : 'Synthesize Sequence'}</span>
            </button>
          </div>

          <div className="genshin-panel rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center p-2 bg-black/40 relative overflow-hidden group min-h-[400px] shadow-inner">
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none">
               <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent"></div>
            </div>
            
            {videoUrl ? (
              <div className="w-full h-full relative group/video animate-in zoom-in duration-500">
                <video 
                   src={videoUrl} 
                   controls 
                   autoPlay 
                   loop 
                   className="w-full h-full object-contain rounded-[2rem] shadow-2xl" 
                />
                <div className="absolute top-4 right-4 flex gap-2">
                    <a 
                       href={videoUrl} 
                       download={`chronicle_${Date.now()}.mp4`}
                       className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover/video:opacity-100 transition-all hover:bg-amber-500 hover:text-black border border-white/10"
                    >
                       <Download className="w-5 h-5" />
                    </a>
                    <button 
                       onClick={() => setVideoUrl(null)}
                       className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover/video:opacity-100 transition-all hover:bg-red-500 border border-white/10"
                    >
                       {/* Fix: Changed RefreshCw to RefreshCcw to match imports */}
                       <RefreshCcw className="w-5 h-5" />
                    </button>
                </div>
              </div>
            ) : isGenerating ? (
               <div className="z-20 text-center p-8">
                  <div className="relative w-24 h-24 mx-auto mb-8">
                      <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin shadow-[0_0_25px_rgba(245,158,11,0.5)]"></div>
                      <div className="absolute inset-4 bg-amber-500/10 rounded-full flex items-center justify-center animate-pulse">
                          <Activity className="w-8 h-8 text-amber-500" />
                      </div>
                  </div>
                  <h3 className="text-2xl font-bold genshin-gold mb-3 animate-pulse tracking-widest font-serif">WEAVING CONTINUITY</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono max-w-xs mx-auto">
                    Interfacing with {VIDEO_GEN_MODELS.find(m => m.id === selectedModel)?.label} Core...
                    <br/><span className="text-amber-600 mt-2 block italic">Do not sever connection (Close tab).</span>
                  </p>
               </div>
            ) : (
               <div className="z-10 text-center opacity-40 group-hover:opacity-60 transition-opacity">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5">
                     <Play className="w-12 h-12 text-gray-400 ml-1" />
                  </div>
                  <p className="text-gray-300 font-bold tracking-widest uppercase text-sm">Chronicle Viewer</p>
                  <p className="text-[10px] text-gray-600 mt-2 font-mono uppercase">IDLE • AWAITING NEURAL SEED</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Activity Icon for the loader
const Activity = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
);

export default VideoGen;
