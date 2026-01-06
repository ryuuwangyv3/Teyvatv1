
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Mic, MicOff, Paperclip, Terminal as TerminalIcon, X, ArrowUp, ArrowDown, Loader2, StopCircle, Box, CloudLightning, Eraser, ChevronDown, Zap, Download, Trash2
} from 'lucide-react';
import { Persona, UserProfile, Message, Attachment, Language, VoiceConfig } from '../types';
import { chatWithAI, generateTTS, generateImage, translateText, ImageAttachment } from '../services/geminiService';
import { fetchChatHistory, syncChatHistory, clearChatHistory } from '../services/supabaseService';
import MessageItem from './MessageItem';
import { AI_MODELS } from '../data';

const HISTORY_MEM_CACHE: Record<string, Message[]> = {};

interface TerminalProps {
  currentPersona: Persona;
  userProfile: UserProfile;
  currentLanguage: Language;
  voiceConfig: VoiceConfig;
  selectedModel: string;
  onError: (msg: string) => void;
  isSupabaseConnected: boolean;
}

const fileToBase64 = (file: File): Promise<ImageAttachment> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type;
      resolve({ inlineData: { mimeType, data } });
    };
    reader.onerror = error => reject(error);
  });
};

const Terminal: React.FC<TerminalProps> = ({ currentPersona, userProfile, currentLanguage, voiceConfig, selectedModel, onError, isSupabaseConnected }) => {
  const isMounted = useRef(true);
  const [messages, setMessages] = useState<Message[]>(() => HISTORY_MEM_CACHE[currentPersona.id] || []);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingStatus, setTypingStatus] = useState<string>(''); 
  const [files, setFiles] = useState<File[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showScrollControls, setShowScrollControls] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [generatingTTSId, setGeneratingTTSId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
      isMounted.current = true;
      return () => {
          isMounted.current = false;
          if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch(e) {}
          }
      };
  }, []);

  const scrollToBottom = useCallback((instant = false) => {
      if (scrollRef.current) {
          requestAnimationFrame(() => {
              if (scrollRef.current) {
                  scrollRef.current.scrollTo({ 
                      top: scrollRef.current.scrollHeight, 
                      behavior: instant ? 'auto' : 'smooth' 
                  });
              }
          });
      }
  }, []);

  const handleScroll = () => {
      if (scrollRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
          const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 100;
          setShowScrollControls(!isAtBottom && scrollTop > 100);
      }
  };

  // Improved Auto-Scroll Trigger
  useEffect(() => {
      if (!loadingHistory) {
        scrollToBottom();
        // Secondary trigger for dynamic content
        const timer = setTimeout(() => scrollToBottom(), 150);
        return () => clearTimeout(timer);
      }
  }, [messages.length, isTyping, typingStatus, scrollToBottom]);

  useEffect(() => {
    const cached = HISTORY_MEM_CACHE[currentPersona.id];
    if (cached && cached.length > 0) {
        setMessages(cached);
        setTimeout(() => scrollToBottom(true), 50);
    } else {
        setMessages([]); 
    }
    setReplyTo(null);
    setFiles([]);
    setInputValue('');
    
    const load = async () => {
        if (!cached || cached.length === 0) setLoadingHistory(true);
        try {
            const history = await fetchChatHistory(currentPersona.id);
            if (isMounted.current) {
                if (history && history.length > 0) {
                    setMessages(history);
                    HISTORY_MEM_CACHE[currentPersona.id] = history;
                    requestAnimationFrame(() => scrollToBottom(true));
                }
                setLoadingHistory(false);
            }
        } catch (e) {
            if (isMounted.current) setLoadingHistory(false);
        }
    };
    load();
  }, [currentPersona.id, selectedModel, scrollToBottom]); 

  useEffect(() => {
    if (messages.length > 0) {
        syncChatHistory(currentPersona.id, messages);
        HISTORY_MEM_CACHE[currentPersona.id] = messages;
    }
  }, [messages, currentPersona.id]);

  const handlePlayTTS = async (id: string, text: string) => {
      setGeneratingTTSId(id);
      try {
          const audioBase64 = await generateTTS(text, currentPersona.voiceName, voiceConfig);
          if (isMounted.current && audioBase64) {
             const audioUrl = `data:audio/wav;base64,${audioBase64}`;
             setMessages(prev => prev.map(m => m.id === id ? { ...m, audioUrl: audioUrl, audioBase64: audioBase64 } : m));
          }
      } catch (e) {
          onError("TTS Error");
      } finally {
          if (isMounted.current) setGeneratingTTSId(null);
      }
  };

  const handleClear = async () => {
      try {
          await clearChatHistory(currentPersona.id);
          setMessages([]);
          HISTORY_MEM_CACHE[currentPersona.id] = [];
          setShowClearConfirm(false);
      } catch (e) {
          onError("Failed to clear Ley Lines.");
      }
  };

  const processAIResponse = async (currentHistory: Message[], userImages: ImageAttachment[] = []) => {
      setIsTyping(true);
      setTypingStatus('Resonating with Akasha...');
      let rawResponse = "";
      let imgUrl: string | undefined;
      let audioUrl: string | undefined;
      let audioBase64: string | undefined;

      try {
        const lastMsg = currentHistory[currentHistory.length - 1];
        let finalPrompt = lastMsg.text;
        if (lastMsg.replyTo) finalPrompt = `[Reply Context: "${lastMsg.replyTo.text}"]\n\n${lastMsg.text}`;
        
        const historyForAI = currentHistory.slice(0, -1).slice(-15).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        const instruction = `${currentPersona.systemInstruction}\nUser: ${userProfile.username}\nLang: ${currentLanguage.instruction}`;
        
        rawResponse = await chatWithAI(selectedModel, historyForAI, finalPrompt, instruction, "", userImages);
        
        if (!isMounted.current) return;
        const cleanText = rawResponse.replace(/\|\|GEN_IMG:.*?\|\|/g, '').trim();
        const imgMatch = rawResponse.match(/\|\|GEN_IMG:\s*(.*?)\s*\|\|/);
        
        if (imgMatch) {
            setTypingStatus('Manifesting visual artifact (Recursive Fallback)...');
            // generateImage now handles the 4-provider fallback chain internally
            const generatedImg = await generateImage(imgMatch[1], currentPersona.visualSummary);
            if (generatedImg) {
                imgUrl = generatedImg;
            } else {
                throw new Error("Teyvat Visual Core (All Providers) failed to manifest image.");
            }
        }

        if (voiceConfig.autoPlay) {
            setTypingStatus('Synthesizing vocal resonance...');
            const ttsResult = await generateTTS(cleanText, currentPersona.voiceName, voiceConfig);
            if (ttsResult) {
                audioBase64 = ttsResult;
                audioUrl = `data:audio/wav;base64,${ttsResult}`;
            }
        }

        const modelMsg: Message = { id: Date.now().toString(), role: 'model', text: cleanText, imageUrl: imgUrl, audioUrl: audioUrl, audioBase64: audioBase64, timestamp: Date.now(), model: selectedModel };
        setMessages(prev => [...prev, modelMsg]);
      } catch (e: any) {
        if (!isMounted.current) return;
        onError(e.message || "Celestial Anomaly detected.");
      } finally {
        if (isMounted.current) {
            setIsTyping(false);
            setTypingStatus('');
        }
      }
  };

  const handleSend = async () => {
    if (!inputValue.trim() && files.length === 0) return;
    
    setIsTyping(true);
    setTypingStatus('Mapping neural vectors...');

    let attachments: Attachment[] = [];
    let imageAttachments: ImageAttachment[] = [];

    if (files.length > 0) {
        const filePromises = files.map(async (file) => {
            const base64Data = await fileToBase64(file);
            if (file.type.startsWith('image/')) {
                imageAttachments.push(base64Data);
            }
            return {
                name: file.name,
                url: URL.createObjectURL(file),
                type: file.type,
                size: file.size
            };
        });
        attachments = await Promise.all(filePromises);
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue, timestamp: Date.now(), attachments: attachments, replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, role: replyTo.role } : undefined, model: selectedModel };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory);
    setInputValue('');
    setFiles([]);
    setReplyTo(null);
    
    processAIResponse(newHistory, imageAttachments);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] relative overflow-hidden">
      {lightboxImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in" onClick={() => setLightboxImage(null)}>
           <div className="max-w-4xl w-full flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxImage} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
              <div className="flex gap-4 animate-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = lightboxImage;
                    a.download = `akasha_capture_${Date.now()}.png`;
                    a.click();
                  }} 
                  className="flex items-center gap-2 px-8 py-3 bg-[#d3bc8e] text-black rounded-full font-black uppercase tracking-widest shadow-[0_0_20px_rgba(211,188,142,0.4)] hover:scale-105 transition-all active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">Download Artifact</span>
                </button>
                <button 
                  onClick={() => setLightboxImage(null)} 
                  className="flex items-center gap-2 px-8 py-3 bg-white/10 text-white rounded-full font-black uppercase tracking-widest border border-white/20 backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
           </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in duration-300">
            <div className="genshin-panel max-w-sm w-full p-8 border border-red-500/30 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                    <Eraser className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold genshin-gold uppercase tracking-widest mb-4">Clear Resonance?</h3>
                <p className="text-xs text-gray-400 mb-8 leading-relaxed italic">
                    "Traveler, are you sure you want to wipe the current neural history with {currentPersona.name}? This action cannot be undone by Irminsul."
                </p>
                <div className="flex gap-4">
                    <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 transition-all">Cancel</button>
                    <button onClick={handleClear} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg shadow-red-900/40 hover:bg-red-600 transition-all">Clear Memory</button>
                </div>
            </div>
        </div>
      )}
      
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar scroll-smooth relative message-container">
        {loadingHistory && <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 animate-spin text-[#d3bc8e]" /></div>}
        
        {!loadingHistory && messages.length > 0 && (
            <div className="max-w-4xl mx-auto flex justify-end mb-8 sticky top-0 z-20">
                <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#131823]/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-all shadow-xl group">
                    <Eraser className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                    <span className="hidden sm:inline">Clear Archive</span>
                </button>
            </div>
        )}

        {messages.length === 0 && !loadingHistory && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
                <TerminalIcon className="w-20 h-20 mb-4" />
                <h2 className="text-lg font-black font-serif uppercase tracking-[0.4em]">Akasha Terminal Active</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Ready for neural resonance with {currentPersona.name}</p>
            </div>
        )}
        
        <div className="max-w-4xl mx-auto w-full">
            {messages.map((m, idx) => (
              <MessageItem key={m.id} msg={m} userProfile={userProfile} currentPersona={currentPersona} voiceConfig={voiceConfig} editingId={editingId} editValue={editValue} copiedId={copiedId} isTranslating={isTranslating} generatingTTSId={generatingTTSId} onLightbox={setLightboxImage} onDelete={(id) => setMessages(prev => prev.filter(x => x.id !== id))} onCopy={(text, id) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }} onPlayTTS={handlePlayTTS} onEditStart={(msg) => { setEditingId(msg.id); setEditValue(msg.text); }} onEditChange={setEditValue} onSaveEdit={(id, text, regenerate) => { 
                setMessages(prev => {
                  const msgIndex = prev.findIndex(x => x.id === id);
                  if (msgIndex === -1) return prev;
                  const newMessages = prev.map((x, i) => i === msgIndex ? {...x, text} : x);
                  
                  if (regenerate && newMessages[msgIndex].role === 'user') {
                    const historyToProcess = newMessages.slice(0, msgIndex + 1);
                    setTimeout(() => processAIResponse(historyToProcess), 50);
                    return historyToProcess;
                  }
                  return newMessages;
                });
                setEditingId(null);
              }} onTranslate={async (id, text) => { setIsTranslating(id); const res = await translateText(text, currentLanguage.label); setMessages(prev => prev.map(x => x.id === id ? {...x, translatedText: res, showTranslation: true} : x)); setIsTranslating(null); }} onToggleTranslation={(id) => setMessages(prev => prev.map(x => x.id === id ? {...x, showTranslation: !x.showTranslation} : x))} onReply={setReplyTo} isLatest={idx === messages.length - 1} />
            ))}

            {isTyping && (
               <div className="flex items-center gap-4 pl-4 mt-6 animate-pulse">
                  <div className="w-10 h-10 rounded-full border border-[#d3bc8e]/20 bg-black/40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#d3bc8e]" /></div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.2em] mb-1">{currentPersona.name} Resonating...</span>
                      <span className="text-xs text-gray-500 font-mono">{typingStatus}</span>
                  </div>
               </div>
            )}
        </div>

        <div className={`fixed bottom-32 right-8 z-30 flex flex-col gap-3 transition-all duration-500 ${showScrollControls ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
           <button onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} className="p-3 bg-black/60 border border-white/10 rounded-full text-[#d3bc8e] hover:bg-[#d3bc8e] hover:text-black transition-all shadow-xl"><ArrowUp className="w-5 h-5" /></button>
           <button onClick={() => scrollToBottom()} className="p-3 bg-[#d3bc8e] border border-white/10 rounded-full text-black hover:scale-110 transition-all shadow-xl shadow-[#d3bc8e]/20"><ArrowDown className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="p-6 md:p-8 bg-[#0b0e14]/95 backdrop-blur-xl border-t border-white/5 relative z-20">
        <div className="max-w-4xl mx-auto">
            {replyTo && (
               <div className="flex items-center justify-between bg-[#3d447a]/20 border border-[#3d447a]/40 p-4 rounded-t-2xl mb-0 animate-in slide-in-from-bottom-2">
                  <div className="flex flex-col text-xs">
                      <span className="font-black text-[#d3bc8e] uppercase tracking-widest mb-1 flex items-center gap-2"><Zap className="w-3 h-3" /> Resonating with past thought</span>
                      <span className="text-gray-400 truncate max-w-md italic">"{replyTo.text}"</span>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
               </div>
            )}
            
            <div className={`flex items-end gap-3 bg-[#131823] p-3 md:p-4 rounded-3xl border ${replyTo ? 'rounded-t-none' : ''} border-white/10 shadow-2xl group focus-within:border-[#d3bc8e]/50 transition-all`}>
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-500 hover:text-[#d3bc8e] transition-colors rounded-full hover:bg-white/5"><Paperclip className="w-6 h-6" /></button>
                <input type="file" autoFocus={false} ref={fileInputRef} className="hidden" onChange={(e) => { if(e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} multiple />
                
                <button onClick={() => setIsRecording(!isRecording)} className={`p-3 transition-colors rounded-full hover:bg-white/5 ${isRecording ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-gray-500 hover:text-[#d3bc8e]'}`}>{isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}</button>
                
                <textarea value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && (window.innerWidth >= 1024)) { e.preventDefault(); handleSend(); } }} placeholder={`Resonate with ${currentPersona.name}...`} className="flex-1 bg-transparent py-3 px-2 outline-none resize-none text-white h-12 max-h-48 custom-scrollbar text-[15px] placeholder:text-gray-600 font-medium select-text" rows={1} />
                
                <button onClick={handleSend} disabled={(!inputValue.trim() && files.length === 0) || isTyping} className="w-12 h-12 flex items-center justify-center rounded-2xl genshin-button disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95 shadow-xl">
                    {isTyping ? <StopCircle className="w-6 h-6 animate-pulse" /> : <Send className="w-6 h-6" />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
