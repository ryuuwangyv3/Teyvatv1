
import React, { useMemo, useState } from 'react';
import { Copy, Check, Edit2, Volume2, Languages, Trash2, Loader2, Zap, ExternalLink, Reply, CornerDownRight, Cpu, Download, Image, Globe, Maximize2, X, Save, RefreshCw, Youtube, Play, Globe2, Code, Terminal as TerminalIcon } from 'lucide-react';
import { Message, UserProfile, Persona, VoiceConfig } from '../types';
import LazyImage from './LazyImage';
import AudioPlayer from './AudioPlayer';

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
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter text-[#d3bc8e] hover:text-white transition-colors"
                >
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

const MessageItem: React.FC<MessageItemProps> = React.memo(({ 
    msg, userProfile, currentPersona, editingId, editValue, copiedId, isTranslating, generatingTTSId, 
    onLightbox, onEditChange, onSaveEdit, onCancelEdit, onCopy, onTranslate, onToggleTranslation, onDelete, onEditStart, onPlayTTS, onReply, voiceConfig, isLatest = false 
}) => {
    
    const getYoutubeEmbed = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return `https://www.youtube.com/embed/${match[2]}`;
        }
        return url;
    };

    const parsedContent = useMemo(() => {
        let text = msg.text;
        const embeds: React.ReactNode[] = [];

        const videoMatch = text.match(/\|\|VIDEO_EMBED:\s*(.*?)\s*\|\|/);
        if (videoMatch) {
            const url = videoMatch[1];
            text = text.replace(videoMatch[0], '').trim();
            const embedUrl = getYoutubeEmbed(url);
            embeds.push(
                <div key="video" className="my-4 w-full rounded-2xl overflow-hidden border-2 border-[#d3bc8e]/40 bg-black shadow-2xl aspect-video relative group/vid">
                    <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen title="Video Content" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                    <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 pointer-events-none">
                        <Youtube className="w-4 h-4 text-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#d3bc8e]">Irminsul Stream</span>
                    </div>
                </div>
            );
        }

        const webMatch = text.match(/\|\|WEB_EMBED:\s*(.*?)\s*\|\|/);
        if (webMatch) {
            const url = webMatch[1];
            text = text.replace(webMatch[0], '').trim();
            embeds.push(
                <a key="web" href={url} target="_blank" rel="noreferrer" className="block my-4 w-full p-4 rounded-2xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/30 hover:bg-[#d3bc8e]/20 transition-all group/web shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#d3bc8e]/20 flex items-center justify-center border border-[#d3bc8e]/30 group-hover/web:scale-110 transition-transform">
                            <Globe2 className="w-6 h-6 text-[#d3bc8e]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-widest mb-1 flex items-center gap-2">
                                <ExternalLink className="w-3 h-3" /> External Node
                            </div>
                            <p className="text-sm font-bold text-white truncate">{url}</p>
                            <p className="text-[10px] text-gray-500 italic mt-0.5">Click to synchronize with external data...</p>
                        </div>
                    </div>
                </a>
            );
        }

        return { text, embeds };
    }, [msg.text]);

    const renderFormattedText = (text: string) => {
        if (!text) return null;

        const parts = text.split(/(```[\s\S]*?```)/g);
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        return parts.map((part, index) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const match = part.match(/```(\w*)\n?([\s\S]*?)?```/);
                const lang = match?.[1] || 'fragment';
                const code = match?.[2] || '';
                return <CodeBlock key={index} code={code} lang={lang} />;
            }

            const subParts = part.split(/(`[^`]+`)/g);
            return (
                <span key={index}>
                    {subParts.map((subPart, subIdx) => {
                        if (subPart.startsWith('`') && subPart.endsWith('`')) {
                            return (
                                <code key={subIdx} className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300 text-[11px] border border-white/5 mx-0.5">
                                    {subPart.slice(1, -1)}
                                </code>
                            );
                        }

                        return subPart.split(urlRegex).map((content, linkIdx) => {
                            if (content.match(urlRegex)) {
                                return <a key={linkIdx} href={content} target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300 transition-colors">{content}</a>;
                            }
                            return content;
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
                <span className="text-[10px] font-bold text-[#d3bc8e] uppercase tracking-widest">
                    {msg.role === 'user' ? userProfile.username : currentPersona.name}
                </span>
                {msg.role === 'model' && msg.model && (
                    <span className="text-[7px] font-black text-[#d3bc8e] bg-[#d3bc8e]/10 border border-[#d3bc8e]/20 px-2 py-0.5 rounded-md uppercase tracking-tighter flex items-center gap-1 shadow-sm">
                        <Cpu className="w-2 h-2 opacity-70" /> {msg.model}
                    </span>
                )}
            </div>
          </div>

          <div className={`relative px-4 py-3 rounded-2xl w-full max-w-full overflow-hidden ${msg.role === 'user' ? 'bg-[#3d447a] rounded-tr-none text-white shadow-[0_4px_15px_rgba(61,68,122,0.3)]' : 'genshin-panel text-[#ece5d8] border border-[#d3bc8e]/10'}`}>
            {msg.imageUrl && (
                <div className="mb-3 rounded-xl overflow-hidden border border-amber-500/20 bg-black/40 relative group/img cursor-zoom-in" onClick={() => onLightbox(msg.imageUrl!)}>
                    <LazyImage src={msg.imageUrl} className="w-full h-auto max-h-[300px] object-cover transition-transform group-hover/img:scale-105" alt="Visual" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <Maximize2 className="w-6 h-6 text-white" />
                    </div>
                </div>
            )}
            
            {isEditing ? (
                <div className="flex flex-col gap-3 min-w-[240px] md:min-w-[320px] animate-in fade-in zoom-in-95">
                    <textarea 
                        value={editValue}
                        onChange={(e) => onEditChange(e.target.value)}
                        className="w-full bg-black/40 border border-[#d3bc8e]/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#d3bc8e] resize-none min-h-[100px] select-text font-medium leading-relaxed custom-scrollbar"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={onCancelEdit} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-[10px] font-bold uppercase hover:bg-white/10 transition-all border border-white/10"><X className="w-3 h-3 inline mr-1" /> Cancel</button>
                        <button onClick={() => onSaveEdit(msg.id, editValue, false)} className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-bold uppercase hover:bg-green-500/30 transition-all border border-green-500/20"><Save className="w-3 h-3 inline mr-1" /> Save Only</button>
                        {msg.role === 'user' && (
                            <button onClick={() => onSaveEdit(msg.id, editValue, true)} className="px-3 py-1.5 rounded-lg bg-[#d3bc8e] text-black text-[10px] font-black uppercase hover:bg-white transition-all shadow-lg active:scale-90"><RefreshCw className="w-3 h-3 inline mr-1" /> Save & Resend</button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap select-text font-medium break-words">
                        {renderFormattedText(parsedContent.text)}
                    </div>
                    {parsedContent.embeds}
                    {msg.showTranslation && msg.translatedText && (
                        <div className="mt-3 pt-3 border-t border-white/10 animate-in fade-in slide-in-from-top-1">
                            <div className="flex items-center gap-2 text-[9px] font-black text-amber-500/60 uppercase tracking-widest mb-1">
                                <Globe className="w-3 h-3" /> Akasha Translation
                            </div>
                            <p className="text-xs text-[#d3bc8e]/80 italic select-text leading-relaxed font-medium">{msg.translatedText}</p>
                        </div>
                    )}
                </>
            )}
            
            {msg.audioUrl && (
                <div className="mt-3 w-full">
                    <AudioPlayer audioUrl={msg.audioUrl} initialVolume={1.0} voiceConfig={voiceConfig} autoPlay={isLatest} />
                </div>
            )}

            <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { onCopy(msg.text, msg.id); }} className="text-[9px] font-bold text-gray-500 hover:text-amber-500 flex items-center gap-1 transition-colors uppercase tracking-widest">
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />} {copiedId === msg.id ? 'COPIED' : 'COPY'}
                </button>
                <button onClick={() => onReply(msg)} className="text-[9px] font-bold text-gray-500 hover:text-amber-500 flex items-center gap-1 transition-colors uppercase tracking-widest">
                    <Reply className="w-3 h-3" /> REPLY
                </button>
                
                {msg.role === 'user' && !isEditing && (
                    <button onClick={() => onEditStart(msg)} className="text-[9px] font-bold text-gray-500 hover:text-amber-500 flex items-center gap-1 transition-colors uppercase tracking-widest">
                        <Edit2 className="w-3 h-3" /> EDIT
                    </button>
                )}

                {msg.role === 'model' && (
                    <button onClick={() => msg.showTranslation ? onToggleTranslation(msg.id) : onTranslate(msg.id, msg.text)} disabled={isTranslating === msg.id} className="text-[9px] font-bold text-gray-500 hover:text-amber-500 flex items-center gap-1 transition-colors uppercase tracking-widest">
                        {isTranslating === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />} {msg.showTranslation ? 'HIDE' : 'TRANSLATE'}
                    </button>
                )}

                {msg.role === 'model' && !msg.audioUrl && (
                    <button onClick={() => onPlayTTS(msg.id, msg.text)} className="text-[9px] font-bold text-gray-500 hover:text-amber-500 flex items-center gap-1 transition-colors uppercase tracking-widest">
                        {generatingTTSId === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />} VOICE
                    </button>
                )}
                
                <button onClick={() => onDelete(msg.id)} className="text-[9px] font-bold text-gray-500 hover:text-red-500 ml-auto transition-colors p-1" title="Delete Fragment">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
          </div>
          
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[8px] text-gray-600 font-mono tracking-tighter">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    );
});

export default MessageItem;
