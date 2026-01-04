
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Edit2, Shield, User, MapPin, LogOut, CheckCircle2, ShieldCheck, Mail, Cloud, Info } from 'lucide-react';
import { UserProfile } from '../types';
import { signOut, syncUserProfile } from '../services/supabaseService';

interface UserInfoProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ profile, setProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState(profile);
  
  const headerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempProfile(profile);
  }, [profile]);

  const handleSave = async () => {
    setProfile(tempProfile);
    setIsEditing(false);
    await syncUserProfile(tempProfile);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'headerBackground') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  setTempProfile(prev => ({ ...prev, [field]: event.target!.result as string }));
              }
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      {/* Header Banner */}
      <div className="h-64 lg:h-80 relative overflow-hidden group">
        <img src={tempProfile.headerBackground} className="w-full h-full object-cover" alt="header" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/20 to-transparent"></div>
        {isEditing && (
          <button 
            onClick={() => headerInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="flex flex-col items-center gap-2">
                <Camera className="w-10 h-10 text-white drop-shadow-lg" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Update Banner</span>
            </div>
            <input 
                type="file" 
                ref={headerInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'headerBackground')} 
            />
          </button>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 -mt-20 relative z-10 pb-20">
        <div className="flex flex-col lg:flex-row items-end gap-6 mb-12">
          <div className="relative group shrink-0">
            <div className="w-40 h-40 rounded-3xl border-4 border-[#0b0e14] shadow-2xl overflow-hidden bg-[#13182b]">
               <img src={tempProfile.avatar} className="w-full h-full object-cover" alt="avatar" />
            </div>
            {isEditing && (
              <button 
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 rounded-3xl flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-8 h-8 text-white drop-shadow-lg" />
                <input 
                    type="file" 
                    ref={avatarInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, 'avatar')} 
                />
              </button>
            )}
            {profile.isAuth && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 p-1.5 rounded-xl border-4 border-[#0b0e14] shadow-xl" title="Google Verified">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
            )}
          </div>
          
          <div className="flex-1 mb-4 w-full">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              {isEditing ? (
                  <input 
                    type="text" 
                    value={tempProfile.username} 
                    onChange={(e) => setTempProfile({...tempProfile, username: e.target.value})}
                    className="text-4xl font-bold bg-white/5 border-b border-amber-500 outline-none text-white w-full max-w-md px-2 py-1 rounded-t-lg"
                  />
              ) : (
                  <h1 className="text-4xl font-bold flex items-center gap-3">
                    {profile.username}
                    {profile.isAuth && <ShieldCheck className="w-6 h-6 text-amber-500" />}
                  </h1>
              )}
              <div className="bg-amber-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                {profile.isAuth ? 'Verified Akasha' : 'Guest Traveler'}
              </div>
            </div>
            <p className="text-gray-400 mt-2 flex items-center gap-2 text-sm italic">
              <MapPin className="w-4 h-4 text-amber-500/70" />
              <span>Adventurers' Guild • Celestial Node #{Math.floor(Math.random() * 9000) + 1000}</span>
            </p>
          </div>

          <div className="flex gap-3 mb-4 shrink-0">
            {isEditing ? (
              <>
                <button onClick={() => { setIsEditing(false); setTempProfile(profile); }} className="px-6 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-bold text-sm">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2.5 rounded-xl genshin-button font-bold text-white shadow-xl shadow-amber-500/20 text-sm">Update Resonance</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 flex items-center gap-2 transition-all font-bold text-sm">
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="genshin-panel p-8 rounded-[2rem] border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-[4rem] pointer-events-none"></div>
              <h3 className="text-lg font-bold genshin-gold mb-6 uppercase tracking-widest flex items-center gap-2">
                <Info className="w-5 h-5" /> Adventurer Biography
              </h3>
              {isEditing ? (
                <textarea 
                  value={tempProfile.bio}
                  onChange={(e) => setTempProfile({...tempProfile, bio: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm focus:border-amber-500 outline-none min-h-[180px] text-gray-200 resize-none custom-scrollbar leading-relaxed"
                  placeholder="Tell your story across the stars..."
                />
              ) : (
                <p className="text-gray-300 leading-relaxed italic text-lg px-2">"{profile.bio}"</p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Achievements', value: '142', icon: Shield },
                { label: 'Companions', value: '12', icon: User },
                { label: 'Visits', value: '1.2k', icon: Cloud },
                { label: 'Aura', value: '99', icon: Mail },
              ].map(stat => (
                <div key={stat.label} className="genshin-panel p-6 rounded-2xl border border-white/5 text-center group hover:border-amber-500/30 transition-all">
                  <p className="text-3xl font-black genshin-gold group-hover:scale-110 transition-transform">{stat.value}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2 font-bold">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
             <div className="genshin-panel p-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#1a1f2e] to-[#0b0e14]">
                <h3 className="text-sm font-bold genshin-gold mb-8 uppercase tracking-widest flex items-center gap-3">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <span>Account Security</span>
                </h3>
                <div className="space-y-6">
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Linked Identity</span>
                      <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                        <Mail className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-200 text-xs truncate font-mono">{profile.email || 'Local Guest'}</span>
                      </div>
                   </div>
                   <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl">
                      <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Sync Status</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${profile.isAuth ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                         {profile.isAuth ? 'ENCRYPTED CLOUD' : 'LOCAL ONLY'}
                      </span>
                   </div>
                   <div className="flex justify-between items-center text-sm border-t border-white/5 pt-4">
                      <span className="text-gray-500 text-xs uppercase tracking-tighter">Auth Provider</span>
                      <div className="flex items-center gap-2">
                        <img src="https://www.google.com/favicon.ico" className={`w-3 h-3 ${!profile.isAuth && 'grayscale opacity-30'}`} alt="G" />
                        <span className="text-gray-300 font-bold text-xs">{profile.isAuth ? 'Google' : 'None'}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="genshin-panel p-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#3d447a]/10 to-transparent">
                <h3 className="text-sm font-bold genshin-gold mb-3 uppercase tracking-widest flex items-center gap-3">
                  <User className="w-5 h-5" />
                  <span>Session Control</span>
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6 italic">Disconnect from the current Ley Line and secure your neural data.</p>
                
                <button 
                    onClick={() => { if(window.confirm('Disconnect from Akasha Celestial Network?')) signOut(); }}
                    className="w-full py-4 bg-red-500/10 border-2 border-dashed border-red-500/30 rounded-2xl text-xs font-black text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Terminate Session</span>
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
