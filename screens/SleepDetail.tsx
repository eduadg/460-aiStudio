
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SleepSession, SleepStage } from '../types';
import { MoonIcon, ArrowPathIcon, ChevronRightIcon, ShareIcon, ChartBarIcon } from '../components/icons';
import { METRIC_DETAILS, MetricNav } from './Measures';

interface SleepDetailProps {
    onBack: () => void;
    onNavigateToMetric?: (metric: string) => void;
}

const SleepDetail: React.FC<SleepDetailProps> = ({ onBack, onNavigateToMetric }) => {
    const [session, setSession] = useState<SleepSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(15);

    useEffect(() => {
        const load = async () => {
            const data = await api.getSleepDetails();
            setSession(data);
            setLoading(false);
        };
        load();
    }, []);

    const dates = [12, 13, 14, 15, 16, 17, 18, 19];

    // Helper para converter string de duração (ex: "1h 30m") em minutos
    const parseDurationToMinutes = (durStr: string) => {
        if (!durStr) return 0;
        let minutes = 0;
        const hMatch = durStr.match(/(\d+)h/);
        const mMatch = durStr.match(/(\d+)m/);
        if (hMatch) minutes += parseInt(hMatch[1]) * 60;
        if (mMatch) minutes += parseInt(mMatch[1]);
        return minutes;
    };

    // Helper para converter HH:mm em minutos totais do dia (para cálculo relativo)
    const timeToMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    // --- CHART COMPONENT ---
    const SleepHypnogram: React.FC<{ session: SleepSession }> = ({ session }) => {
        if (!session.timeline || session.timeline.length === 0) {
            return <div className="h-48 flex items-center justify-center text-slate-500 text-xs">Sem dados detalhados</div>;
        }

        // Calcula o tempo total em minutos baseado na timeline para normalizar o gráfico (0 a 100%)
        // Precisamos lidar com a virada do dia (ex: 22:00 -> 06:00)
        let firstStart = timeToMinutes(session.timeline[0].startTime);
        
        // Ajuste simples: se o primeiro bloco começa antes do meio dia, assumimos que é madrugada, senão noite anterior.
        // Mas para simplificar a visualização relativa, vamos somar as durações.
        const totalDurationMin = session.timeline.reduce((acc, item) => acc + item.durationMinutes, 0);

        let currentOffset = 0;

        return (
            <div className="relative w-full h-48 mt-4 bg-slate-100 dark:bg-slate-800/20 rounded-xl overflow-hidden border border-slate-200 dark:border-white/5">
                {/* Horizontal Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none px-2">
                    <div className="border-b border-slate-300 dark:border-white/5 w-full h-0"></div>
                    <div className="border-b border-slate-300 dark:border-white/5 w-full h-0"></div>
                    <div className="border-b border-slate-300 dark:border-white/5 w-full h-0"></div>
                    <div className="border-b border-slate-300 dark:border-white/5 w-full h-0"></div>
                </div>

                {/* Bars */}
                <div className="absolute inset-0 flex items-center px-2">
                    {session.timeline.map((block, i) => {
                        let bg = '#6366f1'; // Indigo (Light)
                        let h = '40%';
                        let top = '30%';
                        
                        if (block.stage === 'awake') { bg = '#f97316'; h = '20%'; top = '10%'; } // Orange
                        if (block.stage === 'rem') { bg = '#38bdf8'; h = '30%'; top = '35%'; } // Sky
                        if (block.stage === 'light') { bg = '#6366f1'; h = '40%'; top = '50%'; } // Indigo
                        if (block.stage === 'deep') { bg = '#312e81'; h = '30%'; top = '70%'; } // Dark Indigo

                        const widthPercent = (block.durationMinutes / totalDurationMin) * 100;
                        const leftPercent = (currentOffset / totalDurationMin) * 100;
                        
                        currentOffset += block.durationMinutes;

                        return (
                            <div 
                                key={i}
                                style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                    top: top,
                                    height: h,
                                    backgroundColor: bg,
                                    position: 'absolute',
                                    borderRadius: '4px',
                                    opacity: 0.9
                                }}
                                title={`${block.stage}: ${block.startTime} - ${block.endTime}`}
                            ></div>
                        );
                    })}
                </div>
                
                {/* Labels (Start and End times) */}
                <div className="absolute bottom-1 w-full flex justify-between px-2 text-[9px] text-slate-500 font-mono">
                    <span>{session.timeline[0].startTime}</span>
                    <span>{session.timeline[Math.floor(session.timeline.length / 2)].startTime}</span>
                    <span>{session.timeline[session.timeline.length - 1].endTime}</span>
                </div>
            </div>
        );
    };

    const StatRow: React.FC<{ label: string, valueStr: string, totalMinutes: number, color: string }> = ({ label, valueStr, totalMinutes, color }) => {
        const minutes = parseDurationToMinutes(valueStr);
        const percent = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;

        return (
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">{label}</span>
                    <span className="text-slate-800 dark:text-white text-xs font-bold">{valueStr} ({Math.round(percent)}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%`, backgroundColor: color }}></div>
                </div>
            </div>
        );
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin" /></div>;

    const totalSleepMin = parseDurationToMinutes(session?.totalDuration || "0h 0m");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col animate-fade-in-right">
            {/* Standard Sticky Header */}
            <header className="p-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-30 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <ChevronRightIcon className="w-6 h-6 rotate-180" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Sono</h1>
                </div>
                <div className="flex gap-3 text-slate-400">
                    <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><ShareIcon className="w-5 h-5" /></button>
                    <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><ChartBarIcon className="w-5 h-5" /></button>
                </div>
            </header>

            {/* Navigation Bar */}
            <div className="pt-2 sticky top-[73px] bg-slate-50/95 dark:bg-slate-950/95 z-20 backdrop-blur-sm">
                 <MetricNav current="sleep" onSwitch={(m) => onNavigateToMetric && onNavigateToMetric(m)} />
            </div>

            {/* Date Slider */}
            <div className="flex justify-between items-end px-4 py-4 mb-2 border-b border-slate-200 dark:border-slate-800">
                {dates.map((d) => (
                    <div key={d} className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setSelectedDate(d)}>
                        <div className="h-8 flex items-end">
                            <div className={`w-1 rounded-full transition-all duration-300 ${d === selectedDate ? 'bg-indigo-500 h-6' : 'bg-slate-300 dark:bg-slate-700 h-3 group-hover:bg-slate-400 dark:group-hover:bg-slate-500'}`}></div>
                        </div>
                        {d === selectedDate ? (
                            <div className="bg-indigo-600 text-white font-bold rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-lg shadow-indigo-900/50">
                                {d}
                            </div>
                        ) : (
                            <span className="text-slate-400 dark:text-slate-600 text-xs font-medium h-7 flex items-center">{d}</span>
                        )}
                    </div>
                ))}
            </div>

            <main className="flex-1 overflow-y-auto px-4 pb-24 space-y-6">
                
                {/* 1. Hero Card - Sleep Score */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 relative overflow-hidden text-center border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500 to-purple-900 opacity-10 dark:opacity-20 rounded-full blur-[80px] -mr-16 -mt-16"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center border-4 border-indigo-200 dark:border-indigo-500/20 mb-4 shadow-xl">
                            <MoonIcon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-5xl font-bold text-slate-800 dark:text-white mb-2 tracking-tighter">
                            {session?.efficiency || '--'} <span className="text-xl text-slate-500 font-normal">pts</span>
                        </h2>
                        <p className="text-indigo-600 dark:text-indigo-300 text-sm font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/20 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/20">
                            {session && session.efficiency >= 80 ? 'Qualidade Boa' : session && session.efficiency >= 60 ? 'Regular' : 'Ruim'}
                        </p>
                    </div>
                </div>

                {/* 2. Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Duração</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{session?.totalDuration || '--'}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Eficiência</p>
                        <p className="text-2xl font-bold text-green-500 dark:text-green-400">{session?.efficiency || 0}%</p>
                    </div>
                </div>

                {/* 3. Hypnogram Chart Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-slate-800 dark:text-white font-bold text-lg">Fases do Sono</h3>
                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">{session?.totalDuration || '0h'} Total</span>
                    </div>
                    {session && <SleepHypnogram session={session} />}
                    
                    <div className="mt-6 space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Detalhamento</h4>
                        {session && (
                            <>
                                <StatRow label="Sono Profundo" valueStr={session.stages.deep} totalMinutes={totalSleepMin} color="#312e81" />
                                <StatRow label="Sono REM" valueStr={session.stages.rem} totalMinutes={totalSleepMin} color="#38bdf8" />
                                <StatRow label="Sono Leve" valueStr={session.stages.light} totalMinutes={totalSleepMin} color="#6366f1" />
                                <StatRow label="Acordado" valueStr={session.stages.awake} totalMinutes={totalSleepMin} color="#f97316" />
                            </>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default SleepDetail;
