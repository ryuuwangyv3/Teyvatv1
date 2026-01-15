
import React, { useMemo, useState, useEffect } from 'react';
import { 
    Copy, Check, Edit2, Volume2, Languages, Trash2, Loader2, Zap, ExternalLink, 
    Reply, Cpu, Globe, Maximize2, X, Save, RefreshCw, Youtube, Globe2, 
    Terminal as TerminalIcon, Github, Music2, FileText as FileIcon, Twitter, 
    Instagram, Search, LayoutList, Book, Gamepad2, Palette, MessageSquare,
    Image as LucideImage, Play, ArrowRight, Expand, Monitor, MousePointer2, ShieldCheck
} from 'lucide-react';
import { Message, UserProfile, Persona, VoiceConfig } from '../types';
import LazyImage from './LazyImage';
import AudioPlayer from './AudioPlayer';
import { getYoutubeId } from '../utils/youtubeUtils';

interface MessageItemProps {
    msg: Message;
    userProfile: UserProfile;
    currentPersona: Persona;
    editingId: string | null;
    editValue: string;
    copiedId: string | null;
    isTranslating: string | null;
    generatingTTSId: string | null;
    onLightbox: (url: string) => void;
    onEditChange: (val: string) => void;
    onSaveEdit: (id: string, text: string, regenerate: boolean) => void;
    onCancelEdit: () => void;
    onCopy: (text: string, id: string) => void;
    onTranslate: (id: string, text: string) => void;
    onToggleTranslation: (id: string) => void;
    onDelete: (id: string) => void;
    onEditStart: (msg: Message) => void;
    onPlayTTS: (id: string, text: string) => void;
    onReply: (msg: Message) => void;
    voiceConfig: VoiceConfig;
    isLatest?: boolean; 
}

// --- UTILS ---
const parseTimestampToSeconds = (time: string) => {
    const parts = time.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
};

