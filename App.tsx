
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  PhoneCall, Terminal as TerminalIcon, Users, User, Settings as SettingsIcon, 
  ImageIcon, Video, Globe, LayoutDashboard, HardDrive, MessageSquare, 
  Menu, X, History, Loader2, Info, Crown, Zap, Sparkles, Cpu, Trash2, ChevronDown
} from 'lucide-react';
import { MenuType, Persona, UserProfile, VoiceConfig, Language, ApiKeyData } from './types';
import { DEFAULT_PERSONAS, INITIAL_USER_PROFILE } from './constants';
import { LANGUAGES, AI_MODELS } from './data';
import HistorySidebar from './components/HistorySidebar';
import DonationModal from './components/DonationModal';
import OnboardingTutorial from './components/OnboardingTutorial';
import AuthModal from './components/AuthModal';
import DatabaseSetupModal from './components/DatabaseSetupModal'; 
import ErrorBoundary from './components/ErrorBoundary';
import AdminConsole from './components/AdminConsole'; 
import CookieConsent from './components/CookieConsent';
import { 
  initSupabase, fetchUserProfile, syncUserSettings, fetchUserSettings, 
  getCurrentSession, signInWithGoogle, checkDbConnection, getSessionId, clearChatHistory
} from './services/supabaseService';
import { enableRuntimeProtection } from './services/securityService';
import { setServiceKeys } from './services/geminiService';

// --- COMPONENTS ---
import Terminal from './components/Terminal';
import LiveCall from './components/LiveCall';
import PersonaSelector from './components/PersonaSelector';
import VisionGen from './components/VisionGen';
import VideoGen from './components/VideoGen';
import Settings from './components/Settings';
import UserInfo from './components/UserInfo';
import LanguageSettings from './components/LanguageSettings';
import Dashboard from './components/Dashboard';
import Drive from './components/Drive'; 
import Forum from './components/Forum';
import About from './components/About';
import ExternalPortal from './components/ExternalPortal';

const MENU_ICONS: Record<string, any> = {
    [MenuType.DASHBOARD]: LayoutDashboard,
    [MenuType.TERMINAL]: TerminalIcon,
    [MenuType.PERSONAS]: Users,
    [MenuType.VISION_GEN]: ImageIcon,
    [MenuType.VIDEO_GEN]: Video,
    [MenuType.STORAGE]: HardDrive,
    [MenuType.FORUM]: MessageSquare,
    [MenuType.LANGUAGE]: Globe,
    [MenuType.USER_INFO]: User,
    [MenuType.VOICE_SETTINGS]: SettingsIcon,
    [MenuType.ABOUT]: Info,
    [MenuType.REALM_PORTAL]: Zap
};

