
import React, { useState, useEffect, useMemo } from 'react';
import { PhoneIcon, ExclamationTriangleIcon, HeartIcon, FireIcon, MoonIcon, SunIcon, PaperAirplaneIcon, ArrowPathIcon, RingIcon, UserCircleIcon, CameraIcon, PlusIcon, CakeIcon, CheckCircleIcon, XMarkIcon, ShareIcon, ClipboardDocumentCheckIcon, ShieldCheckIcon, MicrophoneIcon, ChevronRightIcon, StarIcon, CalendarDaysIcon, BellAlertIcon, ChartBarIcon, BoltIcon, DocumentTextIcon } from '../components/icons';
import { api } from '../services/api';
import { PatientSummary, User } from '../types';
import { useUser } from '../contexts/UserContext';
import { useRealtimeVitals } from '../hooks/useRealtimeVitals';
import { useTranslation } from '../services/i18n';

interface PatientHomeProps {
    onNavigateToChat: (message?: string) => void;
    onHeartRateUpdate: (bpm: number) => void;
    onRegisterMeal: () => void;
    onViewNutrition?: () => void;
    onViewPrescriptions?: () => void;
    onCallDrX?: () => void;
    onViewAppointments?: () => void;
    onViewReminders?: () => void;
    onViewGeneralMeasures: () => void;
    onViewMetricDetail: (type: string) => void;
    onViewSleepDetail: () => void;
    lastMealTime: string | null;
    onOpenDoctorPresentation: (doctorId: string) => void;
    onMarkRemindersAsViewed: () => void;
    onViewMedicalRecords: () => void; // New Prop
}

interface Alert {
    id: string;
    message: string;
    type: 'warning' | 'success' | 'info';
}

