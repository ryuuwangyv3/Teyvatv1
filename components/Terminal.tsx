
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Mic, MicOff, Paperclip, Terminal as TerminalIcon, X, ArrowUp, ArrowDown, Loader2, StopCircle, Box, CloudLightning, Eraser, ChevronDown, Zap, Download, Trash2, Eye, FileText, File as FileIcon
} from 'lucide-react';
import { Persona, UserProfile, Message, Attachment, Language, VoiceConfig } from '../types';
// Removed analyzeImageVision from imports as it is not exported by geminiService and not used in this component.
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
          if (recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch(e) {}
          }
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

  const handleScroll = () => {
      if (scrollRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
          const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 100;
          setShowScrollControls(!isAtBottom && scrollTop > 100);
      }
  };

  useEffect(() => {
      if (!loadingHistory) {
        scrollToBottom();
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
        
        if (userImages.length > 0) {
            setTypingStatus('Performing Multimodal Scan...');
        }

        const historyForAI = currentHistory.slice(0, -1).slice(-15).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        const instruction = `${currentPersona.systemInstruction}\nUser: ${userProfile.username}\nLang: ${currentLanguage.instruction}`;
        
        rawResponse = await chatWithAI(selectedModel, historyForAI, finalPrompt, instruction, "", userImages);
        
        if (!isMounted.current) return;
        const cleanText = rawResponse.replace(/\|\|GEN_IMG:.*?\|\|/g, '').trim();
        const imgMatch = rawResponse.match(/\|\|GEN_IMG:\s*(.*?)\s*\|\|/);
        
        if (imgMatch) {
            setTypingStatus('Manifesting visual artifact...');
            const generatedImg = await generateImage(imgMatch[1], currentPersona.visualSummary);
            if (generatedImg) imgUrl = generatedImg;
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
            const isImage = file.type.startsWith('image/');
            let base64Data: ImageAttachment | null = null;
            
            if (isImage) {
                base64Data = await fileToBase64(file);
                imageAttachments.push(base64Data);
            }

            return {
                name: file.name,
                url: isImage ? URL.createObjectURL(file) : '', 
                type: file.type,
                size: file.size
            };
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

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e14] relative overflow-hidden h-full max-h-full">
      {lightboxImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in" onClick={() => setLightboxImage(null)}>
           <div className="max-w-4xl w-full flex flex-col items-center gap-4 sm:gap-6" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxImage} className="max-w-full max-h-[75vh] sm:max-h-[80vh] object-contain rounded-lg shadow-2xl" />
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 animate-in slide-in-from-bottom-4 duration-500">
                <button onClick={() => { const a = document.createElement('a'); a.href = lightboxImage; a.download = `akasha_${Date.now()}.png`; a.click(); }} className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-[#d3bc8e] text-black rounded-full font-black uppercase text-[10px] sm:text-xs tracking-widest shadow-xl hover:scale-105 transition-all">
                  <Download className="w-4 h-4" /> <span>Download</span>
                </button>
                <button onClick={() => setLightboxImage(null)} className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-white/10 text-white rounded-full font-black uppercase text-[10px] sm:text-xs tracking-widest border border-white/20 backdrop-blur-md">
                  <X className="w-4 h-4" /> <span>Close</span>
                </button>
              </div>
           </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in duration-300">
            <div className="genshin-panel max-w-[280px] sm:max-w-xs w-full p-6 border border-red-500/30 text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                    <Eraser className="w-5 h-5 sm:w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-base sm:text-lg font-bold genshin-gold uppercase tracking-widest mb-2 sm:mb-3">Clear Resonance?</h3>
                <p className="text-[9px] sm:text-[10px] text-gray-400 mb-5 leading-relaxed italic">
                    "Purge current neural archive with {currentPersona.name}?"
                </p>
                <div className="flex gap-2 sm:gap-3">
                    <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 sm:py-2.5 rounded-xl border border-white/10 text-gray-400 font-bold text-[10px] sm:text-xs uppercase">Cancel</button>
                    <button onClick={handleClear} className="flex-1 py-2 sm:py-2.5 rounded-xl bg-red-500 text-white font-bold text-[10px] sm:text-xs uppercase">Clear</button>
                </div>
            </div>
        </div>
      )}
      
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 md:p-10 custom-scrollbar scroll-smooth relative message-container overflow-x-hidden">
        {loadingHistory && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-[#d3bc8e]" /></div>}
        
        {!loadingHistory && messages.length > 0 && (
            <div className="max-w-4xl mx-auto flex justify-end mb-4 sm:mb-6 sticky top-0 z-20">
                <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#131823]/60 backdrop-blur-md border border-white/10 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 transition-all shadow-lg group">
                    <Eraser className="w-3 h-3" />
                    <span className="hidden sm:inline">Purge Memory</span>
                </button>
            </div>
        )}

        {messages.length === 0 && !loadingHistory && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none text-center px-6">
                <TerminalIcon className="w-12 h-12 sm:w-20 sm:h-20 mb-4" />
                <h2 className="text-sm sm:text-lg font-black font-serif uppercase tracking-[0.3em] sm:tracking-[0.4em]">Akasha Terminal Online</h2>
                <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Neural bridge with {currentPersona.name}</p>
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
               <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-4 mt-4 sm:mt-6 animate-pulse">
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full border border-[#d3bc8e]/20 bg-black/40 flex items-center justify-center"><Loader2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 animate-spin text-[#d3bc8e]" /></div>
                  <div className="flex flex-col">
                      <span className="text-[8px] sm:text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.1em] sm:tracking-[0.2em] mb-0.5">{currentPersona.name}...</span>
                      <span className="text-[9px] sm:text-xs text-gray-500 font-mono truncate max-w-[150px] sm:max-w-none">{typingStatus}</span>
                  </div>
               </div>
            )}
        </div>

        <div className={`fixed bottom-24 sm:bottom-32 right-3 sm:right-8 z-30 flex flex-col gap-2 transition-all duration-500 ${showScrollControls ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
           <button onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} className="p-2 sm:p-3 bg-black/60 border border-white/10 rounded-full text-[#d3bc8e] hover:bg-[#d3bc8e] hover:text-black transition-all shadow-xl"><ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" /></button>
           <button onClick={() => scrollToBottom()} className="p-2 sm:p-3 bg-[#d3bc8e] border border-white/10 rounded-full text-black hover:scale-110 transition-all shadow-xl shadow-[#d3bc8e]/20"><ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" /></button>
        </div>
      </div>

      <div className="p-1.5 sm:p-6 md:p-8 bg-[#0b0e14]/95 backdrop-blur-xl border-t border-white/5 relative z-20 shrink-0 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
            {/* ATTACHMENT TRAY */}
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 sm:p-3 bg-black/40 border-x border-t border-white/10 rounded-t-2xl animate-in slide-in-from-bottom-2">
                    {files.map((file, idx) => (
                        <div key={idx} className="relative group bg-white/5 border border-white/10 rounded-xl p-1.5 sm:p-2 pr-6 sm:pr-8 max-w-[120px] sm:max-w-[200px]">
                            <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
                                {file.type.startsWith('image/') ? (
                                    <img src={URL.createObjectURL(file)} className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-cover border border-white/10" alt="p" />
                                ) : (
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                        <FileIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                                    </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-200 truncate">{file.name}</span>
                                    <span className="text-[7px] sm:text-[8px] text-gray-500 uppercase">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                            </div>
                            <button onClick={() => removeFile(idx)} className="absolute top-1/2 -translate-y-1/2 right-1 p-0.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-md transition-all">
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    ))}
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-dashed border-white/20 text-gray-600 hover:border-amber-500 hover:text-amber-500 transition-all"
                    >
                        <Paperclip className="w-4 h-4 sm:w-5 h-5" />
                    </button>
                </div>
            )}

            {replyTo && (
               <div className={`flex items-center justify-between bg-[#3d447a]/20 border-x border-t border-[#3d447a]/40 p-2 sm:p-4 ${files.length > 0 ? '' : 'rounded-t-2xl'} mb-0 animate-in slide-in-from-bottom-2`}>
                  <div className="flex flex-col text-[8px] sm:text-xs min-w-0">
                      <span className="font-black text-[#d3bc8e] uppercase tracking-widest mb-0.5 flex items-center gap-2"><Zap className="w-2 h-2 sm:w-3 h-3" /> Resonating Thought</span>
                      <span className="text-gray-400 truncate italic">"{replyTo.text}"</span>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-500 shrink-0 ml-2"><X className="w-3.5 h-3.5 sm:w-4 h-4" /></button>
               </div>
            )}
            
            <div className={`flex items-end gap-1 sm:gap-3 bg-[#131823] p-1.5 sm:p-3 md:p-4 rounded-2xl sm:rounded-3xl border ${(replyTo || files.length > 0) ? 'rounded-t-none' : ''} border-white/10 shadow-2xl focus-within:border-[#d3bc8e]/40 transition-all`}>
                <div className="flex items-center">
                    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 sm:p-3 text-gray-500 hover:text-[#d3bc8e] transition-colors rounded-full hover:bg-white/5"><Paperclip className="w-4 h-4 sm:w-6 h-6" /></button>
                    <button onClick={() => setIsRecording(!isRecording)} className={`p-1.5 sm:p-3 transition-colors rounded-full hover:bg-white/5 ${isRecording ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-gray-500 hover:text-[#d3bc8e]'}`}>{isRecording ? <MicOff className="w-4 h-4 sm:w-6 h-6" /> : <Mic className="w-4 h-4 sm:w-6 h-6" />}</button>
                </div>
                
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if(e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} multiple />
                
                <textarea 
                    value={inputValue} 
                    onChange={e => setInputValue(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 1024) { e.preventDefault(); handleSend(); } }} 
                    placeholder={`Speak...`} 
                    className="flex-1 bg-transparent py-2 px-1 outline-none resize-none text-white h-9 max-h-24 sm:max-h-40 custom-scrollbar text-sm sm:text-[15px] placeholder:text-gray-700 font-medium select-text" 
                    rows={1} 
                />
                
                <button onClick={handleSend} disabled={(!inputValue.trim() && files.length === 0) || isTyping} className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl genshin-button disabled:opacity-50 disabled:grayscale transition-all shadow-xl shrink-0">
                    {isTyping ? <StopCircle className="w-4 h-4 sm:w-6 h-6 animate-pulse" /> : <Send className="w-4 h-4 sm:w-6 h-6" />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
