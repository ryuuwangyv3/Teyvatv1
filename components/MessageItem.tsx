import React from 'react';
import { Copy, Check, Edit2, Volume2, Languages, Trash2, Loader2, Zap, ExternalLink, Reply, CornerDownRight, Cpu, FileText, Download, FileCode, FileAudio, FileVideo, File as FileIcon, Image } from 'lucide-react';
import { Message, UserProfile, Persona, VoiceConfig, Attachment } from '../types';
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
    voiceConfig: VoiceConfig;
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
    isLatest?: boolean; 
}

const MessageItem: React.FC<MessageItemProps> = React.memo(({ 
    msg, userProfile, currentPersona, editingId, editValue, copiedId, isTranslating, generatingTTSId, 
    onLightbox, onEditChange, onSaveEdit, onCancelEdit, onCopy, onTranslate, onToggleTranslation, onDelete, onEditStart, onPlayTTS, onReply, voiceConfig, isLatest = false 
}) => {
    
    const renderContent = (text: string, isTranslation = false) => {
      if (!text) return null;
      
      const parts = text.split(/(```[\s\S]*?```)/g);
      
      return parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.split('\n');
          const code = lines.slice(1, -1).join('\n');
          return (
            <div key={i} className="my-3 sm:my-4 rounded-xl overflow-hidden border border-white/10 bg-black/60 font-mono text-[11px] sm:text-sm relative group/code select-text">
                <div className="bg-[#1e2330] px-3 py-1.5 sm:px-4 sm:py-2 flex justify-between text-[8px] sm:text-[10px] text-gray-500 select-none">
                    <span className="flex items-center gap-1.5 sm:gap-2"><Zap className="w-2.5 h-2.5 sm:w-3 h-3 text-amber-500" /> CODE MODULE</span>
                    <button onClick={() => onCopy(code, `code-${i}`)} className="flex items-center gap-1 hover:text-white">
                        {copiedId === `code-${i}` ? <Check className="w-2.5 h-2.5 sm:w-3 h-3 text-green-400" /> : <Copy className="w-2.5 h-2.5 sm:w-3 h-3" />} Copy
                    </button>
                </div>
                <pre className="p-3 sm:p-4 overflow-x-auto text-blue-300 custom-scrollbar select-text cursor-text"><code>{code}</code></pre>
            </div>
          );
        }

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const textSegments = part.split(urlRegex);

        return (
            <span key={i} className={isTranslation ? 'font-sans' : ''}>
                {textSegments.map((segment, j) => {
                    if (segment.match(urlRegex)) {
                        const url = segment;
                        const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                        if (ytMatch && ytMatch[1]) {
                            return (
                                <div key={j} className="my-2 sm:my-3 w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black select-none">
                                    <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                </div>
                            );
                        }
                        
                        const isImageUrl = url.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)($|\?)/i) || 
                                          url.includes('images.unsplash.com') || 
                                          url.includes('gen.pollinations.ai') ||
                                          url.includes('image.pollinations.ai') ||
                                          url.includes('googleusercontent.com');

                        if (isImageUrl) {
                            return (
                                <div key={j} className="my-2 sm:my-3 rounded-xl overflow-hidden border border-white/10 cursor-zoom-in select-none bg-black/20 group/omni" onClick={() => onLightbox(url)}>
                                    <LazyImage src={url} alt="Celestial visual" className="w-full h-auto max-h-[300px] sm:max-h-[400px] object-contain hover:scale-[1.02] transition-transform duration-500" />
                                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-black/60 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[7px] sm:text-[8px] text-white opacity-0 group-hover/omni:opacity-100 transition-opacity uppercase tracking-widest font-black">Visual Manifestation</div>
                                </div>
                            );
                        }
                        return (
                            <a key={j} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline underline-offset-4 decoration-amber-500/30 break-all select-text">
                                {url} <ExternalLink className="w-2.5 h-2.5 sm:w-3 h-3 inline" />
                            </a>
                        );
                    }
                    return segment;
                })}
            </span>
        );
      });
    };

    // Fix: Added missing 'Image' to imports to resolve collision with global 'Image' which caused type mismatch on className prop
    const getFileIcon = (mime: string) => {
        if (mime.includes('image')) return <Image className="w-5 h-5 text-purple-400" />;
        if (mime.includes('video')) return <FileVideo className="w-5 h-5 text-red-400" />;
        if (mime.includes('audio')) return <FileAudio className="w-5 h-5 text-green-400" />;
        if (mime.includes('pdf') || mime.includes('text')) return <FileText className="w-5 h-5 text-blue-400" />;
        if (mime.includes('code') || mime.includes('javascript') || mime.includes('json')) return <FileCode className="w-5 h-5 text-amber-400" />;
        return <FileIcon className="w-5 h-5 text-gray-400" />;
    };

    const attachments = msg.attachments || [];
    const images = attachments.filter(a => a.type.startsWith('image/'));
    const otherFiles = attachments.filter(a => !a.type.startsWith('image/'));
  
    return (
      <div 
        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-500 w-full mb-5 sm:mb-8 group`}
      >
        <div className={`max-w-[95%] sm:max-w-[75%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} relative`}>
          
          {/* Character Nameplate */}
          <div className={`flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="relative">
                <LazyImage src={msg.role === 'user' ? userProfile.avatar : currentPersona.avatar} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#d3bc8e]/40 shadow-xl" alt="avatar" />
                {msg.role === 'model' && <div className="absolute -bottom-1 -right-1 bg-[#d3bc8e] rounded-full p-0.5"><Zap className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" /></div>}
            </div>
            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-[12px] font-bold text-[#d3bc8e] uppercase tracking-widest genshin-font">{msg.role === 'user' ? userProfile.username : currentPersona.name}</span>
                  {msg.role === 'model' && msg.model && (
                    <span className="bg-black/40 text-[#d3bc8e]/60 text-[7px] sm:text-[8px] font-mono border border-[#d3bc8e]/20 px-1 py-0.5 rounded flex items-center gap-0.5">
                      <Cpu className="w-1.5 h-1.5 sm:w-2 h-2" /> {msg.model.split('/').pop()}
                    </span>
                  )}
                </div>
                <span className="text-[7px] sm:text-[9px] text-gray-500 opacity-60 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className={`relative transition-all duration-300 w-full ${
              msg.role === 'user' 
              ? 'bg-[#3d447a] border border-white/20 shadow-[0_5px_15px_rgba(0,0,0,0.4)] rounded-2xl rounded-tr-none px-4 py-3 sm:px-6 sm:py-4' 
              : 'genshin-dialog-model px-4 py-3 sm:px-6 sm:py-4'
          }`}>
            
            {msg.replyTo && (
               <div className="mb-2 sm:mb-3 pl-2 sm:pl-3 border-l-2 border-amber-500/50 text-[10px] sm:text-[11px] text-gray-400 bg-black/20 p-1.5 sm:p-2 rounded-r-lg hover:bg-black/30 transition-colors cursor-pointer select-none">
                  <div className="flex items-center gap-1 font-bold text-amber-500/80 mb-0.5">
                     <CornerDownRight className="w-2.5 h-2.5 sm:w-3 h-3" />
                     <span className="uppercase text-[8px] sm:text-[9px] tracking-tighter">Replying to {msg.replyTo.role === 'user' ? 'Traveler' : currentPersona.name}</span>
                  </div>
                  <div className="line-clamp-1 italic opacity-80">"{msg.replyTo.text}"</div>
               </div>
            )}

            {/* ATTACHMENT RENDERING: IMAGES GRID */}
            {images.length > 0 && (
                <div className={`mb-3 sm:mb-4 grid gap-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                    {images.map((img, idx) => (
                        <div key={idx} className="rounded-xl overflow-hidden border border-white/10 bg-black/40 cursor-zoom-in relative group/img select-none" onClick={() => onLightbox(img.url)}>
                            <LazyImage src={img.url} className="w-full aspect-square object-cover group-hover/img:scale-105 transition-transform duration-700" alt="Visual" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <Download className="w-5 h-5 text-white drop-shadow-md" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ATTACHMENT RENDERING: OTHER FILES */}
            {otherFiles.length > 0 && (
                <div className="mb-3 sm:mb-4 space-y-2">
                    {otherFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 group/file hover:border-amber-500/30 transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 rounded-lg bg-white/5">{getFileIcon(file.type)}</div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-gray-200 truncate">{file.name}</span>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-tighter">{(file.size ? (file.size / 1024).toFixed(1) : 0)} KB</span>
                                </div>
                            </div>
                            <a href={file.url} download={file.name} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-amber-500 transition-all">
                                <Download className="w-4 h-4" />
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {msg.imageUrl && !images.length && (
                <div className="mb-3 sm:mb-4 rounded-xl overflow-hidden border border-white/10 bg-black/40 cursor-zoom-in relative group/img select-none" onClick={() => onLightbox(msg.imageUrl!)}>
                    <LazyImage src={msg.imageUrl} className="w-full h-auto max-h-[250px] sm:max-h-[400px] object-cover group-hover/img:scale-105 transition-transform duration-700" alt="Visual" />
                    <div className="absolute top-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] text-white font-bold uppercase tracking-widest border border-white/10 backdrop-blur-md">Akasha Capture</div>
                </div>
            )}
            
            {editingId === msg.id ? (
              <div className="flex flex-col gap-2 w-full animate-in fade-in">
                  <textarea value={editValue} onChange={(e) => onEditChange(e.target.value)} className="w-full bg-black/40 rounded-lg p-2 sm:p-3 text-sm text-white focus:outline-none min-h-[80px] sm:min-h-[100px] border border-amber-500/30 select-text" autoFocus />
                  <div className="flex justify-end gap-1.5 sm:gap-2 text-[10px] sm:text-xs flex-wrap">
                      <button onClick={onCancelEdit} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300">Cancel</button>
                      <button onClick={() => onSaveEdit(msg.id, editValue, msg.role === 'user')} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#d3bc8e] text-black font-bold shadow-lg">Update & Resonate</button>
                  </div>
              </div>
            ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className={`whitespace-pre-wrap break-words leading-relaxed text-sm sm:text-[15px] select-text cursor-text selection:bg-amber-500/30 ${msg.role === 'user' ? 'text-white' : 'text-[#ece5d8]'}`}>
                      {renderContent(msg.text)}
                  </div>
                  
                  {msg.showTranslation && msg.translatedText && (
                    <div className="p-3 sm:p-4 bg-black/20 border-l-2 border-[#d3bc8e] rounded-r-xl animate-in slide-in-from-left-2 duration-300">
                      <div className="text-[8px] sm:text-[10px] font-black text-[#d3bc8e] uppercase tracking-widest mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                        <Languages className="w-2.5 h-2.5 sm:w-3 h-3" /> Akasha Translation
                      </div>
                      <div className="text-[13px] sm:text-[14px] text-gray-300 font-sans leading-relaxed select-text cursor-text selection:bg-amber-500/30 italic">
                        {renderContent(msg.translatedText, true)}
                      </div>
                    </div>
                  )}
                </div>
            )}
            
            {(msg.isVoiceNote || msg.audioUrl) && (
                <div className="mt-3 pt-1 border-t border-white/10 select-none">
                    <AudioPlayer 
                        audioUrl={msg.audioUrl!} 
                        initialVolume={voiceConfig.gain || 1.0} 
                        voiceConfig={voiceConfig} 
                        autoPlay={isLatest && voiceConfig.autoPlay} 
                    />
                </div>
            )}
            
            <div className={`mt-3 pt-1 flex flex-wrap items-center justify-between gap-y-1.5 border-t border-white/5 transition-opacity select-none ${isLatest ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button onClick={() => msg.translatedText ? onToggleTranslation(msg.id) : onTranslate(msg.id, msg.text)} className="text-[8px] sm:text-[10px] text-[#d3bc8e] hover:text-white uppercase tracking-widest font-bold flex items-center gap-1 sm:gap-1.5 transition-colors">
                        {isTranslating === msg.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Languages className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}
                        <span>{msg.translatedText && msg.showTranslation ? 'Hide' : 'Translate'}</span>
                    </button>
                </div>
                
                <div className="flex items-center gap-0.5 sm:gap-1">
                    <button onClick={() => onReply(msg)} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Reply"><Reply className="w-3 sm:w-3.5 h-3 sm:h-3.5" /></button>
                    <button onClick={() => onCopy(msg.text, msg.id)} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Copy">{copiedId === msg.id ? <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-400" /> : <Copy className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}</button>
                    {msg.role === 'user' && (<button onClick={() => onEditStart(msg)} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Edit"><Edit2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" /></button>)}
                    {msg.role === 'model' && !msg.audioUrl && (<button onClick={() => onPlayTTS(msg.id, msg.text)} disabled={generatingTTSId === msg.id} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-amber-400 transition-colors" title="Generate Voice">{generatingTTSId === msg.id ? <Loader2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 animate-spin text-amber-500" /> : <Volume2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}</button>)}
                    <button onClick={() => onDelete(msg.id)} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" /></button>
                </div>
            </div>
          </div>
        </div>
      </div>
    );
});

export default MessageItem;