
import React, { useState } from 'react';
import { Volume2, Save, Headphones, Activity, Sliders, Zap, PlayCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { VoiceConfig, ApiKeyData, UserProfile } from '../types';
import { generateTTS } from '../services/geminiService';
import { VOICE_OPTIONS } from '../data';

interface SettingsProps {
  voiceConfig: VoiceConfig;
  setVoiceConfig: (v: VoiceConfig) => void;
  apiKeys: ApiKeyData[]; 
  setApiKeys: (keys: ApiKeyData[]) => void;
  selectedModel?: string;
  setSelectedModel?: (model: string) => void;
  userProfile?: UserProfile; 
  onSwitchToAdmin?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ voiceConfig, setVoiceConfig, onSwitchToAdmin }) => {
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handlePreviewVoice = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    try {
        const text = "Ad Astra Abyssosque.";
        const voice = voiceConfig.voiceId || 'Kore'; 
        // Fixed: generateTTS only accepts 2 arguments (text, voiceName) in its definition.
        const audioBase64 = await generateTTS(text, voice);
        
        if (audioBase64) {
             const binaryString = atob(audioBase64);
             const len = binaryString.length;
             const bytes = new Uint8Array(len);
             for (let i = 0; i < len; i++) {
               bytes[i] = binaryString.charCodeAt(i);
             }
             const blob = new Blob([bytes], { type: 'audio/wav' });
             const url = URL.createObjectURL(blob);
             const audio = new Audio(url);
             // Apply speed modulation manually for preview
             audio.playbackRate = voiceConfig.speed || 1.0;
             audio.play();
             audio.onended = () => setIsPreviewing(false);
        } else {
            alert("Preview failed.");
            setIsPreviewing(false);
        }
    } catch (e) {
        setIsPreviewing(false);
    }
  };

  const renderSlider = (label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void, suffix = "") => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">{value}{suffix}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-amber-500 h-1.5 bg-black/40 rounded-full appearance-none hover:bg-white/10 transition-all"
      />
    </div>
  );

  return (
    <div className="h-full p-6 lg:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
               <Sliders className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold genshin-gold uppercase tracking-widest">Audio Settings</h2>
              <p className="text-gray-400 text-sm">Fine-tune your auditory resonance experience.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="lg:col-span-2 space-y-8">
              <div className="genshin-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-[4rem] -z-0"></div>
                 <div className="flex justify-between items-center mb-6 z-10 relative">
                     <h3 className="flex items-center gap-2 text-lg font-bold">
                       <Activity className="w-5 h-5 text-amber-500" />
                       <span>Voice Modulation</span>
                     </h3>
                     <div className="flex items-center gap-3">
                         <button 
                            onClick={() => setVoiceConfig({...voiceConfig, autoPlay: !voiceConfig.autoPlay})}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[10px] font-black uppercase tracking-widest ${voiceConfig.autoPlay ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-white/5 border-white/10 text-gray-500'}`}
                            title="Auto-play AI responses"
                         >
                            {voiceConfig.autoPlay ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            <span>Auto Play: {voiceConfig.autoPlay ? 'ON' : 'OFF'}</span>
                         </button>
                         <button 
                           onClick={handlePreviewVoice}
                           disabled={isPreviewing}
                           className="px-4 py-2 bg-amber-500 text-black rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-amber-400 disabled:opacity-50 transition-all shadow-lg"
                         >
                           {isPreviewing ? "Playing..." : "Test Audio"}
                         </button>
                     </div>
                 </div>
                 <div className="space-y-8 relative z-10">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 block">Base Voice Model</label>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {VOICE_OPTIONS.map(v => (
                                <button 
                                    key={v.id}
                                    onClick={() => setVoiceConfig({...voiceConfig, voiceId: v.id})}
                                    className={`p-3 rounded-xl border text-left transition-all ${voiceConfig.voiceId === v.id ? 'border-amber-500 bg-amber-500/20 text-amber-400' : 'border-white/10 bg-white/5 text-gray-500 hover:bg-white/10'}`}
                                >
                                    <div className="text-xs font-bold mb-0.5">{v.id}</div>
                                    <div className="text-[9px] opacity-70 truncate">{v.label.split(' - ')[1] || v.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        {renderSlider("Speed / Tempo", voiceConfig.speed, 0.5, 2.0, 0.1, (v) => setVoiceConfig({...voiceConfig, speed: v}), "x")}
                        {renderSlider("Pitch Shift", voiceConfig.pitch, 0.5, 2.0, 0.1, (v) => setVoiceConfig({...voiceConfig, pitch: v}), "x")}
                        {renderSlider("Master Gain", voiceConfig.gain || 1.0, 0.1, 2.0, 0.1, (v) => setVoiceConfig({...voiceConfig, gain: v}), "dB")}
                      </div>
                      <div className="space-y-6 p-6 bg-black/20 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase text-gray-500">Equalizer</span>
                            <Zap className="w-3 h-3 text-yellow-500" />
                        </div>
                        <div className="flex gap-4 h-32 items-end justify-between px-2">
                            {[40, 60, 35, 80, 50, 90, 45, 70].map((h, i) => (
                              <div key={i} className="w-2 bg-gradient-to-t from-amber-900/50 to-amber-500/50 rounded-t-sm transition-all duration-500" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            {['LOW', 'MID', 'HIGH'].map((band, i) => (
                                <div key={band} className="text-center">
                                  <div className="text-[9px] text-gray-500 mb-1">{band}</div>
                                  <input type="range" min="-10" max="10" className="w-full accent-amber-500 h-1 bg-white/10" 
                                    value={i === 0 ? voiceConfig.eqLow || 0 : i === 1 ? voiceConfig.eqMid || 0 : voiceConfig.eqHigh || 0} 
                                    onChange={(e) => setVoiceConfig({
                                        ...voiceConfig, 
                                        eqLow: i === 0 ? parseFloat(e.target.value) : voiceConfig.eqLow,
                                        eqMid: i === 1 ? parseFloat(e.target.value) : voiceConfig.eqMid,
                                        eqHigh: i === 2 ? parseFloat(e.target.value) : voiceConfig.eqHigh
                                    })} 
                                  />
                                </div>
                            ))}
                        </div>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
            <div className="space-y-6">
               <div className="genshin-panel p-6 rounded-3xl border border-white/10">
                  <h3 className="flex items-center gap-2 text-sm font-bold mb-4 uppercase tracking-widest">
                     <Headphones className="w-4 h-4 text-amber-500" />
                     <span>Spatial Audio</span>
                  </h3>
                  <div className="space-y-6">
                     {renderSlider("Reverb / Echo", voiceConfig.reverb, 0, 100, 5, (v) => setVoiceConfig({...voiceConfig, reverb: v}), "%")}
                     {renderSlider("Noise Gate", voiceConfig.noise || 0, 0, 100, 5, (v) => setVoiceConfig({...voiceConfig, noise: v}), "%")}
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
