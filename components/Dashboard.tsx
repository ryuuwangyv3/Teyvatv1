import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Database, Zap, Clock, MessageSquare, ArrowRight, ShieldCheck, Wifi, RefreshCcw, AlertTriangle, Users, TrendingUp, Globe, Heart, Settings } from 'lucide-react';
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

        let statusStr = 'Offline';
        if (ping >= 0) statusStr = 'Online';
        else if (ping === -1) statusStr = 'Unconfigured';
        else if (ping === -2) statusStr = 'Schema Missing';
        else statusStr = 'Offline';

        setStats({
            users: globalStats.total_users,
            posts: globalStats.total_posts,
            latency: ping,
            uptime: statusStr
        });
        setLogs(systemLogs);
        setRecentPosts(forumData.slice(0, 3));
    } catch (e) {
        console.error("Dashboard sync failed", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // 1. Logs Real-time
    const logChannel = subscribeToTable('system_logs', (payload) => {
        if (payload.eventType === 'INSERT') {
             setLogs(prev => [payload.new as SystemLog, ...prev].slice(0, 50));
        }
    });

    // 2. Forum Content Real-time
    const forumChannel = subscribeToTable('forum_posts', () => {
        refreshData();
    });

    // 3. User Statistics Real-time
    const profileChannel = subscribeToTable('user_profiles', () => {
        refreshData();
    });

    return () => {
        logChannel?.unsubscribe();
        forumChannel?.unsubscribe();
        profileChannel?.unsubscribe();
    };
  }, []);

  const handleDiagnostic = async () => {
      const ping = await checkDbConnection();
      await logSystemEvent(`Manual diagnostic initiated. Status: ${ping}ms`, "info");
      refreshData();
  };

  const statCards = [
    { 
        label: 'Cloud Identity', 
        value: stats.uptime, 
        icon: Globe, 
        color: stats.latency >= 0 ? 'text-green-400' : stats.latency === -1 ? 'text-amber-400' : 'text-red-400', 
        bg: stats.latency >= 0 ? 'bg-green-400/10' : 'bg-red-400/10', 
        sub: 'Irminsul Status' 
    },
    { label: 'Active Travelers', value: `${stats.users}`, icon: Users, color: 'text-amber-400', bg: 'bg-amber-400/10', sub: 'Total Profiles' },
    { label: 'Neural Latency', value: stats.latency < 0 ? 'OFF' : `${stats.latency}ms`, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10', sub: 'Sync Speed' },
    { label: 'Akasha Threads', value: `${stats.posts}`, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10', sub: 'Forum Content' },
  ];

  return (
    <div className="h-full p-6 lg:p-10 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* Main Hero Header */}
        <div className="relative rounded-[2.5rem] overflow-hidden p-8 md:p-12 border border-white/10 shadow-2xl group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] via-[#0b0e14] to-[#13182b]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] animate-pulse"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                 <div className={`w-3 h-3 rounded-full ${stats.latency >= 0 ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : stats.latency === -1 ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-red-500'} animate-pulse`}></div>
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/80">Celestial Network Monitor</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold genshin-gold mb-4 font-serif tracking-widest uppercase">Akasha Terminal</h1>
              <p className="text-gray-400 max-w-xl leading-relaxed italic">
                {stats.latency === -1 
                    ? "Terminal belum terhubung ke Akasha Cloud (Supabase). Silakan masukkan koordinat Ley Line di Admin Console untuk sinkronisasi data cloud."
                    : "Memantau aliran data dari seluruh penjuru Teyvat. Seluruh informasi disinkronkan secara real-time melalui memori Irminsul."}
              </p>
              
              {stats.latency === -1 && (
                  <div className="mt-6 flex items-center gap-4 text-xs font-bold uppercase text-amber-500 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 inline-flex animate-in slide-in-from-left-4">
                      <AlertTriangle className="w-4 h-4" />
                      Awaiting Cloud Credentials
                  </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={refreshData} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center group/btn">
                    <RefreshCcw className={`w-6 h-6 text-amber-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                </button>
                <button onClick={handleDiagnostic} className="genshin-button px-8 py-4 rounded-2xl flex items-center gap-3 text-white font-bold shadow-xl hover:scale-105 transition-all group">
                  <Cpu className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="uppercase tracking-widest text-sm">Resonance Scan</span>
                </button>
            </div>
          </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, idx) => (
            <div key={idx} className="genshin-panel p-6 rounded-3xl border border-white/5 hover:border-amber-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-[2rem] -z-0"></div>
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${stat.bg} shadow-inner`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-gray-700 group-hover:text-amber-500 transition-colors" />
              </div>
              <div className="text-3xl font-black text-white mb-1 font-mono tracking-tighter uppercase">{stat.value}</div>
              <div className="flex flex-col">
                <span className="text-[11px] text-white/80 font-bold uppercase tracking-widest">{stat.label}</span>
                <span className="text-[9px] text-gray-500 uppercase font-mono">{stat.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Layout: Forum Preview & Global Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Transmissions (Forum) */}
          <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold genshin-gold uppercase tracking-widest flex items-center gap-3 font-serif">
                   <Zap className="w-6 h-6 text-amber-500" /> Recent Transmissions
                </h3>
                <button className="text-[10px] text-gray-500 hover:text-amber-500 font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                    View Archive <ArrowRight className="w-3 h-3" />
                </button>
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                {recentPosts.length === 0 ? (
                    <div className="genshin-panel p-12 rounded-3xl border border-dashed border-white/10 text-center text-gray-600 italic">
                        {stats.latency === -1 ? "Koneksi Cloud nonaktif. Transmisi forum tidak dapat diakses." : "No recent transmissions detected in the current ley line."}
                    </div>
                ) : (
                    recentPosts.map((post) => (
                        <div key={post.id} className="genshin-panel p-5 rounded-3xl border border-white/5 hover:border-amber-500/20 bg-[#131823]/50 transition-all flex flex-col md:flex-row gap-5 group/post">
                            {post.media_url && (
                                <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                                    <LazyImage src={post.media_url} className="w-full h-full object-cover group-hover/post:scale-110 transition-transform duration-700" alt="media" />
                                </div>
                            )}
                            <div className="flex-1 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-500 uppercase">{post.tag}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">{new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-200 mb-1 group-hover/post:text-[#d3bc8e] transition-colors">{post.title}</h4>
                                <p className="text-xs text-gray-500 line-clamp-2 italic mb-3">"{post.content}"</p>
                                <div className="flex items-center gap-4 text-[10px] text-gray-600 font-bold uppercase">
                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {post.author}</span>
                                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500/50" /> {post.likes} Resonance</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
             </div>
          </div>

          {/* Akasha Global Events (Logs) */}
          <div className="space-y-6">
             <h3 className="text-xl font-bold genshin-gold uppercase tracking-widest flex items-center gap-3 font-serif px-2">
                <Clock className="w-6 h-6 text-blue-400" /> Event Stream
             </h3>
             <div className="genshin-panel rounded-[2rem] border border-white/10 bg-[#0e121b] overflow-hidden flex flex-col max-h-[500px] shadow-2xl">
                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Irminsul Logs</span>
                    <Wifi className={`w-3 h-3 ${stats.latency >= 0 ? 'text-green-500' : 'text-red-500'} animate-pulse`} />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
                            <AlertTriangle className="w-12 h-12 mb-2 mx-auto" />
                            <span className="text-xs font-bold uppercase tracking-widest">No Cloud Logs</span>
                            <p className="text-[9px] mt-1">Connect to Supabase to see global events.</p>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-3 items-start animate-in slide-in-from-right-2">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                                    log.type === 'error' ? 'bg-red-500 shadow-[0_0_5px_red]' : 
                                    log.type === 'warn' ? 'bg-amber-500' : 
                                    log.type === 'success' ? 'bg-green-500' : 
                                    log.type === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                                }`}></div>
                                <div className="flex flex-col">
                                    <span className={`text-[11px] leading-relaxed ${
                                        log.type === 'error' ? 'text-red-400' : 
                                        log.type === 'warn' ? 'text-amber-200' : 
                                        log.type === 'success' ? 'text-green-300' : 
                                        log.type === 'info' ? 'text-blue-300' : 'text-gray-300'
                                    }`}>
                                        {log.message}
                                    </span>
                                    <span className="text-[9px] text-gray-600 font-mono mt-1 uppercase">
                                        {new Date(log.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
             
             <div className="genshin-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-[#3d447a]/20 to-transparent">
                 <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Neural Insight
                 </h4>
                 <p className="text-[11px] text-gray-400 leading-relaxed italic">
                    {stats.latency === -1 
                        ? "Peringatan: Terminal beroperasi dalam mode terbatas. Sinkronisasi identitas cloud diperlukan untuk membuka potensi penuh Akasha."
                        : "Aliran energi Irminsul saat ini sedang stabil. Disarankan bagi para Traveler untuk memantau frekuensi resonansi secara berkala."}
                 </p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;