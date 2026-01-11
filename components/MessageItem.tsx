
import React from 'react';
import { Copy, Check, Edit2, Volume2, Languages, Trash2, Loader2, Zap, ExternalLink, Reply, CornerDownRight, Cpu, Download, Image, Globe, Maximize2, X, Save, RefreshCw } from 'lucide-react';
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

const MessageItem: React.FC<MessageItemProps> = React.memo(({ 
    msg, userProfile, currentPersona, editingId, editValue, copiedId, isTranslating, generatingTTSId, 
    onLightbox, onEditChange, onSaveEdit, onCancelEdit, onCopy, onTranslate, onToggleTranslation, onDelete, onEditStart, onPlayTTS, onReply, voiceConfig, isLatest = false 
}) => {
    
    const renderContent = (text: string) => {
      if (!text) return null;
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return text.split(urlRegex).map((part, i) => {
          if (part.match(urlRegex)) {
              return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300 transition-colors">{part}</a>;
          }
          return part;
      });
    };

    const isEditing = editingId === msg.id;

    return (
      <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full mb-6 group animate-in slide-in-from-bottom-2`}>
        <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-2 mb-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <LazyImage src={msg.role === 'user' ? userProfile.avatar : currentPersona.avatar} className="w-8 h-8 rounded-full border border-[#d3bc8e]/40 shadow-lg" alt="av" />
            <span className="text-[10px] font-bold text-[#d3bc8e] uppercase tracking-widest">{msg.role === 'user' ? userProfile.username : currentPersona.name}</span>
          </div>

          <div className={`relative px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-[#3d447a] rounded-tr-none text-white' : 'genshin-dialog-model text-[#ece5d8]'}`}>
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
                            <button onClick={() => onSaveEdit(msg.id, editValue, true)} className="px-3 py-1.5 rounded-lg bg-[#d3bc8e] text-black text-[10px] font-black uppercase hover:bg-white transition-all shadow-lg active:scale-95"><RefreshCw className="w-3 h-3 inline mr-1" /> Save & Resend</button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap select-text font-medium">{renderContent(msg.text)}</div>
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
                <div className="mt-3">
                    <AudioPlayer audioUrl={msg.audioUrl} initialVolume={1.0} voiceConfig={voiceConfig} autoPlay={isLatest} />
                </div>
            )}

            {/* Interaction Bar: Memunculkan kembali fitur Edit, Translate, Delete, dan Voice */}
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
            {msg.model && <span className="text-[8px] text-amber-500/30 font-black uppercase tracking-tighter">{msg.model}</span>}
          </div>
        </div>
      </div>
    );
});

export default MessageItem;