const getTimeAgo = (isoDate: string | null) => {
    if (!isoDate) return 'Nenhum registro';
    const diff = Date.now() - new Date(isoDate).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d`;
    if (hours > 0) return `${hours}h`;
    if (mins > 0) return `${mins}m`;
    return 'Agora';
};

const PatientHeader: React.FC<{ 
    user: User | null;
    onViewReminders?: () => void;
    hasUnseenReminders: boolean;
    onMarkRemindersAsViewed: () => void;
}> = ({ user, onViewReminders, hasUnseenReminders, onMarkRemindersAsViewed }) => {
    const { t, language } = useTranslation();
    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
    const rawName = user?.name || '';
    const firstName = rawName.trim().split(' ')[0] || 'Paciente';

    const handleRemindersClick = () => {
        onMarkRemindersAsViewed();
        if (onViewReminders) onViewReminders();
    };

    return (
        <div className="flex justify-between items-start mb-6 pt-2">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white capitalize tracking-tight">{t('home.hello')}, {firstName}! 👋</h1>
                <p className="text-slate-500 dark:text-slate-400 capitalize text-sm font-medium mt-1">{formattedDate}</p>
            </div>
            {onViewReminders && (
                <button 
                    onClick={handleRemindersClick}
                    className="relative p-3 rounded-full bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    title="Meus Lembretes"
                >
                    <BellAlertIcon className={`w-7 h-7 ${hasUnseenReminders ? 'animate-pulse' : ''}`} />
                    {hasUnseenReminders && (
                        <span className="absolute top-2 right-2 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
                    )}
                </button>
            )}
        </div>
    );
};

const MetricCard: React.FC<{ label: string, value: string, unit: string, icon: React.ReactNode, bg: string, onClick: (e: React.MouseEvent) => void }> = ({ label, value, unit, icon, bg, onClick }) => (
    <div onClick={onClick} className={`p-4 rounded-2xl ${bg} flex flex-col justify-between h-28 border border-white/10 transition-transform hover:scale-[1.02] cursor-pointer`}>
        <div className="flex justify-between items-start">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">{label}</span>
            {icon}
        </div>
        <div>
            <span className="text-2xl font-bold text-slate-800 dark:text-white">{value}</span>
            <span className="text-xs text-slate-500 ml-1">{unit}</span>
        </div>
    </div>
);

const DailyStoryModal: React.FC<{ 
    user: User | null, 
    data: PatientSummary | null, 
    onClose: () => void 
}> = ({ user, data, onClose }) => {
    const { t } = useTranslation();
    if (!data || !user) return null;
    return (
        <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-sm aspect-[9/16] bg-gradient-to-br from-teal-800 to-slate-900 rounded-3xl relative overflow-hidden flex flex-col shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/20 rounded-full blur-[60px]"></div>
                <div className="relative z-10 p-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-slate-800">
                        {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <UserCircleIcon className="w-full h-full text-slate-400" />}
                    </div>
                    <div><p className="text-white font-bold text-sm">{user.name}</p><p className="text-teal-300 text-[10px] uppercase tracking-wider font-bold">Check-in</p></div>
                    <div className="ml-auto bg-white/10 px-2 py-1 rounded text-[10px] text-white font-mono">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</div>
                </div>
                <div className="relative z-10 flex-1 flex flex-col justify-center px-8 gap-6">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                        <div className="bg-red-500/20 p-3 rounded-full"><HeartIcon className="w-8 h-8 text-red-400" /></div>
                        <div><p className="text-white text-3xl font-bold">{data.heartRate}</p><p className="text-slate-300 text-xs uppercase">{t('metric.heart')}</p></div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
                        <div className="bg-orange-500/20 p-3 rounded-full"><FireIcon className="w-8 h-8 text-orange-400" /></div>
                        <div><p className="text-white text-3xl font-bold">{data.steps}</p><p className="text-slate-300 text-xs uppercase">{t('metric.steps')}</p></div>
                    </div>
                </div>
                <div className="relative z-10 p-6"><button className="w-full bg-white text-teal-900 font-bold py-3 rounded-xl shadow-lg" onClick={onClose}>{t('common.close')}</button></div>
            </div>
        </div>
    );
};

const UnifiedSummaryGrid: React.FC<{
    data: PatientSummary | null;
    alerts: Alert[];
    onStoryClick: () => void;
    onViewGeneralMeasures: () => void;
    onViewMetricDetail: (type: string) => void;
    onViewSleepDetail: () => void;
    isLive: boolean; 
}> = ({ data, alerts, onStoryClick, onViewGeneralMeasures, onViewMetricDetail, onViewSleepDetail, isLive }) => {
    const { t } = useTranslation();
    const hasAlerts = alerts.length > 0;
    const [expanded, setExpanded] = useState(false);
    return (
        <div onClick={onViewGeneralMeasures} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl border border-white/40 dark:border-slate-800 transition-all duration-300 relative overflow-hidden cursor-pointer">
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none ${hasAlerts ? 'bg-amber-500' : 'bg-teal-500'}`}></div>
            <div className="relative z-10 flex justify-between items-start mb-6">
                <div className="flex items-center gap-4" onClick={(e) => { e.stopPropagation(); hasAlerts && setExpanded(!expanded); }}>
                    <div className={`p-3 rounded-2xl shadow-sm transition-colors ${hasAlerts ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
                        {hasAlerts ? <ExclamationTriangleIcon className="w-8 h-8" /> : <ShieldCheckIcon className="w-8 h-8" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {t('home.summary_title')}
                            {isLive && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">{t('home.live')}</span>}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5"><span className={`text-sm font-bold ${hasAlerts ? 'text-amber-600' : 'text-emerald-600'}`}>{hasAlerts ? t('home.attention_needed') : t('home.signals_normal')}</span>{hasAlerts && (<ChevronRightIcon className={`w-4 h-4 text-amber-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />)}</div>
                    </div>
                </div>
                <div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); onStoryClick(); }} className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-pink-500 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 transition-colors" title="Ver Story"><CameraIcon className="w-6 h-6" /></button></div>
            </div>
            {hasAlerts && expanded && (
                <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl p-4 animate-fade-in-down">
                    <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase mb-2">{t('home.alert_detail')}</h3>
                    <ul className="space-y-2">{alerts.map(alert => (<li key={alert.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>{alert.message}</li>))}</ul>
                </div>
            )}
            <div className="grid grid-cols-2 gap-3 relative z-10">
                <MetricCard label={t('metric.heart')} value={data?.heartRate || '--'} unit="" icon={<HeartIcon className={`w-5 h-5 text-red-500 ${isLive ? 'animate-pulse' : ''}`} />} bg="bg-red-50 dark:bg-red-900/20" onClick={(e) => { e.stopPropagation(); onViewMetricDetail('heart'); }} />
                <MetricCard label={t('metric.spo2')} value={data?.spo2 || '--'} unit="" icon={<RingIcon className="w-5 h-5 text-sky-500" />} bg="bg-sky-50 dark:bg-sky-900/20" onClick={(e) => { e.stopPropagation(); onViewMetricDetail('spo2'); }} />
                <MetricCard label={t('metric.stress')} value={data?.stress || '--'} unit="" icon={<BoltIcon className="w-5 h-5 text-amber-500" />} bg="bg-amber-50 dark:bg-amber-900/20" onClick={(e) => { e.stopPropagation(); onViewMetricDetail('stress'); }} />
                <MetricCard label={t('metric.pressure')} value={data?.bloodPressure || '--'} unit="" icon={<HeartIcon className="w-5 h-5 text-pink-500" />} bg="bg-pink-50 dark:bg-pink-900/20" onClick={(e) => { e.stopPropagation(); onViewMetricDetail('pressure'); }} />
                <MetricCard label={t('metric.steps')} value={data?.steps || '0'} unit="" icon={<FireIcon className="w-5 h-5 text-orange-500" />} bg="bg-orange-50 dark:bg-orange-900/20" onClick={(e) => { e.stopPropagation(); onViewMetricDetail('steps'); }} />
                <MetricCard label={t('metric.sleep')} value={data?.sleep || '--'} unit="" icon={<MoonIcon className="w-5 h-5 text-indigo-500" />} bg="bg-indigo-50 dark:bg-indigo-900/20" onClick={(e) => { e.stopPropagation(); onViewSleepDetail(); }} />
            </div>
        </div>
    );
};

