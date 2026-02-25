
import React, { useEffect, useState, useMemo } from 'react';
import { HeartIcon, FireIcon, MoonIcon, ArrowTrendingUpIcon, ArrowPathIcon, UsersIcon, RingIcon, PlusIcon, XMarkIcon, CheckCircleIcon, ChevronRightIcon, DocumentPlusIcon, ScaleIcon, ChartBarIcon, CakeIcon, ShareIcon, ChartBarIcon as ChartIcon, EllipsisVerticalIcon, BoltIcon, MapPinIcon, CpuChipIcon, Battery100Icon } from '../components/icons';
import { api } from '../services/api';
import { ringService } from '../services/ringIntegration';
import type { Measure } from '../types';
import WeatherHero from '../components/WeatherHero';
import MorningReportModal from '../components/MorningReportModal';
import { MiniSparklineChart, BiometricsLineChart, InteractiveBarChart } from '../components/HealthCharts';

interface MeasuresProps {
    onFamilyClick?: () => void;
    onSleepClick?: () => void;
    initialSelectedMetric?: string;
    onClearInitialSelectedMetric?: () => void;
}

// --- CONFIGURAÇÃO DE REFERÊNCIAS CLÍNICAS & TEMAS ---
export const METRIC_DETAILS: Record<string, { label: string, unit: string, description: string, range: string, color: string, gradient: string, icon: any, hex: string }> = {
    heart: {
        label: 'Frequência Cardíaca',
        unit: 'bpm',
        description: 'Monitoramento contínuo para detecção de arritmias e zonas de esforço.',
        range: '60 - 100 bpm',
        color: 'text-rose-500',
        gradient: 'from-rose-500 to-red-900',
        icon: HeartIcon,
        hex: '#f43f5e'
    },
    pressure: {
        label: 'Pressão Arterial',
        unit: 'mmHg',
        description: 'Controle de hipertensão e saúde cardiovascular.',
        range: '< 120/80 mmHg',
        color: 'text-pink-500',
        gradient: 'from-pink-500 to-rose-900',
        icon: HeartIcon,
        hex: '#ec4899'
    },
    spo2: {
        label: 'Oxigenação',
        unit: '%',
        description: 'Saturação de oxigênio no sangue (SpO2).',
        range: '95% - 100%',
        color: 'text-sky-400',
        gradient: 'from-sky-400 to-blue-900',
        icon: RingIcon,
        hex: '#38bdf8'
    },
    steps: {
        label: 'Atividade',
        unit: 'passos',
        description: 'Índice de movimento diário e gasto calórico.',
        range: 'Meta: 10k',
        color: 'text-orange-500',
        gradient: 'from-orange-400 to-red-900',
        icon: FireIcon,
        hex: '#f97316'
    },
    sleep: {
        label: 'Sono',
        unit: 'h',
        description: 'Análise de ciclos de sono e recuperação.',
        range: '7 - 9 h',
        color: 'text-indigo-400',
        gradient: 'from-indigo-400 to-purple-900',
        icon: MoonIcon,
        hex: '#818cf8'
    },
    calories: {
        label: 'Nutrição',
        unit: 'kcal',
        description: 'Balanço energético diário.',
        range: 'Meta Variável',
        color: 'text-emerald-400',
        gradient: 'from-emerald-400 to-teal-900',
        icon: CakeIcon,
        hex: '#34d399'
    },
    stress: {
        label: 'Estresse',
        unit: 'idx',
        description: 'Variabilidade da frequência cardíaca (HRV) e tensão.',
        range: 'Baixo/Médio',
        color: 'text-amber-400',
        gradient: 'from-amber-400 to-orange-900',
        icon: BoltIcon,
        hex: '#fbbf24'
    }
};

