
import React, { useMemo, useState } from 'react';
import { X, Lock, Bug, Check, Heart, AlertTriangle, ImageOff, MicOff, ShieldAlert, WifiOff, Copy } from 'lucide-react';

const USER_AKASHA_URL = "https://mirror-uploads.trakteer.id/images/content/eml73oyywavr4d9q/ct-htCT0FFlItjxvdHgYsBymFl63ZdxC9r11765727946.jpg";
const FALLBACK_AKASHA_URL = "https://img.freepik.com/premium-photo/anime-girl-looking-camera_950669-26.jpg"; 

interface DonationModalProps {
    errorLog: string | null;
    onClose: () => void;
}

const DonationModal: React.FC<DonationModalProps> = ({ errorLog, onClose }) => {
    const [copied, setCopied] = useState(false);

    // Logic to determine the specific message based on the error log content
    // MOVED UP before any early return to prevent React Error #310 (Hook rule violation)
    const errorDetails = useMemo(() => {
        if (!errorLog) return null;
        
        const log = errorLog.toLowerCase();

        // 1. QUOTA / LIMIT (429)
        if (log.includes('429') || log.includes('quota') || log.includes('limit') || log.includes('exhausted') || log.includes('resource')) {
            return {
                icon: <Lock className="text-red-500 w-5 h-5" />,
                tag: "Energy Depleted",
                title: <>"Maaf banget... <br/>Energiku habis total." 😭</>,
                message: "Sistem mendeteksi kuota API Key (Google/Evolink) sudah mencapai batas limit harian. Aku butuh 'isi ulang' atau API Key baru untuk bisa aktif kembali."
            };
        }

        // 2. IMAGE GENERATION ERROR
        if (log.includes('image') || log.includes('visual') || log.includes('evolink') || log.includes('generateimage')) {
            return {
                icon: <ImageOff className="text-amber-500 w-5 h-5" />,
                tag: "Visual Glitch",
                title: <>"Gagal Memproyeksikan <br/>Visual..." 😵‍💫</>,
                message: "Modul visualisasiku mengalami error. Mungkin server gambar sedang sibuk, prompt terlalu rumit, atau ada masalah koneksi ke engine Evolink/Google."
            };
        }

        // 3. VOICE / TTS ERROR
        if (log.includes('voice') || log.includes('tts') || log.includes('audio') || log.includes('speech')) {
            return {
                icon: <MicOff className="text-blue-400 w-5 h-5" />,
                tag: "Audio Circuit Fail",
                title: <>"Suaraku... <br/>Hilang..." 😶</>,
                message: "Sirkuit sintesis suaraku terganggu. Aku tidak bisa bicara sekarang, tapi kita masih bisa mengobrol lewat teks."
            };
        }

        // 4. SAFETY / POLICY BLOCK
        if (log.includes('safety') || log.includes('harm') || log.includes('block') || log.includes('policy')) {
            return {
                icon: <ShieldAlert className="text-purple-500 w-5 h-5" />,
                tag: "Protocol Restriction",
                title: <>"Akses Ditolak <br/>Oleh Protokol." 🛡️</>,
                message: "Permintaanmu memicu filter keamanan sistem Akasha. Aku tidak bisa memproses konten tersebut demi menjaga integritas data."
            };
        }

        // 5. DEFAULT / NETWORK
        return {
            icon: <WifiOff className="text-gray-400 w-5 h-5" />,
            tag: "System Anomaly",
            title: <>"Terjadi Gangguan <br/>Sinyal..." 📡</>,
            message: "Koneksi ke Ley Lines (Server) terputus atau terjadi error internal. Coba periksa internetmu atau coba lagi beberapa saat lagi."
        };

    }, [errorLog]);

    // Check here AFTER hooks are initialized
    if (!errorLog || !errorDetails) return null;

    const handleCopyLog = () => {
        if (errorLog) {
            navigator.clipboard.writeText(errorLog);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 p-4">
            <div className="w-full max-w-4xl bg-[#13182b] border border-[#d3bc8e]/50 rounded-3xl shadow-[0_0_100px_rgba(211,188,142,0.2)] relative overflow-hidden flex flex-col md:flex-row">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-500/20 blur-[100px] rounded-full pointer-events-none"></div>

                {/* Left Side: Visual */}
                <div className="w-full md:w-5/12 relative h-64 md:h-auto bg-gradient-to-b from-[#1e2235] to-[#0c0f1d] flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-[#d3bc8e]/20">
                    <img 
                        src={USER_AKASHA_URL} 
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AKASHA_URL; }}
                        className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-700 filter sepia-[0.1]"
                        alt="Akasha System"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#13182b] via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                        <h2 className="text-3xl font-bold text-[#d3bc8e] font-serif drop-shadow-md">AKASHA</h2>
                        <p className="text-red-400 font-mono text-xs tracking-widest animate-pulse flex items-center gap-2">
                             <AlertTriangle className="w-3 h-3" /> SYSTEM CRITICAL
                        </p>
                    </div>
                </div>

                {/* Right Side: Content */}
                <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col relative z-10">
                    <button onClick={onClose} className="absolute top-4 right-4 text-[#8a92b2] hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <X size={24} />
                    </button>

                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            {errorDetails.icon}
                            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">{errorDetails.tag}</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-[#ece5d8] mb-4 leading-tight">
                            {errorDetails.title}
                        </h3>
                        <p className="text-[#8a92b2] text-sm leading-relaxed italic border-l-2 border-[#d3bc8e]/30 pl-4">
                            "{errorDetails.message}"
                        </p>
                    </div>

                    <div className="bg-black/40 rounded-lg p-3 border border-red-500/20 mb-6 font-mono text-[10px] text-red-300 overflow-x-auto custom-scrollbar">
                        <div className="flex items-center justify-between gap-2 mb-1 border-b border-red-500/10 pb-1 font-bold">
                            <div className="flex items-center gap-2">
                                <Bug size={10}/> SYSTEM_DIAGNOSTIC_LOG
                            </div>
                            <button 
                                onClick={handleCopyLog} 
                                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer group"
                                title="Copy Diagnostic Log"
                            >
                                {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} className="text-red-300 group-hover:text-white" />}
                                <span className={`text-[8px] uppercase tracking-widest ${copied ? 'text-green-400' : 'text-red-300 group-hover:text-white'}`}>
                                    {copied ? 'COPIED' : 'COPY'}
                                </span>
                            </button>
                        </div>
                        <div className="whitespace-pre-wrap break-all">
                            {errorLog}
                        </div>
                    </div>

                    <div className="mt-auto space-y-3">
                        <div className="text-xs text-[#d3bc8e] font-bold uppercase tracking-wide text-center mb-2">
                            Bantu Admin Isi Ulang Energi Akasha?
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <a href="https://trakteer.id/ryuuwangy" target="_blank" rel="noopener noreferrer" className="py-3 bg-[#d3bc8e] hover:bg-[#fff] text-black font-bold rounded-xl shadow-[0_0_20px_rgba(211,188,142,0.4)] transition-all flex items-center justify-center gap-2 group">
                                <Check size={18}/>
                                <span>TRAKTIR API KEY</span>
                            </a>
                            <a href="https://saweria.co/ryuuwangy" target="_blank" rel="noopener noreferrer" className="py-3 bg-[#1e2235] hover:bg-[#2a1e35] text-[#d3bc8e] border border-[#d3bc8e]/30 font-bold rounded-xl transition-all flex items-center justify-center gap-2 hover:border-[#d3bc8e]">
                                <Heart size={18} className="text-red-400 fill-current"/>
                                <span>DONASI (SAWERIA)</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DonationModal;
