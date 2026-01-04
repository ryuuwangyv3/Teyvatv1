
import React, { useState } from 'react';
import { Lock, ShieldAlert, ChevronRight, X } from 'lucide-react';
import { verifyAdminPassword } from '../services/securityService';

interface AdminLoginModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onSuccess, onClose }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Uses the new SHA-256 Hashing protocol
        if (verifyAdminPassword(password)) {
            onSuccess();
        } else {
            setError(true);
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in-95 p-4">
            <div className="w-full max-w-sm bg-[#0b0e14] border-2 border-red-900/50 rounded-2xl shadow-[0_0_50px_rgba(153,27,27,0.3)] overflow-hidden">
                <div className="bg-red-900/10 p-6 border-b border-red-900/30 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-red-500 flex items-center gap-2 font-mono uppercase tracking-widest">
                            <ShieldAlert className="w-5 h-5" /> Restricted
                        </h2>
                        <p className="text-[10px] text-red-400 mt-1">Akasha Root Access Protocol</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Admin Passphrase</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                                className="w-full bg-black border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-red-500 focus:outline-none font-mono text-sm"
                                placeholder="Enter system code..."
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-xs text-red-500 font-bold animate-pulse">Access Denied: Invalid Credentials</p>}
                    </div>

                    <button 
                        type="submit" 
                        className="w-full py-3 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 hover:text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                    >
                        Authenticate <ChevronRight className="w-4 h-4" />
                    </button>
                </form>
                
                <div className="bg-black p-3 text-center border-t border-white/5">
                    <p className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter">
                        Encrypted SHA-256 Validation Active
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginModal;
