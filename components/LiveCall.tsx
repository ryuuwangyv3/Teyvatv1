
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PhoneOff, Mic, MicOff, Volume2, PhoneCall, Loader2, Play, Activity, 
  AlertTriangle, Minimize2, Maximize2, X, Sparkles, Radio, Zap
} from 'lucide-react';
import { Persona, VoiceConfig } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface LiveCallProps {
  currentPersona: Persona;
  voiceConfig: VoiceConfig;
  isOpen: boolean;
  onClose: () => void;
}

const LiveCall: React.FC<LiveCallProps> = ({ currentPersona, voiceConfig, isOpen, onClose }) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);

  // --- AUDIO UTILS (INTERNAL TO LIVE CALL) ---
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const cleanupCall = useCallback(() => {
    if (sessionRef.current) {
        try { sessionRef.current.close(); } catch(e) {}
        sessionRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsCalling(false);
    setStatus('idle');
  }, []);

  const startCall = async () => {
    if (!process.env.API_KEY) {
        alert("Akasha Core missing API Key.");
        return;
    }

    setStatus('connecting');
    setIsCalling(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setStatus('active');
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: createBlob(inputData) });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { console.error(e); setStatus('error'); },
          onclose: () => cleanupCall()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: currentPersona.voiceName } }
          },
          systemInstruction: `
            ${currentPersona.systemInstruction}
            [COMMUNICATION FREQUENCY: LIVE VOICE]
            - Be concise.
            - Speak as if we are in a high-fidelity celestial call.
            - Do not use markdown.
          `
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error(e);
      setStatus('error');
      setIsCalling(false);
    }
  };

  useEffect(() => {
    return () => cleanupCall();
  }, [cleanupCall]);

  if (!isOpen && !isCalling) return null;

  // --- PERSISTENT FLOATING VIEW ---
  if (isMinimized || !isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-right-10 duration-500">
        <div 
          onClick={() => setIsMinimized(false)}
          className="bg-[#13182b]/90 backdrop-blur-xl border-2 border-amber-500/30 rounded-3xl p-3 shadow-[0_0_50px_rgba(0,0,0,0.6)] flex items-center gap-4 cursor-pointer hover:border-amber-500 transition-all group"
        >
          <div className="relative shrink-0">
             <img src={currentPersona.avatar} className="w-12 h-12 rounded-full border-2 border-amber-500 object-cover" alt="p" />
             {status === 'active' && (
                <div className="absolute -inset-1 rounded-full border border-amber-500 animate-ping opacity-40"></div>
             )}
          </div>
          <div className="flex flex-col">
             <span className="text-[10px] font-black genshin-gold uppercase tracking-widest">{currentPersona.name}</span>
             <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                <span className="text-[9px] text-gray-400 font-bold uppercase">{status}</span>
             </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); cleanupCall(); onClose(); }} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full transition-all">
             <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // --- FULL SCREEN VIEW ---
  return (
    <div className="fixed inset-0 z-[150] bg-[#0b0e14] flex flex-col items-center justify-center p-6 overflow-hidden animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(211,188,142,0.05)_0%,_transparent_70%)] pointer-events-none"></div>
      
      <div className="absolute top-8 right-8 flex gap-4">
        <button onClick={() => setIsMinimized(true)} className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-white">
           <Minimize2 className="w-6 h-6" />
        </button>
        <button onClick={() => { cleanupCall(); onClose(); }} className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-all">
           <X className="w-6 h-6" />
        </button>
      </div>

      {/* Visualizer Constellation */}
      <div className="relative w-80 h-80 flex items-center justify-center mb-12">
        <div className={`absolute inset-0 rounded-full border border-amber-500/20 animate-[spin_40s_linear_infinite] ${status === 'active' ? 'opacity-100' : 'opacity-20'}`}>
           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_10px_#f59e0b]"></div>
        </div>
        <div className={`absolute inset-10 rounded-full border border-amber-500/10 animate-[spin_20s_linear_infinite_reverse] ${status === 'active' ? 'opacity-100' : 'opacity-20'}`}>
           <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_10px_#fbbf24]"></div>
        </div>
        
        <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-amber-500/50 shadow-[0_0_100px_rgba(211,188,142,0.2)]">
           <img src={currentPersona.avatar} className="w-full h-full object-cover transition-transform duration-700" alt="Av" />
           {status === 'active' && (
              <div className="absolute inset-0 bg-amber-500/5 mix-blend-overlay animate-pulse"></div>
           )}
        </div>
        
        {status === 'active' && (
           <div className="absolute -bottom-4 flex gap-1 items-end h-8">
              {[...Array(12)].map((_, i) => (
                 <div key={i} className="w-1 bg-amber-500/60 rounded-full animate-voice-bar" style={{ animationDelay: `${i * 0.1}s` }}></div>
              ))}
           </div>
        )}
      </div>

      <div className="text-center mb-12 space-y-2">
         <h2 className="text-4xl font-black genshin-gold font-serif tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(211,188,142,0.4)]">{currentPersona.name}</h2>
         <div className="flex items-center justify-center gap-3">
            <Radio className={`w-4 h-4 ${status === 'active' ? 'text-green-500 animate-pulse' : 'text-gray-600'}`} />
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
               {status === 'active' ? 'Frequency Established' : status === 'connecting' ? 'Calibrating Ley Lines...' : 'Standby Mode'}
            </span>
         </div>
      </div>

      <div className="flex items-center gap-8">
        <button 
           onClick={() => setIsMuted(!isMuted)}
           className={`p-6 rounded-full border-2 transition-all ${isMuted ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'}`}
        >
           {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </button>

        {!isCalling ? (
          <button 
            onClick={startCall}
            className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)] hover:scale-110 active:scale-95 transition-all text-white"
          >
            <PhoneCall className="w-10 h-10 animate-bounce" />
          </button>
        ) : (
          <button 
            onClick={cleanupCall}
            className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:scale-110 active:scale-95 transition-all text-white"
          >
            <PhoneOff className="w-10 h-10" />
          </button>
        )}

        <button className="p-6 rounded-full bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-all">
           <Volume2 className="w-8 h-8" />
        </button>
      </div>

      <style>{`
         @keyframes voice-bar {
            0%, 100% { height: 4px; }
            50% { height: 24px; }
         }
         .animate-voice-bar {
            animation: voice-bar 0.6s ease-in-out infinite;
         }
      `}</style>
    </div>
  );
};

export default LiveCall;
