
import React, { useState, useEffect } from 'react';
import { UserCircleIcon, CheckCircleIcon, ArrowPathIcon, ShareIcon, PlusIcon, XMarkIcon, EnvelopeIcon, SparklesIcon, EyeIcon, EyeSlashIcon } from '../components/icons';
import { api, formatError } from '../services/api';
import { User } from '../types';
import AppPresentationModal from '../components/AppPresentationModal';
import { useUser } from '../contexts/UserContext';
import { useTranslation } from '../services/i18n';

// Login prop type can be empty now as it uses Context
interface LoginProps {
    onLoginSuccess?: (user: User) => void; // Optional legacy prop
}

const Login: React.FC<LoginProps> = () => {
    const { login, register } = useUser();
    const { t, language, setLanguage } = useTranslation();
    const [activeTab, setActiveTab] = useState<'patient' | 'doctor'>('patient');
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [systemStatus, setSystemStatus] = useState<{online: boolean, message: string, latency: number} | null>(null);
    const [showPresentation, setShowPresentation] = useState(false);
    
    // PWA State
    const [canInstall, setCanInstall] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSHelp, setShowIOSHelp] = useState(false);

    useEffect(() => {
        const check = async () => {
            const status = await api.checkSystemHealth();
            setSystemStatus({
                online: status.online,
                message: status.message || '',
                latency: status.latency
            });
        };
        check();

        if ((window as any).deferredPrompt) {
            setCanInstall(true);
        }

        const handleInstallPrompt = (e: any) => {
            e.preventDefault();
            (window as any).deferredPrompt = e;
            setCanInstall(true);
        };
        window.addEventListener('beforeinstallprompt', handleInstallPrompt);

        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        
        if (isIosDevice && !isStandalone) {
            setIsIOS(true);
            setCanInstall(true);
        }

        if (isStandalone) {
            setCanInstall(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
        };
    }, []);

    const handleInstallClick = () => {
        if (isIOS) {
            setShowIOSHelp(true);
            return;
        }

        const promptEvent = (window as any).deferredPrompt;
        if (!promptEvent) {
            alert("O navegador não permitiu a instalação automática neste momento. Tente pelo menu do navegador.");
            return;
        }

        promptEvent.prompt();
        promptEvent.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
                setCanInstall(false);
            }
            (window as any).deferredPrompt = null;
        });
    };

    const handleTabChange = (tab: 'patient' | 'doctor') => {
        setActiveTab(tab);
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (mode === 'forgot') {
                await api.resetPassword(email);
                setSuccess(t('login.msg.recovery_sent'));
                setLoading(false);
                return;
            }

            if (mode === 'register') {
                if (!name.trim()) throw new Error("Nome é obrigatório para cadastro.");
                if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
                await register(email, password, name, activeTab);
            } else {
                await login(email, password, activeTab);
            }
            // Sucesso! O contexto UserContext atualizará o 'user' e o App.tsx desmontará este componente.
            
        } catch (err: any) {
            console.error(err);
            const msg = formatError(err);

            if (msg.includes('confirmar')) { // Simplificação da checagem de erro traduzido
                setSuccess(msg);
                setMode('login');
            } else if (msg.includes('Invalid login')) {
                setError('E-mail ou senha incorretos.');
            } else if (msg.includes('already registered')) {
                setError('Este e-mail já está cadastrado.');
            } else {
                setError(msg || t('common.error'));
            }
        } finally {
            if (mode !== 'forgot') setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {showPresentation && <AppPresentationModal onClose={() => setShowPresentation(false)} />}
            
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Language Switcher */}
            <div className="absolute top-6 left-6 z-50">
                <button 
                    onClick={() => setLanguage(language === 'pt-BR' ? 'en-US' : 'pt-BR')}
                    className="text-white/50 hover:text-white text-xs font-bold font-mono border border-white/10 rounded-full px-3 py-1 bg-white/5 transition-colors"
                    aria-label={`Mudar idioma para ${language === 'pt-BR' ? 'Inglês' : 'Português'}`}
                >
                    {language === 'pt-BR' ? 'EN' : 'PT'}
                </button>
            </div>

            {/* Top Buttons Container */}
            <div className="absolute top-6 right-6 flex gap-3 items-center z-50 pointer-events-none">
                <div className="pointer-events-auto">
                    <button 
                        onClick={() => setShowPresentation(true)}
                        className="bg-white/5 hover:bg-white/10 backdrop-blur-md text-slate-300 hover:text-white px-4 py-2 rounded-full border border-white/10 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                        aria-label="Conheça o Dr. X"
                    >
                        <SparklesIcon className="w-4 h-4 text-purple-400" aria-hidden="true" />
                        Dr. X
                    </button>
                </div>

                <div className="pointer-events-auto">
                    {canInstall && (
                        <button 
                            onClick={handleInstallClick}
                            className="bg-teal-600/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg shadow-teal-900/50 font-bold text-xs flex items-center gap-2 animate-bounce hover:bg-teal-500 transition-colors cursor-pointer border border-white/10"
                            aria-label={isIOS ? t('login.install.ios') : 'Instalar App'}
                        >
                            <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
                            {t('login.install.app')}
                        </button>
                    )}
                </div>
            </div>

            {showIOSHelp && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowIOSHelp(false)}>
                    <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowIOSHelp(false)} className="absolute top-4 right-4 bg-slate-800 p-2 rounded-full hover:bg-slate-700" aria-label="Fechar ajuda">
                            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
                        </button>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <ShareIcon className="w-6 h-6 text-blue-400" aria-hidden="true" />
                            {t('login.install.ios')}
                        </h3>
                        <ol className="list-decimal pl-5 space-y-4 text-sm text-slate-300">
                            <li>Toque no botão <strong>Compartilhar</strong> <span className="inline-block bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-white text-xs align-middle" aria-hidden="true">⎋</span>.</li>
                            <li>Selecione <strong>"Adicionar à Tela de Início"</strong> <span className="inline-block bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-white text-xs align-middle" aria-hidden="true"><PlusIcon className="w-3 h-3 inline"/></span>.</li>
                            <li>Toque em <strong>Adicionar</strong>.</li>
                        </ol>
                    </div>
                </div>
            )}

            <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden z-10 border border-white/10 mt-12">
                <div className={`p-8 text-center relative overflow-hidden`}>
                    <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${activeTab === 'patient' ? 'from-teal-500 to-blue-600' : 'from-blue-600 to-indigo-600'}`}></div>
                    <div className="relative z-10">
                        <div className="inline-block p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-4 shadow-lg">
                            <UserCircleIcon className="w-12 h-12 text-white" aria-hidden="true" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">{t('app.title')}</h1>
                        <p className="text-slate-400 text-sm font-medium">{t('app.tagline')}</p>
                    </div>
                </div>

                {mode !== 'forgot' && (
                    <div className="flex border-b border-white/5 bg-slate-900/50" role="tablist">
                        <button
                            role="tab"
                            aria-selected={activeTab === 'patient'}
                            onClick={() => handleTabChange('patient')}
                            className={`flex-1 py-4 text-sm font-bold transition-all relative ${
                                activeTab === 'patient' 
                                    ? 'text-teal-400 bg-slate-800/50' 
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                            }`}
                        >
                            {t('role.patient')}
                            {activeTab === 'patient' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"></span>}
                        </button>
                        <button
                            role="tab"
                            aria-selected={activeTab === 'doctor'}
                            onClick={() => handleTabChange('doctor')}
                            className={`flex-1 py-4 text-sm font-bold transition-all relative ${
                                activeTab === 'doctor' 
                                    ? 'text-blue-400 bg-slate-800/50' 
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                            }`}
                        >
                            {t('role.doctor')}
                            {activeTab === 'doctor' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]"></span>}
                        </button>
                    </div>
                )}

                <div className="p-8">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white">
                            {mode === 'forgot' ? t('login.forgot_password') : mode === 'register' ? t('login.create_account') : (activeTab === 'patient' ? t('login.welcome_back') : t('login.doctor_portal'))}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {mode === 'forgot' ? 'Enviaremos um link para seu e-mail.' : activeTab === 'patient' ? t('login.subtitle_patient') : t('login.subtitle_doctor')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in-up">
                        {mode === 'register' && (
                            <div>
                                <label htmlFor="name" className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">{t('login.label.name')}</label>
                                <input 
                                    id="name"
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-teal-500/50 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition-all text-white placeholder:text-slate-600"
                                    placeholder={t('login.placeholder.name')}
                                    required
                                />
                            </div>
                        )}
                        
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">{t('login.label.email')}</label>
                            <input 
                                id="email"
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-teal-500/50 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition-all text-white placeholder:text-slate-600"
                                placeholder={t('login.placeholder.email')}
                                required
                            />
                        </div>

                        {mode !== 'forgot' && (
                            <div>
                                <div className="flex justify-between items-center mb-1.5 ml-1">
                                    <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase">{t('login.label.password')}</label>
                                    <button 
                                        type="button"
                                        onClick={() => setMode('forgot')}
                                        className="text-[10px] font-bold text-teal-500 hover:text-teal-400 uppercase tracking-wider"
                                    >
                                        {t('login.btn.forgot')}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input 
                                        id="password"
                                        type={showPassword ? "text" : "password"} 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-teal-500/50 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition-all text-white placeholder:text-slate-600 pr-12"
                                        placeholder={t('login.placeholder.password')}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-green-500/10 text-green-400 text-sm rounded-xl flex items-start gap-2 border border-green-500/20" role="alert">
                                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                                <span>{success}</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-xl flex items-start gap-2 border border-red-500/20 animate-pulse" role="alert">
                                <span className="block w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0"></span>
                                <span className="font-bold">{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`mt-4 w-full py-4 rounded-xl font-bold text-white shadow-lg transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2
                                ${mode === 'forgot' ? 'bg-indigo-600 hover:bg-indigo-500' : activeTab === 'patient' 
                                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 shadow-teal-900/30' 
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30'}
                            `}
                        >
                            {loading ? (
                                <ArrowPathIcon className="w-5 h-5 animate-spin" aria-hidden="true" />
                            ) : (
                                <>{mode === 'forgot' ? t('login.btn.send_link') : mode === 'register' ? t('login.btn.register') : t('login.btn.enter')}</>
                            )}
                        </button>

                        <div className="text-center mt-2 flex flex-col gap-3">
                            {mode === 'forgot' ? (
                                <button 
                                    type="button"
                                    onClick={() => setMode('login')}
                                    className="text-sm text-slate-400 font-medium hover:text-white transition-colors"
                                >
                                    {t('login.link.back_login')}
                                </button>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                    className="text-sm text-slate-400 font-medium hover:text-white transition-colors"
                                >
                                    {mode === 'login' ? t('login.link.no_account') : t('login.link.has_account')}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            <div className="mt-8 flex items-center gap-3 px-4 py-1.5 bg-slate-900/50 backdrop-blur-md rounded-full border border-white/5 text-[10px] text-slate-500 font-mono">
                <span className={`block w-1.5 h-1.5 rounded-full ${systemStatus?.online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span>
                    {systemStatus?.online ? `SYSTEM ONLINE (${systemStatus.latency}ms)` : 'OFFLINE'}
                </span>
            </div>
        </div>
    );
};

export default Login;
