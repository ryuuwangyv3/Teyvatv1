
import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Cpu, Database, Zap, Clock, MessageSquare, ArrowRight, ShieldCheck, Wifi, RefreshCcw, AlertTriangle, Users, TrendingUp, Globe, Heart, Settings, Copy, Check, Key, Sparkles, CloudSync } from 'lucide-react';
import { fetchGlobalStats, fetchSystemLogs, checkDbConnection, logSystemEvent, subscribeToTable, fetchForumPosts } from '../services/supabaseService';
import { SystemLog, ForumPost } from '../types';
import LazyImage from './LazyImage';

const Dashboard: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [recentPosts, setRecentPosts] = useState<ForumPost[]>([]);
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    latency: 0,
    uptime: 'Checking...'
  });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>(new Date().toLocaleTimeString());
  const [pulseKey, setPulseKey] = useState(0); // Trigger for pulse animation

  const refreshData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsSyncing(true);
    try {
        const [globalStats, systemLogs, forumData, ping] = await Promise.all([
            fetchGlobalStats(),
            fetchSystemLogs(),
            fetchForumPosts('latest'),
            checkDbConnection()
        ]);
        
        let statusStr = ping >= 0 ? 'Online' : ping === -1 ? 'Unconfigured' : 'Offline';
        
        setStats({ 
            users: globalStats.total_users, 
            posts: globalStats.total_posts, 
            latency: ping, 
            uptime: statusStr 
        });
        setLogs(systemLogs);
        setRecentPosts(forumData.slice(0, 3));
        setLastSynced(new Date().toLocaleTimeString());
        setPulseKey(prev => prev + 1); // Trigger visual feedback
    } catch (e) { 
        console.error("Dashboard Resonance Error:", e); 
    } finally { 
        setLoading(false); 
        setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    
    // Auto-ping every 30 seconds for stability check
    const pingInterval = setInterval(() => refreshData(true), 30000);

    // Real-time Subscriptions
    const logChannel = subscribeToTable('system_logs', (payload) => { 
        if (payload.eventType === 'INSERT') {
            setLogs(prev => [payload.new as SystemLog, ...prev].slice(0, 50));
            setLastSynced(new Date().toLocaleTimeString());
            setPulseKey(prev => prev + 1);
        }
    });

    const forumChannel = subscribeToTable('forum_posts', () => {
        refreshData(true); // Silent refresh to keep stats up-to-date
    });

    const profileChannel = subscribeToTable('user_profiles', () => {
        refreshData(true); // Silent refresh to keep user count up-to-date
    });

    return () => { 
        clearInterval(pingInterval);
        logChannel?.unsubscribe(); 
        forumChannel?.unsubscribe(); 
        profileChannel?.unsubscribe(); 
    };
  }, [refreshData]);

  const statCards = [
    { label: 'Network Identity', value: stats.uptime, icon: Globe, color: stats.latency >= 0 ? 'text-green-400' : 'text-red-400', bg: 'bg-green-500/5' },
    { label: 'Registered Travelers', value: `${stats.users}`, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/5' },
    { label: 'Link Latency', value: stats.latency < 0 ? 'OFF' : `${stats.latency}ms`, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/5' },
    { label: 'Archive Threads', value: `${stats.posts}`, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/5' },
  ];

  return (
    <div className="h-full p-3 sm:p-6 lg:p-10 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8 animate-in fade-in duration-700">
        
        {/* Main Hero Header */}
        <div className="relative rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden p-5 sm:p-12 border border-white/10 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] via-[#0b0e14] to-[#13182b]"></div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6 text-center lg:text-left">
            <div className="flex-1">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                 <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${stats.latency >= 0 ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-red-400'} animate-pulse`}></div>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500/80">Celestial Node Sync</span>
                 </div>
                 {isSyncing && (
                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                        <RefreshCcw className="w-3 h-3 text-blue-400 animate-spin" />
                        <span className="text-[7px] font-bold text-blue-400 uppercase tracking-widest">Resonating...</span>
                    </div>
                 )}
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black genshin-gold mb-3 sm:mb-4 font-serif tracking-widest uppercase leading-tight">Irminsul <br className="hidden md:block" /> Dashboard</h1>
              <div className="flex flex-col sm:flex-row items-center gap-4 text-gray-400 italic">
                <p className="text-[11px] sm:text-sm max-w-xl leading-relaxed">"Observing the flow of data fragments across the Ley Lines in real-time."</p>
                <div className="h-px w-8 bg-amber-500/30 hidden sm:block"></div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-tighter bg-white/5 px-2 py-0.5 rounded">
                   <Clock className="w-3 h-3" /> Last Sync: {lastSynced}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button 
                    onClick={() => refreshData()} 
                    disabled={isSyncing}
                    className="flex-1 sm:flex-none p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex justify-center items-center group disabled:opacity-50"
                >
                    <RefreshCcw className={`w-5 h-5 text-amber-500 transition-transform group-hover:rotate-180 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
                <button 
                    onClick={() => refreshData()} 
                    disabled={isSyncing}
                    className="flex-[3] sm:flex-none genshin-button px-8 py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_30px_rgba(211,188,142,0.15)] group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                    <Database className="w-4 h-4" />
                    <span>Ley Line Scan</span>
                </button>
            </div>
          </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {statCards.map((stat, idx) => (
            <div key={idx} className="genshin-panel p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-transparent to-white/[0.02] group hover:border-amber-500/30 transition-all duration-500 hover:translate-y-[-4px] shadow-lg">
              <div className="flex justify-between items-start mb-4 sm:mb-8">
                <div className={`p-3 sm:p-5 rounded-xl sm:rounded-3xl ${stat.bg} border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
                    <stat.icon className={`w-5 h-5 sm:w-7 sm:h-7 ${stat.color} drop-shadow-[0_0_8px_currentColor]`} />
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-gray-600 group-hover:text-amber-500 transition-colors" />
                </div>
              </div>
              <div className="space-y-1">
                <div 
                  key={`${pulseKey}-${idx}`}
                  className={`text-xl sm:text-3xl font-black text-white font-mono uppercase tracking-tighter flex items-center gap-2 ${isSyncing ? 'animate-pulse' : 'animate-pulse-stat'}`}
                >
                    {stat.value}
                </div>
                <div className="text-[8px] sm:text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Layout: Content Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-5">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-lg sm:text-2xl font-black genshin-gold uppercase tracking-[0.2em] flex items-center gap-3 font-serif">
                    <Zap className="w-5 h-5 text-amber-500 animate-pulse" /> Live Transmissions
                </h3>
                <div className="h-px flex-1 mx-6 bg-gradient-to-r from-amber-500/20 to-transparent hidden sm:block"></div>
                <button className="text-[9px] font-black text-gray-500 hover:text-amber-500 transition-colors uppercase tracking-[0.2em] flex items-center gap-2">
                    Browse All <ArrowRight className="w-3 h-3" />
                </button>
             </div>
             <div className="space-y-4">
                {loading && !isSyncing ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-black/20 rounded-3xl border border-dashed border-white/5">
                        <RefreshCcw className="w-10 h-10 text-amber-500/30 animate-spin mb-4" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Resonating with database...</span>
                    </div>
                ) : recentPosts.length === 0 ? (
                    <div className="genshin-panel p-12 sm:p-20 rounded-3xl border border-dashed border-white/10 text-center flex flex-col items-center gap-4">
                        <MessageSquare className="w-12 h-12 text-gray-800" />
                        <p className="text-gray-600 italic text-xs tracking-widest uppercase">The Ley Lines are currently silent.</p>
                    </div>
                ) : (
                    recentPosts.map((post) => (
                        <div key={post.id} className="genshin-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 bg-[#131823]/30 hover:bg-[#131823]/60 transition-all duration-500 flex flex-row gap-4 sm:gap-7 group cursor-default">
                            {post.media_url ? (
                                <div className="w-20 h-20 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-xl">
                                    <LazyImage src={post.media_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="media" />
                                </div>
                            ) : (
                                <div className="w-20 h-20 sm:w-36 sm:h-36 rounded-2xl bg-black/40 flex items-center justify-center shrink-0 border border-white/5">
                                    <Sparkles className="w-8 h-8 text-gray-800" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[8px] sm:text-[10px] text-amber-500/80 font-black uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">#{post.tag}</span>
                                    <span className="text-[8px] text-gray-600 font-mono">{new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-sm sm:text-xl font-bold text-gray-100 mb-2 truncate group-hover:text-amber-400 transition-colors">{post.title}</h4>
                                <p className="text-[10px] sm:text-sm text-gray-500 line-clamp-2 italic mb-4 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">"{post.content}"</p>
                                <div className="flex items-center gap-4 text-[9px] sm:text-[11px] text-gray-600 font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-2 group/author cursor-pointer">
                                        <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10">
                                            <img src={post.avatar || 'https://picsum.photos/seed/akasha/50'} className="w-full h-full object-cover" alt="av" />
                                        </div>
                                        <span className="group-hover/author:text-white transition-colors truncate max-w-[80px]">@{post.author}</span>
                                    </div>
                                    <div className="flex items-center gap-3 ml-auto">
                                        <span className="flex items-center gap-1.5 hover:text-red-400 transition-colors"><Heart className="w-3 h-3 text-red-500/50" /> {post.likes}</span>
                                        <span className="flex items-center gap-1.5"><MessageSquare className="w-3 h-3 text-blue-500/50" /> Logged</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
             </div>
          </div>

          <div className="space-y-5">
             <h3 className="text-lg sm:text-2xl font-black genshin-gold uppercase tracking-[0.2em] flex items-center gap-3 font-serif px-2">
                <Clock className="w-5 h-5 text-blue-400" /> Event Horizon
             </h3>
             <div className="genshin-panel rounded-[2rem] border border-white/10 bg-[#0e121b]/90 backdrop-blur-xl overflow-hidden flex flex-col max-h-[400px] sm:max-h-[600px] shadow-2xl">
                <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Real-time System Logs</span>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20">
                            <AlertTriangle className="w-10 h-10 mb-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-center">Neural Stream Empty</span>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-3 items-start animate-in slide-in-from-right-4 duration-500">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                    log.type === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                                    log.type === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 
                                    'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                                }`}></div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] sm:text-[12px] text-gray-300 leading-relaxed font-medium break-words">{log.message}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[8px] text-gray-600 font-mono uppercase font-bold">{new Date(log.created_at).toLocaleTimeString()}</span>
                                        <span className="h-px w-4 bg-white/5"></span>
                                        <span className={`text-[7px] font-black uppercase px-1.5 rounded border ${
                                            log.type === 'error' ? 'text-red-500/60 border-red-500/20' : 'text-blue-500/60 border-blue-500/20'
                                        }`}>{log.type}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 bg-black/40 border-t border-white/5 text-center">
                    <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Displaying Last 50 Events</p>
                </div>
             </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes counter-pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
        }
        .animate-pulse-stat {
            animation: counter-pulse 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
