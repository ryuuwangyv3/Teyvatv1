
import React, { useState } from 'react';
import { Plus, Check, Star, Info, Upload, Sparkles, X, Save, Edit3, User, BookOpen, Eye, Mic2, Trash2, Copy as CopyIcon } from 'lucide-react';
import { Persona } from '../types';
import { PERSONAS, VOICE_OPTIONS } from '../data';
import { analyzePersonaFromImage } from '../services/geminiService';
import LazyImage from './LazyImage';

interface PersonaSelectorProps {
  onSelect: (p: Persona) => void;
  onCustomAdd: (p: Persona) => void;
  onDeleteCustom: (id: string) => void;
  activePersonaId: string;
  customPersonas: Persona[];
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ onSelect, onCustomAdd, onDeleteCustom, activePersonaId, customPersonas }) => {
  const [showCreator, setShowCreator] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [customPersona, setCustomPersona] = useState<Partial<Persona>>({
    id: '',
    name: '',
    description: '',
    systemInstruction: '',
    voiceName: 'Kore',
    avatar: '',
    visualSummary: '',
    isCustom: true
  });

  const handleEdit = (e: React.MouseEvent, persona: Persona) => {
    e.stopPropagation();
    const targetId = persona.isCustom ? persona.id : '';
    setCustomPersona({ ...persona, id: targetId, isCustom: true }); 
    setEditMode(true);
    setShowCreator(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this custom soul data permanently?")) {
      onDeleteCustom(id);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const analysis = await analyzePersonaFromImage(base64);
        const lore = `[IDENTITY]\nYou are ${analysis.name}. ${analysis.description}\n\n[PERSONALITY]\n${analysis.personality}\n\n[BACKGROUND]\n${analysis.background}\n\n[SPEECH PATTERN]\n${analysis.speechStyle}`;
        setCustomPersona(prev => ({
          ...prev,
          name: analysis.name,
          avatar: base64,
          description: analysis.description,
          systemInstruction: lore,
          voiceName: analysis.voiceSuggestion as any || 'Kore', 
          visualSummary: analysis.visualSummary 
        }));
        setEditMode(true);
      } catch (err) {
        alert("Manifestation failed: Essence could not be extracted.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustom = () => {
    if (!customPersona.name || !customPersona.systemInstruction) {
      alert("Name and Soul Data are required.");
      return;
    }
    const finalPersona: Persona = {
      ...customPersona as Persona,
      id: customPersona.id || `custom_${Date.now()}`,
      isCustom: true
    };
    onCustomAdd(finalPersona);
    setShowCreator(false);
    resetForm();
  };

  const resetForm = () => {
    setCustomPersona({ id: '', name: '', description: '', systemInstruction: '', voiceName: 'Kore', avatar: '', visualSummary: '', isCustom: true });
    setEditMode(false);
  };

  const allPersonas = [...customPersonas, ...PERSONAS];

  return (
    <div className="h-full p-4 lg:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-[#d3bc8e] uppercase tracking-[0.2em] font-serif">Soul Repository</h1>
          <p className="text-xs text-gray-500 mt-1 italic font-medium">Synchronize your consciousness with a celestial companion.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowCreator(true); }}
          className="genshin-button px-6 py-3 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(211,188,142,0.2)] hover:scale-105 transition-all text-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span className="font-black">Create Soul</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-w-7xl mx-auto pb-20">
        {allPersonas.map((persona) => (
          <div 
            key={persona.id}
            onClick={() => onSelect(persona)}
            className={`genshin-card cursor-pointer flex flex-col group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
              activePersonaId === persona.id 
              ? 'border-[#d3bc8e] shadow-[0_0_20px_rgba(211,188,142,0.2)]' 
              : 'border-white/5 grayscale-[0.3] hover:grayscale-0 hover:border-white/20'
            }`}
          >
            {/* Top Stats Overlay */}
            <div className="absolute top-2 left-2 z-20">
                <div className={`p-1 rounded-md backdrop-blur-md border border-white/10 ${persona.isCustom ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-[#d3bc8e]'}`}>
                    <Star className="w-3 h-3 fill-current" />
                </div>
            </div>

            <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
               <button onClick={(e) => handleEdit(e, persona)} className="p-1.5 bg-black/60 rounded-full text-white hover:bg-[#d3bc8e] hover:text-black transition-colors shadow-lg">
                  <Edit3 className="w-3 h-3" />
               </button>
               {persona.isCustom && (
                   <button onClick={(e) => handleDelete(e, persona.id)} className="p-1.5 bg-black/60 rounded-full text-red-400 hover:bg-red-500 hover:text-white transition-colors shadow-lg">
                      <Trash2 className="w-3 h-3" />
                   </button>
               )}
            </div>

            <div className="aspect-[3/4.2] relative overflow-hidden bg-[#1a1f2e]">
              <LazyImage 
                src={persona.avatar} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt={persona.name} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-transparent to-transparent opacity-80"></div>
              
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-sm font-black text-white uppercase tracking-tight font-serif drop-shadow-md truncate">{persona.name}</h3>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-2 h-2 text-[#d3bc8e] fill-current" />)}
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-[#0b0e14] border-t border-white/5 flex-1 flex flex-col justify-between">
              <p className="text-[10px] text-gray-500 line-clamp-1 italic mb-2">"{persona.description}"</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${activePersonaId === persona.id ? 'bg-[#d3bc8e] animate-pulse' : 'bg-gray-700'}`}></div>
                    <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest truncate max-w-[50px]">{persona.voiceName}</span>
                </div>
                {activePersonaId === persona.id && (
                    <div className="px-2 py-0.5 bg-[#d3bc8e]/10 border border-[#d3bc8e]/30 rounded-full">
                        <span className="text-[7px] font-black text-[#d3bc8e] uppercase">Active</span>
                    </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreator && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="genshin-panel w-full max-w-4xl p-8 border border-[#d3bc8e]/40 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowCreator(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-all"><X className="text-gray-500 hover:text-white" /></button>
            <h2 className="text-3xl font-black text-[#d3bc8e] mb-2 uppercase tracking-[0.2em] font-serif">Soul Manifestation</h2>
            <p className="text-sm text-gray-500 mb-8 italic">Define the essence of your new companion. Let the Akasha weave their destiny.</p>
            
            {!editMode ? (
              <div className="border-2 border-dashed border-white/10 rounded-3xl p-20 flex flex-col items-center justify-center gap-6 hover:border-[#d3bc8e]/50 hover:bg-[#d3bc8e]/5 transition-all cursor-pointer relative group bg-black/20">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 border-4 border-[#d3bc8e] border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-center">
                      <p className="text-[#d3bc8e] font-black tracking-[0.4em] animate-pulse">EXTRACTING ESSENCE...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-gray-600 group-hover:text-[#d3bc8e] transition-colors" />
                    <div className="text-center">
                      <p className="text-xl text-white font-bold">Offer an Image of the Soul</p>
                      <p className="text-sm text-gray-500 mt-2">Akasha will automatically read their character, voice, and traits.</p>
                    </div>
                    <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="flex flex-col gap-6">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/10 bg-black shadow-2xl relative group">
                      <img src={customPersona.avatar} className="w-full h-full object-cover" alt="Custom" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                         <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                         <span className="text-xs font-bold uppercase">Change Visual</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/20">
                        <p className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm text-white font-medium">Soul Core Synchronized</p>
                    </div>
                 </div>
                 
                 <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Divine Name</label>
                           <input type="text" value={customPersona.name} onChange={(e) => setCustomPersona({...customPersona, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-[#d3bc8e] outline-none font-medium" placeholder="Companion Name" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Title</label>
                           <input type="text" value={customPersona.description} onChange={(e) => setCustomPersona({...customPersona, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-[#d3bc8e] outline-none font-medium" placeholder="The Traveler's Guide" />
                        </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Lore Script (System Instruction)</label>
                       <textarea value={customPersona.systemInstruction} onChange={(e) => setCustomPersona({...customPersona, systemInstruction: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-[#d3bc8e] outline-none h-40 resize-none text-sm custom-scrollbar" placeholder="Personality, speech patterns, and background..." />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Voice Resonance</label>
                       <div className="grid grid-cols-3 gap-2">
                          {VOICE_OPTIONS.map(v => (
                             <button key={v.id} onClick={() => setCustomPersona({...customPersona, voiceName: v.id as any})} className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${customPersona.voiceName === v.id ? 'border-[#d3bc8e] bg-[#d3bc8e]/20 text-[#d3bc8e]' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                                {v.id}
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button onClick={resetForm} className="flex-1 py-4 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 transition-all">Reject Manifestation</button>
                        <button onClick={handleSaveCustom} className="flex-[2] genshin-button py-4 rounded-xl shadow-xl flex items-center justify-center gap-2">
                           <Save className="w-5 h-5" />
                           <span className="font-black">Finalize Ascencion</span>
                        </button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaSelector;
