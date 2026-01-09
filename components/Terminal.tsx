import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Mic, MicOff, Paperclip, Terminal as TerminalIcon, X, ArrowUp, ArrowDown, Loader2, StopCircle, Eraser, Zap, Download, File as FileIcon
} from 'lucide-react';
import { Persona, UserProfile, Message, Attachment, Language, VoiceConfig } from '../types';
import { chatWithAI, generateTTS, generateImage, translateText, ImageAttachment } from '../services/geminiService';
import { fetchChatHistory, syncChatHistory, clearChatHistory } from '../services/supabaseService';
import MessageItem from './MessageItem';

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

  useEffect(() => {
      isMounted.current = true;
      const handleResonance = (e: any) => {
          const detail = e.detail;
          if (detail && detail.personaId === currentPersona.id) {
              const newMsg: Message = {
                  id: Date.now().toString(),
                  role: detail.role,
                  text: detail.text,
                  imageUrl: detail.imageUrl,
                  timestamp: Date.now(),
                  model: detail.model || selectedModel
              };
              setMessages(prev => [...prev, newMsg]);
          }
      };
      window.addEventListener('akasha:resonance', handleResonance);
      return () => {
          isMounted.current = false;
          window.removeEventListener('akasha:resonance', handleResonance);
      };
  }, [currentPersona.id, selectedModel]);

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

  useEffect(() => {
      if (!loadingHistory) scrollToBottom();
  }, [messages.length, isTyping, typingStatus, scrollToBottom]);

  useEffect(() => {
    const cached = HISTORY_MEM_CACHE[currentPersona.id];
    if (cached) setMessages(cached);
    else setMessages([]); 
    
    const load = async () => {
        if (!cached) setLoadingHistory(true);
        try {
            const history = await fetchChatHistory(currentPersona.id);
            if (isMounted.current && history) {
                setMessages(history);
                HISTORY_MEM_CACHE[currentPersona.id] = history;
                scrollToBottom(true);
            }
        } finally {
            if (isMounted.current) setLoadingHistory(false);
        }
    };
    load();
  }, [currentPersona.id, selectedModel]); 

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
      } finally {
          if (isMounted.current) setGeneratingTTSId(null);
      }
  };

  const processAIResponse = async (currentHistory: Message[], userImages: ImageAttachment[] = []) => {
      setIsTyping(true);
      setTypingStatus('Connecting to Irminsul...');
      let rawResponse = "";
      let imgUrl: string | undefined;
      let audioUrl: string | undefined;
      let audioBase64: string | undefined;

      try {
        const lastMsg = currentHistory[currentHistory.length - 1];
        let finalPrompt = lastMsg.text;
        if (lastMsg.replyTo) finalPrompt = `[Context: "${lastMsg.replyTo.text}"]\n${lastMsg.text}`;
        
        const historyForAI = currentHistory.slice(0, -1).slice(-10).map(m => ({ 
            role: m.role, 
            parts: [{ text: m.text }] 
        }));
        
        const instruction = `${currentPersona.systemInstruction}\nLanguage: ${currentLanguage.instruction}`;
        
        rawResponse = await chatWithAI(selectedModel, historyForAI, finalPrompt, instruction, "Terminal", userImages);
        
        if (!isMounted.current) return;
        
        // Visual Intent Extraction (Tag Logic)
        const cleanText = rawResponse.replace(/\|\|GEN_IMG:.*?\|\|/g, '').trim();
        const imgMatch = rawResponse.match(/\|\|GEN_IMG:\s*(.*?)\s*\|\|/);
        
        if (imgMatch) {
            setTypingStatus(`Manifesting Artifact...`);
            imgUrl = await generateImage(imgMatch[1], currentPersona.visualSummary) || undefined;
        }

        if (voiceConfig.autoPlay && cleanText) {
            setTypingStatus('Synthesizing Voice...');
            const ttsResult = await generateTTS(cleanText, currentPersona.voiceName, voiceConfig);
            if (ttsResult) {
                audioBase64 = ttsResult;
                audioUrl = `data:audio/wav;base64,${ttsResult}`;
            }
        }

        const modelMsg: Message = { 
            id: Date.now().toString(), 
            role: 'model', 
            text: cleanText || (imgUrl ? "[Visual Fragment Manifested]" : "..."), 
            imageUrl: imgUrl, 
            audioUrl: audioUrl, 
            audioBase64: audioBase64, 
            timestamp: Date.now(), 
            model: selectedModel 
        };
        setMessages(prev => [...prev, modelMsg]);
      } catch (e: any) {
        onError(e.message || "Celestial Signal Error.");
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
    
    let attachments: Attachment[] = [];
    let imageAttachments: ImageAttachment[] = [];

    if (files.length > 0) {
        const filePromises = files.map(async (file) => {
            const isImage = file.type.startsWith('image/');
            if (isImage) {
                const b64 = await fileToBase64(file);
                imageAttachments.push(b64);
            }
            return { name: file.name, url: isImage ? URL.createObjectURL(file) : '', type: file.type, size: file.size };
        });
        attachments = await Promise.all(filePromises);
    }

    const userMsg: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        text: inputValue, 
        timestamp: Date.now(), 
        attachments: attachments, 
        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, role: replyTo.role } : undefined, 
        model: selectedModel 
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputValue('');
    setFiles([]);
    setReplyTo(null);
    processAIResponse(newHistory, imageAttachments);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e14] relative overflow-hidden h-full">
      {lightboxImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in" onClick={() => setLightboxImage(null)}>
           <div className="max-w-4xl w-full flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxImage} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" alt="Artifact" />
              <button onClick={() => setLightboxImage(null)} className="px-8 py-3 bg-[#d3bc8e] text-black rounded-full font-black uppercase text-xs tracking-widest shadow-xl">Close</button>
           </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="genshin-panel max-w-xs w-full p-6 text-center border border-red-500/30">
                <h3 className="text-lg font-bold genshin-gold uppercase tracking-widest mb-4">Clear Memory?</h3>
                <div className="flex gap-2">
                    <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 font-bold text-xs uppercase">Cancel</button>
                    <button onClick={async () => { await clearChatHistory(currentPersona.id); setMessages([]); setShowClearConfirm(false); }} className="flex-1 py-2 rounded-xl bg-red-500 text-white font-bold text-xs uppercase">Clear</button>
                </div>
            </div>
        </div>
      )}
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 custom-scrollbar scroll-smooth relative">
        {loadingHistory && <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#d3bc8e]" /></div>}
        
        {!loadingHistory && messages.length > 0 && (
            <div className="max-w-4xl mx-auto flex justify-end mb-6 sticky top-0 z-20">
                <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131823]/60 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 transition-all shadow-lg">
                    <Eraser className="w-3 h-3" /> Purge Memory
                </button>
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
               <div className="flex items-center gap-3 mt-6 animate-pulse">
                  <div className="w-8 h-8 rounded-full border border-[#d3bc8e]/20 bg-black/40 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-[#d3bc8e]" /></div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.2em]">{currentPersona.name}...</span>
                      <span className="text-[10px] text-gray-500 font-mono italic">{typingStatus}</span>
                  </div>
               </div>
            )}
        </div>
      </div>

      <div className="p-4 sm:p-8 bg-[#0b0e14]/95 backdrop-blur-xl border-t border-white/5 relative z-20 shrink-0">
        <div className="max-w-4xl mx-auto">
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-black/40 border-x border-t border-white/10 rounded-t-2xl animate-in slide-in-from-bottom-2">
                    {files.map((file, idx) => (
                        <div key={idx} className="relative bg-white/5 border border-white/10 rounded-xl p-2 pr-8 max-w-[150px]">
                            <span className="text-[10px] font-bold text-gray-200 truncate block">{file.name}</span>
                            <button onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1/2 -translate-y-1/2 right-1 p-1 text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                    ))}
                </div>
            )}

            {replyTo && (
               <div className="flex items-center justify-between bg-[#3d447a]/20 border-x border-t border-[#3d447a]/40 p-3 mb-0 animate-in slide-in-from-bottom-2">
                  <div className="flex flex-col text-xs min-w-0">
                      <span className="font-black text-[#d3bc8e] uppercase tracking-widest mb-0.5">Resonating Response</span>
                      <span className="text-gray-400 truncate italic">"{replyTo.text}"</span>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="p-1 text-gray-500"><X className="w-4 h-4" /></button>
               </div>
            )}
            
            <div className={`flex items-end gap-2 bg-[#131823] p-3 rounded-2xl border ${(replyTo || files.length > 0) ? 'rounded-t-none' : ''} border-white/10 shadow-2xl focus-within:border-[#d3bc8e]/40 transition-all`}>
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-[#d3bc8e] transition-colors"><Paperclip className="w-5 h-5" /></button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if(e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} multiple />
                
                <textarea 
                    value={inputValue} 
                    onChange={e => setInputValue(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
                    placeholder={`Speak with Akasha...`} 
                    className="flex-1 bg-transparent py-2 px-1 outline-none resize-none text-white h-10 max-h-40 custom-scrollbar text-sm font-medium" 
                    rows={1} 
                />
                
                <button onClick={handleSend} disabled={(!inputValue.trim() && files.length === 0) || isTyping} className="w-10 h-10 flex items-center justify-center rounded-xl genshin-button disabled:opacity-50 transition-all shadow-xl shrink-0">
                    {isTyping ? <StopCircle className="w-5 h-5 animate-pulse" /> : <Send className="w-5 h-5" />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
