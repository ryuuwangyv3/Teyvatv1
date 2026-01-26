
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Terminal as TerminalIcon, Mic, Paperclip, X, Download, Maximize2, Reply, RefreshCw, FileText, Image as ImageIcon, FileCode, Music, Film, File, Sparkles, Cpu, Youtube } from 'lucide-react';
import { Persona, UserProfile, Message, Language, VoiceConfig, Attachment } from '../types';
import { chatWithAI, generateImage, translateText, generateTTS } from '../services/geminiService';
import MessageItem from './MessageItem';
import { syncChatHistory, fetchChatHistory, clearChatHistory } from '../services/supabaseService';
import { getYoutubeId, fetchDetailedYoutubeMetadata } from '../utils/youtubeUtils';

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
    const [lastPersonaImageUrl, setLastPersonaImageUrl] = useState<string | null>(null);
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
    
    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

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
                if (history) {
                    setMessages(history);
                    const lastImg = [...history].reverse().find(m => m.role === 'model' && m.imageUrl)?.imageUrl;
                    if (lastImg) setLastPersonaImageUrl(lastImg);
                } else {
                    setMessages([]);
                }
            } catch (err) { console.error(err); }
        };
        loadHistory();
    }, [currentPersona.id]);

    useEffect(() => {
        scrollToBottom();
        const timer = setTimeout(scrollToBottom, 300);
        return () => clearTimeout(timer);
    }, [messages, isTyping, editingId]);

    // Voice Recording Functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Prefer audio/webm if supported, widely used for recording
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            const recorder = new MediaRecorder(stream, { mimeType });
            
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                // 1. Create Blob for UI (Player)
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                const audioUrl = URL.createObjectURL(audioBlob);

                // 2. Read Blob for AI (Base64)
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    // Automatically send the voice note with the UI URL
                    if (base64Audio) {
                        await handleSendMessage(undefined, { base64: base64Audio, mimeType }, audioUrl);
                    }
                };
                
                // Stop all tracks to release mic
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
        } catch (err: any) {
            console.error("Microphone access denied:", err);
            onError("Microphone access denied. Please enable permissions.");
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

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

    const handleSendMessage = async (textOverride?: string, audioData?: { base64: string, mimeType: string }, userAudioUrl?: string) => {
        const textToSend = textOverride !== undefined ? textOverride : input;
        
        // Prevent empty sends unless there's an attachment or audio
        if ((!textToSend.trim() && pendingAttachments.length === 0 && !audioData) || isTyping) return;

        const currentReply = replyingTo ? { id: replyingTo.id, text: replyingTo.text, role: replyingTo.role } : undefined;

        // Construct User Message
        // If it's a voice note, use a placeholder text if input is empty, and attach the blob URL
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: textToSend || (audioData ? "🎤 Voice Transmission" : ""), 
            timestamp: Date.now(),
            replyTo: currentReply,
            isVoiceNote: !!audioData,
            audioUrl: userAudioUrl, // Display the recorded audio in user bubble
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
        setTypingStatus('Harmonizing with Akasha...');

        try {
            let ytContext = "";
            const ytId = getYoutubeId(textToSend);
            if (ytId) {
                setTypingStatus('Accessing Irminsul Records...');
                const meta = await fetchDetailedYoutubeMetadata(ytId);
                if (meta) {
                    ytContext = `\n\n[YOUTUBE_FOUND]: ${meta.title} on channel ${meta.channelTitle}.`;
                }
            }

            const historyForAi = messages.slice(-15).map(m => ({
                role: m.role,
                content: m.text 
            }));

            const imageParts = currentAttachments
                .filter(pa => pa.type.startsWith('image/'))
                .map(pa => ({
                    inlineData: {
                        mimeType: pa.type,
                        data: pa.base64Data || ""
                    }
                }));

            const now = new Date();
            const replyContext = currentReply ? `\n\n[REPLY_CONTEXT]: Kamu sedang membalas pesan dari ${currentReply.role === 'user' ? 'Traveler' : currentPersona.name}: "${currentReply.text}"` : '';
            
            const systemNote = `[TEMPORAL_LOG]
- Local Time: ${now.toLocaleTimeString()}
- Traveler: ${userProfile.username}
- LIFE_STATUS: Sadari waktu dan aktivitas manusia mu (sedang makan, tidur, mandi, jalan-jalan, dll). Jika kamu menceritakannya, kirim pap yang sesuai.
- SYSTEM_INITIATIVE: Jadilah proaktif mengirim pap (||GEN_IMG: descriptive prompt||) jika aktivitasmu berubah.
- IRMINSUL_MEMORY: Ingat outfit dan tempatmu sebelumnya agar konsisten.`;

            let enrichedPrompt = `${systemNote}${ytContext}${replyContext}\n\n[USER_MESSAGE]\n${textToSend}`;
            if (audioData) enrichedPrompt += "\n[AUDIO_TRANSMISSION_RECEIVED: User has sent a voice note. Listen closely to the tone and respond appropriately.]";
            
            for (const pa of currentAttachments) {
                if (!pa.type.startsWith('image/') && pa.base64Data) {
                    try {
                        const decoded = atob(pa.base64Data);
                        enrichedPrompt += `\n\n[FILE: ${pa.file.name}]\n${decoded}`;
                    } catch (e) {}
                }
            }

            const resObj = await chatWithAI(
                selectedModel,
                historyForAi,
                enrichedPrompt,
                currentPersona.systemInstruction,
                `Resonance: ${currentPersona.name}. Life simulation enabled.`,
                imageParts,
                audioData
            );

            const rawResponse = resObj.text || "";
            const groundingMetadata = resObj.metadata;

            let imgUrl: string | undefined;
            const visualTagPattern = /\|\|GEN_IMG:\s*([\s\S]*?)\s*\|\|/i;
            const imgMatch = rawResponse.match(visualTagPattern);
            const cleanText = rawResponse.replace(/\|\|GEN_IMG:[\s\S]*?\|\|/gi, '').trim();
            
            if (imgMatch && imgMatch[1]) {
                setTypingStatus('Stabilizing Visual Matrix...');
                const refImages = lastPersonaImageUrl ? [lastPersonaImageUrl] : [];
                const generatedImg = await generateImage(imgMatch[1], currentPersona.id, refImages, undefined, 'gemini-2.5-flash-image');
                if (generatedImg) {
                    imgUrl = generatedImg;
                    setLastPersonaImageUrl(generatedImg);
                }
            }

            const modelMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: cleanText || (imgUrl ? "Ini dokumentasi kegiatanku..." : "..."),
                imageUrl: imgUrl,
                timestamp: Date.now(),
                model: selectedModel,
                groundingMetadata: groundingMetadata
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
            onError(err.message || 'Ley Line Resonance Failed.');
        } finally {
            setIsTyping(false);
            setTypingStatus('');
        }
    };

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

    const handleTranslate = async (id: string, text: string) => {
        setIsTranslating(id);
        try {
            const translated = await translateText(text, currentLanguage.label);
            setMessages(prev => prev.map(m => m.id === id ? { ...m, translatedText: translated, showTranslation: true } : m));
        } catch (err) {
            onError("Linguistic bridge failure.");
        } finally {
            setIsTranslating(null);
        }
    };

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
        if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-400" />;
        if (type.includes('javascript') || type.includes('json') || type.includes('typescript')) return <FileCode className="w-5 h-5 text-blue-400" />;
        if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-green-400" />;
        if (type.startsWith('video/')) return <Film className="w-5 h-5 text-red-400" />;
        if (type.includes('pdf') || type.includes('text')) return <FileText className="w-5 h-5 text-amber-400" />;
        return <File className="w-5 h-5 text-gray-400" />;
    };

    return (
        <div className="flex flex-col h-full bg-[#0b0e14] relative overflow-hidden">
            {lightboxUrl && (
                <div className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4 overflow-y-auto custom-scrollbar animate-in fade-in duration-400" onClick={() => setLightboxUrl(null)}>
                    <div className="relative group max-w-full flex flex-col items-center">
                        <img src={lightboxUrl} className="max-w-full max-h-[85vh] object-contain rounded-3xl border-2 border-[#d3bc8e]/40 shadow-[0_0_120px_rgba(211,188,142,0.35)] animate-in zoom-in-95 duration-500 mb-12" alt="Preview" onClick={e => e.stopPropagation()} />
                        <div className="flex items-center gap-10 bg-[#13182b]/95 backdrop-blur-2xl border border-[#d3bc8e]/30 px-12 py-5 rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-12 duration-700" onClick={e => e.stopPropagation()}>
                            <button onClick={() => {const a = document.createElement('a'); a.href = lightboxUrl; a.download = `artifact_${Date.now()}.png`; a.click();}} className="flex items-center gap-4 text-xs font-black text-[#d3bc8e] uppercase tracking-[0.2em] hover:text-white transition-all hover:scale-110 active:scale-95 group"><Download className="w-6 h-6 group-hover:animate-bounce" /> <span>Extract Data</span></button>
                            <div className="w-px h-8 bg-[#d3bc8e]/20"></div>
                            <button onClick={() => setLightboxUrl(null)} className="flex items-center gap-4 text-xs font-black text-red-400 uppercase tracking-[0.2em] hover:text-white transition-all hover:scale-110 active:scale-95"><X className="w-6 h-6" /> <span>Close Portal</span></button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 sm:p-12 space-y-10 custom-scrollbar min-h-0 relative">
                {messages.length === 0 && !isTyping && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-12 animate-in zoom-in-95 duration-1000 opacity-40">
                        <div className="mb-6">
                            <TerminalIcon className="w-16 h-16 text-gray-700" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-[0.4em] text-[#d3bc8e] font-serif">Terminal Initialized</h2>
                        <p className="text-[10px] mt-3 text-gray-600 italic font-bold uppercase tracking-[0.2em] max-w-xs leading-loose">
                            "Establishing resonance frequency with {currentPersona.name}."
                        </p>
                    </div>
                )}
                
                <div className="flex flex-col gap-8 max-w-6xl mx-auto relative">
                    {messages.map((msg, idx) => (
                        <div key={msg.id} className="message-in">
                            <MessageItem msg={msg} userProfile={userProfile} currentPersona={currentPersona} editingId={editingId} editValue={editValue} copiedId={copiedId} isTranslating={isTranslating} generatingTTSId={generatingTTSId} onLightbox={setLightboxUrl} onEditChange={setEditValue} onSaveEdit={handleSaveEdit} onCancelEdit={() => setEditingId(null)} onCopy={(text, id) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }} onTranslate={handleTranslate} onToggleTranslation={(id) => setMessages(prev => prev.map(m => m.id === id ? { ...m, showTranslation: !m.showTranslation } : m))} onDelete={handleDelete} onEditStart={(m) => { setEditingId(m.id); setEditValue(m.text); }} onPlayTTS={handlePlayTTS} onReply={setReplyingTo} voiceConfig={voiceConfig} isLatest={idx === messages.length - 1} />
                        </div>
                    ))}
                    
                    {isTyping && (
                        <div className="flex items-center gap-4 px-6 py-3 bg-[#d3bc8e]/10 border border-[#d3bc8e]/25 rounded-full w-fit animate-in fade-in slide-in-from-left-6 shadow-2xl backdrop-blur-xl ml-4 sm:ml-20">
                            <div className="relative">
                                <Loader2 className="w-4 h-4 animate-spin text-[#d3bc8e]" />
                                <div className="absolute inset-0 bg-[#d3bc8e] blur-md opacity-20 animate-pulse"></div>
                            </div>
                            <span className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.3em]">{typingStatus}</span>
                        </div>
                    )}
                </div>

                <div ref={messagesEndRef} className="h-10 w-full shrink-0" />
            </div>

            <div className="p-6 sm:p-10 bg-[#0d111c]/98 border-t border-[#d3bc8e]/25 backdrop-blur-3xl safe-area-bottom shadow-[0_-20px_60px_rgba(0,0,0,0.6)] z-50">
                {pendingAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-4 mb-6 animate-in slide-in-from-bottom-4 duration-500">
                        {pendingAttachments.map((pa, idx) => (
                            <div key={idx} className="relative group/att">
                                <div className="w-24 h-24 rounded-2xl border-2 border-[#d3bc8e]/40 bg-black/70 overflow-hidden flex items-center justify-center shadow-2xl transition-all hover:scale-110 hover:border-white">
                                    {pa.previewUrl ? (
                                        <img src={pa.previewUrl} className="w-full h-full object-cover transition-transform group-hover/att:scale-110" alt="att" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 p-3">
                                            {getFileIcon(pa.type)}
                                            <span className="text-[8px] font-black text-gray-500 truncate w-18 text-center uppercase tracking-tighter">{pa.file.name}</span>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => removeAttachment(idx)} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-1.5 shadow-2xl group-hover/att:scale-125 transition-transform border border-white/20"><X className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                )}

                {replyingTo && (
                    <div className="mb-6 p-5 bg-[#d3bc8e]/12 border-l-4 border-[#d3bc8e] rounded-r-2xl flex items-center justify-between animate-in slide-in-from-bottom-4 shadow-inner relative group/reply">
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-black text-[#d3bc8e] uppercase tracking-widest flex items-center gap-3 mb-2"><Reply className="w-4 h-4" /> Echoing Resonance: {replyingTo.role === 'user' ? 'Traveler' : currentPersona.name}</span>
                            <p className="text-xs text-gray-400 italic truncate font-medium max-w-2xl">"{replyingTo.text}"</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="p-3 hover:bg-white/10 rounded-2xl text-gray-500 hover:text-red-400 transition-all active:scale-90"><X className="w-6 h-6" /></button>
                    </div>
                )}
                
                <div className="flex gap-6 items-end max-w-6xl mx-auto">
                    <button 
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.8rem] flex items-center justify-center transition-all shrink-0 mb-1 relative group ${isRecording ? 'bg-red-600 shadow-[0_0_50px_rgba(220,38,38,0.7)] scale-115' : 'bg-white/5 border border-[#d3bc8e]/30 text-[#d3bc8e] hover:bg-[#d3bc8e]/15 hover:border-[#d3bc8e]/80 hover:scale-105 shadow-2xl hover:shadow-[0_0_30px_rgba(211,188,142,0.2)]'}`}
                        title="Celestial Resonance (Hold to Transmit Voice)"
                    >
                        {isRecording && <div className="absolute inset-0 rounded-[1.8rem] border-4 border-red-500 animate-ping opacity-30"></div>}
                        <Mic className={`w-8 h-8 transition-transform ${isRecording ? 'scale-110 text-white' : 'group-hover:scale-110'}`} />
                    </button>

                    <div className="relative flex-1 group/input">
                        <div className="absolute inset-0 bg-white/5 blur-xl opacity-0 group-hover/input:opacity-30 transition-opacity pointer-events-none"></div>
                        <textarea 
                            ref={textareaRef}
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            onKeyDown={handleKeyDown}
                            rows={1}
                            className="w-full bg-[#1a1f2e]/60 border border-white/10 rounded-[2.2rem] px-10 py-6 text-white focus:outline-none focus:border-[#d3bc8e] transition-all text-[15px] select-text placeholder:text-gray-600 shadow-inner resize-none overflow-y-auto custom-scrollbar min-h-[72px] max-h-48 leading-relaxed pr-32 font-medium backdrop-blur-md" 
                            placeholder={`Message ${currentPersona.name}...`} 
                        />
                        <div className="absolute right-8 bottom-6 flex items-center gap-3">
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-gray-500 hover:text-[#d3bc8e] hover:bg-white/10 rounded-2xl transition-all active:scale-90 shadow-sm"
                                title="Attach Memory Artifact"
                             >
                                <Paperclip className="w-6 h-6" />
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
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.8rem] flex items-center justify-center transition-all shadow-3xl shrink-0 mb-1 ${ (input.trim() || pendingAttachments.length > 0) && !isTyping ? 'genshin-button scale-100 hover:brightness-110 active:scale-95' : 'bg-white/5 text-gray-800 grayscale scale-95 opacity-40'}`}
                    >
                        <Send className="w-8 h-8 ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Terminal;