const MiniProgressBar: React.FC<{ value: number, max: number, colorStart: string, colorEnd: string }> = ({ value, max, colorStart, colorEnd }) => {
    const percent = Math.min((value / max) * 100, 100);
    return (
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative mt-1">
            <div className={`h-full absolute top-0 left-0 rounded-full bg-gradient-to-r ${colorStart} ${colorEnd} shadow-[0_0_10px_currentColor]`} style={{ width: `${percent}%` }}></div>
        </div>
    );
};

// --- SMART CARD COMPONENT (UPDATED DESIGN) ---
const SmartMetricCard: React.FC<{ 
    type: string, 
    latestValue: string, 
    history: Measure[], 
    date: string, 
    onClick: () => void 
}> = ({ type, latestValue, history, date, onClick }) => {
    const info = METRIC_DETAILS[type] || METRIC_DETAILS['steps'];
    const Icon = info.icon;
    const numericHistory = useMemo(() => history.map(m => parseInt(m.value.replace(/\D/g, '')) || 0).reverse().slice(-20), [history]);

    return (
        <button 
            onClick={onClick}
            className="w-full bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-xl text-left"
        >
            {/* Subtle Gradient Glow */}
            <div className={`absolute -right-10 -top-10 w-48 h-48 bg-gradient-to-br ${info.gradient} opacity-5 dark:opacity-10 blur-[60px] group-hover:opacity-20 transition-opacity duration-500`}></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-white border border-slate-100 dark:border-white/5 shadow-sm`}>
                            <Icon className={`w-5 h-5 ${info.color}`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm leading-tight">{info.label}</h3>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">{date}</p>
                        </div>
                    </div>
                    <div className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500 dark:group-hover:text-white transition-colors" />
                    </div>
                </div>

                <div className="flex items-end justify-between gap-4">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-bold text-slate-800 dark:text-white tracking-tighter tabular-nums">{latestValue}</span>
                        <span className="text-sm text-slate-500 font-medium dark:text-slate-400 mb-1">{type !== 'stress' ? info.unit : ''}</span>
                    </div>
                    
                    <div className="h-10 w-24 opacity-80 group-hover:opacity-100 transition-opacity">
                        {type === 'steps' ? (
                            <div className="flex flex-col justify-end h-full pb-1">
                                <span className="text-[10px] text-slate-400 text-right mb-1">Meta: 10k</span>
                                <MiniProgressBar value={parseInt(latestValue) || 0} max={10000} colorStart="from-orange-400" colorEnd="to-red-500" />
                            </div>
                        ) : (
                            <MiniSparklineChart data={numericHistory} color={info.hex} height={40} />
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
};

export const MetricNav: React.FC<{ current: string, onSwitch: (m: string) => void }> = ({ current, onSwitch }) => {
    const metrics = ['heart', 'steps', 'sleep', 'calories', 'spo2', 'pressure', 'stress'];
    
    return (
        <div className="flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar mb-2 border-b border-slate-200 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md">
            {metrics.map(m => {
                const info = METRIC_DETAILS[m];
                const Icon = info.icon;
                const isActive = current === m;
                return (
                    <button
                        key={m}
                        onClick={() => onSwitch(m)}
                        className={`flex flex-col items-center gap-1.5 min-w-[4.5rem] transition-all duration-300 group ${isActive ? 'scale-105' : 'opacity-60 hover:opacity-100'}`}
                    >
                        <div className={`p-3 rounded-2xl transition-all duration-300 shadow-sm ${isActive ? 'bg-white dark:bg-slate-800 shadow-md ring-1 ring-slate-200 dark:ring-white/10' : 'bg-slate-100 dark:bg-slate-900 group-hover:bg-white dark:group-hover:bg-slate-800'}`}>
                            <Icon className={`w-5 h-5 transition-colors ${isActive ? info.color : 'text-slate-400 group-hover:text-slate-300'}`} />
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                            {info.label.split(' ')[0]}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

// ... (Rest of Layout Components like DetailViewLayout remain mostly the same, ensuring they use the new styles)

const DetailViewLayout: React.FC<{ 
    title: string, 
    onBack: () => void, 
    onAdd?: () => void,
    currentMetric: string,
    onSwitchMetric: (m: string) => void,
    heroContent: React.ReactNode,
    chartContent: React.ReactNode,
    statsContent: React.ReactNode,
    historyContent: React.ReactNode
}> = ({ title, onBack, onAdd, currentMetric, onSwitchMetric, heroContent, chartContent, statsContent, historyContent }) => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col relative animate-fade-in-right">
        <header className="p-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-30 border-b border-slate-200 dark:border-slate-800/50">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                    <ChevronRightIcon className="w-6 h-6 rotate-180" />
                </button>
                <h1 className="text-lg font-bold tracking-tight">{title}</h1>
            </div>
            <div className="flex gap-3 text-slate-400">
                <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><ShareIcon className="w-5 h-5" /></button>
                <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"><ChartIcon className="w-5 h-5" /></button>
            </div>
        </header>
        
        <div className="sticky top-[69px] z-20">
             <MetricNav current={currentMetric} onSwitch={onSwitchMetric} />
        </div>

        <main className="flex-1 overflow-y-auto px-4 pb-24 space-y-6 pt-4">
            {heroContent}
            {chartContent}
            {statsContent}
            {historyContent}
        </main>
        
        {onAdd && (
            <button 
                onClick={onAdd} 
                className="fixed bottom-24 right-6 bg-slate-900/90 dark:bg-white/10 backdrop-blur-md text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform active:scale-95 z-50 border border-white/10"
            >
                <PlusIcon className="w-6 h-6" />
            </button>
        )}
    </div>
);

// ... (GenericDetailView, HeartRateDetailView, StressDetailView - reused with better classNames inside DetailViewLayout)

const GenericDetailView: React.FC<{ type: string, measures: Measure[], onBack: () => void, onAddMeasurement: () => void, onSwitchMetric: (t: string) => void }> = ({ type, measures, onBack, onAddMeasurement, onSwitchMetric }) => {
    const info = METRIC_DETAILS[type] || METRIC_DETAILS['steps'];
    const Icon = info.icon;
    const parseValue = (val: string) => {
        if (!val) return 0;
        if (val.includes('/')) return parseInt(val.split('/')[0]) || 0;
        return parseInt(val.replace(/\D/g, '')) || 0;
    };
    const allValues = measures.map(m => parseValue(m.value));
    const hasData = allValues.length > 0;
    const latest = hasData ? measures[0].value : '--';
    const maxVal = hasData ? Math.max(...allValues) : 0;
    const minVal = hasData ? Math.min(...allValues) : 0;
    const avgVal = hasData ? Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length) : 0;
    
    const chartData = measures.slice(0, 14).reverse().map(m => ({
        label: new Date(m.created_at).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}),
        value: parseValue(m.value),
        unit: info.unit,
        fullDate: new Date(m.created_at).toLocaleString('pt-BR')
    }));

    return (
        <DetailViewLayout
            title={info.label}
            onBack={onBack}
            onAdd={onAddMeasurement}
            currentMetric={type}
            onSwitchMetric={onSwitchMetric}
            heroContent={
                <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-8 relative overflow-hidden text-center border border-slate-200 dark:border-white/5 shadow-lg">
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${info.gradient} opacity-10 dark:opacity-20 rounded-full blur-[80px] -mr-16 -mt-16`}></div>
                    <div className="relative z-10">
                        <div className={`inline-flex p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 mb-6 border border-slate-100 dark:border-white/5 shadow-sm`}>
                            <Icon className={`w-8 h-8 ${info.color}`} />
                        </div>
                        <h2 className="text-7xl font-bold text-slate-900 dark:text-white mb-2 tracking-tighter leading-none">
                            {latest.replace(/[a-zA-Z%]/g, '').trim()} 
                            <span className="text-2xl text-slate-400 font-normal ml-1 tracking-normal">{info.unit}</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-xs mx-auto">{info.description}</p>
                    </div>
                </div>
            }
            chartContent={
                <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-slate-800 dark:text-white font-bold text-lg">Tendência</h3>
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">14 Dias</span>
                    </div>
                    <div className="h-64 w-full relative">
                        {hasData ? (
                            <BiometricsLineChart data={chartData} color={info.hex} unit={info.unit} showGrid={true} />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm italic">
                                <p>Sem dados registrados.</p>
                            </div>
                        )}
                    </div>
                </div>
            }
            statsContent={
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl text-center border border-slate-200 dark:border-white/5 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Média</p>
                        <p className="text-xl font-bold text-slate-800 dark:text-white">{hasData ? avgVal : '--'}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl text-center border border-slate-200 dark:border-white/5 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Máximo</p>
                        <p className={`text-xl font-bold ${info.color}`}>{hasData ? maxVal : '--'}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl text-center border border-slate-200 dark:border-white/5 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">Mínimo</p>
                        <p className="text-xl font-bold text-slate-600 dark:text-slate-300">{hasData ? minVal : '--'}</p>
                    </div>
                </div>
            }
            historyContent={
                <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 shadow-sm mb-6">
                    <h3 className="text-slate-800 dark:text-white font-bold mb-4 text-lg">Histórico Completo</h3>
                    <div className="space-y-4">
                        {hasData ? (
                            measures.map((m, i) => (
                                <div key={i} className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                                    <div>
                                        <p className="text-slate-800 dark:text-white font-bold text-lg">{m.value}</p>
                                        <p className="text-xs text-slate-500 font-mono">{new Date(m.created_at).toLocaleDateString('pt-BR')} • {new Date(m.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                                        <Icon className={`w-4 h-4 ${info.color}`} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-sm text-center py-8 italic">Nenhum registro encontrado.</p>
                        )}
                    </div>
                </div>
            }
        />
    );
};

const HeartRateDetailView: React.FC<{ measures: Measure[], onBack: () => void, onAddMeasurement: () => void, onSwitchMetric: (t: string) => void }> = ({ measures, onBack, onAddMeasurement, onSwitchMetric }) => {
    return <GenericDetailView type="heart" measures={measures} onBack={onBack} onAddMeasurement={onAddMeasurement} onSwitchMetric={onSwitchMetric} />;
};

const StressDetailView: React.FC<{ measures: Measure[], onBack: () => void, onAddMeasurement: () => void, onSwitchMetric: (t: string) => void }> = ({ measures, onBack, onAddMeasurement, onSwitchMetric }) => {
    const info = METRIC_DETAILS['stress'];
    const hasData = measures.length > 0;
    const latestMeasure = measures[0];
    const latestVal = latestMeasure ? parseInt(latestMeasure.value) : 0;
    let statusText = 'Sem Dados';
    let statusColor = 'text-slate-500';
    if (hasData) {
        if (latestVal < 30) { statusText = 'Alto Estresse'; statusColor = 'text-red-500'; }
        else if (latestVal < 60) { statusText = 'Moderado'; statusColor = 'text-amber-500'; }
        else { statusText = 'Calmo'; statusColor = 'text-green-500'; }
    }

    const chartData = measures.slice(0, 14).reverse().map(m => ({
        label: new Date(m.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
        value: parseInt(m.value),
        unit: 'HRV'
    }));

    return (
        <DetailViewLayout
            title="Nível de Estresse"
            onBack={onBack}
            onAdd={onAddMeasurement}
            currentMetric="stress"
            onSwitchMetric={onSwitchMetric}
            heroContent={
                <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-8 relative overflow-hidden text-center border border-slate-200 dark:border-white/5 shadow-lg">
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500 to-orange-900 opacity-10 rounded-full blur-[80px] -mr-16 -mt-16`}></div>
                    <div className="relative z-10">
                        <div className="flex h-3 w-48 mx-auto rounded-full overflow-hidden mb-8 bg-slate-200 dark:bg-slate-800 relative">
                            <div className="flex-1 bg-red-500/80"></div>
                            <div className="flex-1 bg-amber-500/80"></div>
                            <div className="flex-1 bg-green-500/80"></div>
                            {hasData && (
                                <div 
                                    className="absolute w-2 h-5 bg-white shadow-lg -top-1 transition-all duration-1000 rounded-full"
                                    style={{ left: `${Math.min(latestVal, 98)}%` }}
                                ></div>
                            )}
                        </div>
                        <h2 className={`text-4xl font-bold ${statusColor} mb-2 tracking-tight`}>{statusText}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Índice HRV: {latestVal}</p>
                    </div>
                </div>
            }
            chartContent={
                <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-slate-800 dark:text-white font-bold mb-6">Variação Diária</h3>
                    <div className="h-64 w-full relative">
                        {hasData ? (
                            <InteractiveBarChart data={chartData} color={info.hex} />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm italic">Dados insuficientes para gráfico</div>
                        )}
                    </div>
                </div>
            }
            statsContent={
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <h4 className="text-slate-400 text-[10px] uppercase font-bold mb-2 tracking-wider">Média Recente</h4>
                        <p className="text-slate-800 dark:text-white font-bold text-2xl">
                            {hasData ? Math.round(measures.reduce((acc, m) => acc + parseInt(m.value), 0) / measures.length) : '--'}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <h4 className="text-slate-400 text-[10px] uppercase font-bold mb-2 tracking-wider">Pico de Estresse</h4>
                        <p className="text-amber-500 font-bold text-2xl">
                            {hasData ? Math.min(...measures.map(m => parseInt(m.value))) : '--'} 
                        </p>
                    </div>
                </div>
            }
            historyContent={
                <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 shadow-sm">
                    <h3 className="text-slate-800 dark:text-white font-bold mb-4 text-lg">Histórico de Leitura</h3>
                    <div className="space-y-4">
                        {hasData ? measures.map((m, i) => (
                            <div key={i} className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
                                <div>
                                    <p className="text-slate-800 dark:text-white font-bold text-md">HRV: {m.value}</p>
                                    <p className="text-xs text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
                                </div>
                                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                                    <BoltIcon className="w-4 h-4 text-amber-500" />
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-500 text-sm text-center py-4">Sem registros.</p>
                        )}
                    </div>
                </div>
            }
        />
    );
};

const Measures: React.FC<MeasuresProps> = ({ onFamilyClick, onSleepClick, initialSelectedMetric, onClearInitialSelectedMetric }) => {
    const [allMeasures, setAllMeasures] = useState<Measure[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
    const [showMeasureModal, setShowMeasureModal] = useState(false);
    const [measuring, setMeasuring] = useState(false);
    const [liveData, setLiveData] = useState({ bpm: 0, spo2: 0, bpSys: 0, bpDia: 0, temp: 0, hrv: 0, battery: 0 });
    const [connectionStatus, setConnectionStatus] = useState<string>('');
    const [dataSource, setDataSource] = useState<'standard' | 'proprietary' | null>(null);
    
    const [showMorningReport, setShowMorningReport] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const loadData = async () => {
        try {
            const data = await api.getMeasures();
            setAllMeasures(data);
            
            const user = await api.getUser();
            setCurrentUser(user);
            const lastReport = localStorage.getItem('last_morning_report');
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            
            let shouldShow = false;
            if (!lastReport) {
                shouldShow = true;
            } else {
                const lastDate = lastReport.split('T')[0];
                const lastTime = new Date(lastReport).getTime();
                const diffHours = (now.getTime() - lastTime) / (1000 * 60 * 60);
                if (lastDate !== today || diffHours > 8) shouldShow = true;
            }
            
            if (shouldShow) {
                setShowMorningReport(true);
                localStorage.setItem('last_morning_report', now.toISOString());
            }

        } catch (error) {
            console.error("Erro ao buscar medidas", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (initialSelectedMetric) {
            if (initialSelectedMetric === 'sleep' && onSleepClick) onSleepClick();
            else setSelectedMetric(initialSelectedMetric);
            if (onClearInitialSelectedMetric) onClearInitialSelectedMetric();
        }
    }, [initialSelectedMetric, onClearInitialSelectedMetric, onSleepClick]);

    const summaryList = useMemo(() => {
        const types = ['heart', 'sleep', 'calories', 'stress', 'steps', 'spo2', 'pressure'];
        return types.map(t => {
            const history = allMeasures.filter(m => m.type === t);
            const latest = history[0];
            return {
                type: t,
                value: latest?.value || (t === 'stress' ? 'Normal' : t === 'calories' || t === 'steps' ? '0' : '--'),
                date: latest?.created_at ? new Date(latest.created_at).toLocaleDateString('pt-BR') : 'Sem dados',
                history: history
            };
        });
    }, [allMeasures]);

    const handleMetricClick = (type: string) => {
        if (type === 'sleep' && onSleepClick) onSleepClick();
        else setSelectedMetric(type);
    };

    const handleStartMeasurement = async () => {
        setShowMeasureModal(true);
        setMeasuring(true);
        setConnectionStatus('Conectando ao anel...');
        setLiveData({ bpm: 0, spo2: 0, bpSys: 0, bpDia: 0, temp: 0, hrv: 0, battery: 0 });
        try {
            if (!ringService.isConnected()) {
                const device = await ringService.scanDevices({ scan_timeout_seconds: 5 });
                await ringService.connectDevice({ device_mac: device.id });
            }
            setConnectionStatus('Iniciando ciclo completo (60s)...');
            await ringService.startRealtimeStream([], (data) => {
                setLiveData(prev => ({
                    ...prev,
                    bpm: data.heartRate || prev.bpm,
                    spo2: data.spo2 || prev.spo2,
                    bpSys: data.bloodPressure?.sys || prev.bpSys,
                    bpDia: data.bloodPressure?.dia || prev.bpDia,
                    temp: data.temperature || prev.temp,
                    hrv: data.hrv || prev.hrv,
                    battery: data.batteryLevel || prev.battery
                }));
                if (data.source) setDataSource(data.source);
            });
        } catch (e: any) {
            setConnectionStatus('Erro ao conectar.');
            setMeasuring(false);
        }
    };

    const handleStopAndSave = async () => {
        setMeasuring(false);
        setConnectionStatus('Salvando...');
        try {
            await ringService.stopRealtimeStream();
            if (liveData.bpm > 0) await api.saveSingleMeasure('heart', `${liveData.bpm} bpm`);
            if (liveData.spo2 > 0) await api.saveSingleMeasure('spo2', `${liveData.spo2}%`);
            if (liveData.bpSys > 0) await api.saveSingleMeasure('pressure', `${liveData.bpSys}/${liveData.bpDia}`);
            if (liveData.temp > 0) await api.saveSingleMeasure('temp', `${liveData.temp}°C`);
            if (liveData.hrv > 0) await api.saveSingleMeasure('stress', `${liveData.hrv}`);
            await loadData();
            setShowMeasureModal(false);
        } catch (e) {
            setConnectionStatus('Erro ao salvar.');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950"><ArrowPathIcon className="w-8 h-8 text-teal-600 animate-spin" /></div>;

    if (selectedMetric === 'heart') return <HeartRateDetailView measures={allMeasures.filter(m => m.type === 'heart')} onBack={() => setSelectedMetric(null)} onAddMeasurement={handleStartMeasurement} onSwitchMetric={handleMetricClick} />;
    if (selectedMetric === 'stress') return <StressDetailView measures={allMeasures.filter(m => m.type === 'stress' || m.type === 'hrv')} onBack={() => setSelectedMetric(null)} onAddMeasurement={handleStartMeasurement} onSwitchMetric={handleMetricClick} />;
    if (selectedMetric) return <GenericDetailView type={selectedMetric} measures={allMeasures.filter(m => m.type === selectedMetric)} onBack={() => setSelectedMetric(null)} onAddMeasurement={handleStartMeasurement} onSwitchMetric={handleMetricClick} />;

    return (
        <div className="p-4 md:p-6 lg:max-w-4xl lg:mx-auto pb-24 min-h-screen text-slate-800 dark:text-slate-100 pt-0">
            {showMorningReport && currentUser && <MorningReportModal user={currentUser} onClose={() => setShowMorningReport(false)} />}
            
            <div className="-mt-4 md:-mt-6 lg:mt-0"> 
                <WeatherHero />
            </div>
            {onFamilyClick && (
                <button 
                    onClick={onFamilyClick} 
                    className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-white/20 dark:bg-black/20 backdrop-blur-md px-4 py-2 rounded-full text-white hover:bg-white/30 dark:hover:bg-black/40 transition-colors border border-white/10 shadow-lg flex items-center gap-2"
                >
                    <UsersIcon className="w-4 h-4" />
                    <span className="text-sm font-bold">Família</span>
                </button>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {summaryList.map((item) => (
                    <SmartMetricCard 
                        key={item.type}
                        type={item.type}
                        latestValue={item.value}
                        date={item.date}
                        history={item.history}
                        onClick={() => handleMetricClick(item.type)}
                    />
                ))}
            </div>
            {showMeasureModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 text-slate-800 dark:text-white shadow-2xl border border-slate-200 dark:border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2"><RingIcon className="w-6 h-6 text-teal-400" /> Leitura Realtime</h2>
                            <div className="flex items-center gap-4">
                                {liveData.battery > 0 && (
                                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-mono bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-full border border-slate-200 dark:border-white/10">
                                        <Battery100Icon className="w-4 h-4 text-green-500" />
                                        <span>{liveData.battery}%</span>
                                    </div>
                                )}
                                <button onClick={() => setShowMeasureModal(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
                            </div>
                        </div>
                        <div className="text-center mb-8">
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2 animate-pulse font-mono tracking-widest uppercase">{connectionStatus}</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center h-24">
                                     <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Oxigenação</p>
                                     <p className="text-2xl font-mono font-bold text-sky-500 dark:text-sky-400">{liveData.spo2 > 0 ? `${liveData.spo2}%` : '--'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center h-24">
                                     <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Pressão</p>
                                     <p className="text-2xl font-mono font-bold text-rose-500 dark:text-rose-400">{liveData.bpSys > 0 ? `${liveData.bpSys}/${liveData.bpDia}` : '--'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center h-24">
                                     <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">HRV (Estresse)</p>
                                     <p className="text-2xl font-mono font-bold text-amber-500 dark:text-amber-400">{liveData.hrv > 0 ? `${liveData.hrv} ms` : '--'}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center h-24">
                                     <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Temperatura</p>
                                     <p className="text-2xl font-mono font-bold text-orange-500 dark:text-orange-400">{liveData.temp > 0 ? `${liveData.temp}°C` : '--'}</p>
                                </div>
                                <div className="col-span-2 bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between relative overflow-hidden">
                                    <div className="flex items-center gap-4 z-10">
                                        <div className="bg-red-500/20 p-3 rounded-full border border-red-500/30"><HeartIcon className="w-8 h-8 text-red-500 animate-pulse" /></div>
                                        <div className="text-left"><p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Batimentos</p><p className="text-4xl font-mono font-bold text-slate-800 dark:text-white">{liveData.bpm > 0 ? `${liveData.bpm}` : '--'}</p></div>
                                    </div>
                                    <span className="text-slate-400 dark:text-slate-500 font-mono text-sm z-10">BPM</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleStopAndSave} disabled={!measuring} className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-teal-500 transition-all flex items-center justify-center gap-2 border border-white/10"><CheckCircleIcon className="w-6 h-6" /> Capturar & Salvar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Measures;
