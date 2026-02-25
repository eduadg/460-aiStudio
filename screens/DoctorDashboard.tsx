
import React, { useEffect, useState } from 'react';
import type { DoctorMetric, UrgentCase, DoctorAvailabilityBlock, Appointment } from '../types';
import { api } from '../services/api';
import { ExclamationTriangleIcon, UsersIcon, SparklesIcon, ArrowTrendingUpIcon, RingIcon, HeartIcon, ArrowPathIcon, UserCircleIcon, CalendarDaysIcon, XMarkIcon, PlusIcon, ClockIcon, TrashIcon, PhoneIcon, CheckCircleIcon, BoltIcon, ChevronRightIcon } from '../components/icons';
import DoctorVisualMap from './DoctorVisualMap';
import DoctorProfile from './DoctorProfile';
import DoctorLiveMonitor from './DoctorLiveMonitor'; // Importa nova tela
import { supabase } from '../services/supabaseClient';
import { useRealtimeVitals } from '../hooks/useRealtimeVitals';
import { useTranslation } from '../services/i18n';

// --- ICONS ---
const getIcon = (name: string) => {
    const props = { className: "h-6 w-6 text-white" };
    switch(name) {
        case 'exclamation': return <ExclamationTriangleIcon {...props} />;
        case 'users': return <UsersIcon {...props} />;
        case 'sparkles': return <SparklesIcon {...props} />;
        case 'trending': return <ArrowTrendingUpIcon {...props} />;
        default: return <UsersIcon {...props} />;
    }
};

// --- SUB COMPONENTS ---
const MetricCard: React.FC<{ metric: DoctorMetric }> = ({ metric }) => (
    <div className={`relative overflow-hidden bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-[1.5rem] p-5 shadow-lg group hover:border-slate-700 transition-all`}>
        {/* Background Gradient Blob */}
        <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${metric.color} opacity-20 blur-[30px] rounded-full group-hover:opacity-30 transition-opacity`}></div>
        
        <div className="relative z-10 flex justify-between items-start mb-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${metric.color} shadow-lg shadow-black/20`}>
                {getIcon(metric.iconName)}
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700`}>
                {metric.change}
            </span>
        </div>
        
        <div className="relative z-10">
            <p className="text-3xl font-bold text-white tracking-tight">{metric.value}</p>
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">{metric.label}</h3>
        </div>
    </div>
);

// ... (EmergencyAlertBanner mantido igual) ...
const EmergencyAlertBanner: React.FC<{ cases: UrgentCase[], onSelect: (id: string) => void }> = ({ cases, onSelect }) => {
    const { t } = useTranslation();
    if (cases.length === 0) return null;

    return (
        <div className="mb-6 animate-fade-in-down">
            <div className="bg-red-500/10 border border-red-500/50 rounded-[1.5rem] p-1 overflow-hidden relative shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
                <div className="bg-slate-950/80 backdrop-blur-md rounded-[1.3rem] p-4 relative z-10">
                    <div className="flex items-center gap-3 mb-4 border-b border-red-500/20 pb-3">
                        <div className="bg-red-500 p-2 rounded-full animate-pulse">
                            <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-red-400 font-bold text-lg uppercase tracking-wider">{t('doctor.dash.emergency_alerts')}</h3>
                            <p className="text-slate-400 text-xs">{cases.length} paciente(s).</p>
                        </div>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {cases.map(c => (
                            <button 
                                key={c.id}
                                onClick={() => onSelect(c.id)}
                                className="flex items-center gap-4 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 rounded-xl p-3 transition-colors text-left group"
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border-2 border-red-500 shadow-lg">
                                        {c.avatarUrl ? <img src={c.avatarUrl} className="w-full h-full object-cover"/> : <UserCircleIcon className="w-full h-full p-2 text-slate-500"/>}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 border border-slate-900">
                                        <PhoneIcon className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-white font-bold group-hover:underline">{c.name}</p>
                                    <p className="text-red-300 text-xs font-medium uppercase">{c.condition || 'SOS'}</p>
                                    <p className="text-slate-500 text-[10px] mt-0.5">{new Date(c.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... (UrgentCaseCard mantido igual) ...
const UrgentCaseCard: React.FC<{ caseData: UrgentCase, onClick: () => void }> = ({ caseData, onClick }) => {
    const isOnline = caseData.status === 'online';

    return (
     <div 
        onClick={onClick}
        className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800 hover:border-slate-600 transition-all cursor-pointer group relative overflow-hidden shadow-sm hover:shadow-md"
     >
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>

        <div className="flex items-center justify-between pl-3">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-lg">
                        {caseData.avatarUrl ? (
                            <img src={caseData.avatarUrl} alt={caseData.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">{caseData.name.charAt(0)}</div>
                        )}
                    </div>
                    {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></div>}
                </div>
                <div>
                    <p className="font-bold text-white text-base group-hover:text-teal-400 transition-colors">{caseData.name}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{caseData.condition}</p>
                </div>
            </div>
            
            <div className="text-right">
                 <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {caseData.risk}
                 </span>
            </div>
        </div>
    </div>
    );
};

// ... (PatientLiveDataRow mantido mas ligeiramente ajustado) ...
const PatientLiveDataRow: React.FC<{ data: {name: string, lastHeartRate: string, lastSync: string}, isRealtimeActive?: boolean }> = ({ data, isRealtimeActive }) => (
    <div className={`border rounded-[1.2rem] p-5 flex items-center justify-between transition-all relative overflow-hidden ${isRealtimeActive ? 'bg-slate-900 border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.1)]' : 'bg-slate-900/40 border-slate-800'}`}>
        
        {isRealtimeActive && <div className="absolute inset-0 bg-teal-500/5 animate-pulse"></div>}

        <div className="flex items-center gap-4 relative z-10">
            <div className={`p-3 rounded-full transition-colors duration-300 ${isRealtimeActive ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-slate-800 text-slate-500'}`}>
                <RingIcon className="h-6 w-6" />
            </div>
            <div>
                <p className="text-white font-bold text-sm">{data.name}</p>
                <p className={`text-[10px] font-mono mt-1 ${isRealtimeActive ? 'text-teal-400 font-bold' : 'text-slate-500'}`}>
                    {isRealtimeActive ? 'TRANSMITINDO...' : `Sync: ${data.lastSync}`}
                </p>
            </div>
        </div>
        <div className="text-right relative z-10">
            <div className="flex items-center gap-2 justify-end text-white font-bold text-2xl tracking-tighter">
                {data.lastHeartRate.replace(' bpm', '')}
                <span className="text-sm font-normal text-slate-500">bpm</span>
                <HeartIcon className={`w-4 h-4 text-red-500 ${isRealtimeActive ? 'animate-pulse' : 'opacity-50'}`} />
            </div>
        </div>
    </div>
);

