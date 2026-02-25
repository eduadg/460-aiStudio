
import React, { useEffect, useState } from 'react';
import { api, formatError } from '../services/api';
import { PatientSummary } from '../types';
import { HeartIcon, FireIcon, MoonIcon, SunIcon, ArrowPathIcon, UserCircleIcon, RingIcon, PlusIcon, XMarkIcon } from '../components/icons';
import { useRealtimeVitals } from '../hooks/useRealtimeVitals';

interface FamilyMemberDetailProps {
    memberId: string;
    memberName: string;
    onBack: () => void;
}

const FamilyMemberDetail: React.FC<FamilyMemberDetailProps> = ({ memberId, memberName, onBack }) => {
    const [summary, setSummary] = useState<PatientSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showMeasureModal, setShowMeasureModal] = useState(false);
    
    // USE CUSTOM HOOK
    const { data: realtimeData, isLive } = useRealtimeVitals(memberId);

    // Sync realtime data with local state
    useEffect(() => {
        if (realtimeData) {
            setSummary(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    heartRate: realtimeData.heartRate ? `${realtimeData.heartRate} bpm` : prev.heartRate,
                    spo2: realtimeData.spo2 ? `${realtimeData.spo2}%` : prev.spo2,
                    steps: realtimeData.steps ? realtimeData.steps.toString() : prev.steps,
                    bloodPressure: realtimeData.bloodPressure ? `${realtimeData.bloodPressure.sys}/${realtimeData.bloodPressure.dia}` : prev.bloodPressure
                };
            });
        }
    }, [realtimeData]);

    useEffect(() => {
        // Carregamento inicial de dados (Async)
        const loadData = async () => {
            try {
                setLoading(true);
                if (!memberId) throw new Error("ID do membro inválido ou não conectado.");
                const data = await api.getPatientSummary(memberId);
                setSummary(data);
            } catch (e: any) {
                console.error("Erro ao carregar dados do familiar:", e);
                setError(formatError(e));
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [memberId]);

    const summaryItems = [
        { 
            label: 'Coração', 
            value: realtimeData?.heartRate ? `${realtimeData.heartRate} bpm` : (summary?.heartRate || '--'), 
            icon: <HeartIcon className={`h-6 w-6 text-red-500 ${isLive && realtimeData?.heartRate ? 'animate-pulse' : ''}`} />,
            highlight: isLive && !!realtimeData?.heartRate
        },
        { label: 'Passos', value: summary?.steps || '0', icon: <FireIcon className="h-6 w-6 text-orange-500" /> },
        { label: 'Sono', value: summary?.sleep || '--', icon: <MoonIcon className="h-6 w-6 text-indigo-500" /> },
        { label: 'SpO2', value: summary?.spo2 || '--', icon: <RingIcon className="h-6 w-6 text-sky-500" /> },
        { label: 'Pressão', value: summary?.bloodPressure || '--', icon: <HeartIcon className="h-6 w-6 text-rose-500" /> },
    ];

    const [manualType, setManualType] = useState<'heart' | 'spo2' | 'pressure' | 'glucose' | 'temp'>('heart');
    const [manualValue, setManualValue] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSaveManual = async () => {
        if (!manualValue) return;
        setSaving(true);
        try {
            await api.saveMeasureForMember(memberId, manualType, manualValue);
            setShowMeasureModal(false);
            setManualValue('');
            // Recarrega dados
            const data = await api.getPatientSummary(memberId);
            setSummary(data);
        } catch (e: any) {
            alert(formatError(e));
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-gray-50"><ArrowPathIcon className="w-8 h-8 text-teal-600 animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white p-4 flex items-center border-b border-slate-200 sticky top-0 z-10 justify-between">
                <div className="flex items-center gap-1">
                    <button onClick={onBack} className="text-slate-500 font-medium hover:text-slate-800 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                        Voltar
                    </button>
                </div>
                <h1 className="text-lg font-bold text-center flex-1">Dados de Saúde</h1>
                <button 
                    onClick={() => setShowMeasureModal(true)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"
                >
                    <PlusIcon className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 p-6 lg:max-w-2xl lg:mx-auto w-full">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-3 relative">
                        <UserCircleIcon className="w-12 h-12 text-blue-600" />
                        {isLive && (
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white animate-pulse">
                                AO VIVO
                            </div>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{memberName}</h2>
                    <p className="text-slate-500 text-sm">Visualização de Membro Familiar</p>
                </div>

                {error ? (
                    <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
                        <p className="text-red-600 font-medium mb-2">Não foi possível carregar os dados.</p>
                        <p className="text-xs text-red-400">{error}</p>
                        {error.includes("policy") && (
                            <p className="text-xs text-slate-500 mt-4">
                                Dica: Verifique se as políticas de segurança (RLS) do banco de dados permitem visualizar dados de terceiros na tabela 'measures'.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {summaryItems.map(item => (
                            <div key={item.label} className={`bg-white p-4 rounded-2xl shadow-sm border flex flex-col gap-2 transition-all ${item.highlight ? 'border-red-200 shadow-md transform scale-105' : 'border-slate-100'}`}>
                                <div className="bg-slate-50 w-10 h-10 rounded-full flex items-center justify-center">
                                    {item.icon}
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">{item.label}</p>
                                    <p className={`text-xl font-bold ${item.highlight ? 'text-red-600' : 'text-slate-800'}`}>{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                    <p className="text-xs text-blue-600 font-medium">
                        {isLive 
                            ? "Conexão Estabelecida: Recebendo sinais vitais em tempo real." 
                            : "Os dados exibidos são os últimos sincronizados. Se o familiar abrir o app, você verá ao vivo."}
                    </p>
                </div>
            </main>

            {/* Modal de Medição Manual (Cuidador) */}
            {showMeasureModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">Nova Medição</h3>
                            <button onClick={() => setShowMeasureModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <XMarkIcon className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Medida</label>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {['heart', 'pressure', 'glucose', 'temp', 'spo2'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setManualType(t as any)}
                                        className={`py-2 px-1 rounded-lg text-xs font-bold capitalize ${manualType === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                                    >
                                        {t === 'heart' ? 'BPM' : t === 'pressure' ? 'Pressão' : t === 'temp' ? 'Temp' : t}
                                    </button>
                                ))}
                            </div>
                            
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valor</label>
                            <input 
                                type="text" 
                                value={manualValue}
                                onChange={e => setManualValue(e.target.value)}
                                placeholder="Ex: 120/80 ou 98"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 mb-6"
                            />
                            
                            <button 
                                onClick={handleSaveManual}
                                disabled={saving}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Registrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyMemberDetail;
