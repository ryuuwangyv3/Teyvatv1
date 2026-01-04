
import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Database, Zap, Clock, MessageSquare, ArrowRight, ShieldCheck, Wifi, RefreshCcw, AlertTriangle } from 'lucide-react';
import { PERSONAS } from '../data';
import { fetchGlobalStats, fetchSystemLogs, checkDbConnection, logSystemEvent, subscribeToTable } from '../services/supabaseService';
import { SystemLog } from '../types';

const Dashboard: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    latency: 0,
    uptime: '100%'
  });
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
        const globalStats = await fetchGlobalStats();
        const systemLogs = await fetchSystemLogs();
        const ping = await checkDbConnection();

        setStats({
            users: globalStats.total_users,
            posts: globalStats.total_posts,
            latency: ping,
            uptime: ping === -1 ? 'Offline' : 'Online'
        });
        setLogs(systemLogs);
    } catch (e) {
        console.error("Dashboard sync failed", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // Subscribe to REALTIME logs
    const channel = subscribeToTable('system_logs', (payload) => {
        if (payload.eventType === 'INSERT') {
             const newLog = payload.new as SystemLog;
             setLogs(prev => [newLog, ...prev].slice(0, 50));
        }
    });

    return () => {
        if (channel) channel.unsubscribe();
    };
  }, []);

  const handleDiagnostic = async () => {
      await logSystemEvent("User initiated manual system diagnostic.", "info");
      const start = Date.now();
      const ping = await checkDbConnection();
      
      alert(`DIAGNOSTIC RESULT (REAL-TIME):\n\n- Database Status: ${ping >= 0 ? 'CONNECTED' : 'DISCONNECTED'}\n- Latency: ${ping}ms\n- Sync Timestamp: ${new Date().toLocaleTimeString()}`);
      refreshData();
  };

  const statCards = [
    { label: 'System Status', value: stats.uptime, icon: Clock, color: stats.latency === -1 ? 'text-red-400' : 'text-green-400', bg: stats.latency === -1 ? 'bg-red-400/10' : 'bg-green-400/10' },
    { label: 'Real Users', value: `${stats.users}`, icon: Database, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Cloud Latency', value: stats.latency === -1 ? 'N/A' : `${stats.latency}ms`, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Total Threads', value: `${stats.posts}`, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  return (
    <div className="h-full p-6 lg:p-10 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Welcome Section */}
        <div className="relative rounded-3xl overflow-hidden p-8 border border-white/10 group shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f2e] to-[#0b0e14]"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className={`w-2 h-2 rounded-full ${stats.latency >= 0 ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></div>
                 <span className={`text-[10px] uppercase tracking-[0.2em] font-bold ${stats.latency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.latency >= 0 ? 'Akasha Cloud: LIVE' : 'Akasha Cloud: DISCONNECTED'}
                 </span>
              </div>
              <h1 className="text-4xl font-bold genshin-gold mb-2 font-serif">System Dashboard</h1>
              <p className="text-gray-400 max-w-lg">
                Real-time metrics from the Teyvat Terminal public network.
              </p>
            </div>
            <div className="flex gap-3">
                <button onClick={refreshData} className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                    <RefreshCcw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={handleDiagnostic} className="genshin-button px-6 py-3 rounded-full flex items-center gap-2 text-white font-bold shadow-lg hover:scale-105 transition-all">
                <span>Run Diagnostic</span>
                <ArrowRight className="w-4 h-4" />
                </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => (
            <div key={idx} className="genshin-panel p-5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <Wifi className={`w-4 h-4 transition-colors ${loading ? 'text-amber-500 animate-pulse' : 'text-gray-600'}`} />
              </div>
              <div className="text-3xl font-bold text-white mb-1 font-mono">{stat.value}</div>
              <div className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Resonance Graph */}
          <div className="lg:col-span-2 genshin-panel p-6 rounded-3xl border border-white/10 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold genshin-gold uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-5 h-5" /> Network Traffic
              </h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span className="text-[10px] text-gray-400 uppercase">Live</span>
              </div>
            </div>
            
            <div className="flex-1 flex items-end justify-between gap-2 h-64 px-2">
              {[...Array(24)].map((_, i) => {
                // Generate semi-random heights based on index to simulate traffic
                const h = Math.max(20, Math.min(95, (Math.sin(i) * 30) + 50 + (Math.random() * 20)));
                return (
                    <div key={i} className="w-full bg-gradient-to-t from-amber-900/20 to-amber-500/60 rounded-t-sm hover:to-amber-400 transition-all duration-300 relative group" style={{ height: `${h}%` }}>
                    </div>
                );
              })}
            </div>
          </div>

          {/* Real System Logs */}
          <div className="genshin-panel p-6 rounded-3xl border border-white/10 overflow-hidden relative flex flex-col">
            <h3 className="text-lg font-bold genshin-gold uppercase tracking-widest mb-6 flex items-center gap-2">
              <Cpu className="w-5 h-5" /> Global Events
            </h3>
            
            {logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-600 opacity-50">
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <span className="text-xs">No logs available or DB disconnected</span>
                </div>
            ) : (
                <div className="space-y-4 relative z-10 overflow-y-auto custom-scrollbar flex-1 max-h-[400px]">
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 items-start text-xs border-b border-white/5 pb-3 last:border-0 animate-in fade-in slide-in-from-right-2">
                    <span className="font-mono text-gray-500 shrink-0">
                        {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span className={`${
                        log.type === 'warn' ? 'text-amber-400' : 
                        log.type === 'success' ? 'text-green-400' : 
                        log.type === 'error' ? 'text-red-400' : 'text-gray-300'
                    }`}>
                        {log.message}
                    </span>
                    </div>
                ))}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
