
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, PhoneCall, Loader2, X, Radio, Activity } from 'lucide-react';
import { Persona, VoiceConfig } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

interface LiveCallProps {
  currentPersona: Persona;
  voiceConfig: VoiceConfig;
  isOpen: boolean;
  onClose: () => void;
}

const LiveCall: React.FC<LiveCallProps> = ({ currentPersona, voiceConfig, isOpen, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);

  // Manual encoding/decoding as required by SDK
  const decode = (b64: string) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const chData = buffer.getChannelData(ch);
      for (let i = 0; i < frameCount; i++) chData[i] = dataInt16[i * numChannels + ch] / 32768.0;
    }
    return buffer;
  };

  const createBlob = (data: Float32Array): Blob => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const cleanup = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (sessionRef.current) sessionRef.current.close();
    sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setStatus('idle');
  }, []);

  const startCall = async () => {
    const key = "AIzaSyCWFLagWil_s7OFUsBAjBrGsp5OYKLsb6U"; // Hardcoded for immediate activation
    setStatus('connecting');
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('active');
            const src = inputCtx.createMediaStreamSource(stream);
            const proc = inputCtx.createScriptProcessor(4096, 1, 1);
            proc.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(inputData) }));
            };
            src.connect(proc);
            proc.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioB64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioB64) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioB64), outputCtx, 24000, 1);
              const src = outputCtx.createBufferSource();
              src.buffer = buffer;
              src.connect(outputCtx.destination);
              src.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(src);
              src.onended = () => sourcesRef.current.delete(src);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => { console.error("Neural link error:", e); setStatus('error'); },
          onclose: () => cleanup()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: currentPersona.voiceName || 'Zephyr' } } },
          systemInstruction: `Resonate as ${currentPersona.name}. Context: ${currentPersona.systemInstruction}.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { setStatus('error'); }
  };

  useEffect(() => { return () => cleanup(); }, [cleanup]);

  if (!isOpen && status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#0b0e14]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="absolute top-8 right-8"><button onClick={() => { cleanup(); onClose(); }} className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-all"><X className="w-6 h-6" /></button></div>
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center mb-12">
        <div className={`absolute inset-0 rounded-full border border-amber-500/20 animate-[spin_60s_linear_infinite] ${status === 'active' ? 'opacity-100' : 'opacity-20'}`}><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-amber-500 rounded-full shadow-[0_0_15px_#f59e0b]"></div></div>
        <div className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-amber-500/40 shadow-[0_0_80px_rgba(211,188,142,0.2)]">
           <img src={currentPersona.avatar} className="w-full h-full object-cover" alt="Persona" />
           {status === 'active' && <div className="absolute inset-0 bg-amber-500/10 mix-blend-overlay animate-pulse"></div>}
        </div>
      </div>
      <div className="text-center mb-12">
         <h2 className="text-3xl sm:text-5xl font-black genshin-gold font-serif uppercase tracking-widest drop-shadow-2xl">{currentPersona.name}</h2>
         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-2">{status === 'active' ? 'Neural Link Optimized' : status === 'connecting' ? 'Synchronizing...' : status === 'error' ? 'Link Severed' : 'Awaiting Connection'}</p>
      </div>
      <div className="flex items-center gap-8">
        <button onClick={() => setIsMuted(!isMuted)} className={`p-6 rounded-full border-2 transition-all ${isMuted ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-white/20 text-white'}`}>{isMuted ? <MicOff /> : <Mic />}</button>
        {status === 'idle' || status === 'error' ? (
          <button onClick={startCall} className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-2xl hover:scale-105 transition-all text-white"><PhoneCall className="w-10 h-10" /></button>
        ) : (
          <button onClick={cleanup} className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center shadow-2xl hover:scale-105 transition-all text-white"><PhoneOff className="w-10 h-10" /></button>
        )}
        <button className="p-6 rounded-full bg-white/5 border border-white/20 text-white"><Volume2 /></button>
      </div>
    </div>
  );
};
export default LiveCall;
