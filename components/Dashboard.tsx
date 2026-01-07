
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
    <div className="h-full p-4 sm:p-6 lg:p-10 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700">
        
        {/* Main Hero Header */}
        <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden p-6 sm:p-12 border border-white/10 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] via-[#0b0e14] to-[#13182b]"></div>
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6 text-center lg:text-left">
            <div>
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                 <div className={`w-2.5 h-2.5 rounded-full ${stats.latency >= 0 ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                 <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500/80">Celestial Network Monitor</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold genshin-gold mb-3 font-serif tracking-widest uppercase">Akasha Terminal</h1>
              <p className="text-xs sm:text-sm text-gray-400 max-w-xl leading-relaxed italic">Monitoring Irminsul data streams across all fragments of Teyvat in real-time.</p>
            </div>
            <div className="flex gap-3">
                <button onClick={refreshData} className="p-3.5 sm:p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"><RefreshCcw className={`w-5 h-5 sm:w-6 sm:h-6 text-amber-500 ${loading ? 'animate-spin' : ''}`} /></button>
                <button onClick={() => refreshData()} className="genshin-button px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl flex items-center gap-2 text-white font-bold text-xs sm:text-sm uppercase tracking-widest shadow-xl">Resonance Scan</button>
            </div>
          </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statCards.map((stat, idx) => (
            <div key={idx} className="genshin-panel p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 group hover:border-amber-500/30 transition-all">
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${stat.bg}`}><stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} /></div>
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white mb-0.5 sm:mb-1 font-mono uppercase truncate">{stat.value}</div>
              <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Layout: Content Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-lg sm:text-xl font-bold genshin-gold uppercase tracking-widest flex items-center gap-3 font-serif"><Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" /> Transmissions</h3>
                <button className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest">View All</button>
             </div>
             <div className="space-y-4">
                {recentPosts.length === 0 ? (
                    <div className="genshin-panel p-10 sm:p-12 rounded-3xl border border-dashed border-white/10 text-center text-gray-600 italic text-xs">No active resonances detected.</div>
                ) : (
                    recentPosts.map((post) => (
                        <div key={post.id} className="genshin-panel p-4 sm:p-5 rounded-3xl border border-white/5 bg-[#131823]/50 transition-all flex flex-col sm:flex-row gap-4 sm:gap-5 group">
                            {post.media_url && (
                                <div className="w-full sm:w-28 h-28 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                                    <LazyImage src={post.media_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="media" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <span className="text-[9px] text-amber-500/80 font-black uppercase mb-1">#{post.tag}</span>
                                <h4 className="text-md sm:text-lg font-bold text-gray-200 mb-1 truncate">{post.title}</h4>
                                <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-2 italic mb-3">"{post.content}"</p>
                                <div className="flex items-center gap-4 text-[9px] sm:text-[10px] text-gray-600 font-bold uppercase">
                                    <span className="truncate max-w-[80px]">@{post.author}</span>
                                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500/50" /> {post.likes}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
             </div>
          </div>

          <div className="space-y-6">
             <h3 className="text-lg sm:text-xl font-bold genshin-gold uppercase tracking-widest flex items-center gap-3 font-serif px-2"><Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" /> Event Stream</h3>
             <div className="genshin-panel rounded-[2rem] border border-white/10 bg-[#0e121b] overflow-hidden flex flex-col max-h-[400px] shadow-2xl">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4">
                    {logs.length === 0 ? (
                        <div className="text-center py-20 opacity-20"><AlertTriangle className="w-10 h-10 mb-2 mx-auto" /><span className="text-[10px] font-bold uppercase">No Logs</span></div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-3 items-start text-[11px]">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${log.type === 'error' ? 'bg-red-500' : log.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                <div className="flex flex-col">
                                    <span className="text-gray-300 leading-relaxed">{log.message}</span>
                                    <span className="text-[9px] text-gray-600 font-mono mt-0.5 uppercase">{new Date(log.created_at).toLocaleTimeString()}</span>
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
