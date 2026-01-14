
import React, { useMemo, useState } from 'react';
import { 
    Copy, Check, Edit2, Volume2, Languages, Trash2, Loader2, Zap, ExternalLink, 
    Reply, CornerDownRight, Cpu, Download, Image, Globe, Maximize2, X, Save, 
    RefreshCw, Youtube, Play, Globe2, Code, Terminal as TerminalIcon, Github, 
    Music2, FileText as FileIcon, Twitter, Instagram, Linkedin, Facebook 
} from 'lucide-react';
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
    onPlayTTS_auto?: (id: string, text: string) => void;
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

/**
 * CELESTIAL LINK CARD: Luxurious Link Preview with Dynamic Branding
 */
const LinkEmbedCard: React.FC<{ url: string }> = ({ url }) => {
    const domainInfo = useMemo(() => {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return { icon: Youtube, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Irminsul Stream' };
        if (lowerUrl.includes('github.com')) return { icon: Github, color: 'text-white', bg: 'bg-white/10', label: 'Forge Repository' };
        if (lowerUrl.includes('spotify.com')) return { icon: Music2, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Euthymia Melodies' };
        if (lowerUrl.includes('instagram.com')) return { icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-500/10', label: 'Visual Chronicle' };
        if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return { icon: Twitter, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Celestial Echoes' };
        if (lowerUrl.includes('linkedin.com')) return { icon: Linkedin, color: 'text-blue-600', bg: 'bg-blue-600/10', label: 'Guild Network' };
        if (lowerUrl.includes('facebook.com')) return { icon: Facebook, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Ancient Social' };
        return { icon: Globe2, color: 'text-[#d3bc8e]', bg: 'bg-[#d3bc8e]/10', label: 'World Data Node' };
    }, [url]);

    const Icon = domainInfo.icon;

    return (
        <a 
            href={url} 
            target="_blank" 
            rel="noreferrer" 
            className="block my-4 w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#d3bc8e]/60 hover:bg-[#d3bc8e]/10 transition-all group/link-card shadow-[0_15px_35px_rgba(0,0,0,0.5)] overflow-hidden relative"
        >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover/link-card:translate-x-full transition-transform duration-1000 ease-in-out"></div>
            
            <div className="flex items-center gap-5 relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${domainInfo.bg} flex items-center justify-center border border-white/10 group-hover/link-card:scale-110 group-hover/link-card:border-[#d3bc8e]/40 transition-all duration-500 shadow-inner shrink-0`}>
                    <Icon className={`w-7 h-7 ${domainInfo.color} drop-shadow-[0_0_8px_currentColor]`} />
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black text-amber-500/90 uppercase tracking-[0.2em]">{domainInfo.label}</span>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                           <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                           <span className="text-[7px] font-black text-green-400 uppercase tracking-tighter">Synced</span>
                        </div>
                    </div>
                    
                    <p className="text-sm font-bold text-gray-100 truncate group-hover/link-card:text-white transition-colors">{url.replace(/^https?:\/\//, '')}</p>
                    
                    <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-[8px] font-black text-gray-500 uppercase tracking-widest">
                            <Zap className="w-2.5 h-2.5" /> High Fidelity Link
                        </div>
                        <div className="h-1 w-1 rounded-full bg-white/20"></div>
                        <div className="flex items-center gap-1 text-[8px] font-black text-[#d3bc8e] uppercase tracking-widest opacity-0 group-hover/link-card:opacity-100 transition-opacity">
                            Access Portal <ExternalLink className="w-2 h-2" />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Corner Accent */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-[#d3bc8e]/20 rounded-br-2xl group-hover/link-card:border-[#d3bc8e]/60 transition-all"></div>
        </a>
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
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const foundUrls = text.match(urlRegex) || [];

        foundUrls.forEach((url, i) => {
            const isYT = url.includes('youtube.com') || url.includes('youtu.be');
            
            if (isYT) {
                const embedUrl = getYoutubeEmbed(url);
                embeds.push(
                    <div key={`yt-${i}`} className="my-4 w-full rounded-2xl overflow-hidden border-2 border-[#d3bc8e]/20 bg-black shadow-2xl aspect-video relative group/yt animate-in zoom-in-95 duration-500">
                        <iframe src={embedUrl} className="w-full h-full border-0" title="Auto-YouTube" allowFullScreen />
                        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 opacity-0 group-hover/yt:opacity-100 transition-opacity pointer-events-none">
                            <Youtube className="w-4 h-4 text-red-500" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#d3bc8e]">Irminsul Data Stream</span>
                        </div>
                    </div>
                );
            } else {
                embeds.push(<LinkEmbedCard key={`link-${i}`} url={url} />);
            }
        });

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
                                return <a key={linkIdx} href={content} target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300 transition-colors font-bold">{content}</a>;
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

          <div className={`relative px-4 py-3 rounded-2xl w-full max-w-full overflow-hidden ${msg.role === 'user' ? 'bg-[#3d447a] rounded-tr-none text-white shadow-[0_4px_15px_rgba(61,68,122,0.3)]' : 'genshin-panel text-[#ece5d8] border border-[#d3bc8e]/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]'}`}>
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