// ... (DailyAgendaCard mantido) ...
const DailyAgendaCard: React.FC<{ appointments: Appointment[] }> = ({ appointments }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-slate-900/40 rounded-3xl p-5 border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full min-h-[250px]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <CalendarDaysIcon className="w-5 h-5 text-purple-400" />
                    {t('doctor.dash.agenda')}
                </h3>
                <span className="text-[10px] font-bold bg-purple-900/30 text-purple-300 px-2 py-1 rounded-full border border-purple-500/20">
                    {appointments.length}
                </span>
            </div>

            {appointments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                    <ClockIcon className="w-10 h-10 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400">{t('doctor.dash.no_appointments')}</p>
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                    {appointments.map(appt => (
                        <div key={appt.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex items-center gap-3 hover:bg-slate-800 transition-colors">
                            <div className="bg-purple-500/10 text-purple-400 font-mono text-xs font-bold px-2 py-1 rounded border border-purple-500/20">
                                {appt.time}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-bold truncate">{appt.patientName || 'Paciente'}</p>
                                <p className="text-xs text-slate-400 truncate capitalize">
                                    {appt.type === 'consultation' ? 'Consulta' : appt.type === 'exam_review' ? 'Exames' : 'Retorno'}
                                </p>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${appt.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ... (AvailabilityModal mantido) ...
const AvailabilityModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t } = useTranslation();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [blocks, setBlocks] = useState<DoctorAvailabilityBlock[]>([]);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    
    // Form State
    const [startTime, setStartTime] = useState('12:00');
    const [endTime, setEndTime] = useState('13:00');
    const [reason, setReason] = useState('Almoço');

    useEffect(() => {
        const init = async () => {
            const user = await api.getUser();
            setUserId(user.id || null);
            loadBlocks(user.id!);
        };
        init();
    }, [date]);

    const loadBlocks = async (uid: string) => {
        setLoading(true);
        try {
            const data = await api.getDoctorAvailabilityBlocks(uid, date);
            setBlocks(data);
        } catch(e) { console.error(e); } finally { setLoading(false); }
    };

    const handleAddBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        try {
            await api.createDoctorAvailabilityBlock(userId, { date, startTime, endTime, reason });
            loadBlocks(userId);
        } catch(e) { alert("Erro ao criar bloqueio."); }
    };

    const handleDeleteBlock = async (id: string) => {
        if (!userId) return;
        try {
            await api.deleteDoctorAvailabilityBlock(id);
            loadBlocks(userId);
        } catch(e) { alert("Erro ao deletar."); }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <CalendarDaysIcon className="w-5 h-5 text-blue-400" />
                        Gerenciar Agenda
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Date Picker */}
                    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex justify-between items-center">
                        <label className="text-slate-400 text-sm font-bold uppercase tracking-wider">Data</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                        />
                    </div>

                    {/* Add Form */}
                    <form onSubmit={handleAddBlock} className="space-y-4">
                        <h4 className="text-xs text-slate-500 uppercase font-bold tracking-wider ml-1">Novo Bloqueio</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block font-medium">Início</label>
                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block font-medium">Fim</label>
                                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-2 block font-medium">Motivo</label>
                            <div className="flex gap-2">
                                <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 focus:outline-none" placeholder="Ex: Almoço" />
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/20">
                                    <PlusIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* List */}
                    <div className="space-y-3 pt-2">
                        <h4 className="text-xs text-slate-500 uppercase font-bold tracking-wider ml-1">Bloqueios Existentes</h4>
                        {loading ? (
                            <div className="text-center py-4 text-slate-500"><ArrowPathIcon className="w-5 h-5 animate-spin mx-auto"/></div>
                        ) : blocks.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-800/30">
                                <p className="text-slate-500 text-xs">Agenda livre nesta data.</p>
                            </div>
                        ) : (
                            blocks.map(block => (
                                <div key={block.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex justify-between items-center group hover:border-slate-600 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20">
                                            <ClockIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm font-mono">{block.startTime} - {block.endTime}</p>
                                            <p className="text-slate-400 text-xs">{block.reason}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteBlock(block.id)} className="p-2 bg-slate-900 hover:bg-red-900/30 rounded-full text-slate-500 hover:text-red-400 transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
interface DoctorDashboardProps {
    onSelectPatient?: (patientId: string) => void;
    onLogout: () => void;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onSelectPatient, onLogout }) => {
    const { t } = useTranslation();
    // Data State
    const [metrics, setMetrics] = useState<DoctorMetric[]>([]);
    const [urgentCases, setUrgentCases] = useState<UrgentCase[]>([]);
    const [patientLive, setPatientLive] = useState<{id: string, name: string, lastHeartRate: string, lastSync: string} | null>(null);
    const [loading, setLoading] = useState(true);
    const [doctorName, setDoctorName] = useState<string>('');
    const [doctorAvatar, setDoctorAvatar] = useState<string | undefined>(undefined);
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
    
    // UI State
    const [systemStatus, setSystemStatus] = useState<'online' | 'paused'>('online');
    const [isToggling, setIsToggling] = useState(false);
    const [currentView, setCurrentView] = useState<'dashboard' | 'visualMap' | 'profile' | 'liveMonitor'>('dashboard');
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    // USE CUSTOM HOOK FOR REALTIME
    // Assuming patientLive holds the ID of the patient currently in the "Live Feed" slot
    const { data: realtimeData, isLive: isRealtimeActive } = useRealtimeVitals(patientLive?.id);

    // Sync realtime data for the live feed
    useEffect(() => {
        if (realtimeData) {
            setPatientLive(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    lastHeartRate: realtimeData.heartRate ? `${realtimeData.heartRate} bpm` : prev.lastHeartRate,
                    lastSync: 'Ao Vivo'
                };
            });
        }
    }, [realtimeData]);

    const loadDashboard = async () => {
        try {
            const user = await api.getSession();
            setDoctorName(user?.name || 'Médico');
            setDoctorAvatar(user?.avatarUrl);

            const [metricsData, casesData, liveData, allAppointments] = await Promise.all([
                api.getDoctorMetrics(),
                api.getUrgentCases(),
                api.getPatientLiveData(),
                user.id ? api.getDoctorAppointments(user.id) : Promise.resolve([])
            ]);
            setMetrics(metricsData);
            setUrgentCases(casesData);
            setPatientLive(liveData);
            
            // Filter Appointments for Today
            const today = new Date().toISOString().split('T')[0];
            const todays = allAppointments.filter(app => app.date === today && app.status !== 'cancelled').sort((a,b) => a.time.localeCompare(b.time));
            setTodayAppointments(todays);
            
            if (casesData.length > 0) {
                setSystemStatus(casesData[0].status === 'online' ? 'online' : 'paused');
            }
        } catch (e) {
            console.error("Erro ao carregar dashboard", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();

        // Subscribe to profile changes to detect SOS alerts in real-time
        const profilesSubscription = supabase.channel('dashboard-profiles')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => {
                    // Refresh dashboard when any profile updates (e.g., status changes to SOS)
                    console.log('Profile update detected, refreshing dashboard...', payload);
                    loadDashboard();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(profilesSubscription);
        };
    }, []);

    const handleGlobalToggle = async () => {
        setIsToggling(true);
        await new Promise(r => setTimeout(r, 600));
        setSystemStatus(prev => prev === 'online' ? 'paused' : 'online');
        setIsToggling(false);
    };

    const isSystemOnline = systemStatus === 'online';

    // Separar casos realmente críticos para o banner de alerta
    const criticalCases = urgentCases.filter(c => c.risk === 'Crítico' || c.condition.includes('SOS') || c.condition.includes('Emergência'));
    const normalMonitoringCases = urgentCases.filter(c => !criticalCases.includes(c));

    if (loading) {
        return (
             <div className="bg-slate-950 min-h-screen flex items-center justify-center">
                <ArrowPathIcon className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
        )
    }
    
    // Renderiza o Perfil se for a view atual
    if (currentView === 'profile') {
        return (
            <div className="bg-slate-950 min-h-screen relative pb-20">
                <DoctorProfile onBack={() => setCurrentView('dashboard')} onLogout={onLogout} />
                {renderBottomNav()}
            </div>
        );
    }
    
    // Se for VisualMap, renderiza sem padding
    if (currentView === 'visualMap') {
        return (
            <div className="bg-slate-950 min-h-screen relative">
                <DoctorVisualMap onSelectPatient={(id) => onSelectPatient && onSelectPatient(id)} />
                {renderBottomNav()}
            </div>
        );
    }

    // Se for LiveMonitor (Monitoramento em tempo real)
    if (currentView === 'liveMonitor') {
        return (
            <div className="bg-slate-950 min-h-screen relative pb-20">
                <DoctorLiveMonitor onBack={() => setCurrentView('dashboard')} onSelectPatient={(id) => onSelectPatient && onSelectPatient(id)} />
                {renderBottomNav()}
            </div>
        );
    }

    return (
        <div className="bg-slate-950 min-h-screen text-white relative pb-28">
            {showScheduleModal && <AvailabilityModal onClose={() => setShowScheduleModal(false)} />}
            
            {/* Header / Top Bar */}
            <div className="px-6 pt-6 pb-2">
                <header className="flex justify-between items-center bg-slate-900/80 p-4 rounded-[2rem] border border-slate-800 backdrop-blur-md shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800">
                            {doctorAvatar ? (
                                <img src={doctorAvatar} alt="Dr" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <UserCircleIcon className="w-8 h-8 text-slate-500" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-tight text-white">Dr. {doctorName.split(' ')[0]}</h1>
                            <p className="text-teal-400 text-[10px] font-bold uppercase tracking-widest">{t('doctor.dash.title')}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowScheduleModal(true)}
                            className="p-3 rounded-full bg-slate-800 text-blue-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 shadow-md"
                            title="Gerenciar Agenda"
                        >
                            <CalendarDaysIcon className="w-5 h-5" />
                        </button>

                        <button 
                            onClick={handleGlobalToggle}
                            disabled={isToggling}
                            className={`h-11 px-4 rounded-full border transition-all duration-300 flex items-center gap-2 font-bold shadow-lg transform active:scale-95 ${
                                isSystemOnline 
                                ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/50' 
                                : 'bg-amber-900/30 text-amber-400 border-amber-500/30 hover:bg-amber-900/50'
                            }`}
                        >
                            {isToggling ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            ) : (
                                <span className={`w-2 h-2 rounded-full ${isSystemOnline ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`}></span>
                            )}
                            <span className="text-xs tracking-wider hidden sm:inline">{isSystemOnline ? t('doctor.dash.online') : t('doctor.dash.paused')}</span>
                        </button>
                    </div>
                </header>
            </div>
            
            <main className="p-6 pt-4 space-y-8 max-w-7xl mx-auto">
                
                {/* 1. EMERGENCY ALERT BANNER */}
                <EmergencyAlertBanner cases={criticalCases} onSelect={(id) => onSelectPatient && onSelectPatient(id)} />

                {/* 2. Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
                    {metrics.map(metric => <MetricCard key={metric.id} metric={metric} />)}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Column: Patient Monitoring */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <UsersIcon className="w-5 h-5 text-blue-400" />
                                {t('doctor.dash.active_monitoring')}
                            </h2>
                            <span className="text-xs font-bold bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full border border-blue-500/20">{normalMonitoringCases.length} Pacientes</span>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            {normalMonitoringCases.length === 0 ? (
                                <div className="p-10 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                                    <p className="text-slate-500 text-sm">{t('doctor.dash.no_patients')}</p>
                                </div>
                            ) : (
                                normalMonitoringCases.map(c => (
                                    <UrgentCaseCard 
                                        key={c.id} 
                                        caseData={{...c, status: systemStatus}} 
                                        onClick={() => onSelectPatient && onSelectPatient(c.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Side Column: Agenda & Live Feed */}
                    <div className="space-y-6">
                        {/* Daily Agenda */}
                        <div className="h-72">
                            <DailyAgendaCard appointments={todayAppointments} />
                        </div>

                        {/* Live Feed Widget (Updated to act as Navigation) */}
                        <div>
                            <div className="flex justify-between items-center px-2 mb-3">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <RingIcon className="w-5 h-5 text-teal-400" />
                                    {t('doctor.dash.live_feed')}
                                </h2>
                                <button 
                                    onClick={() => setCurrentView('liveMonitor')}
                                    className="text-xs font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                                >
                                    Ver Todos <ChevronRightIcon className="w-3 h-3" />
                                </button>
                            </div>
                            
                            <div 
                                onClick={() => setCurrentView('liveMonitor')}
                                className={`transition-all duration-500 cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${isSystemOnline ? 'opacity-100' : 'opacity-50 grayscale pointer-events-none'}`}
                            >
                                <div className="bg-slate-900/40 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4 hover:border-teal-500/30 transition-colors">
                                    {patientLive ? (
                                        <>
                                            <PatientLiveDataRow data={patientLive} isRealtimeActive={isRealtimeActive} />
                                            
                                            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('doctor.dash.ai_summary')}</h3>
                                                <div className="bg-teal-900/20 px-2 py-1 rounded text-[10px] text-teal-400 font-bold uppercase border border-teal-500/20 group-hover:bg-teal-900/40 transition-colors">
                                                    Monitorar
                                                </div>
                                            </div>
                                            <div className="bg-slate-950 p-4 rounded-xl text-xs text-slate-300 border border-slate-800 leading-relaxed italic relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                                                "Sinais vitais estáveis. Acesso ao prontuário recomendado para análise detalhada do sono."
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-8 text-center">
                                            <RingIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                            <p className="text-slate-500 text-xs">Aguardando sinal dos dispositivos...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {!isSystemOnline && (
                                <div className="mt-4 p-4 bg-amber-900/10 border border-amber-500/20 rounded-2xl text-center shadow-lg">
                                    <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Sistema em Pausa</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {renderBottomNav()}
        </div>
    );
    
    function renderBottomNav() {
        return (
            <nav className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-full px-8 py-4 flex items-center gap-10 shadow-2xl z-50">
                <button 
                    onClick={() => setCurrentView('dashboard')}
                    className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${currentView === 'dashboard' ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <UsersIcon className="w-6 h-6" />
                </button>

                {/* ANIMATED CENTER BUTTON */}
                <button 
                    onClick={() => setCurrentView(prev => prev === 'dashboard' ? 'visualMap' : 'dashboard')}
                    className="relative -top-8 bg-gradient-to-br from-indigo-600 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-indigo-900/50 border-[6px] border-slate-950 group transition-transform active:scale-95 hover:scale-105"
                >
                    <SparklesIcon className={`w-8 h-8 text-white transition-transform duration-500 ${currentView === 'visualMap' ? 'rotate-180 scale-110' : ''}`} />
                </button>
                
                <button 
                    onClick={() => setCurrentView('profile')}
                    className={`flex flex-col items-center gap-1 transition-all hover:scale-110 ${currentView === 'profile' ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <UserCircleIcon className="w-6 h-6" />
                </button>
            </nav>
        );
    }
};

export default DoctorDashboard;
