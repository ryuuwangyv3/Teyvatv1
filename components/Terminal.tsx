
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Terminal as TerminalIcon, Mic, Paperclip, X, Download, Maximize2, Reply, RefreshCw, FileText, Image as ImageIcon, FileCode, Music, Film, File } from 'lucide-react';
import { Persona, UserProfile, Message, Language, VoiceConfig, Attachment } from '../types';
import { chatWithAI, generateImage, translateText, generateTTS } from '../services/geminiService';
import MessageItem from './MessageItem';
import { syncChatHistory, fetchChatHistory, clearChatHistory } from '../services/supabaseService';

interface TerminalProps {
    currentPersona: Persona;
    userProfile: UserProfile;
    currentLanguage: Language;
    voiceConfig: VoiceConfig;
    selectedModel: string;
    onError: (msg: string) => void;
    isSupabaseConnected: boolean;
}

interface PendingAttachment {
    file: File;
    previewUrl: string;
    type: string;
    base64Data?: string;
}

const Terminal: React.FC<TerminalProps> = ({ 
    currentPersona, userProfile, currentLanguage, voiceConfig, selectedModel, onError, isSupabaseConnected 
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingStatus, setTypingStatus] = useState('');
    const [generatingTTSId, setGeneratingTTSId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    // Added missing state for copy status
    const [copiedId, setCopiedId] = useState<string | null>(null);
    
    // ATTACHMENT STATES
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
    const [isRecording, setIsRecording] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
        }
    }, [input]);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const history = await fetchChatHistory(currentPersona.id);
                if (history) setMessages(history);
                else setMessages([]);
            } catch (err) { console.error(err); }
        };
        loadHistory();
    }, [currentPersona.id]);

    useEffect(() => {
        scrollToBottom();
        const timer = setTimeout(scrollToBottom, 300);
        return () => clearTimeout(timer);
    }, [messages, isTyping, editingId]);

    // Fix: Cast Array.from(files) to File[] to resolve 'unknown' property errors
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        (Array.from(files) as File[]).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = ev.target?.result as string;
                setPendingAttachments(prev => [...prev, {
                    file,
                    previewUrl: file.type.startsWith('image/') ? base64 : '',
                    type: file.type,
                    base64Data: base64.split(',')[1]
                }]);
            };
            if (file.type.startsWith('image/') || file.type.startsWith('text/') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.json')) {
                reader.readAsDataURL(file);
            } else {
                setPendingAttachments(prev => [...prev, {
                    file,
                    previewUrl: '',
                    type: file.type
                }]);
            }
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (index: number) => {
        setPendingAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handlePlayTTS = async (id: string, text: string) => {
        if (generatingTTSId) return;
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const tempCtx = new AudioContext();
        if (tempCtx.state === 'suspended') await tempCtx.resume();

        setGeneratingTTSId(id);
        try {
            const audio = await generateTTS(text, currentPersona.voiceName);
            if (audio) {
                setMessages(prev => prev.map(m => m.id === id ? { ...m, audioUrl: `data:audio/wav;base64,${audio}` } : m));
            }
        } finally {
            setGeneratingTTSId(null);
        }
    };

    const handleSendMessage = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if ((!textToSend.trim() && pendingAttachments.length === 0) || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: textToSend,
            timestamp: Date.now(),
            replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, role: replyingTo.role } : undefined,
            attachments: pendingAttachments.map(pa => ({
                name: pa.file.name,
                url: pa.previewUrl,
                type: pa.type,
                size: pa.file.size
            }))
        };

        const currentAttachments = [...pendingAttachments];
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setPendingAttachments([]);
        setReplyingTo(null);
        setIsTyping(true);
        setTypingStatus('Connecting to Akasha...');

        try {
            const historyForAi = messages.slice(-15).map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            // Prepare Multimodal Input
            const imageParts = currentAttachments
                .filter(pa => pa.type.startsWith('image/'))
                .map(pa => ({
                    inlineData: {
                        mimeType: pa.type,
                        data: pa.base64Data || ""
                    }
                }));

            // Include document content if it's a text file
            let enrichedPrompt = textToSend;
            for (const pa of currentAttachments) {
                if (!pa.type.startsWith('image/') && pa.base64Data) {
                    try {
                        const decoded = atob(pa.base64Data);
                        enrichedPrompt += `\n\n[FILE_CONTENT: ${pa.file.name}]\n${decoded}`;
                    } catch (e) { console.error("Failed to decode text file", e); }
                }
            }

            const rawResponse = await chatWithAI(
                selectedModel,
                historyForAi,
                enrichedPrompt,
                currentPersona.systemInstruction,
                `User Node: ${userProfile.username}. Time: ${new Date().toLocaleTimeString()}`,
                imageParts
            );

            let imgUrl: string | undefined;
            const cleanText = rawResponse.replace(/\|\|GEN_IMG:.*?\|\|/g, '').trim();
            const imgMatch = rawResponse.match(/\|\|GEN_IMG:\s*(.*?)\s*\|\|/);
            
            if (imgMatch) {
                setTypingStatus('Manifesting Visual...');
                const generatedImg = await generateImage(imgMatch[1], currentPersona.id, undefined, undefined, selectedModel);
                if (generatedImg) imgUrl = generatedImg;
            }

            const modelMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: cleanText,
                imageUrl: imgUrl,
                timestamp: Date.now(),
                model: selectedModel
            };

            const finalMessages = [...messages, userMsg, modelMsg];
            setMessages(finalMessages);
            
            if (isSupabaseConnected) {
                await syncChatHistory(currentPersona.id, finalMessages);
            }

            if (voiceConfig.autoPlay) {
                handlePlayTTS(modelMsg.id, modelMsg.text);
            }

        } catch (err: any) {
            onError(err.message || 'Link failed.');
        } finally {
            setIsTyping(false);
            setTypingStatus('');
        }
    };

    // Fix: Implement missing handleSaveEdit to handle message editing and optional regeneration
    const handleSaveEdit = async (id: string, newText: string, regenerate: boolean) => {
        setEditingId(null);
        if (regenerate) {
            const index = messages.findIndex(m => m.id === id);
            if (index !== -1) {
                const truncated = messages.slice(0, index);
                setMessages(truncated);
                await handleSendMessage(newText);
            }
        } else {
            const updated = messages.map(m => m.id === id ? { ...m, text: newText } : m);
            setMessages(updated);
            if (isSupabaseConnected) {
                await syncChatHistory(currentPersona.id, updated);
            }
        }
    };

    // Fix: Implement missing handleTranslate to call translation service
    const handleTranslate = async (id: string, text: string) => {
        setIsTranslating(id);
        try {
            const translated = await translateText(text, currentLanguage.label);
            setMessages(prev => prev.map(m => m.id === id ? { ...m, translatedText: translated, showTranslation: true } : m));
        } catch (err) {
            onError("Translation link failed.");
        } finally {
            setIsTranslating(null);
        }
    };

    // Fix: Implement missing handleDelete to remove message fragments
    const handleDelete = async (id: string) => {
        if (!window.confirm("Purge this memory fragment?")) return;
        const updated = messages.filter(m => m.id !== id);
        setMessages(updated);
        if (isSupabaseConnected) {
            await syncChatHistory(currentPersona.id, updated);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
        if (type.includes('javascript') || type.includes('json') || type.includes('typescript')) return <FileCode className="w-4 h-4" />;
        if (type.startsWith('audio/')) return <Music className="w-4 h-4" />;
        if (type.startsWith('video/')) return <Film className="w-4 h-4" />;
        if (type.includes('pdf') || type.includes('text')) return <FileText className="w-4 h-4" />;
        return <File className="w-4 h-4" />;
    };

    return (
        <div className="flex flex-col h-full bg-[#0b0e14] relative overflow-hidden">
            {lightboxUrl && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setLightboxUrl(null)}>
                    <img src={lightboxUrl} className="max-w-full max-h-[85vh] object-contain rounded-2xl border-2 border-[#d3bc8e]/30 shadow-[0_0_80px_rgba(211,188,142,0.3)] animate-in zoom-in duration-500" alt="Preview" onClick={e => e.stopPropagation()} />
                    <div className="fixed bottom-12 flex items-center gap-6 bg-[#13182b]/90 backdrop-blur-xl border border-[#d3bc8e]/40 px-10 py-5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-10 duration-700" onClick={e => e.stopPropagation()}>
                        <button onClick={() => {const a = document.createElement('a'); a.href = lightboxUrl; a.download = `artifact_${Date.now()}.png`; a.click();}} className="flex items-center gap-3 text-xs font-black text-[#d3bc8e] uppercase tracking-[0.2em] hover:text-white transition-all hover:scale-110 active:scale-95"><Download className="w-5 h-5" /> <span>Extract Data</span></button>
                        <div className="w-px h-6 bg-[#d3bc8e]/20"></div>
                        <button onClick={() => setLightboxUrl(null)} className="flex items-center gap-3 text-xs font-black text-red-400 uppercase tracking-[0.2em] hover:text-white transition-all hover:scale-110 active:scale-95"><X className="w-5 h-5" /> <span>Close Portal</span></button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar min-h-0 relative">
                {messages.length === 0 && !isTyping && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-10">
                        <TerminalIcon className="w-16 h-16 mb-4 genshin-gold" />
                        <p className="text-sm font-black uppercase tracking-[0.3em]">Celestial Resonance Ready</p>
                        <p className="text-[10px] mt-2 italic font-bold">Awaiting transmission with {currentPersona.name}...</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <MessageItem key={msg.id} msg={msg} userProfile={userProfile} currentPersona={currentPersona} editingId={editingId} editValue={editValue} copiedId={copiedId} isTranslating={isTranslating} generatingTTSId={generatingTTSId} onLightbox={setLightboxUrl} onEditChange={setEditValue} onSaveEdit={handleSaveEdit} onCancelEdit={() => setEditingId(null)} onCopy={(text, id) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }} onTranslate={handleTranslate} onToggleTranslation={(id) => setMessages(prev => prev.map(m => m.id === id ? { ...m, showTranslation: !m.showTranslation } : m))} onDelete={handleDelete} onEditStart={(m) => { setEditingId(m.id); setEditValue(m.text); }} onPlayTTS={handlePlayTTS} onReply={setReplyingTo} voiceConfig={voiceConfig} isLatest={idx === messages.length - 1} />
                ))}
                {isTyping && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-[#d3bc8e]/10 border border-[#d3bc8e]/20 rounded-full w-fit animate-in fade-in slide-in-from-left-4">
                        <Loader2 className="w-3 h-3 animate-spin text-[#d3bc8e]" />
                        <span className="text-[9px] font-black text-[#d3bc8e] uppercase tracking-[0.2em]">{typingStatus}</span>
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4 w-full" />
            </div>

            <div className="p-4 sm:p-6 bg-[#0e121b]/95 border-t border-[#d3bc8e]/10 safe-area-bottom">
                {/* ATTACHMENT PREVIEW BAR */}
                {pendingAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 animate-in slide-in-from-bottom-2">
                        {pendingAttachments.map((pa, idx) => (
                            <div key={idx} className="relative group/att">
                                <div className="w-16 h-16 rounded-xl border border-[#d3bc8e]/30 bg-black/40 overflow-hidden flex items-center justify-center">
                                    {pa.previewUrl ? (
                                        <img src={pa.previewUrl} className="w-full h-full object-cover" alt="att" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1">
                                            {getFileIcon(pa.type)}
                                            <span className="text-[6px] font-bold text-gray-500 truncate w-12 text-center uppercase">{pa.file.name.split('.').pop()}</span>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => removeAttachment(idx)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-lg group-hover/att:scale-110 transition-transform"><X className="w-3 h-3" /></button>
                            </div>
                        ))}
                    </div>
                )}

                {replyingTo && (
                    <div className="mb-4 p-3 bg-[#d3bc8e]/10 border-l-4 border-[#d3bc8e] rounded-r-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-black text-[#d3bc8e] uppercase tracking-widest flex items-center gap-2"><Reply className="w-3 h-3" /> Replying to {replyingTo.role === 'user' ? 'You' : currentPersona.name}</span>
                            <p className="text-xs text-gray-400 italic truncate">"{replyingTo.text}"</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-500"><X className="w-4 h-4" /></button>
                    </div>
                )}
                
                <div className="flex gap-4 items-end max-w-6xl mx-auto">
                    {/* ENHANCED MIC BUTTON */}
                    <button 
                        onMouseDown={() => setIsRecording(true)}
                        onMouseUp={() => setIsRecording(false)}
                        onTouchStart={() => setIsRecording(true)}
                        onTouchEnd={() => setIsRecording(false)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shrink-0 mb-1 relative group ${isRecording ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110' : 'bg-white/5 border border-[#d3bc8e]/20 text-[#d3bc8e] hover:bg-[#d3bc8e]/10 hover:border-[#d3bc8e]/50'}`}
                        title="Resonance Link (Hold to Record)"
                    >
                        {isRecording && <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-40"></div>}
                        <Mic className={`w-7 h-7 transition-transform ${isRecording ? 'scale-110 text-white' : 'group-hover:scale-110'}`} />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-[#0b0e14] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        </div>
                    </button>

                    <div className="relative flex-1 group">
                        <textarea 
                            ref={textareaRef}
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            onKeyDown={handleKeyDown}
                            rows={1}
                            className="w-full bg-white/5 border border-white/10 rounded-3xl px-8 py-5 text-white focus:outline-none focus:border-[#d3bc8e] transition-all text-sm select-text placeholder:text-gray-600 shadow-inner resize-none overflow-y-auto custom-scrollbar min-h-[64px] max-h-40 leading-relaxed pr-24" 
                            placeholder={`Message ${currentPersona.name}...`} 
                        />
                        <div className="absolute right-6 bottom-5 flex items-center gap-4">
                             {/* MULTI-FORMAT UPLOAD BUTTON */}
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 text-gray-500 hover:text-[#d3bc8e] hover:bg-white/5 rounded-full transition-all active:scale-90"
                                title="Attach Memory Fragment"
                             >
                                <Paperclip className="w-5 h-5" />
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    multiple 
                                    onChange={handleFileSelect}
                                    accept="image/*,text/*,application/pdf,.js,.ts,.json"
                                />
                             </button>
                        </div>
                    </div>

                    <button 
                        onClick={() => handleSendMessage()} 
                        disabled={(!input.trim() && pendingAttachments.length === 0) || isTyping} 
                        className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-xl shrink-0 mb-1 ${ (input.trim() || pendingAttachments.length > 0) && !isTyping ? 'genshin-button scale-100 hover:brightness-110 active:scale-90 hover:shadow-[0_0_20px_rgba(211,188,142,0.4)]' : 'bg-white/5 text-gray-600 grayscale scale-95 opacity-50'}`}
                    >
                        <Send className="w-7 h-7 ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Terminal;