const PatientHome: React.FC<PatientHomeProps> = ({ 
    onNavigateToChat, onHeartRateUpdate, onRegisterMeal,
    onViewNutrition, onViewPrescriptions, onCallDrX, lastMealTime,
    onOpenDoctorPresentation, onViewAppointments, onViewReminders,
    onViewGeneralMeasures, onViewMetricDetail, onViewSleepDetail, onMarkRemindersAsViewed,
    onViewMedicalRecords
}) => {
    const { user } = useUser();
    const { t } = useTranslation();
    const [summary, setSummary] = useState<PatientSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showStory, setShowStory] = useState(false);
    const [doctorInfo, setDoctorInfo] = useState<User | null>(null);
    const [hasUnseenReminders, setHasUnseenReminders] = useState(false);
    
    const { data: realtimeData, isLive } = useRealtimeVitals(user?.id);

    useEffect(() => {
        if (realtimeData) {
            setSummary(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    heartRate: realtimeData.heartRate ? `${realtimeData.heartRate} bpm` : prev.heartRate,
                    spo2: realtimeData.spo2 ? `${realtimeData.spo2}%` : prev.spo2,
                    steps: realtimeData.steps ? realtimeData.steps.toString() : prev.steps,
                    stress: realtimeData.hrv ? realtimeData.hrv.toString() : prev.stress
                };
            });
            if (realtimeData.heartRate) onHeartRateUpdate(realtimeData.heartRate);
        }
    }, [realtimeData, onHeartRateUpdate]);

    const alerts: Alert[] = useMemo(() => {
        if (!summary) return [];
        const list: Alert[] = [];
        const bpm = parseInt(summary.heartRate.replace(/\D/g, '')) || 0;
        if (bpm > 100) list.push({ id: '1', message: 'Frequência cardíaca acima do normal em repouso.', type: 'warning' });
        if (bpm < 50 && bpm > 0) list.push({ id: '2', message: 'Bradicardia detectada. Acompanhe.', type: 'info' });
        return list;
    }, [summary]);

    useEffect(() => {
        const load = async () => {
            try {
                if (user?.id) {
                    const data = await api.getPatientSummary(user.id);
                    setSummary(data);
                    const bpm = parseInt(data.heartRate.replace(/\D/g, '')) || 0;
                    if (bpm > 0) onHeartRateUpdate(bpm);
                    if (user.doctorId) {
                        const doctor = await api.getMyDoctor();
                        setDoctorInfo(doctor);
                    }
                    const unseen = await api.checkUnseenReminders(user.id, user.lastRemindersViewedAt);
                    setHasUnseenReminders(unseen);
                }
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, [user, onHeartRateUpdate]);

    const handleSOS = async () => {
        try { await api.triggerEmergencyAlert(); } catch (e) { console.error("Falha ao registrar alerta de emergência:", e); }
        if (onCallDrX) onCallDrX();
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 text-teal-600 animate-spin" /></div>;

    const isDoctorAssigned = !!(user?.doctorId && doctorInfo);

    return (
        <div className="p-4 md:p-6 lg:max-w-4xl lg:mx-auto pb-24 min-h-screen relative">
            {showStory && <DailyStoryModal user={user} data={summary} onClose={() => setShowStory(false)} />}
            <PatientHeader user={user} onViewReminders={onViewReminders} hasUnseenReminders={hasUnseenReminders} onMarkRemindersAsViewed={onMarkRemindersAsViewed} />

            <div className="bg-red-600 rounded-3xl p-1 shadow-lg shadow-red-200 dark:shadow-none mb-6 transform transition-transform hover:scale-[1.01] cursor-pointer" onClick={handleSOS}>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-[1.3rem] p-5 border border-white/10 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-full animate-pulse"><PhoneIcon className="w-8 h-8 text-white" /></div>
                            <div><h2 className="text-white font-bold text-lg leading-tight">{t('home.sos_title')}</h2><p className="text-red-100 text-xs mt-1 font-medium">{t('home.sos_subtitle')}</p></div>
                        </div>
                        <ChevronRightIcon className="w-6 h-6 text-white/50" />
                    </div>
                </div>
            </div>

            <div className="mb-6"><UnifiedSummaryGrid data={summary} alerts={alerts} onStoryClick={() => setShowStory(true)} onViewGeneralMeasures={onViewGeneralMeasures} onViewMetricDetail={onViewMetricDetail} onViewSleepDetail={onViewSleepDetail} isLive={isLive} /></div>

            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1 mb-2">{t('home.main_functions')}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                
                {/* NEW MEDICAL RECORDS BUTTON */}
                <button 
                    onClick={onViewMedicalRecords}
                    className="w-full p-4 rounded-2xl flex flex-col items-start shadow-sm transition-all bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800 group"
                >
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full text-purple-600 dark:text-purple-400 mb-2">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white block text-left group-hover:text-purple-600 dark:group-hover:text-purple-400">Prontuário</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block text-left">Exames & Histórico</span>
                </button>

                {user?.doctorId && doctorInfo && (
                    <button 
                        onClick={() => onOpenDoctorPresentation(user.doctorId!)}
                        className={`w-full p-4 rounded-2xl flex flex-col items-start shadow-sm transition-all group ${isDoctorAssigned 
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/50 border border-blue-400 hover:from-blue-500 hover:to-indigo-500 hover:scale-[1.02]' 
                            : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800'}`
                        }
                    >
                        <div className="flex items-center gap-3 mb-2">
                            {doctorInfo.avatarUrl ? (
                                <div className={`w-10 h-10 rounded-full overflow-hidden border ${isDoctorAssigned ? 'border-white/50' : 'border-purple-200 dark:border-purple-800'} flex-shrink-0`}>
                                    <img src={doctorInfo.avatarUrl} alt={doctorInfo.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className={`p-2 rounded-full flex-shrink-0 ${isDoctorAssigned ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                    <UserCircleIcon className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        <span className={`font-bold block text-left ${isDoctorAssigned ? 'text-white' : 'text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400'}`}>{t('home.my_doctor')}</span>
                        <span className={`text-xs block text-left ${isDoctorAssigned ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>{doctorInfo.name}</span>
                    </button>
                )}

                {onViewAppointments && (
                    <button onClick={onViewAppointments} className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col items-start border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-blue-200 dark:hover:border-blue-800 group">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400 mb-2"><CalendarDaysIcon className="w-6 h-6" /></div>
                        <span className="font-bold text-slate-800 dark:text-white block text-left group-hover:text-blue-600 dark:group-hover:text-blue-400">{t('home.my_appointments')}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block text-left">Agenda</span>
                    </button>
                )}

                {onViewPrescriptions && (
                    <button onClick={onViewPrescriptions} className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl flex flex-col items-start border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-teal-200 dark:hover:border-teal-800 group">
                        <div className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-full text-teal-600 dark:text-teal-400 mb-2"><ClipboardDocumentCheckIcon className="w-6 h-6" /></div>
                        <span className="font-bold text-slate-800 dark:text-white block text-left group-hover:text-teal-600 dark:group-hover:text-teal-400">{t('home.prescriptions')}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block text-left">Documentos</span>
                    </button>
                )}
            </div>

            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1 mb-2">{t('home.quick_log')}</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div onClick={onRegisterMeal} className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-orange-200 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100/50 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-orange-200/50"></div>
                    <div className="relative z-10">
                        <div className="bg-orange-100 dark:bg-orange-900/30 w-10 h-10 rounded-full flex items-center justify-center mb-3 text-orange-600 dark:text-orange-400"><CameraIcon className="w-5 h-5" /></div>
                        <h3 className="font-bold text-slate-800 dark:text-white">{t('home.log_meal')}</h3>
                        <p className="text-xs text-slate-500 mt-1">{getTimeAgo(lastMealTime)}</p>
                    </div>
                </div>
                <div onClick={() => onNavigateToChat("Gostaria de uma análise rápida.")} className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-blue-200 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-blue-200/50"></div>
                    <div className="relative z-10">
                        <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-full flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400"><ArrowPathIcon className="w-5 h-5" /></div>
                        <h3 className="font-bold text-slate-800 dark:text-white">{t('home.quick_analysis')}</h3>
                        <p className="text-xs text-slate-500 mt-1">Dr. X IA</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientHome;
