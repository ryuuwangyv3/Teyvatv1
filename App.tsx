
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  PhoneCall, Terminal as TerminalIcon, Users, User, Settings as SettingsIcon, 
  ImageIcon, Video, Globe, LayoutDashboard, HardDrive, MessageSquare, 
  Menu, X, History, Loader2, Info, Crown, Zap, Sparkles, Cpu, Trash2, ChevronDown, Bell
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
          gain: p.pitch && p.pitch < 1 ? 1.2 : 1.0
      }));
  };

  const handleClearChat = async () => {
      if (window.confirm(`Purge all memory fragments with ${currentPersona.name}? This will sever the current resonance link.`)) {
          await clearChatHistory(currentPersona.id);
          setTerminalKey(prev => prev + 1); 
      }
  };

  const getProviderStyle = (provider: string) => {
    switch (provider.toLowerCase()) {
        case 'google': return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
        case 'pollinations': return 'text-purple-400 border-purple-500/30 bg-purple-500/5';
        case 'openai': return 'text-blue-400 border-blue-500/30 bg-blue-500/5';
        case 'openrouter': return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5';
        default: return 'text-gray-400 border-white/10 bg-white/5';
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
        <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Initializing Akasha Brain...</p>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-[#0b0e14] text-[#ece5d8] overflow-hidden relative select-none">
      {showAuthModal && <AuthModal onLogin={async () => { setIsAuthLoading(true); const r = await signInWithGoogle(); setIsAuthLoading(false); return r; }} onGuest={() => setShowAuthModal(false)} isLoading={isAuthLoading} />}
      {showDbSetupModal && <DatabaseSetupModal onClose={() => setShowDbSetupModal(false)} />}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] transition-opacity duration-500" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-[120] h-full genshin-panel rounded-none border-r border-[#d3bc8e]/20 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col ${isSidebarOpen ? 'translate-x-0 w-80 shadow-[30px_0_100px_rgba(0,0,0,0.9)]' : '-translate-x-full w-80'}`}>
          <div className="p-8 flex items-center justify-between shrink-0 border-b border-[#d3bc8e]/10 bg-black/20">
              <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/30 flex items-center justify-center shadow-inner">
                    <Sparkles className="w-7 h-7 text-[#d3bc8e] animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-xl font-black tracking-[0.2em] text-[#d3bc8e] font-serif leading-none">AKASHA</span>
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Ley Line Interface</span>
                  </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-500 hover:text-[#d3bc8e] hover:rotate-90 transition-all"><X className="w-6 h-6"/></button>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-2">
            <button onClick={() => { setIsLiveCallOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-4 p-5 rounded-2xl mb-6 bg-[#d3bc8e]/10 border border-[#d3bc8e]/20 text-[#d3bc8e] hover:bg-[#d3bc8e]/20 hover:border-[#d3bc8e]/40 transition-all group shadow-lg">
                <div className="w-10 h-10 rounded-full bg-[#d3bc8e]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PhoneCall className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-black uppercase tracking-widest text-[10px]">Celestial Call</span>
                    <span className="text-[8px] text-[#d3bc8e]/60 font-bold">Synchronous Voice Link</span>
                </div>
            </button>
            
            <div className="space-y-1">
                {sidebarMenus.map((m) => {
                  const Icon = MENU_ICONS[m] || TerminalIcon;
                  const isActive = activeMenu === m;
                  return (
                    <button 
                        key={m} 
                        onClick={() => { setActiveMenu(m); setIsSidebarOpen(false); }} 
                        className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 relative group ${isActive ? 'bg-[#d3bc8e] text-black shadow-xl shadow-[#d3bc8e]/20 translate-x-2' : 'text-gray-400 hover:bg-white/5 hover:text-[#d3bc8e]'}`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{m.replace(/_/g, ' ')}</span>
                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-black rounded-r-full"></div>}
                    </button>
                  );
                })}
            </div>
          </nav>

          <div className="p-6 border-t border-[#d3bc8e]/10 bg-black/40">
             <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#d3bc8e]/5 border border-[#d3bc8e]/10 hover:border-[#d3bc8e]/30 transition-all cursor-pointer group">
                <div className="relative">
                    <img src={userProfile.avatar} className="w-12 h-12 rounded-2xl border-2 border-[#d3bc8e]/30 group-hover:scale-105 transition-transform" alt="av" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#0b0e14] rounded-full"></div>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black text-[#d3bc8e] uppercase truncate tracking-widest">{userProfile.username}</p>
                    <p className="text-[8px] text-gray-500 uppercase tracking-tighter font-bold">Resonance Level: LVL. 90</p>
                </div>
             </div>
          </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 relative w-full overflow-hidden">
        <header className="h-20 border-b border-[#d3bc8e]/10 flex items-center justify-between px-8 bg-[#0b0e14]/80 backdrop-blur-xl z-[100] shrink-0">
           <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-3 rounded-2xl bg-[#d3bc8e]/5 border border-[#d3bc8e]/20 text-[#d3bc8e] hover:bg-[#d3bc8e]/10 hover:scale-110 transition-all shadow-lg active:scale-95"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="flex flex-col">
                <h2 className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.4em] font-serif leading-none">{activeMenu.replace(/_/g, ' ')}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1 w-6 bg-[#d3bc8e] rounded-full"></div>
                    <div className="h-1 w-2 bg-[#d3bc8e]/40 rounded-full"></div>
                </div>
              </div>
           </div>

           <div className="flex items-center gap-2 sm:gap-4">
              {activeMenu === MenuType.TERMINAL && (
                 <>
                    <div className="relative">
                        <button 
                            onClick={() => setShowModelDropdown(!showModelDropdown)}
                            className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/30 text-[#d3bc8e] hover:bg-[#d3bc8e]/20 transition-all group shadow-lg"
                        >
                            <Cpu className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">
                                    {AI_MODELS.find(m => m.id === selectedModel)?.label.split(' ')[0] || 'Model'}
                                </span>
                                <span className="text-[6px] text-gray-500 uppercase font-black tracking-tighter mt-0.5 hidden md:block">
                                    Core: {AI_MODELS.find(m => m.id === selectedModel)?.provider}
                                </span>
                            </div>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showModelDropdown && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowModelDropdown(false)}></div>
                                <div className="absolute top-full right-0 mt-3 w-72 bg-[#13182b]/98 backdrop-blur-2xl border border-[#d3bc8e]/30 rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-20 py-3 overflow-hidden animate-in slide-in-from-top-3 duration-300">
                                    <div className="px-5 py-2 border-b border-[#d3bc8e]/10 mb-2">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Wisdom Core Selection</span>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto custom-scrollbar px-2 space-y-1">
                                        {AI_MODELS.map(m => (
                                            <button 
                                                key={m.id}
                                                onClick={() => { setSelectedModel(m.id); setShowModelDropdown(false); }}
                                                className={`w-full text-left px-4 py-3 rounded-xl flex flex-col transition-all group/item relative ${selectedModel === m.id ? 'bg-[#d3bc8e] text-black shadow-lg' : 'hover:bg-white/5 text-gray-400 hover:text-[#d3bc8e]'}`}
                                            >
                                                <div className="flex justify-between items-start w-full">
                                                    <span className="text-[11px] font-black uppercase tracking-tight max-w-[70%] truncate">{m.label}</span>
                                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase border transition-colors ${selectedModel === m.id ? 'bg-black/20 border-black/30 text-black' : getProviderStyle(m.provider)}`}>
                                                        {m.provider}
                                                    </span>
                                                </div>
                                                <span className={`text-[8px] mt-1 uppercase tracking-widest font-bold opacity-60 ${selectedModel === m.id ? 'text-black/70' : 'text-gray-500'}`}>{m.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={handleClearChat}
                        className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/20 hover:scale-110 transition-all shadow-lg"
                        title="Purge Memory"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                 </>
              )}

              <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block"></div>

              <button 
                onClick={() => setIsHistoryOpen(true)} 
                className="p-3 rounded-2xl bg-[#d3bc8e]/5 border border-[#d3bc8e]/20 text-[#d3bc8e] hover:bg-[#d3bc8e]/10 hover:scale-110 transition-all shadow-lg relative" 
                title="Resonance Log"
              >
                <History className="w-6 h-6" />
                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-[#0b0e14] animate-pulse"></div>
              </button>
           </div>
        </header>
        
        <section className="flex-1 min-h-0 relative z-10 overflow-hidden w-full bg-[#0b0e14]/40">
          <ErrorBoundary>
             <Suspense fallback={
                <div className="flex h-full flex-col items-center justify-center">
                    <Loader2 className="animate-spin w-12 h-12 text-[#d3bc8e] mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d3bc8e]/50">Synchronizing Ley Lines...</p>
                </div>
             }>
                <div className="h-full w-full overflow-hidden">
                    {activeContent}
                </div>
             </Suspense>
          </ErrorBoundary>
        </section>
        
        {/* Dynamic Elemental Aura Background */}
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#d3bc8e]/5 to-transparent pointer-events-none z-0"></div>
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
