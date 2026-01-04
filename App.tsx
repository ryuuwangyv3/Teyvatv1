
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  PhoneCall, Terminal as TerminalIcon, Users, User, Settings as SettingsIcon, 
  Image as ImageIcon, Video, Globe, LayoutDashboard, Info, MessageSquare, 
  Menu, X, History, ShieldCheck, HardDrive, Loader2, Cloud, Lock, Sparkles, Database, LogOut, CheckCircle2, ChevronDown, Box, CloudLightning
} from 'lucide-react';
import { MenuType, Persona, UserProfile, VoiceConfig, Language, ApiKeyData, SupabaseConfig } from './types';
import { DEFAULT_PERSONAS, INITIAL_USER_PROFILE } from './constants';
import { LANGUAGES, AI_MODELS } from './data';
import LazyImage from './components/LazyImage';
import HistorySidebar from './components/HistorySidebar';
import DonationModal from './components/DonationModal';
import OnboardingTutorial from './components/OnboardingTutorial';
import AuthModal from './components/AuthModal';
import DatabaseSetupModal from './components/DatabaseSetupModal'; 
import ErrorBoundary from './components/ErrorBoundary';
import AdminConsole from './components/AdminConsole'; 
import { 
  initSupabase, fetchUserProfile, syncUserProfile, 
  fetchCustomPersonas, syncCustomPersonas, deleteCustomPersona,
  fetchUserSettings, syncUserSettings, VfsManager,
  getCurrentSession, signInWithGoogle, checkSchemaHealth, listenToAuthChanges, signOut
} from './services/supabaseService';
import { enableRuntimeProtection, SecureStorage } from './services/securityService';
import { getSystemCredentials } from './services/credentials';

// --- EAGER IMPORTS ---
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

