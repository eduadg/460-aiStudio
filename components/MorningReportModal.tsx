
import React, { useState, useEffect, useRef } from 'react';
import { MoonIcon, ArrowPathIcon, RingIcon, SparklesIcon, FireIcon, CheckCircleIcon, HeartIcon, BoltIcon } from './icons';
import { api } from '../services/api';
import { User, SleepSession, PatientSummary } from '../types';

interface MorningReportModalProps {
    user: User;
    onClose: () => void;
}

const STEPS = ['sync', 'welcome', 'readiness', 'sleep', 'suggestion'] as const;

const MorningReportModal: React.FC<MorningReportModalProps> = ({ user, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sleepData, setSleepData] = useState<SleepSession | null>(null);
    const [vitals, setVitals] = useState<PatientSummary | null>(null);
    
    // Drag State
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [dragCurrent, setDragCurrent] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (currentIndex === 0) {
            const fetchData = async () => {
                try {
                    const [sData, vData] = await Promise.all([
                        api.getSleepDetails(),
                        api.getPatientSummary(user.id!)
                    ]);
                    setSleepData(sData);
                    setVitals(vData);
                } catch (e) { console.error(e); }
                
                // Minimum splash time for "Sync" feel
                setTimeout(() => handleNext(), 3000);
            };
            fetchData();
        }
    }, []);

    const handleNext = () => {
        if (currentIndex < STEPS.length - 1) setCurrentIndex(prev => prev + 1);
        else onClose();
    };

    const handlePrev = () => {
        if (currentIndex > 1) setCurrentIndex(prev => prev - 1);
    };

    // --- TOUCH HANDLERS ---
    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (currentIndex === 0) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        setDragStart(clientX);
        setDragCurrent(clientX);
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging || !dragStart) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        setDragCurrent(clientX);
    };

    const handleTouchEnd = () => {
        if (!isDragging || !dragStart || !dragCurrent) {
            setIsDragging(false);
            return;
        }
        const diff = dragCurrent - dragStart;
        if (diff < -50) handleNext();
        else if (diff > 50) handlePrev();
        
        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
    };

    const getDragOffset = () => {
        if (!isDragging || !dragStart || !dragCurrent) return 0;
        return dragCurrent - dragStart;
    };

    // --- RENDERERS ---

    const renderSync = () => (
        <div className="flex flex-col items-center justify-center h-full px-6 relative overflow-hidden">
            {/* Pulsating Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border border-teal-500/20 rounded-full animate-[ping_3s_linear_infinite]"></div>
                <div className="w-96 h-96 border border-teal-500/10 rounded-full animate-[ping_3s_linear_infinite_1s] absolute"></div>
            </div>

            <div className="relative z-10 mb-12">
                <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-teal-500/30 shadow-[0_0_50px_rgba(20,184,166,0.3)]">
                    <RingIcon className="w-10 h-10 text-teal-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 border-2 border-teal-500/50 rounded-full border-t-transparent animate-spin"></div>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Sincronizando</h2>
            <p className="text-teal-400/60 text-xs font-mono uppercase tracking-[0.3em] animate-pulse">Estabelecendo Conexão Segura</p>
        </div>
    );

    const renderWelcome = () => (
        <div className="flex flex-col items-center justify-center h-full px-8 relative">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none"></div>
            
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-orange-500/20 blur-[50px] rounded-full"></div>
                <span className="text-8xl relative z-10 drop-shadow-2xl">☀️</span>
            </div>

            <h1 className="text-4xl font-black text-white mb-2 leading-tight text-center">
                Bom dia,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-200">
                    {user.name.split(' ')[0]}
                </span>
            </h1>
            
            <p className="text-slate-400 text-lg font-medium text-center max-w-xs mt-4 leading-relaxed">
                Seus dados foram processados. Vamos ver como seu corpo se recuperou?
            </p>

            <div className="absolute bottom-12 flex flex-col items-center gap-3 animate-bounce">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Deslize para iniciar</span>
                <div className="w-px h-8 bg-gradient-to-b from-slate-500 to-transparent"></div>
            </div>
        </div>
    );

    const renderReadiness = () => {
        const score = 84; // Mock or calculate from vitals
        return (
            <div className="flex flex-col items-center justify-center h-full px-6">
                <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 blur-[60px] rounded-full"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div className="flex items-center gap-2">
                            <BoltIcon className="w-5 h-5 text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Prontidão</span>
                        </div>
                        <div className="bg-indigo-500/20 px-2 py-1 rounded text-[10px] font-bold text-indigo-300 border border-indigo-500/20">
                            HRV Estável
                        </div>
                    </div>

                    <div className="relative flex items-center justify-center mb-8">
                        {/* Background Circle */}
                        <svg className="w-64 h-64 transform -rotate-90">
                            <circle cx="128" cy="128" r="110" stroke="#1e293b" strokeWidth="16" fill="transparent" />
                            <circle 
                                cx="128" cy="128" r="110" 
                                stroke="url(#gradient-readiness)" 
                                strokeWidth="16" 
                                fill="transparent" 
                                strokeDasharray={2 * Math.PI * 110} 
                                strokeDashoffset={2 * Math.PI * 110 * (1 - score / 100)} 
                                strokeLinecap="round" 
                                className="drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                            />
                            <defs>
                                <linearGradient id="gradient-readiness" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-7xl font-black text-white tracking-tighter drop-shadow-xl">{score}</span>
                            <span className="text-sm font-medium text-slate-400 mt-1">Excelente</span>
                        </div>
                    </div>

                    <p className="text-center text-slate-300 text-sm leading-relaxed">
                        Seu sistema nervoso autônomo está equilibrado. Ótimo dia para treinos intensos.
                    </p>
                </div>
            </div>
        );
    };

    const renderSleep = () => (
        <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/20 blur-[60px] rounded-full"></div>

                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-blue-500/20 rounded-full text-blue-400 border border-blue-500/20">
                        <MoonIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-xl leading-none">Sono</h3>
                        <p className="text-slate-500 text-xs font-mono uppercase mt-1">Última Noite</p>
                    </div>
                </div>

                <div className="flex items-baseline gap-2 mb-8">
                    <span className="text-6xl font-black text-white tracking-tighter">{sleepData?.totalDuration.split(' ')[0] || '7'}</span>
                    <span className="text-2xl text-slate-400 font-medium">h</span>
                    <span className="text-6xl font-black text-white tracking-tighter ml-2">{sleepData?.totalDuration.split(' ')[1].replace('m','') || '30'}</span>
                    <span className="text-2xl text-slate-400 font-medium">m</span>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 flex justify-between items-center border border-white/5">
                        <span className="text-slate-400 text-xs font-bold uppercase">Eficiência</span>
                        <span className="text-white font-bold text-lg">{sleepData?.efficiency || 92}%</span>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 flex justify-between items-center border border-white/5">
                        <span className="text-slate-400 text-xs font-bold uppercase">Profundo + REM</span>
                        <span className="text-indigo-400 font-bold text-lg">2h 15m</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSuggestion = () => (
        <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-emerald-500/30 blur-[40px] rounded-full"></div>
                <div className="relative bg-gradient-to-br from-emerald-400 to-teal-600 w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3">
                    <SparklesIcon className="w-10 h-10 text-white" />
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6 text-center">Recomendação do Dia</h2>

            <div className="bg-slate-800/50 border border-white/10 p-6 rounded-3xl mb-8 relative w-full max-w-sm">
                <div className="absolute -top-3 left-6 bg-slate-900 border border-slate-700 px-3 py-1 rounded-full text-[10px] font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></div>
                    Dr. X AI
                </div>
                <p className="text-slate-200 text-lg font-medium italic leading-relaxed pt-2">
                    "Sua recuperação foi excelente. Aproveite a manhã para atividades criativas ou um treino de força."
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-10">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                    <FireIcon className="w-5 h-5 text-orange-500" />
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Meta Ativa</p>
                        <p className="text-white font-bold text-sm">Queimar 400kcal</p>
                    </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Foco</p>
                        <p className="text-white font-bold text-sm">Alta Energia</p>
                    </div>
                </div>
            </div>

            <button 
                onClick={onClose}
                className="w-full max-w-sm bg-white hover:bg-slate-100 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-white/10 transition-all active:scale-95 uppercase tracking-widest text-xs"
            >
                Iniciar Dashboard
            </button>
        </div>
    );

    const stepsContent = [
        renderSync(),
        renderWelcome(),
        renderReadiness(),
        renderSleep(),
        renderSuggestion()
    ];

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 overflow-hidden font-sans text-white select-none">
            {/* Background Ambient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none"></div>

            {/* Content Slider */}
            <div 
                ref={containerRef}
                className="flex h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                style={{ transform: `translateX(calc(-${currentIndex * 100}% + ${getDragOffset()}px))` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                {stepsContent.map((content, idx) => (
                    <div key={idx} className="min-w-full h-full flex-shrink-0 relative">
                        {content}
                    </div>
                ))}
            </div>

            {/* Progress Bars (Story Style) */}
            {currentIndex > 0 && (
                <div className="absolute top-0 left-0 w-full px-4 pt-4 z-50 flex gap-1.5">
                    {STEPS.slice(1).map((_, idx) => {
                        const stepIndex = idx + 1;
                        let stateClass = 'bg-slate-800';
                        if (stepIndex < currentIndex) stateClass = 'bg-white';
                        if (stepIndex === currentIndex) stateClass = 'bg-white'; // Active handled by inner div if needed, simplified here

                        return (
                            <div key={idx} className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-300 ${stepIndex <= currentIndex ? 'bg-white w-full' : 'w-0'}`}
                                ></div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Skip Button */}
            {currentIndex > 0 && currentIndex < STEPS.length - 1 && (
                <button 
                    onClick={onClose}
                    className="absolute top-8 right-4 text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-transparent hover:border-slate-700 transition-all z-50"
                >
                    Pular
                </button>
            )}
        </div>
    );
};

export default MorningReportModal;