// --- COMPONENT: WEB PORTAL FRAME (Genshin Style) ---
const WebPortalFrame: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    
    return (
        <div className="mt-4 w-full animate-in zoom-in-95 slide-in-from-top-2 duration-500">
            <div className="genshin-panel overflow-hidden border-2 border-[#d3bc8e]/40 shadow-[0_25px_60px_rgba(0,0,0,0.7)] bg-[#0b0e14]">
                {/* Portal Header */}
                <div className="px-4 py-3 bg-[#131823] border-b border-[#d3bc8e]/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.2em] truncate max-w-[200px]">
                            Dimensional Portal: {new URL(url).hostname}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => window.open(url, '_blank')} className="p-1.5 text-gray-500 hover:text-white transition-colors" title="Open in New Tab">
                            <ExternalLink size={14} />
                        </button>
                        <button onClick={onClose} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-md transition-all">
                            <X size={14} />
                        </button>
                    </div>
                </div>
                
                {/* Iframe Area */}
                <div className="relative aspect-video sm:aspect-[16/10] bg-white">
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0e14] z-10">
                            <Loader2 className="w-8 h-8 text-[#d3bc8e] animate-spin mb-3" />
                            <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Resonating with Source...</span>
                        </div>
                    )}
                    <iframe 
                        src={url} 
                        className="w-full h-full border-0" 
                        onLoad={() => setIsLoading(false)}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                </div>
                
                {/* Portal Footer */}
                <div className="px-4 py-2 bg-[#0b0e14] flex items-center justify-center border-t border-white/5">
                    <p className="text-[7px] text-gray-600 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <ShieldCheck size={10} /> Akasha Sandbox Protection Active
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: GROUNDING SOURCES ---
const GroundingSources: React.FC<{ metadata: any; onPortal: (url: string) => void }> = ({ metadata, onPortal }) => {
    if (!metadata || !metadata.groundingChunks || metadata.groundingChunks.length === 0) return null;

    const sources = metadata.groundingChunks.filter((c: any) => c.web).map((c: any) => c.web);
    if (sources.length === 0) return null;

    return (
        <div className="mt-4 w-full bg-[#1e2235]/50 border border-[#d3bc8e]/20 rounded-2xl overflow-hidden shadow-xl animate-in zoom-in-95 duration-500">
            <div className="px-4 py-2 bg-[#131823] border-b border-[#d3bc8e]/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Search size={14} className="text-[#d3bc8e]" />
                    <span className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.2em]">Verified Archive</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-[#d3bc8e] animate-pulse"></div>
                    <span className="text-[8px] font-bold text-gray-500 uppercase">Irminsul Sync Active</span>
                </div>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sources.slice(0, 4).map((src: any, i: number) => (
                    <div 
                        key={i} 
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#d3bc8e]/10 transition-all border border-transparent hover:border-[#d3bc8e]/20 group bg-black/20"
                    >
                        <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center shrink-0 text-[10px] font-black text-[#d3bc8e] border border-[#d3bc8e]/10">
                            {i+1}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] text-[#ece5d8] truncate font-bold group-hover:text-[#d3bc8e] transition-colors leading-none">
                                {src.title}
                            </div>
                            <div className="text-[8px] text-gray-500 truncate mt-1 uppercase font-black tracking-tighter">
                                {new URL(src.uri).hostname.replace('www.', '')}
                            </div>
                        </div>
                        <button 
                            onClick={() => onPortal(src.uri)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#d3bc8e] hover:text-black transition-all text-gray-500 opacity-0 group-hover:opacity-100"
                            title="Open Portal"
                        >
                            <Monitor size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- COMPONENT: SMART EMBED ---
const SmartEmbed: React.FC<{ url: string; onPortal: (url: string) => void }> = ({ url, onPortal }) => {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const youtubeId = getYoutubeId(url);
    const domain = useMemo(() => {
        try { return new URL(fullUrl).hostname.replace('www.', ''); } catch { return ''; }
    }, [fullUrl]);
    
    const isImageDirect = /\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i.test(fullUrl);
    const isSocialImage = domain.includes('imgur.com') || domain.includes('pinterest.com') || domain.includes('pin.it');

    const [isImageLoadError, setIsImageLoadError] = useState(false);
    const [seekSeconds, setSeekSeconds] = useState(0);

    useEffect(() => {
        const handleSeek = (e: CustomEvent) => {
            if (youtubeId && e.detail?.seconds !== undefined) setSeekSeconds(e.detail.seconds);
        };
        window.addEventListener('akasha-seek-youtube', handleSeek as EventListener);
        return () => window.removeEventListener('akasha-seek-youtube', handleSeek as EventListener);
    }, [youtubeId]);

    if (youtubeId) {
        const embedSrc = `https://www.youtube-nocookie.com/embed/${youtubeId}?start=${seekSeconds}&autoplay=${seekSeconds > 0 ? 1 : 0}&rel=0&modestbranding=1&enablejsapi=1`;
        return (
            <div className="mt-4 w-full max-w-[500px] overflow-hidden rounded-2xl border-2 border-[#d3bc8e]/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-black animate-in zoom-in-95 duration-500">
                <div className="relative pb-[56.25%] h-0">
                    <iframe 
                        className="absolute top-0 left-0 w-full h-full"
                        src={embedSrc}
                        title="Irminsul Stream" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                </div>
                <div className="px-4 py-2 bg-[#131823] flex items-center justify-between border-t border-[#d3bc8e]/10">
                    <div className="flex items-center gap-2">
                        <Youtube className="w-4 h-4 text-red-500" />
                        <span className="text-[9px] font-black text-[#d3bc8e] uppercase tracking-widest">Temporal Stream</span>
                    </div>
                    <a href={fullUrl} target="_blank" rel="noreferrer" className="text-[8px] font-black text-gray-500 hover:text-white uppercase tracking-tighter">Open Node</a>
                </div>
            </div>
        );
    }

    if ((isImageDirect || isSocialImage) && !isImageLoadError) {
        return (
            <div className="mt-4 max-w-[400px] rounded-2xl overflow-hidden border border-[#d3bc8e]/20 group cursor-pointer relative shadow-2xl animate-in zoom-in-95 duration-500 bg-[#131823]">
                <img src={fullUrl} alt="Visual Logic" className="w-full h-auto object-cover max-h-[350px] transition-transform duration-700 group-hover:scale-105" onError={() => setIsImageLoadError(true)} loading="lazy" />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={fullUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-2.5 bg-[#d3bc8e] text-black rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl scale-95 group-hover:scale-100 transition-transform">
                        <Expand className="w-4 h-4"/> Extract Visual
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-3 block w-full max-w-md group animate-in slide-in-from-left-2 duration-300">
            <div className="bg-[#131823]/80 backdrop-blur-md border border-[#d3bc8e]/20 rounded-2xl p-3.5 flex items-center gap-4 hover:bg-[#1a1f2e] hover:border-[#d3bc8e]/60 transition-all shadow-lg overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="w-10 h-10 rounded-xl bg-black/60 flex items-center justify-center shrink-0 border border-[#d3bc8e]/10 text-[#8a92b2] shadow-inner">
                    <img 
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} 
                        alt="icon" 
                        className="w-6 h-6 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iMiIgeTE9IjEyIiB4Mj0iMjIiIHkyPSIxMiI+PC9saW5lPjxwYXRoIGQ9Ik0xMiAyYTYuMjYgNi4yNiAwIDAgMCAwIDIwIDYuMjYgNi4yNiAwIDAgMCAwLTIwIj48L3BhdGg+PC9zdmc+'; }}
                    />
                </div>
                <div className="flex-1 min-w-0 z-10">
                    <div className="text-[11px] font-black text-[#d3bc8e] uppercase tracking-widest truncate group-hover:text-white transition-colors">{domain}</div>
                    <div className="text-[9px] text-gray-500 truncate mt-1 font-medium">{fullUrl.replace(/^https?:\/\//, '')}</div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onPortal(fullUrl)}
                        className="p-2 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black rounded-xl transition-all shadow-md group/portbtn"
                        title="View Web Portal"
                    >
                        <Monitor size={14} className="group-hover/portbtn:scale-110 transition-transform" />
                    </button>
                    <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:text-[#d3bc8e] transition-colors">
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: TIMESTAMP LINK ---
const TimestampLink: React.FC<{ time: string }> = ({ time }) => {
    const handleClick = () => {
        const seconds = parseTimestampToSeconds(time);
        const event = new CustomEvent('akasha-seek-youtube', { detail: { seconds } });
        window.dispatchEvent(event);
    };
    return (
        <button 
            onClick={handleClick} 
            className="text-amber-400 font-mono font-black hover:text-white bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 hover:border-amber-400 transition-all cursor-pointer inline-flex items-center gap-1 mx-1 animate-pulse"
            title="Jump to temporal anchor"
        >
            <Play size={8} className="fill-current"/> {time}
        </button>
    );
};

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-4 w-full max-w-full rounded-xl overflow-hidden border border-[#d3bc8e]/30 bg-[#0d1117] shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <TerminalIcon className="w-3 h-3 text-[#d3bc8e]" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{lang || 'logic_fragment'}</span>
                </div>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter text-[#d3bc8e] hover:text-white transition-colors">
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Extracted' : 'Extract Logic'}
                </button>
            </div>
            <div className="p-4 overflow-x-auto custom-scrollbar bg-black/20">
                <pre className="text-xs font-mono text-cyan-400/90 leading-relaxed select-text">
                    <code>{code.trim()}</code>
                </pre>
            </div>
        </div>
    );
};

const MessageItem = React.memo<MessageItemProps>(({ 
    msg, userProfile, currentPersona, editingId, editValue, copiedId, isTranslating, generatingTTSId, 
    onLightbox, onEditChange, onSaveEdit, onCancelEdit, onCopy, onTranslate, onToggleTranslation, onDelete, onEditStart, onPlayTTS, onReply, voiceConfig, isLatest = false 
}) => {
    
    const [activePortal, setActivePortal] = useState<string | null>(null);

    const parsedContent = useMemo(() => {
        const text = msg.text;
        const embeds: React.ReactNode[] = [];
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const foundUrls = text.match(urlRegex) || [];

        foundUrls.forEach((url, i) => {
            if (url.includes('vertexaisearch.cloud.google.com')) return;
            embeds.push(<SmartEmbed key={`embed-${i}`} url={url} onPortal={setActivePortal} />);
        });
        return { text, embeds };
    }, [msg.text]);

    const renderFormattedText = (text: string) => {
        if (!text) return null;
        const parts = text.split(/(```[\s\S]*?```)/g);
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const timestampRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;

        return parts.map((part, index) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const match = part.match(/```(\w*)\n?([\s\S]*?)?```/);
                const lang = match?.[1] || 'fragment';
                const code = match?.[2] || '';
                return <CodeBlock key={`code-${index}`} code={code} lang={lang} />;
            }

            const subParts = part.split(/(`[^`]+`)/g);
            return (
                <span key={`text-block-${index}`}>
                    {subParts.map((subPart, subIdx) => {
                        if (subPart.startsWith('`') && subPart.endsWith('`')) {
                            return <code key={`inline-code-${subIdx}`} className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300 text-[11px] border border-white/5 mx-0.5">{subPart.slice(1, -1)}</code>;
                        }
                        
                        return subPart.split(urlRegex).map((content, linkIdx) => {
                            if (content.match(urlRegex)) {
                                if (content.includes('vertexaisearch.cloud.google.com')) return null;
                                return <a key={`link-inline-${linkIdx}`} href={content} target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300 transition-colors font-bold">{content}</a>;
                            }
                            
                            const textSegments = content.split(timestampRegex);
                            return textSegments.map((seg, segIdx) => {
                                if (seg.match(/^\d{1,2}:\d{2}(?::\d{2})?$/)) {
                                    return <TimestampLink key={`ts-${segIdx}`} time={seg} />;
                                }
                                return <span key={`raw-${segIdx}`}>{seg}</span>;
                            });
                        });
                    })}
                </span>
            );
        });
    };

    const isEditing = editingId === msg.id;

    return (
      <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full mb-6 group animate-in slide-in-from-bottom-2`}>
        <div className={`max-w-[85%] w-fit flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-2 mb-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <LazyImage src={msg.role === 'user' ? userProfile.avatar : currentPersona.avatar} className="w-8 h-8 rounded-full border border-[#d3bc8e]/40 shadow-lg" alt="av" />
            <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <span className="text-[10px] font-bold text-[#d3bc8e] uppercase tracking-widest">{msg.role === 'user' ? userProfile.username : currentPersona.name}</span>
                {msg.role === 'model' && msg.model && (
                    <span className="text-[7px] font-black text-[#d3bc8e] bg-[#d3bc8e]/10 border border-[#d3bc8e]/20 px-2 py-0.5 rounded-md uppercase tracking-tighter flex items-center gap-1">
                        <Cpu className="w-2 h-2 opacity-70" /> {msg.model}
                    </span>
                )}
            </div>
          </div>

          <div className={`relative rounded-2xl w-full max-w-full overflow-hidden ${msg.role === 'user' ? 'bg-[#3d447a] rounded-tr-none text-white shadow-[0_4px_15px_rgba(61,68,122,0.3)]' : 'genshin-panel text-[#ece5d8] border border-[#d3bc8e]/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]'}`}>
            <div className="max-h-[700px] md:max-h-[800px] overflow-y-auto custom-scrollbar px-4 py-3">
                {msg.imageUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-amber-500/20 bg-black/40 relative group/img cursor-zoom-in" onClick={() => onLightbox(msg.imageUrl!)}>
                        <LazyImage src={msg.imageUrl} className="w-full h-auto max-h-[300px] object-cover transition-transform group-hover/img:scale-105" alt="Visual" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity"><Maximize2 className="w-6 h-6 text-white" /></div>
                    </div>
                )}
                {isEditing ? (
                    <div className="flex flex-col gap-3 min-w-[240px] md:min-w-[320px] animate-in fade-in zoom-in-95">
                        <textarea value={editValue} onChange={(e) => onEditChange(e.target.value)} className="w-full bg-black/40 border border-[#d3bc8e]/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#d3bc8e] resize-none min-h-[100px] select-text font-medium leading-relaxed custom-scrollbar" autoFocus />
                        <div className="flex justify-end gap-2 pb-2">
                            <button onClick={onCancelEdit} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-[10px] font-bold uppercase hover:bg-white/10 transition-all border border-white/10"><X className="w-3 h-3 inline mr-1" /> Cancel</button>
                            <button onClick={() => onSaveEdit(msg.id, editValue, false)} className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-bold uppercase hover:bg-green-500/30 transition-all border border-green-500/20"><Save className="w-3 h-3 inline mr-1" /> Save</button>
                            {msg.role === 'user' && (
                                <button onClick={() => onSaveEdit(msg.id, editValue, true)} className="px-3 py-1.5 rounded-lg bg-[#d3bc8e] text-black text-[10px] font-black uppercase hover:bg-white transition-all shadow-lg"><RefreshCw className="w-3 h-3 inline mr-1" /> Resend</button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap select-text font-medium break-words">{renderFormattedText(parsedContent.text)}</div>
                        <GroundingSources metadata={msg.groundingMetadata} onPortal={setActivePortal} />
                        {parsedContent.embeds}
                        {activePortal && <WebPortalFrame url={activePortal} onClose={() => setActivePortal(null)} />}
                    </>
                )}
            </div>
            <div className="px-4 pb-3">
                {msg.audioUrl && <div className="mt-1 w-full"><AudioPlayer audioUrl={msg.audioUrl} initialVolume={1.0} voiceConfig={voiceConfig} autoPlay={isLatest} /></div>}
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onCopy(msg.text, msg.id)} className="text-[9px] font-bold text-gray-500 hover:text-amber-500 flex items-center gap-1 transition-colors uppercase tracking-widest">{copiedId === msg.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />} {copiedId === msg.id ? 'COPIED' : 'COPY'}</button>
                    <button onClick={() => onReply(msg)} className="text-[9px] font-bold text-gray-500 hover:text-amber-500 flex items-center gap-1 transition-colors uppercase tracking-widest"><Reply className="w-3 h-3" /> REPLY</button>
                    {msg.role === 'model' && !msg.audioUrl && (
                        <button onClick={() => onPlayTTS(msg.id, msg.text)} className="text-[9px] font-bold text-gray-500 hover:text-amber-500 flex items-center gap-1 transition-colors uppercase tracking-widest">{generatingTTSId === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />} VOICE</button>
                    )}
                    <button onClick={() => onDelete(msg.id)} className="text-[9px] font-bold text-gray-500 hover:text-red-500 ml-auto transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>
          </div>
        </div>
      </div>
    );
});

export default MessageItem;
