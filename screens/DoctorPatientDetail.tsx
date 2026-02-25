
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
// Fix: Added missing icon imports for ClockIcon, ShieldCheckIcon, and PlusIcon
import { ChevronRightIcon, UserCircleIcon, HeartIcon, FireIcon, ChatBubbleOvalLeftEllipsisIcon, ArrowPathIcon, PaperAirplaneIcon, ClipboardDocumentCheckIcon, SparklesIcon, ShareIcon, MicrophoneIcon, StopIcon, CakeIcon, RingIcon, ExclamationTriangleIcon, CheckCircleIcon, PrinterIcon, VideoCameraIcon, CalendarDaysIcon, ClockIcon, ShieldCheckIcon, PlusIcon, BellIcon, XMarkIcon } from '../components/icons';
import VideoCaptureModal from './VideoCaptureModal'; 
import { PatientFullProfile, TimelineEvent, MedicalActionPlan, Prescription, ChatMessage, Measure, Meal, VideoEntry, Reminder } from '../types';
import NutritionReportView from './NutritionReportView';
import { InteractiveBarChart, MiniSparklineChart } from '../components/HealthCharts'; // Import New Charts
import { useTranslation } from '../services/i18n';

interface DoctorPatientDetailProps {
    patientId: string;
    onBack: () => void;
}