// --- HASH ROUTING HELPERS ---
const getMenuFromHash = (): MenuType => {
  if (typeof window === 'undefined') return MenuType.TERMINAL;
  const hash = window.location.hash.replace(/^#\//, '').replace(/-/g, '_').toLowerCase();
  const values = Object.values(MenuType);
  const found = values.find(v => v.toLowerCase() === hash);
  return (found as MenuType) || MenuType.TERMINAL;
};

const getHashFromMenu = (menu: MenuType): string => {
  return '#/' + menu.replace(/_/g, '-');
};

const App: React.FC = () => {
  // Initialize state from URL hash
  const [activeMenu, setActiveMenu] = useState<MenuType>(() => getMenuFromHash());

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [globalErrorLog, setGlobalErrorLog] = useState<string | null>(null);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDbSetupModal, setShowDbSetupModal] = useState(false); 
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [loadingStep, setLoadingStep] = useState("Initializing VFS...");
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // LIVE CALL PERSISTENCE
  const [isLiveCallOpen, setIsLiveCallOpen] = useState(false);

  // State
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({ 
      speed: 1.0, pitch: 1.0, reverb: 0, gain: 1.0, eqLow: 0, eqMid: 0, eqHigh: 0, noise: 0, voiceId: 'Kore', autoPlay: true
  });
  const [currentLanguage, setCurrentLanguage] = useState<Language>(LANGUAGES[0]);
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id);
  const [currentPersona, setCurrentPersona] = useState<Persona>(DEFAULT_PERSONAS[0]);

  // --- HASH ROUTING SYNC ---
  useEffect(() => {
    const handleHashChange = () => {
      setActiveMenu(getMenuFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const targetHash = getHashFromMenu(activeMenu);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, [activeMenu]);

  useEffect(() => {
    enableRuntimeProtection(); 
    initializeSystem();

    const handleResize = () => {
       if (window.innerWidth < 1024) setIsSidebarOpen(false);
       else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      const formattedTitle = activeMenu
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      document.title = `${formattedTitle} | Akasha System`;
  }, [activeMenu]);

  // --- AUTH LISTENER ---
  useEffect(() => {
      const { subscription } = listenToAuthChanges((user) => {
          if (user) {
              const newProfile: UserProfile = {
                  username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Traveler',
                  email: user.email,
                  avatar: user.user_metadata?.avatar_url || INITIAL_USER_PROFILE.avatar,
                  bio: "Connected via Akasha Celestial Network.",
                  headerBackground: INITIAL_USER_PROFILE.headerBackground,
                  isAuth: true
              };
              setUserProfile(prev => ({ ...prev, ...newProfile }));
              setShowAuthModal(false);
              syncUserProfile(newProfile);
          } else {
              setUserProfile(prev => ({ ...prev, isAuth: false, email: undefined }));
          }
      });
      return () => { subscription?.unsubscribe(); };
  }, []);

  const initializeSystem = async () => {
      setLoadingStep("Accessing Irminsul VFS...");
      try {
          const vfsProfile = await fetchUserProfile();
          const vfsPersonas = await VfsManager.loadItem('custom_personas.json');
          const vfsSettings = await VfsManager.loadItem('settings.json');
          const savedPersonaId = localStorage.getItem('active_persona_id'); 
          const savedModelId = localStorage.getItem('terminal_local_model_override');

          if (vfsProfile) setUserProfile(vfsProfile);
          if (vfsPersonas) setCustomPersonas(vfsPersonas);
          
          let loadedKeys: ApiKeyData[] = [];
          if (vfsSettings) {
              if (vfsSettings.apiKeys) loadedKeys = vfsSettings.apiKeys;
              if (vfsSettings.voiceConfig) setVoiceConfig({ ...voiceConfig, ...vfsSettings.voiceConfig });
              if (vfsSettings.currentLanguage) setCurrentLanguage(vfsSettings.currentLanguage);
              if (vfsSettings.selectedModel) setSelectedModel(vfsSettings.selectedModel);
          }

          // Local storage override has precedence for UI persistence
          if (savedModelId) {
            setSelectedModel(savedModelId);
          }

          const sysCreds = getSystemCredentials();
          if (sysCreds.openai && !loadedKeys.some(k => k.key === sysCreds.openai)) {
              loadedKeys.push({ key: sysCreds.openai, provider: 'openai', isValid: true, lastChecked: Date.now(), label: 'System Key' });
          }
          setApiKeys(loadedKeys);

          if (savedPersonaId) {
              const all = [...(vfsPersonas || []), ...DEFAULT_PERSONAS];
              const found = all.find(p => p.id === savedPersonaId);
              if (found) setCurrentPersona(found);
          }

          setLoadingStep("Syncing Celestial Identity...");
          const connected = initSupabase();
          setIsSupabaseConnected(connected);
          
          if (connected) {
              const status = await checkSchemaHealth();
              if (status === 404) setShowDbSetupModal(true);
              else if (status === 200) {
                  const session = await getCurrentSession();
                  if (!session?.user && !localStorage.getItem('has_seen_auth_v2')) setShowAuthModal(true);
              }
          }
      } catch (err) {
          console.error("VFS Init failed, continuing with defaults.", err);
      } finally {
          setIsDataLoaded(true);
      }
  };

  useEffect(() => {
    if (!isDataLoaded) return;
    syncUserProfile(userProfile);
    syncCustomPersonas(customPersonas);
    syncUserSettings({ voiceConfig, apiKeys, currentLanguage, selectedModel });
  }, [userProfile, customPersonas, voiceConfig, apiKeys, currentLanguage, selectedModel, isDataLoaded]);

  const handlePersonaChange = (persona: Persona) => {
    setCurrentPersona(persona);
    localStorage.setItem('active_persona_id', persona.id);
    setActiveMenu(MenuType.TERMINAL);
    if (window.innerWidth < 1024) setIsSidebarOpen(false); 
  };

  const handleCustomAdd = (persona: Persona) => {
    setCustomPersonas(prev => [...prev.filter(p => p.id !== persona.id), persona]);
    handlePersonaChange(persona);
  };

  const activeContent = useMemo(() => {
      if (!isDataLoaded) return null;
      switch (activeMenu) {
          case MenuType.DASHBOARD: return <Dashboard />;
          case MenuType.STORAGE: return <Drive />;
          case MenuType.TERMINAL: return <Terminal key={currentPersona.id} currentPersona={currentPersona} userProfile={userProfile} currentLanguage={currentLanguage} voiceConfig={voiceConfig} selectedModel={selectedModel} onError={setGlobalErrorLog} isSupabaseConnected={isSupabaseConnected} />;
          case MenuType.PERSONAS: return <PersonaSelector onSelect={handlePersonaChange} activePersonaId={currentPersona.id} onCustomAdd={handleCustomAdd} onDeleteCustom={deleteCustomPersona} customPersonas={customPersonas} />;
          case MenuType.VISION_GEN: return <VisionGen onError={setGlobalErrorLog} />;
          case MenuType.VIDEO_GEN: return <VideoGen />;
          case MenuType.VOICE_SETTINGS: return <Settings voiceConfig={voiceConfig} setVoiceConfig={setVoiceConfig} apiKeys={apiKeys} setApiKeys={setApiKeys} onSwitchToAdmin={() => setActiveMenu(MenuType.ADMIN_CONSOLE)} />;
          case MenuType.USER_INFO: return <UserInfo profile={userProfile} setProfile={setUserProfile} />;
          case MenuType.LANGUAGE: return <LanguageSettings currentLanguage={currentLanguage} setLanguage={setCurrentLanguage} />;
          case MenuType.FORUM: return <Forum />;
          case MenuType.ABOUT: return <About onSwitchToAdmin={() => setActiveMenu(MenuType.ADMIN_CONSOLE)} />;
          case MenuType.ADMIN_CONSOLE: return <AdminConsole apiKeys={apiKeys} setApiKeys={setApiKeys} userProfile={userProfile} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />;
          default: return <Terminal currentPersona={currentPersona} userProfile={userProfile} currentLanguage={currentLanguage} voiceConfig={voiceConfig} selectedModel={selectedModel} onError={setGlobalErrorLog} isSupabaseConnected={isSupabaseConnected} />;
      }
  }, [activeMenu, currentPersona, userProfile, currentLanguage, voiceConfig, selectedModel, isDataLoaded, apiKeys, isSupabaseConnected, customPersonas]);

  if (!isDataLoaded) {
      return (
        <div className="h-screen w-screen bg-[#0b0e14] flex flex-col items-center justify-center overflow-hidden text-[#ece5d8]">
            <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                <div className="absolute inset-0 rounded-full border border-dashed border-amber-500/20 akasha-loader-ring"></div>
                <div className="absolute inset-16 rounded-full bg-black/40 backdrop-blur-sm akasha-pulse flex items-center justify-center">
                    <TerminalIcon className="w-16 h-16 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
                </div>
            </div>
            <div className="text-center">
                <h1 className="text-4xl font-bold font-serif tracking-[0.2em] genshin-gold mb-2">TEYVAT.AI</h1>
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest animate-pulse">[{loadingStep}]</p>
            </div>
        </div>
      );
  }

  const navItems = [
    { type: MenuType.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { type: MenuType.STORAGE, label: 'Drive', icon: HardDrive },
    { type: MenuType.TERMINAL, label: 'Terminal', icon: TerminalIcon },
    { type: MenuType.PERSONAS, label: 'Personas', icon: Users },
    { type: MenuType.USER_INFO, label: 'User Info', icon: User },
    { type: MenuType.VOICE_SETTINGS, label: 'Audio Config', icon: SettingsIcon },
    { type: MenuType.VISION_GEN, label: 'Vision Gen', icon: ImageIcon },
    { type: MenuType.VIDEO_GEN, label: 'Video Gen', icon: Video },
    { type: MenuType.LANGUAGE, label: 'Language', icon: Globe },
    { type: MenuType.FORUM, label: 'Forum', icon: MessageSquare },
    { type: MenuType.ABOUT, label: 'About', icon: Info },
  ];

  return (
    <div className="flex h-screen w-full bg-[#0b0e14] text-[#ece5d8] overflow-hidden relative">
      {showAuthModal && <AuthModal onLogin={async () => { setIsAuthLoading(true); const r = await signInWithGoogle(); setIsAuthLoading(false); return r; }} onGuest={() => { setShowAuthModal(false); localStorage.setItem('has_seen_auth_v2', 'true'); }} isLoading={isAuthLoading} />}
      {showDbSetupModal && <DatabaseSetupModal onClose={() => setShowDbSetupModal(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-[70] h-full genshin-panel border-r border-white/10 transition-all duration-300 lg:relative lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:w-20'}`}>
          <div className="p-6 flex items-center justify-between shrink-0">
              <span className="text-xl font-bold tracking-widest genshin-gold truncate">{isSidebarOpen ? 'TEYVAT.AI' : 'T.AI'}</span>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-white/10"><X /></button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
            {/* LIVE CALL TRIGGER */}
            <button 
              onClick={() => setIsLiveCallOpen(true)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl mb-4 transition-all bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-500 text-white shadow-lg shadow-amber-900/10 group`}
            >
              <div className="relative">
                <PhoneCall className="w-6 h-6 shrink-0 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              </div>
              {isSidebarOpen && <span className="font-black uppercase tracking-widest text-xs">Celestial Call</span>}
            </button>

            {navItems.map((item) => (
              <button key={item.type} onClick={() => { setActiveMenu(item.type); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-lg transition-all ${activeMenu === item.type ? 'sidebar-item-active' : 'text-gray-400 hover:bg-white/5'}`} title={item.label}>
                <item.icon className={`w-6 h-6 shrink-0 ${activeMenu === item.type ? 'text-amber-500' : ''}`} />
                {isSidebarOpen && <span className="font-medium truncate">{item.label}</span>}
              </button>
            ))}
            {activeMenu === MenuType.ADMIN_CONSOLE && <button className="w-full flex items-center gap-4 p-3 rounded-lg bg-red-900/20 border-l-4 border-red-500 text-red-400"><Lock className="w-6 h-6 shrink-0" />{isSidebarOpen && <span className="font-bold">ADMIN ROOT</span>}</button>}
          </nav>
          
          <div className="p-3 border-t border-white/10 bg-[#0e121b]/80 backdrop-blur-xl shrink-0 group">
              <div className="flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-white/5">
                  <div className="relative cursor-pointer shrink-0" onClick={() => setActiveMenu(MenuType.USER_INFO)}>
                      <LazyImage src={userProfile.avatar} className="w-10 h-10 rounded-xl border border-white/20 shadow-lg group-hover:border-amber-500/50 transition-colors" alt="User" />
                      {userProfile.isAuth ? (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#0e121b] rounded-full flex items-center justify-center shadow-md">
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </div>
                      ) : (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-500 border-2 border-[#0e121b] rounded-full shadow-md"></div>
                      )}
                  </div>
                  {isSidebarOpen && (
                      <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="text-sm font-bold text-gray-100 truncate flex items-center gap-1.5">
                              {userProfile.username}
                              {userProfile.isAuth && <ShieldCheck className="w-3 h-3 text-amber-500" />}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate font-mono uppercase tracking-tighter">
                              {userProfile.isAuth ? (userProfile.email || 'Google Account') : 'Guest Session'}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0b0e14]/90 backdrop-blur-md z-30">
           <div className="flex items-center gap-3">
               <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors"><Menu /></button>
               <h2 className="text-lg font-medium genshin-gold uppercase tracking-[0.1em]">{activeMenu.replace('_', ' ')}</h2>
           </div>
           <div className="flex items-center gap-4">
               {/* GLOBAL AI MODEL SELECTOR (MOVED FROM TERMINAL) */}
               {activeMenu === MenuType.TERMINAL && (
                    <div className="relative" onMouseEnter={() => setShowModelSelector(true)} onMouseLeave={() => setShowModelSelector(false)}>
                        <button className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-[#d3bc8e] transition-all bg-white/5 px-4 py-2 rounded-full border border-white/5 hover:border-[#d3bc8e]/30">
                            {AI_MODELS.find(m => m.id === selectedModel)?.provider === 'openai' ? <CloudLightning className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                            <span className="hidden sm:inline">Engine: {AI_MODELS.find(m => m.id === selectedModel)?.label}</span>
                            <span className="sm:hidden">{AI_MODELS.find(m => m.id === selectedModel)?.label.split(' ').pop()}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showModelSelector ? 'rotate-180' : ''}`} />
                        </button>
                        {showModelSelector && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-[#131823] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in slide-in-from-top-2">
                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] p-2 border-b border-white/5 mb-2">Select Wisdom Core</div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                    {AI_MODELS.map(model => (
                                        <button key={model.id} onClick={() => { setSelectedModel(model.id); localStorage.setItem('terminal_local_model_override', model.id); setShowModelSelector(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-xs flex items-center justify-between transition-all ${selectedModel === model.id ? 'bg-[#d3bc8e]/20 text-[#d3bc8e] font-black' : 'hover:bg-white/5 text-gray-400'}`}>
                                            <div className="flex flex-col">
                                                <span>{model.label}</span>
                                                <span className="text-[8px] opacity-60 font-mono">{model.provider.toUpperCase()}</span>
                                            </div>
                                            {selectedModel === model.id && <Box className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
               )}
               <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="p-2 -mr-2 rounded-full hover:bg-white/5 transition-colors"><History /></button>
           </div>
        </header>
        <section className="flex-1 overflow-hidden relative z-10">
          <ErrorBoundary>
             <Suspense fallback={<div className="flex h-full items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>}>{activeContent}</Suspense>
          </ErrorBoundary>
        </section>
      </main>

      {/* PERSISTENT LIVE CALL COMPONENT */}
      <LiveCall 
        currentPersona={currentPersona} 
        voiceConfig={voiceConfig} 
        isOpen={isLiveCallOpen} 
        onClose={() => setIsLiveCallOpen(false)} 
      />

      <HistorySidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelectPersona={handlePersonaChange} onNewChat={() => setActiveMenu(MenuType.PERSONAS)} activePersonaId={currentPersona.id} customPersonas={customPersonas} />
      <DonationModal errorLog={globalErrorLog} onClose={() => setGlobalErrorLog(null)} />
      <OnboardingTutorial />
    </div>
  );
};

export default App;
