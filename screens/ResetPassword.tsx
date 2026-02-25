
import React, { useState } from 'react';
import { api, formatError } from '../services/api';
import { LockClosedIcon, CheckCircleIcon, ArrowPathIcon } from '../components/icons';

interface ResetPasswordProps {
    onComplete: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onComplete }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            setLoading(false);
            return;
        }

        try {
            await api.updatePassword(password);
            setSuccess(true);
            setTimeout(() => {
                onComplete(); // Navigate back to login/home
            }, 2000);
        } catch (err: any) {
            setError(formatError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white">
            <div className="w-full max-w-md bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                        <LockClosedIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Nova Senha</h1>
                    <p className="text-slate-400 text-sm">Defina sua nova senha para acessar o Dr. X Health.</p>
                </div>

                {success ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center animate-fade-in">
                        <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <h3 className="text-green-400 font-bold text-lg mb-1">Senha Atualizada!</h3>
                        <p className="text-slate-400 text-xs">Redirecionando...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Senha Segura</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="••••••••"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50"
                        >
                            {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Confirmar Nova Senha'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
