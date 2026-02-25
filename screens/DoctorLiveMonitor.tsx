
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { UrgentCase, PatientSummary } from '../types';
import { 
    HeartIcon, RingIcon, BoltIcon, ArrowPathIcon, 
    XMarkIcon, UserCircleIcon, ExclamationTriangleIcon, 
    PhoneIcon
} from '../components/icons';
import { useTranslation } from '../services/i18n';

interface DoctorLiveMonitorProps {
    onBack: () => void;
    onSelectPatient: (id: string) => void;
}

// Card Individual do Paciente
const LivePatientCard: React.FC<{ patient: UrgentCase; onSelect: () => void }> = ({ patient, onSelect }) => {
    const [vitals, setVitals] = useState<PatientSummary | null>(null);
    const [loadingVitals, setLoadingVitals] = useState(true);

    // Fetch real data for this specific patient
    useEffect(() => {
        let isMounted = true;
        const fetchVitals = async () => {
            try {
                const data = await api.getPatientSummary(patient.id);
                if (isMounted) {
                    setVitals(data);
                    setLoadingVitals(false);
                }
            } catch (e) {
                console.error("Failed to fetch vitals for", patient.name, e);
                if (isMounted) setLoadingVitals(false);
            }
        };
        fetchVitals();
        
        // Optional: Poll every 10s for real updates if needed
        const interval = setInterval(fetchVitals, 10000);
        
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [patient.id]);

    const isCritical = patient.risk === 'Crítico' || patient.status === 'SOS';
    const isOnline = patient.status === 'online' || patient.status === 'SOS';
    
    // Safely parse vitals, handling '--' and potential non-digit strings
    const rawBpm = vitals?.heartRate || '--';
    const bpm = rawBpm.match(/\d+/) ? rawBpm.replace(/\D/g, '') : '--';
    
    const rawSpo2 = vitals?.spo2 || '--';
    const spo2 = rawSpo2.match(/\d+/) ? rawSpo2.replace(/\D/g, '') : '--';

    return (
        <div 
            onClick={onSelect}
            className={`relative rounded-2xl p-4 border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group overflow-hidden ${
                isCritical 
                    ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.2)]' 
                    : isOnline 
                        ? 'bg-slate-900/60 border-slate-700 hover:border-teal-500/50 shadow-lg' 
                        : 'bg-slate-900/30 border-slate-800 opacity-60 grayscale hover:grayscale-0'
            }`}
        >
            {/* Background Pulse Effect for Critical */}
            {isCritical && <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>}

            <div className="relative z-10 flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full border-2 overflow-hidden ${isCritical ? 'border-red-500' : 'border-slate-600'}`}>
                        {patient.avatarUrl ? (
                            <img src={patient.avatarUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                <UserCircleIcon className="w-6 h-6 text-slate-500" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm truncate max-w-[100px]">{patient.name}</h4>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? (isCritical ? 'bg-red-500 animate-ping' : 'bg-green-500') : 'bg-slate-500'}`}></span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">{patient.status}</span>
                        </div>
                    </div>
                </div>
                {isCritical && <ExclamationTriangleIcon className="w-5 h-5 text-red-500 animate-bounce" />}
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-2 mt-4">
                <div className="bg-slate-950/50 rounded-xl p-2 border border-slate-800 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1 text-slate-400 mb-1">
                        <HeartIcon className={`w-3 h-3 ${isOnline ? 'text-rose-500' : 'text-slate-600'}`} />
                        <span className="text-[10px] font-bold uppercase">BPM</span>
                    </div>
                    {loadingVitals ? (
                        <ArrowPathIcon className="w-4 h-4 text-slate-600 animate-spin" />
                    ) : (
                        <span className={`text-xl font-mono font-bold ${isCritical ? 'text-red-400' : 'text-white'}`}>{bpm}</span>
                    )}
                </div>
                <div className="bg-slate-950/50 rounded-xl p-2 border border-slate-800 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1 text-slate-400 mb-1">
                        <RingIcon className="w-3 h-3 text-sky-500" />
                        <span className="text-[10px] font-bold uppercase">SpO2</span>
                    </div>
                    {loadingVitals ? (
                        <ArrowPathIcon className="w-4 h-4 text-slate-600 animate-spin" />
                    ) : (
                        <span className="text-xl font-mono font-bold text-white">{spo2}<span className="text-xs text-slate-500">%</span></span>
                    )}
                </div>
            </div>

            {/* Quick Actions Overlay (Visible on Hover) */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button className="p-3 bg-blue-600 rounded-full text-white hover:bg-blue-500 hover:scale-110 transition-all shadow-lg" title="Ver Detalhes">
                    <ArrowPathIcon className="w-6 h-6" />
                </button>
                {isCritical && (
                    <button className="p-3 bg-red-600 rounded-full text-white hover:bg-red-500 hover:scale-110 transition-all shadow-lg animate-pulse" title="Contato de Emergência">
                        <PhoneIcon className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div>
    );
};

const DoctorLiveMonitor: React.FC<DoctorLiveMonitorProps> = ({ onBack, onSelectPatient }) => {
    const { t } = useTranslation();
    const [patients, setPatients] = useState<UrgentCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'critical' | 'online'>('all');

    useEffect(() => {
        const load = async () => {
            try {
                // Get list of patients (This is just profile data, does not include vitals usually)
                const data = await api.getUrgentCases();
                setPatients(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
        
        // Refresh list every 10s
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, []);

    const filteredPatients = patients.filter(p => {
        if (filter === 'critical') return p.risk === 'Crítico' || p.status === 'SOS';
        if (filter === 'online') return p.status === 'online' || p.status === 'SOS';
        return true;
    });

    const activeCount = patients.filter(p => p.status === 'online' || p.status === 'SOS').length;
    const criticalCount = patients.filter(p => p.risk === 'Crítico' || p.status === 'SOS').length;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col animate-fade-in">
            {/* Header / Command Center Bar */}
            <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <BoltIcon className="w-5 h-5 text-teal-400" />
                                Centro de Monitoramento
                            </h1>
                            <p className="text-xs text-slate-400 flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Sistema Operacional • {activeCount} Conectados
                            </p>
                        </div>
                    </div>

                    <div className="flex bg-slate-800 p-1 rounded-xl">
                        <button 
                            onClick={() => setFilter('all')} 
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                            Todos ({patients.length})
                        </button>
                        <button 
                            onClick={() => setFilter('online')} 
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'online' ? 'bg-teal-900/50 text-teal-400 shadow-sm' : 'text-slate-400 hover:text-teal-400'}`}
                        >
                            Online ({activeCount})
                        </button>
                        <button 
                            onClick={() => setFilter('critical')} 
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === 'critical' ? 'bg-red-900/50 text-red-400 shadow-sm' : 'text-slate-400 hover:text-red-400'}`}
                        >
                            Críticos ({criticalCount})
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <ArrowPathIcon className="w-8 h-8 text-teal-500 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredPatients.map(patient => (
                            <LivePatientCard 
                                key={patient.id} 
                                patient={patient} 
                                onSelect={() => onSelectPatient(patient.id)} 
                            />
                        ))}
                        
                        {/* Placeholder Card for "Invite New" */}
                        <button className="rounded-2xl p-4 border border-slate-800 border-dashed bg-slate-900/20 hover:bg-slate-900/50 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-teal-400 transition-all group min-h-[180px]">
                            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:border-teal-500/50 group-hover:scale-110 transition-all">
                                <span className="text-2xl">+</span>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">Adicionar Paciente</span>
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DoctorLiveMonitor;