const TimelineItem: React.FC<{ event: TimelineEvent }> = ({ event }) => {
    const getIcon = () => {
        switch(event.icon) {
            case 'heart': return <HeartIcon className="w-4 h-4 text-red-400" />;
            case 'chat': return <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4 text-blue-400" />;
            case 'meal': return <CakeIcon className="w-4 h-4 text-orange-400" />;
            case 'doc': return <ClipboardDocumentCheckIcon className="w-4 h-4 text-purple-400" />;
            case 'calendar': return <CalendarDaysIcon className="w-4 h-4 text-teal-400" />;
            case 'video': return <VideoCameraIcon className="w-4 h-4 text-green-400" />;
            case 'bell': return <BellIcon className="w-4 h-4 text-yellow-400" />;
            default: return <SparklesIcon className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center z-10">
                    {getIcon()}
                </div>
                <div className="w-px h-full bg-slate-800 absolute top-8"></div>
            </div>
            <div className="flex-1 pb-6">
                <p className="text-xs text-slate-500 mb-0.5">{new Date(event.timestamp).toLocaleString()}</p>
                <h4 className="text-sm font-bold text-slate-200">{event.title}</h4>
                <p className="text-sm text-slate-400">{event.description}</p>
                
                {/* Media Previews */}
                {event.url && event.type === 'video' && (
                    <a href={event.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-400 text-xs mt-1 hover:underline">
                        Ver Vídeo <ChevronRightIcon className="w-3 h-3 ml-1" />
                    </a>
                )}
                {event.url && event.type === 'meal' && (
                    <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-slate-700">
                        <img src={event.url} alt="Refeição" className="w-full h-full object-cover" />
                    </div>
                )}
            </div>
        </div>
    );
};

const DoctorPatientDetail: React.FC<DoctorPatientDetailProps> = ({ patientId, onBack }) => {
    const { t } = useTranslation();
    const [fullProfile, setFullProfile] = useState<PatientFullProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'nutrition' | 'journal' | 'prescriptions' | 'videos' | 'reminders'>('dashboard');
    
    // Chat State (Doctor)
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    // Plan State
    const [actionPlan, setActionPlan] = useState<MedicalActionPlan | null>(null);
    const [generatingPlan, setGeneratingPlan] = useState(false);
    const [editedPlanSummary, setEditedPlanSummary] = useState('');
    
    // Video Capture State
    const [showVideoCapture, setShowVideoCapture] = useState(false);

    // Reminder Modal State
    const [showAddReminderModal, setShowAddReminderModal] = useState(false);
    const [newReminderMessage, setNewReminderMessage] = useState('');
    const [newReminderType, setNewReminderType] = useState<Reminder['type']>('general');
    const [newReminderTime, setNewReminderTime] = useState('08:00');
    const [newReminderFrequency, setNewReminderFrequency] = useState<Reminder['frequency']>('daily');
    const [addingReminder, setAddingReminder] = useState(false);
    const [addReminderError, setAddReminderError] = useState('');


    // Voice State
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const loadData = async () => {
        try {
            const profile = await api.getPatientFullProfile(patientId);
            setFullProfile(profile);
            
            const chat = await api.getChatHistory(patientId);
            setChatHistory(chat);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        
        const unsubscribe = api.subscribeToChat(patientId, (msg) => {
            if (msg.sender !== 'doctor') {
                setChatHistory(prev => [...prev, msg]);
            }
        });
        return () => unsubscribe();
    }, [patientId]);

    const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
        if (e) e.preventDefault();
        const textToSend = customText || newMessage;
        if (!textToSend.trim()) return;
        
        setSendingMsg(true);
        const msg: ChatMessage = { sender: 'doctor', text: textToSend, time: new Date().toLocaleTimeString() };
        
        setChatHistory(prev => [...prev, msg]);
        setNewMessage('');
        
        try {
            await api.saveChatMessage(msg, patientId);
        } catch(e) {
            console.error(e);
        } finally {
            setSendingMsg(false);
        }
    };

    const handleGenerateActionPlan = async () => {
        setGeneratingPlan(true);
        try {
            const plan = await api.generateActionPlan(patientId);
            setActionPlan(plan);
            setEditedPlanSummary(plan.summary);
        } catch (e) {
            alert("Erro ao gerar plano.");
        } finally {
            setGeneratingPlan(false);
        }
    };

    const handleApprovePlan = async () => {
        if (!actionPlan) return;
        try {
            const finalPlan = { ...actionPlan, summary: editedPlanSummary };
            await api.savePrescription(patientId, finalPlan);
            await loadData(); 
            handleSendMessage(undefined, `📋 PLANO DE AÇÃO MÉDICA\n${editedPlanSummary}`);
            setActionPlan(null);
        } catch (e: any) {
            alert(e.message);
        }
    };
    
    // Voice Logic (Copy from previous implementation)
    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("Sem suporte a voz."); return; }
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = true;
        recognition.onresult = (e: any) => setNewMessage(Array.from(e.results).map((r: any) => r[0].transcript).join(''));
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    };
    
    const handleVideoSaved = async () => {
        setShowVideoCapture(false);
        await loadData(); 
    };

    const handleAddReminder = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingReminder(true);
        setAddReminderError('');
        try {
            const user = await api.getUser();
            if (!user.id) throw new Error("Erro: ID do médico não encontrado.");

            const newReminder: Omit<Reminder, 'id' | 'userId' | 'createdAt'> = {
                message: newReminderMessage,
                type: newReminderType,
                time: newReminderTime,
                frequency: newReminderFrequency,
                isActive: true,
            };
            await api.createReminder(patientId, newReminder); 
            
            handleSendMessage(undefined, `🔔 Lembrete Adicionado: "${newReminderMessage}" para ${newReminderTime} (${newReminderFrequency}).`);

            await loadData();
            
            setShowAddReminderModal(false);
            setNewReminderMessage('');
            setNewReminderType('general');
            setNewReminderTime('08:00');
            setNewReminderFrequency('daily');
        } catch (e: any) {
            setAddReminderError(e.message || "Erro ao adicionar lembrete.");
        } finally {
            setAddingReminder(false);
        }
    };

    const getBmiColorClass = (bmiValue: number) => {
        if (bmiValue <= 0) return 'bg-slate-800 text-slate-400';
        if (bmiValue < 18.5) return 'bg-blue-900/50 text-blue-400 border border-blue-500/50';
        if (bmiValue < 24.9) return 'bg-green-900/50 text-green-400 border border-green-500/50';
        if (bmiValue < 29.9) return 'bg-yellow-900/50 text-yellow-400 border border-yellow-500/50';
        return 'bg-red-900/50 text-red-400 border border-red-500/50';
    };

    // Prepare chart data for Recharts
    const activityChartData = fullProfile?.stats.activityGraph.map((val, i) => ({
        label: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][i % 7],
        value: val
    })) || [];

    // Mock Heart Rate data for sparkline (since fullProfile might not have historical array readily available in simple format)
    const mockHeartData = [68, 72, 70, 75, 71, 69, 72, 74, 73, 70];

    if (loading || !fullProfile) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin"/></div>;

    const p = fullProfile.basic;
    const s = fullProfile.stats;
    
    const heightStr = fullProfile.biometrics.height || '0';
    const weightStr = fullProfile.biometrics.weight || '0';
    
    const h = parseFloat(heightStr.toString().replace(',', '.'));
    const w = parseFloat(weightStr.toString().replace(',', '.'));
    
    let bmiVal = 0;
    let bmiDisplay = 'N/A';
    
    if (h > 0 && w > 0) {
        bmiVal = w / (h * h);
        bmiDisplay = bmiVal.toFixed(1);
    } else if (fullProfile.biometrics.bmi && fullProfile.biometrics.bmi !== 'N/A') {
        bmiVal = parseFloat(fullProfile.biometrics.bmi.replace(',', '.'));
        bmiDisplay = bmiVal.toFixed(1);
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
            {showVideoCapture && (
                <VideoCaptureModal 
                    patientId={patientId}
                    onClose={() => setShowVideoCapture(false)}
                    onSaveSuccess={handleVideoSaved}
                />
            )}

            {showAddReminderModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Adicionar Lembrete</h3>
                            <button onClick={() => setShowAddReminderModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                <XMarkIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddReminder} className="p-6">
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Mensagem</label>
                                <input 
                                    type="text" 
                                    value={newReminderMessage}
                                    onChange={e => setNewReminderMessage(e.target.value)}
                                    placeholder="Ex: Tomar medicação X"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Tipo</label>
                                <select 
                                    value={newReminderType}
                                    onChange={e => setNewReminderType(e.target.value as any)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="general">Geral</option>
                                    <option value="medication">Medicação</option>
                                    <option value="measurement">Medição</option>
                                    <option value="appointment">Consulta</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Hora (Diária)</label>
                                <input 
                                    type="time" 
                                    value={newReminderTime}
                                    onChange={e => setNewReminderTime(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Frequência</label>
                                <select 
                                    value={newReminderFrequency}
                                    onChange={e => setNewReminderFrequency(e.target.value as any)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="daily">Diário</option>
                                    <option value="weekly">Semanal</option>
                                    <option value="once">Uma Vez</option>
                                </select>
                            </div>
                            
                            {addReminderError && <p className="mb-4 text-red-500 text-sm">{addReminderError}</p>}

                            <button 
                                type="submit" 
                                disabled={addingReminder}
                                className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {addingReminder ? (
                                    <>
                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                        Adicionando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Criar Lembrete
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <header className="relative bg-slate-900 border-b border-slate-800 p-6">
                <button onClick={onBack} className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-1 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                    {t('common.back')}
                </button>

                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8 pt-8">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-4 border-slate-800 bg-slate-800 overflow-hidden shadow-2xl">
                            {p.avatarUrl ? (
                                <img src={p.avatarUrl} className="w-full h-full object-cover" alt={p.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-700 text-3xl font-bold text-slate-500">
                                    {p.name.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-slate-900 ${p.status === 'online' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-white mb-2">{p.name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-slate-400 mb-4">
                            <span className="bg-slate-800 px-3 py-1 rounded-full">{fullProfile.biometrics.age} anos</span>
                            <span className="bg-slate-800 px-3 py-1 rounded-full">{fullProfile.biometrics.height}m</span>
                            <span className="bg-slate-800 px-3 py-1 rounded-full">{fullProfile.biometrics.weight}kg</span>
                            {bmiVal > 0 ? (
                                <span className={`px-3 py-1 rounded-full font-bold ${getBmiColorClass(bmiVal)}`}>
                                    IMC {bmiDisplay}
                                </span>
                            ) : (
                                <span className="bg-slate-800 border border-amber-500/50 text-amber-500 px-3 py-1 rounded-full flex items-center gap-1">
                                    <ExclamationTriangleIcon className="w-3 h-3" /> Dados Faltantes
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                            Última Sincronização: {p.timestamp}
                        </p>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 text-center w-full md:w-auto">
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Health Score</p>
                        <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {s.healthScore}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex justify-center border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-20 overflow-x-auto">
                {['dashboard', 'nutrition', 'journal', 'prescriptions', 'videos', 'reminders'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-3 px-4 text-sm font-bold transition-colors relative ${
                            activeTab === tab 
                                ? 'text-teal-400' 
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {t(`doctor.tab.${tab}` as any)}
                        {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-t-full"></span>}
                    </button>
                ))}
            </div>

            <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
                {activeTab === 'dashboard' && (
                    <div className="animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md">
                                <h3 className="text-slate-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                                    <RingIcon className="w-4 h-4 text-blue-400" /> Atividade Recente
                                </h3>
                                <div className="flex justify-between items-end h-20">
                                    <div>
                                        <p className="text-3xl font-bold text-white mb-1">{s.consistency}%</p>
                                        <p className="text-sm text-slate-500">Consistência Diária</p>
                                    </div>
                                    <div className="w-1/2 h-full">
                                        <InteractiveBarChart data={activityChartData} color="#3b82f6" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md">
                                <h3 className="text-slate-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                                    <HeartIcon className="w-4 h-4 text-red-400" /> Média de BPM
                                </h3>
                                <div className="flex justify-between items-end h-20">
                                    <div className="relative z-10">
                                        <div className="text-4xl font-bold text-white">{fullProfile.measures?.find(m => m.type === 'heart')?.value || '--'}</div>
                                        <p className="text-sm text-slate-500 mt-1">Repouso</p>
                                    </div>
                                    <div className="absolute inset-0 opacity-20">
                                        <MiniSparklineChart data={mockHeartData} color="#f87171" height={120} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md">
                                <h3 className="text-slate-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                                    <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4 text-purple-400" /> Interações Totais
                                </h3>
                                <div className="text-4xl font-bold text-white">{s.totalInteractions}</div>
                                <p className="text-sm text-slate-500 mt-1">Chat & App</p>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md mb-8">
                            <h3 className="text-slate-400 text-xs font-bold uppercase mb-4 flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-orange-400" /> Linha do Tempo Recente
                            </h3>
                            <div className="relative pl-6 border-l-2 border-slate-800">
                                {fullProfile.timeline.slice(0, 5).map(event => (
                                    <TimelineItem key={event.id} event={event} />
                                ))}
                            </div>
                            {fullProfile.timeline.length > 5 && (
                                <button 
                                    onClick={() => setActiveTab('journal')} 
                                    className="text-blue-400 hover:underline text-sm mt-4 block mx-auto text-center"
                                >
                                    Ver histórico completo
                                </button>
                            )}
                        </div>
                        
                        <button 
                            onClick={handleGenerateActionPlan}
                            disabled={generatingPlan}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg hover:from-blue-500 hover:to-purple-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {generatingPlan ? (
                                <>
                                    <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                    Gerando Plano de Ação IA...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-6 h-6" />
                                    {t('doctor.action.generate_plan')}
                                </>
                            )}
                        </button>

                        {actionPlan && (
                            <div className="mt-6 bg-slate-800 p-6 rounded-2xl border border-blue-700 shadow-xl animate-fade-in-up">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                    <ClipboardDocumentCheckIcon className="w-7 h-7 text-blue-400" />
                                    Plano de Ação Sugerido
                                </h3>
                                <p className="text-sm text-blue-300 italic mb-4">Revisado por IA, pronto para sua aprovação.</p>
                                
                                <label className="block text-sm font-bold text-slate-400 mb-2">Resumo e Orientações</label>
                                <textarea
                                    value={editedPlanSummary}
                                    onChange={(e) => setEditedPlanSummary(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm resize-y h-32 focus:outline-none focus:border-blue-500"
                                ></textarea>

                                <h4 className="text-slate-400 text-xs font-bold uppercase mt-4 mb-2">Ações Detalhadas</h4>
                                {actionPlan.actions.medication && actionPlan.actions.medication.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-blue-300 font-semibold text-sm">Medicação:</p>
                                        <ul className="list-disc list-inside text-sm text-slate-300 ml-2">
                                            {actionPlan.actions.medication.map((item, idx) => <li key={idx}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {actionPlan.actions.lifestyle && actionPlan.actions.lifestyle.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-green-300 font-semibold text-sm">Estilo de Vida:</p>
                                        <ul className="list-disc list-inside text-sm text-slate-300 ml-2">
                                            {actionPlan.actions.lifestyle.map((item, idx) => <li key={idx}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {actionPlan.actions.exams && actionPlan.actions.exams.length > 0 && (
                                    <div>
                                        <p className="text-orange-300 font-semibold text-sm">Exames:</p>
                                        <ul className="list-disc list-inside text-sm text-slate-300 ml-2">
                                            {actionPlan.actions.exams.map((item, idx) => <li key={idx}>{item}</li>)}
                                        </ul>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={handleApprovePlan}
                                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 mt-6 rounded-xl flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <CheckCircleIcon className="w-5 h-5" />
                                    Aprovar e Enviar para Paciente
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'nutrition' && (
                    <div className="animate-fade-in-up h-[600px] relative">
                        <NutritionReportView patientId={patientId} />
                    </div>
                )}

                {activeTab === 'journal' && (
                    <div className="flex flex-col h-full animate-fade-in-up">
                        <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                            <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4 text-blue-400" /> Histórico de Chat
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {fullProfile.timeline.map((event, index) => (
                                <TimelineItem key={index} event={event} />
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        
                        <form onSubmit={(e) => handleSendMessage(e)} className="flex items-end gap-2 mt-4">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={sendingMsg}
                                    placeholder="Enviar mensagem para o paciente..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3 pl-4 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <button 
                                    type="button" 
                                    onClick={toggleListening}
                                    className={`absolute inset-y-0 right-2 flex items-center justify-center p-2 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    {isListening ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <button type="submit" disabled={sendingMsg || !newMessage.trim()} className="bg-blue-600 h-12 w-12 rounded-full flex items-center justify-center transform hover:scale-105 transition-transform disabled:bg-slate-700 disabled:scale-100 flex-shrink-0 mb-0.5">
                                <PaperAirplaneIcon className="h-6 w-6 text-white" />
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'prescriptions' && (
                    <div className="animate-fade-in-up">
                        <h3 className="text-sm font-bold text-slate-300 uppercase mb-4 flex items-center gap-2">
                            <ClipboardDocumentCheckIcon className="w-4 h-4 text-purple-400" /> Histórico de Prescrições
                        </h3>
                        <div className="space-y-4">
                            {fullProfile.prescriptionHistory && fullProfile.prescriptionHistory.length > 0 ? (
                                fullProfile.prescriptionHistory.map(pres => (
                                    <div key={pres.id} className="bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-800 flex items-start gap-4">
                                        <div className={`p-3 rounded-full mt-1 ${pres.content.type === 'emergency' ? 'bg-red-900/20 text-red-500' : 'bg-purple-900/20 text-purple-500'}`}>
                                            <ClipboardDocumentCheckIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white">
                                                {pres.content.type === 'emergency' ? 'Plano de Emergência' : pres.content.type === 'weekly_review' ? 'Revisão Semanal' : 'Ajuste Clínico'}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1">{new Date(pres.createdAt).toLocaleDateString()} • {pres.content.summary.slice(0, 50)}...</p>
                                            <div className="flex gap-2 mt-2">
                                                {pres.content.actions.medication && (
                                                    <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">
                                                        {pres.content.actions.medication.length} Meds
                                                    </span>
                                                )}
                                                {pres.digitalSignatureHash && (
                                                    <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <ShieldCheckIcon className="w-3 h-3" /> Assinado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                                    Nenhuma prescrição encontrada.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'videos' && (
                    <div className="animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                                <VideoCameraIcon className="w-4 h-4 text-green-400" /> Vídeos de Acompanhamento
                            </h3>
                            <button 
                                onClick={() => setShowVideoCapture(true)}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2"
                            >
                                <PlusIcon className="w-5 h-5" /> {t('doctor.action.record_video')}
                            </button>
                        </div>
                        <div className="space-y-4">
                            {fullProfile.videos && fullProfile.videos.length > 0 ? (
                                fullProfile.videos.map(video => (
                                    <div key={video.id} className="bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-800 flex gap-4">
                                        <div className="w-32 h-20 flex-shrink-0 bg-black rounded-xl overflow-hidden relative">
                                            {video.thumbnailUrl ? (
                                                <img src={video.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                    <VideoCameraIcon className="w-8 h-8 text-slate-500" />
                                                </div>
                                            )}
                                            <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM10.5 8.25a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0V8.25ZM13.5 8.25a.75.75 0 0 0-1.5 0v7.5a.75.75 0 0 0 1.5 0V8.25Z" clipRule="evenodd" /></svg>
                                            </a>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-white text-sm line-clamp-1">{video.title}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{new Date(video.createdAt).toLocaleDateString('pt-BR')}</p>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{video.description || 'Nenhuma descrição.'}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                                    Nenhum vídeo gravado.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'reminders' && (
                    <div className="animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                                <BellIcon className="w-4 h-4 text-yellow-400" /> Lembretes do Paciente
                            </h3>
                            <button 
                                onClick={() => setShowAddReminderModal(true)}
                                className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2"
                            >
                                <PlusIcon className="w-5 h-5" /> {t('doctor.action.create_reminder')}
                            </button>
                        </div>
                        <div className="space-y-4">
                            {fullProfile.reminders && fullProfile.reminders.length > 0 ? (
                                fullProfile.reminders.map(rem => (
                                    <div key={rem.id} className={`bg-slate-900 p-4 rounded-2xl shadow-sm border ${rem.isActive ? 'border-teal-800' : 'border-slate-800 opacity-70'} flex items-center gap-4`}>
                                        <div className={`p-3 rounded-full flex-shrink-0 ${rem.isActive ? 'bg-teal-900/30 text-teal-400' : 'bg-slate-800 text-slate-500'}`}>
                                            <BellIcon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-white">{rem.message}</h3>
                                            <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                                                <ClockIcon className="w-4 h-4" /> {rem.time} • {rem.frequency === 'daily' ? 'Diário' : rem.frequency === 'weekly' ? 'Semanal' : 'Única vez'}
                                            </p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${rem.type === 'medication' ? 'bg-purple-900/30 text-purple-400' : rem.type === 'measurement' ? 'bg-blue-900/30 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                                {rem.type === 'medication' ? 'Medicação' : rem.type === 'measurement' ? 'Medição' : rem.type === 'appointment' ? 'Consulta' : 'Geral'}
                                            </span>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${rem.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                            {rem.isActive ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                                    Nenhum lembrete configurado para este paciente.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export { DoctorPatientDetail };