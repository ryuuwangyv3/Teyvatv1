
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  PhoneCall, Terminal as TerminalIcon, Users, User, Settings as SettingsIcon, 
  ImageIcon, Video, Globe, LayoutDashboard, Info, MessageSquare, 
  Menu, X, History, ShieldCheck, HardDrive, Loader2, Cloud, Lock, Sparkles, Database, LogOut, CheckCircle2, ChevronDown, Box, CloudLightning, Zap
} from 'lucide-react';
import { MenuType, Persona, UserProfile, VoiceConfig, Language, ApiKeyData, GitHubConfig } from './types';
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
import CookieConsent from './components/CookieConsent';
import { 
  initSupabase, fetchUserProfile, syncUserProfile, 
  syncUserSettings, fetchUserSettings, subscribeToTable,
  getCurrentSession, signInWithGoogle, listenToAuthChanges, checkDbConnection, mapUserToProfile, getSessionId
} from './services/supabaseService';
import { enableRuntimeProtection } from './services/securityService';
import { getSystemCredentials } from './services/credentials';
import { setServiceKeys } from './services/geminiService';
import { syncGithubRepo, DEFAULT_GITHUB_CONFIG } from './services/githubService';

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
import ExternalPortal from './components/ExternalPortal';

// --- HASH ROUTING HELPERS ---
const getMenuFromHash = (): MenuType => {
  if (typeof window === 'undefined') return MenuType.TERMINAL;
  const hash = window.location.hash.replace(/^#\//, '').replace(/-/g, '_').toLowerCase();
  const values = Object.values(MenuType);
  return (values.find(v => v.toLowerCase() === hash) as MenuType) || MenuType.TERMINAL;
};

const getHashFromMenu = (menu: MenuType): string => {
  return '#/' + menu.replace(/_/g, '-');
};

const App: React.FC = () => {
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
  const [isLiveCallOpen, setIsLiveCallOpen] = useState(false);

  // State
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => getSessionId());
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({ 
      speed: 1.0, pitch: 1.0, reverb: 0, gain: 1.0, voiceId: 'Kore', autoPlay: true
  });
  const [currentLanguage, setCurrentLanguage] = useState<Language>(LANGUAGES[0]);
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id);
  const [currentPersona, setCurrentPersona] = useState<Persona>(DEFAULT_PERSONAS[0]);

  useEffect(() => {
    const handleHashChange = () => {
        const newMenu = getMenuFromHash();
        setActiveMenu(newMenu);
        window.dispatchEvent(new CustomEvent('akasha:menu_change', { detail: { menu: newMenu } }));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const targetHash = getHashFromMenu(activeMenu);
    if (window.location.hash !== targetHash) window.location.hash = targetHash;
  }, [activeMenu]);

  useEffect(() => {
    enableRuntimeProtection(); 
    initializeSystem();
    const handleResize = () => {
       if (window.innerWidth < 1024) setIsSidebarOpen(false);
       else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    
    const syncInterval = setInterval(() => {
        const ghConfig = userProfile.githubConfig || DEFAULT_GITHUB_CONFIG;
        if (ghConfig.autoSync) {
            syncGithubRepo(ghConfig);
        }
    }, 600000);

    return () => {
        window.removeEventListener('resize', handleResize);
        clearInterval(syncInterval);
    };
  }, [userProfile.githubConfig]);

  const initializeSystem = async () => {
      setLoadingStep("Accessing Irminsul VFS...");
      try {
          const connected = initSupabase();
          setIsSupabaseConnected(connected);

          if (connected) {
              setLoadingStep("Syncing Celestial Identity...");
              const ping = await checkDbConnection();
              
              if (ping === -2) {
                  setShowDbSetupModal(true);
              } else if (ping >= 0) {
                  const session = await getCurrentSession();
                  if (session?.user) {
                      setCurrentUserId(session.user.id);
                      const [cloudProfile, cloudSettings] = await Promise.all([
                          fetchUserProfile(),
                          fetchUserSettings()
                      ]);

                      if (cloudProfile) {
                          setUserProfile(cloudProfile);
                          const ghConfig = cloudProfile.githubConfig || DEFAULT_GITHUB_CONFIG;
                          if (ghConfig.autoSync) {
                              setLoadingStep(`Resonating with GitHub (${ghConfig.repo})...`);
                              syncGithubRepo(ghConfig);
                          }
                      } else {
                          const googleProfile = mapUserToProfile(session.user);
                          setUserProfile(googleProfile);
                          syncUserProfile(googleProfile);
                          syncGithubRepo(DEFAULT_GITHUB_CONFIG);
                      }

                      if (cloudSettings) {
                          if (cloudSettings.apiKeys) setApiKeys(cloudSettings.apiKeys);
                          if (cloudSettings.voiceConfig) setVoiceConfig(cloudSettings.voiceConfig);
                          if (cloudSettings.currentLanguage) setCurrentLanguage(cloudSettings.currentLanguage);
                          if (cloudSettings.selectedModel) setSelectedModel(cloudSettings.selectedModel);
                      }
                  } else {
                      setLoadingStep("Resonating with Public Fragments...");
                      syncGithubRepo(DEFAULT_GITHUB_CONFIG);
                      if (!localStorage.getItem('has_seen_auth_v2')) {
                          setShowAuthModal(true);
                      }
                  }
              }
          } else {
              setLoadingStep("Resonating with Local Fragments...");
              syncGithubRepo(DEFAULT_GITHUB_CONFIG);
          }

          if (!isSupabaseConnected || !currentUserId) {
             const vfsProfile = await fetchUserProfile();
             if (vfsProfile) setUserProfile(vfsProfile);
          }

          const savedPersonaId = localStorage.getItem('active_persona_id'); 
          if (savedPersonaId) {
              const all = [...DEFAULT_PERSONAS];
              const found = all.find(p => p.id === savedPersonaId);
              if (found) setCurrentPersona(found);
          }

      } catch (err) {
          console.error("Akasha VFS Init failed:", err);
      } finally {
          setIsDataLoaded(true);
      }
  };

  useEffect(() => {
      const { subscription } = listenToAuthChanges(async (user) => {
          if (user) {
              setCurrentUserId(user.id);
              const cloudProfile = await fetchUserProfile();
              if (cloudProfile) {
                  setUserProfile(cloudProfile);
              } else {
                  const googleProfile = mapUserToProfile(user);
                  setUserProfile(googleProfile);
                  syncUserProfile(googleProfile);
              }
              setShowAuthModal(false);
              setActiveMenu(MenuType.USER_INFO);
              window.location.hash = getHashFromMenu(MenuType.USER_INFO);
          } else {
              setCurrentUserId(null);
              setUserProfile(prev => ({ ...prev, isAuth: false, email: undefined }));
          }
      });
      return () => { subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
      if (!isSupabaseConnected || !userProfile.isAuth) return;

      const profileChannel = subscribeToTable('user_profiles', (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.user_id === currentUserId) {
              const p = payload.new;
              setUserProfile(prev => ({
                  ...prev,
                  username: p.username, bio: p.bio, avatar: p.avatar,
                  header_background: p.header_background, email: p.email,
                  githubConfig: p.github_config 
              }));
          }
      });

      const settingsChannel = subscribeToTable('user_settings', (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.user_id === currentUserId) {
              const s = payload.new.data;
              if (s.voiceConfig) setVoiceConfig(s.voiceConfig);
              if (s.currentLanguage) setCurrentLanguage(s.currentLanguage);
              if (s.selectedModel) setSelectedModel(s.selectedModel);
          }
      });

      return () => {
          profileChannel?.unsubscribe();
          settingsChannel?.unsubscribe();
      };
  }, [isSupabaseConnected, userProfile.isAuth, currentUserId]);

  useEffect(() => {
    if (!isDataLoaded) return;
    syncUserSettings({ voiceConfig, apiKeys, currentLanguage, selectedModel });
    setServiceKeys(apiKeys);
  }, [voiceConfig, apiKeys, currentLanguage, selectedModel, isDataLoaded]);

  const handlePersonaChange = (persona: Persona) => {
    setCurrentPersona(persona);
    localStorage.setItem('active_persona_id', persona.id);
    setActiveMenu(MenuType.TERMINAL);
    if (window.innerWidth < 1024) setIsSidebarOpen(false); 
  };

  const activeContent = useMemo(() => {
      if (!isDataLoaded) return null;
      switch (activeMenu) {
          case MenuType.DASHBOARD: return <Dashboard />;
          case MenuType.STORAGE: return <Drive />;
          case MenuType.TERMINAL: return <Terminal key={currentPersona.id} currentPersona={currentPersona} userProfile={userProfile} currentLanguage={currentLanguage} voiceConfig={voiceConfig} selectedModel={selectedModel} onError={setGlobalErrorLog} isSupabaseConnected={isSupabaseConnected} />;
          case MenuType.PERSONAS: return <PersonaSelector onSelect={handlePersonaChange} activePersonaId={currentPersona.id} onCustomAdd={(p) => setCustomPersonas(v => [...v, p])} onDeleteCustom={() => {}} customPersonas={customPersonas} />;
          case MenuType.VISION_GEN: return <VisionGen onError={setGlobalErrorLog} />;
          case MenuType.VIDEO_GEN: return <VideoGen />;
          case MenuType.VOICE_SETTINGS: return <Settings voiceConfig={voiceConfig} setVoiceConfig={setVoiceConfig} apiKeys={apiKeys} setApiKeys={setApiKeys} />;
          case MenuType.USER_INFO: return <UserInfo profile={userProfile} setProfile={setUserProfile} />;
          case MenuType.LANGUAGE: return <LanguageSettings currentLanguage={currentLanguage} setLanguage={setCurrentLanguage} />;
          case MenuType.FORUM: return <Forum />;
          case MenuType.ABOUT: return <About onSwitchToAdmin={() => setActiveMenu(MenuType.ADMIN_CONSOLE)} />;
          case MenuType.ADMIN_CONSOLE: return <AdminConsole apiKeys={apiKeys} setApiKeys={setApiKeys} userProfile={userProfile} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />;
          case MenuType.REALM_PORTAL: return <ExternalPortal />;
          default: return <Terminal currentPersona={currentPersona} userProfile={userProfile} currentLanguage={currentLanguage} voiceConfig={voiceConfig} selectedModel={selectedModel} onError={setGlobalErrorLog} isSupabaseConnected={isSupabaseConnected} />;
      }
  }, [activeMenu, currentPersona, userProfile, currentLanguage, voiceConfig, selectedModel, isDataLoaded, apiKeys, isSupabaseConnected, customPersonas]);

  if (!isDataLoaded) {
      return (
        <div className="h-screen w-screen bg-[#0b0e14] flex flex-col items-center justify-center overflow-hidden text-[#ece5d8]">
            <div className="relative w-40 h-40 sm:w-64 sm:h-64 flex items-center justify-center mb-8">
                <div className="absolute inset-0 rounded-full border border-dashed border-amber-500/20 akasha-loader-ring"></div>
                <div className="absolute inset-10 sm:inset-16 rounded-full bg-black/40 backdrop-blur-sm akasha-pulse flex items-center justify-center">
                    <TerminalIcon className="w-10 h-10 sm:w-16 sm:h-16 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
                </div>
            </div>
            <div className="text-center px-6">
                <h1 className="text-2xl sm:text-4xl font-bold font-serif tracking-[0.2em] genshin-gold mb-2 uppercase">Akasha Terminal</h1>
                <p className="text-[9px] sm:text-xs font-mono text-cyan-400 uppercase tracking-widest animate-pulse">[{loadingStep}]</p>
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
    { type: MenuType.REALM_PORTAL, label: 'Realms', icon: Box },
    { type: MenuType.ABOUT, label: 'About', icon: Info },
  ];

  return (
    <div className="flex h-screen w-full bg-[#0b0e14] text-[#ece5d8] overflow-hidden relative font-sans">
      {showAuthModal && <AuthModal onLogin={async () => { setIsAuthLoading(true); const r = await signInWithGoogle(); setIsAuthLoading(false); return r; }} onGuest={() => { setShowAuthModal(false); localStorage.setItem('has_seen_auth_v2', 'true'); }} isLoading={isAuthLoading} />}
      {showDbSetupModal && <DatabaseSetupModal onClose={() => setShowDbSetupModal(false)} />}

      {isSidebarOpen && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[65] transition-all duration-300 ease-in-out cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[70] h-full genshin-panel border-r border-white/10 transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0 w-72 sm:w-80 lg:w-72 shadow-[20px_0_50px_rgba(0,0,0,0.8)]' : '-translate-x-full lg:w-20'}`}>
          <div className="p-6 flex items-center justify-between shrink-0">
              <span className="text-lg sm:text-xl font-bold tracking-widest genshin-gold truncate">{isSidebarOpen ? 'TEYVAT.AI' : 'T.AI'}</span>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 rounded-full hover:bg-white/10 text-amber-500 transition-colors"><X className="w-5 h-5 sm:w-6 h-6"/></button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 space-y-1.5 custom-scrollbar">
            <button onClick={() => setIsLiveCallOpen(true)} className={`w-full flex items-center gap-4 p-3 rounded-xl mb-4 transition-all bg-gradient-to-r from-amber-500/20 to-transparent border-l-4 border-amber-500 text-white shadow-lg shadow-amber-900/10 group`}>
              <div className="relative shrink-0">
                <PhoneCall className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              </div>
              {isSidebarOpen && <span className="font-black uppercase tracking-widest text-xs truncate">Celestial Call</span>}
            </button>
            {navItems.map((item) => (
              <button key={item.type} onClick={() => { setActiveMenu(item.type); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${activeMenu === item.type ? 'sidebar-item-active' : 'text-gray-400 hover:bg-white/5'}`} title={item.label}>
                <item.icon className={`w-6 h-6 shrink-0 ${activeMenu === item.type ? 'text-amber-500' : ''}`} />
                {isSidebarOpen && <span className="font-medium truncate text-sm">{item.label}</span>}
              </button>
            ))}
            {activeMenu === MenuType.ADMIN_CONSOLE && <button className="w-full flex items-center gap-4 p-3 rounded-xl bg-red-900/20 border-l-4 border-red-500 text-red-400 shrink-0"><Lock className="w-6 h-6 shrink-0" />{isSidebarOpen && <span className="font-bold text-sm truncate">ADMIN ROOT</span>}</button>}
          </nav>
          
          <div className="p-4 border-t border-white/10 bg-[#0e121b]/80 backdrop-blur-xl shrink-0">
              <div className="flex items-center gap-3 p-2 rounded-2xl transition-all hover:bg-white/5 group">
                  <div className="relative cursor-pointer shrink-0" onClick={() => { setActiveMenu(MenuType.USER_INFO); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}>
                      <LazyImage src={userProfile.avatar} className="w-10 h-10 rounded-xl border border-white/20 shadow-lg group-hover:border-amber-500/50 transition-colors" alt="User" />
                      {userProfile.isAuth && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#0e121b] rounded-full flex items-center justify-center shadow-md">
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </div>
                      )}
                  </div>
                  {isSidebarOpen && (
                      <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="text-sm font-bold text-gray-100 truncate flex items-center gap-1.5">
                              {userProfile.username}
                              {userProfile.isAuth && <ShieldCheck className="w-3 h-3 text-amber-500" />}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-gray-500 truncate font-mono uppercase tracking-tighter">
                              {userProfile.isAuth ? (userProfile.email || 'Google Account') : 'Guest Session'}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden w-full">
        <header className="h-14 sm:h-16 border-b border-white/10 flex items-center justify-between px-4 sm:px-6 bg-[#0b0e14]/90 backdrop-blur-md z-30 shrink-0">
           <div className="flex items-center gap-2 sm:gap-3 min-w-0">
               <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-1 sm:-ml-2 rounded-full hover:bg-white/5 transition-colors text-amber-500 shrink-0"><Menu className="w-5 h-5 sm:w-6 h-6" /></button>
               <h2 className="text-xs sm:text-lg font-medium genshin-gold uppercase tracking-[0.15em] truncate">{activeMenu.replace('_', ' ')}</h2>
           </div>
           <div className="flex items-center gap-2 sm:gap-4 shrink-0">
               {activeMenu === MenuType.TERMINAL && (
                    <div className="relative" onMouseEnter={() => setShowModelSelector(true)} onMouseLeave={() => setShowModelSelector(false)}>
                        <button className="flex items-center gap-2 text-[7px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-[#d3bc8e] transition-all bg-white/5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/5 hover:border-[#d3bc8e]/30">
                            {AI_MODELS.find(m => m.id === selectedModel)?.provider === 'openai' ? <CloudLightning className="w-2.5 h-2.5 sm:w-3 h-3" /> : <Box className="w-2.5 h-2.5 sm:w-3 h-3" />}
                            <span className="hidden sm:inline truncate max-w-[80px]">Engine: {AI_MODELS.find(m => m.id === selectedModel)?.label}</span>
                            <ChevronDown className={`w-2.5 h-2.5 sm:w-3 h-3 transition-transform shrink-0 ${showModelSelector ? 'rotate-180' : ''}`} />
                        </button>
                        {showModelSelector && (
                            <div className="absolute top-full right-0 mt-2 w-56 sm:w-64 bg-[#131823] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in slide-in-from-top-2">
                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] p-2 border-b border-white/5 mb-2">Wisdom Core</div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                    {AI_MODELS.map(model => (
                                        <button key={model.id} onClick={() => { setSelectedModel(model.id); setShowModelSelector(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-xs flex items-center justify-between transition-all ${selectedModel === model.id ? 'bg-[#d3bc8e]/20 text-[#d3bc8e] font-black' : 'hover:bg-white/5 text-gray-400'}`}>
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
               <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="p-2 -mr-1 sm:-mr-2 rounded-full hover:bg-white/5 transition-colors text-amber-500 shrink-0"><History className="w-5 h-5 sm:w-6 h-6" /></button>
           </div>
        </header>
        
        <section className="flex-1 min-h-0 relative z-10 flex flex-col w-full overflow-hidden">
          <ErrorBoundary>
             <Suspense fallback={<div className="flex h-full items-center justify-center text-amber-500"><Loader2 className="animate-spin w-8 h-8 sm:w-10 h-10" /></div>}>
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
                    {activeContent}
                </div>
             </Suspense>
          </ErrorBoundary>
        </section>
      </main>

      <LiveCall 
        currentPersona={currentPersona} 
        voiceConfig={voiceConfig} 
        isOpen={isLiveCallOpen} 
        onClose={() => setIsLiveCallOpen(false)} 
      />

      <HistorySidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelectPersona={handlePersonaChange} onNewChat={() => setActiveMenu(MenuType.PERSONAS)} activePersonaId={currentPersona.id} customPersonas={customPersonas} />
      <DonationModal errorLog={globalErrorLog} onClose={() => setGlobalErrorLog(null)} />
      <OnboardingTutorial />
      <CookieConsent />
    </div>
  );
};

export default App;