const App: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuType>(MenuType.TERMINAL);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [globalErrorLog, setGlobalErrorLog] = useState<string | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDbSetupModal, setShowDbSetupModal] = useState(false); 
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLiveCallOpen, setIsLiveCallOpen] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [terminalKey, setTerminalKey] = useState(0); 

  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({ 
      speed: 1.0, pitch: 1.0, reverb: 0, gain: 1.0, voiceId: 'Kore', autoPlay: true
  });
  const [currentLanguage, setCurrentLanguage] = useState<Language>(LANGUAGES[0]);
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id);
  const [currentPersona, setCurrentPersona] = useState<Persona>(DEFAULT_PERSONAS[0]);

  useEffect(() => {
    enableRuntimeProtection(); 
    initializeSystem();
  }, []);

  const initializeSystem = async () => {
      try {
          const connected = initSupabase();
          setIsSupabaseConnected(connected);
          if (connected) {
              const ping = await checkDbConnection();
              if (ping === -2) setShowDbSetupModal(true);
              else if (ping >= 0) {
                  const session = await getCurrentSession();
                  if (session?.user) {
                      const [cloudProfile, cloudSettings] = await Promise.all([fetchUserProfile(), fetchUserSettings()]);
                      if (cloudProfile) setUserProfile(cloudProfile);
                      if (cloudSettings) {
                          if (cloudSettings.apiKeys) setApiKeys(cloudSettings.apiKeys);
                          if (cloudSettings.voiceConfig) setVoiceConfig(cloudSettings.voiceConfig);
                          if (cloudSettings.currentLanguage) setCurrentLanguage(cloudSettings.currentLanguage);
                          if (cloudSettings.selectedModel) setSelectedModel(cloudSettings.selectedModel);
                      }
                  }
              }
          }
      } finally { setIsDataLoaded(true); }
  };

  useEffect(() => {
    if (isDataLoaded) {
      syncUserSettings({ voiceConfig, apiKeys, currentLanguage, selectedModel });
      setServiceKeys(apiKeys);
    }
  }, [voiceConfig, apiKeys, currentLanguage, selectedModel, isDataLoaded]);

  const handlePersonaSelect = (p: Persona) => {
      setCurrentPersona(p);
      setActiveMenu(MenuType.TERMINAL);
      
      // AUTO-SYNC VOICE CONFIG BASED ON PERSONA PRESETS
      setVoiceConfig(prev => ({
          ...prev,
          voiceId: p.voiceName,
          pitch: p.pitch || 1.0,
          speed: p.speed || 1.0,
          gain: p.pitch && p.pitch < 1 ? 1.2 : 1.0 // Kompensasi volume untuk pitch rendah
      }));
  };

  const handleClearChat = async () => {
      if (window.confirm(`Purge all memory fragments with ${currentPersona.name}? This will sever the current resonance link.`)) {
          await clearChatHistory(currentPersona.id);
          setTerminalKey(prev => prev + 1); 
      }
  };

  const sidebarMenus = Object.values(MenuType).filter(m => 
    ![MenuType.ADMIN_CONSOLE, MenuType.API_KEY, MenuType.LIVE_CALL].includes(m)
  );

  const activeContent = useMemo(() => {
      if (!isDataLoaded) return null;
      switch (activeMenu) {
          case MenuType.DASHBOARD: return <Dashboard />;
          case MenuType.STORAGE: return <Drive />;
          case MenuType.TERMINAL: return <Terminal key={`${currentPersona.id}-${terminalKey}`} currentPersona={currentPersona} userProfile={userProfile} currentLanguage={currentLanguage} voiceConfig={voiceConfig} selectedModel={selectedModel} onError={setGlobalErrorLog} isSupabaseConnected={isSupabaseConnected} />;
          case MenuType.PERSONAS: return <PersonaSelector onSelect={handlePersonaSelect} activePersonaId={currentPersona.id} onCustomAdd={() => {}} onDeleteCustom={() => {}} customPersonas={[]} />;
          case MenuType.VISION_GEN: return <VisionGen onError={setGlobalErrorLog} />;
          case MenuType.VIDEO_GEN: return <VideoGen />;
          case MenuType.VOICE_SETTINGS: return <Settings voiceConfig={voiceConfig} setVoiceConfig={setVoiceConfig} apiKeys={apiKeys} setApiKeys={setApiKeys} />;
          case MenuType.USER_INFO: return <UserInfo profile={userProfile} setProfile={setUserProfile} />;
          case MenuType.LANGUAGE: return <LanguageSettings currentLanguage={currentLanguage} setLanguage={setCurrentLanguage} />;
          case MenuType.FORUM: return <Forum />;
          case MenuType.ABOUT: return <About onSwitchToAdmin={() => setActiveMenu(MenuType.ADMIN_CONSOLE)} />;
          case MenuType.ADMIN_CONSOLE: return <AdminConsole apiKeys={apiKeys} setApiKeys={setApiKeys} userProfile={userProfile} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />;
          case MenuType.REALM_PORTAL: return <ExternalPortal />;
          default: return <Terminal key={`${currentPersona.id}-${terminalKey}`} currentPersona={currentPersona} userProfile={userProfile} currentLanguage={currentLanguage} voiceConfig={voiceConfig} selectedModel={selectedModel} onError={setGlobalErrorLog} isSupabaseConnected={isSupabaseConnected} />;
      }
  }, [activeMenu, currentPersona, userProfile, currentLanguage, voiceConfig, selectedModel, isDataLoaded, apiKeys, isSupabaseConnected, terminalKey]);

  if (!isDataLoaded) return (
    <div className="h-full w-full bg-[#0b0e14] flex flex-col items-center justify-center text-[#d3bc8e]">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing Akasha Brain...</p>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-[#0b0e14] text-[#ece5d8] overflow-hidden relative select-none">
      {showAuthModal && <AuthModal onLogin={async () => { setIsAuthLoading(true); const r = await signInWithGoogle(); setIsAuthLoading(false); return r; }} onGuest={() => setShowAuthModal(false)} isLoading={isAuthLoading} />}
      {showDbSetupModal && <DatabaseSetupModal onClose={() => setShowDbSetupModal(false)} />}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110]" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-[120] h-full genshin-panel border-r border-[#d3bc8e]/20 transition-all duration-500 flex flex-col ${isSidebarOpen ? 'translate-x-0 w-80 shadow-[20px_0_60px_rgba(0,0,0,0.9)]' : '-translate-x-full w-80'}`}>
          <div className="p-8 flex items-center justify-between shrink-0 border-b border-[#d3bc8e]/10">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/30 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#d3bc8e]" />
                  </div>
                  <span className="text-xl font-black tracking-widest genshin-gold font-serif">AKASHA</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-[#d3bc8e] hover:rotate-90 transition-transform"><X className="w-6 h-6"/></button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1">
            <button onClick={() => { setIsLiveCallOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl mb-4 bg-[#d3bc8e]/10 border border-[#d3bc8e]/20 text-[#d3bc8e] hover:bg-[#d3bc8e]/20 transition-all group">
                <PhoneCall className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-black uppercase tracking-widest text-[10px]">Celestial Call</span>
            </button>
            
            {sidebarMenus.map((m) => {
              const Icon = MENU_ICONS[m] || TerminalIcon;
              return (
                <button key={m} onClick={() => { setActiveMenu(m); setIsSidebarOpen(false); }} className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all duration-300 ${activeMenu === m ? 'bg-[#d3bc8e] text-black shadow-lg shadow-[#d3bc8e]/10' : 'text-gray-400 hover:bg-white/5 hover:text-[#d3bc8e]'}`}>
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{m.replace(/_/g, ' ')}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-[#d3bc8e]/10 bg-black/40">
             <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <img src={userProfile.avatar} className="w-10 h-10 rounded-full border border-[#d3bc8e]/30" alt="av" />
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-[#d3bc8e] uppercase truncate">{userProfile.username}</p>
                    <p className="text-[8px] text-gray-500 uppercase tracking-tighter">Traveler Node</p>
                </div>
             </div>
          </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 relative w-full">
        <header className="h-16 border-b border-[#d3bc8e]/10 flex items-center justify-between px-6 bg-[#0b0e14]/90 backdrop-blur-md z-[100] shrink-0">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-[#d3bc8e] hover:scale-110 transition-transform"><Menu className="w-7 h-7" /></button>
           </div>

           <div className="hidden sm:flex flex-col items-center">
             <h2 className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.3em] font-serif">{activeMenu.replace(/_/g, ' ')}</h2>
             <div className="h-0.5 w-8 bg-[#d3bc8e]/30 mt-1 rounded-full"></div>
           </div>

           <div className="flex items-center gap-1 sm:gap-3">
              {activeMenu === MenuType.TERMINAL && (
                 <>
                    <div className="relative">
                        <button 
                            onClick={() => setShowModelDropdown(!showModelDropdown)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/30 text-[#d3bc8e] hover:bg-[#d3bc8e]/20 transition-all group"
                        >
                            <Cpu className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden md:block">
                                {AI_MODELS.find(m => m.id === selectedModel)?.label.split(' ')[0] || 'Model'}
                            </span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showModelDropdown && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowModelDropdown(false)}></div>
                                <div className="absolute top-full right-0 mt-2 w-56 bg-[#13182b]/95 backdrop-blur-xl border border-[#d3bc8e]/30 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden animate-in slide-in-from-top-2">
                                    <div className="px-4 py-2 border-b border-[#d3bc8e]/10 mb-1">
                                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Select Wisdom Core</span>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                        {AI_MODELS.map(m => (
                                            <button 
                                                key={m.id}
                                                onClick={() => { setSelectedModel(m.id); setShowModelDropdown(false); }}
                                                className={`w-full text-left px-4 py-3 flex flex-col transition-all ${selectedModel === m.id ? 'bg-[#d3bc8e] text-black' : 'hover:bg-white/5 text-gray-400 hover:text-[#d3bc8e]'}`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-tight">{m.label}</span>
                                                <span className={`text-[8px] opacity-70 italic ${selectedModel === m.id ? 'text-black/60' : 'text-gray-500'}`}>{m.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={handleClearChat}
                        className="p-2 text-[#d3bc8e]/60 hover:text-red-400 hover:scale-110 transition-all"
                        title="Purge Memory"
                    >
                        <Trash2 className="w-6 h-6" />
                    </button>
                 </>
              )}

              <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-[#d3bc8e] hover:scale-110 transition-transform" title="Resonance Log"><History className="w-7 h-7" /></button>
           </div>
        </header>
        
        <section className="flex-1 min-h-0 relative z-10 overflow-hidden w-full">
          <ErrorBoundary>
             <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-[#d3bc8e]" /></div>}>
                <div className="h-full w-full overflow-hidden">
                    {activeContent}
                </div>
             </Suspense>
          </ErrorBoundary>
        </section>
      </main>

      <LiveCall currentPersona={currentPersona} voiceConfig={voiceConfig} isOpen={isLiveCallOpen} onClose={() => setIsLiveCallOpen(false)} />
      <HistorySidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelectPersona={handlePersonaSelect} onNewChat={() => setActiveMenu(MenuType.PERSONAS)} activePersonaId={currentPersona.id} customPersonas={[]} />
      <DonationModal errorLog={globalErrorLog} onClose={() => setGlobalErrorLog(null)} />
      <OnboardingTutorial />
      <CookieConsent />
    </div>
  );
};

export default App;
