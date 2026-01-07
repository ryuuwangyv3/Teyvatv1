
import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Database, Zap, Clock, MessageSquare, ArrowRight, ShieldCheck, Wifi, RefreshCcw, AlertTriangle, Users, TrendingUp, Globe, Heart, Settings, Copy, Check, Key, Sparkles } from 'lucide-react';
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

  const refreshData = async () => {
    setLoading(true);
    try {
        const globalStats = await fetchGlobalStats();
        const systemLogs = await fetchSystemLogs();
        const forumData = await fetchForumPosts('latest');
        const ping = await checkDbConnection();
        let statusStr = ping >= 0 ? 'Online' : ping === -1 ? 'Unconfigured' : 'Offline';
        setStats({ users: globalStats.total_users, posts: globalStats.total_posts, latency: ping, uptime: statusStr });
        setLogs(systemLogs);
        setRecentPosts(forumData.slice(0, 3));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    refreshData();
    const logChannel = subscribeToTable('system_logs', (payload) => { if (payload.eventType === 'INSERT') setLogs(prev => [payload.new as SystemLog, ...prev].slice(0, 50)); });
    const forumChannel = subscribeToTable('forum_posts', () => refreshData());
    const profileChannel = subscribeToTable('user_profiles', () => refreshData());
    return () => { logChannel?.unsubscribe(); forumChannel?.unsubscribe(); profileChannel?.unsubscribe(); };
  }, []);

  const statCards = [
    { label: 'Identity', value: stats.uptime, icon: Globe, color: stats.latency >= 0 ? 'text-green-400' : 'text-amber-400', bg: 'bg-white/5' },
    { label: 'Travelers', value: `${stats.users}`, icon: Users, color: 'text-blue-400', bg: 'bg-white/5' },
    { label: 'Latency', value: stats.latency < 0 ? 'OFF' : `${stats.latency}ms`, icon: Activity, color: 'text-amber-400', bg: 'bg-white/5' },
    { label: 'Threads', value: `${stats.posts}`, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-white/5' },
  ];

  return (
    <div className="h-full p-3 sm:p-6 lg:p-10 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8 animate-in fade-in duration-700">
        
        {/* Main Hero Header */}
        <div className="relative rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden p-5 sm:p-12 border border-white/10 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] via-[#0b0e14] to-[#13182b]"></div>
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-4 text-center lg:text-left">
            <div>
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                 <div className={`w-2 h-2 rounded-full ${stats.latency >= 0 ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                 <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-amber-500/80">Celestial Network Monitor</span>
              </div>
              <h1 className="text-2xl sm:text-5xl font-bold genshin-gold mb-1 sm:mb-3 font-serif tracking-widest uppercase">Akasha Terminal</h1>
              <p className="text-[10px] sm:text-sm text-gray-400 max-w-xl leading-relaxed italic">Real-time Irminsul stream across Teyvat.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={refreshData} className="flex-1 sm:flex-none p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex justify-center items-center"><RefreshCcw className={`w-4 h-4 sm:w-6 sm:h-6 text-amber-500 ${loading ? 'animate-spin' : ''}`} /></button>
                <button onClick={() => refreshData()} className="flex-[3] sm:flex-none genshin-button px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-[10px] sm:text-sm uppercase tracking-widest shadow-xl">Resonance Scan</button>
            </div>
          </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {statCards.map((stat, idx) => (
            <div key={idx} className="genshin-panel p-3 sm:p-6 rounded-xl sm:rounded-3xl border border-white/5 group hover:border-amber-500/30 transition-all">
              <div className="flex justify-between items-start mb-3 sm:mb-6">
                <div className={`p-2 sm:p-4 rounded-lg sm:rounded-2xl ${stat.bg}`}><stat.icon className={`w-4 h-4 sm:w-6 sm:h-6 ${stat.color}`} /></div>
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-800" />
              </div>
              <div className="text-lg sm:text-2xl font-black text-white mb-0 font-mono uppercase truncate">{stat.value}</div>
              <span className="text-[7px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Layout: Content Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-4">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-base sm:text-xl font-bold genshin-gold uppercase tracking-widest flex items-center gap-2 font-serif"><Zap className="w-4 h-4 sm:w-6 sm:h-6 text-amber-500" /> Transmissions</h3>
                <button className="text-[8px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest">View All</button>
             </div>
             <div className="space-y-3">
                {recentPosts.length === 0 ? (
                    <div className="genshin-panel p-8 sm:p-12 rounded-2xl border border-dashed border-white/10 text-center text-gray-600 italic text-[10px] sm:text-xs">No active resonances detected.</div>
                ) : (
                    recentPosts.map((post) => (
                        <div key={post.id} className="genshin-panel p-3 sm:p-5 rounded-2xl border border-white/5 bg-[#131823]/50 transition-all flex flex-row gap-3 sm:gap-5 group">
                            {post.media_url && (
                                <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                    <LazyImage src={post.media_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="media" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <span className="text-[8px] text-amber-500/80 font-black uppercase mb-0.5">#{post.tag}</span>
                                <h4 className="text-sm sm:text-lg font-bold text-gray-200 mb-0.5 truncate">{post.title}</h4>
                                <p className="text-[9px] sm:text-xs text-gray-500 line-clamp-2 italic mb-2">"{post.content}"</p>
                                <div className="flex items-center gap-3 text-[8px] sm:text-[10px] text-gray-600 font-bold uppercase">
                                    <span className="truncate max-w-[60px]">@{post.author}</span>
                                    <span className="flex items-center gap-1"><Heart className="w-2.5 h-2.5 text-red-500/50" /> {post.likes}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-base sm:text-xl font-bold genshin-gold uppercase tracking-widest flex items-center gap-2 font-serif px-1"><Clock className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" /> Event Stream</h3>
             <div className="genshin-panel rounded-2xl border border-white/10 bg-[#0e121b] overflow-hidden flex flex-col max-h-[300px] sm:max-h-[400px] shadow-2xl">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-3">
                    {logs.length === 0 ? (
                        <div className="text-center py-12 opacity-20"><AlertTriangle className="w-8 h-8 mb-2 mx-auto" /><span className="text-[8px] font-bold uppercase">No Logs</span></div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-2 items-start text-[9px] sm:text-[11px]">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${log.type === 'error' ? 'bg-red-500' : log.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                <div className="flex flex-col">
                                    <span className="text-gray-300 leading-tight">{log.message}</span>
                                    <span className="text-[7px] sm:text-[9px] text-gray-600 font-mono mt-0.5 uppercase">{new Date(log.created_at).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
