
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PatientFullProfile, TimelineEvent } from '../types';
import { ArrowPathIcon, UserCircleIcon, HeartIcon, ChatBubbleOvalLeftEllipsisIcon, CakeIcon, ClipboardDocumentCheckIcon, VideoCameraIcon, CalendarDaysIcon, XMarkIcon, PrinterIcon, ChevronRightIcon } from '../components/icons';

interface PatientHistoryProps {
    onBack: () => void;
}

const PatientHistory: React.FC<PatientHistoryProps> = ({ onBack }) => {
    const [fullProfile, setFullProfile] = useState<PatientFullProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try { const user = await api.getUser(); setFullProfile(await api.getPatientFullProfile(user.id!)); } 
            catch (e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, []);

    const getEventIcon = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'measure': return <HeartIcon className="w-5 h-5 text-red-400" />;
            case 'chat': return <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 text-blue-400" />;
            case 'meal': return <CakeIcon className="w-5 h-5 text-orange-400" />;
            case 'prescription': return <ClipboardDocumentCheckIcon className="w-5 h-5 text-purple-400" />;
            case 'appointment': return <CalendarDaysIcon className="w-5 h-5 text-teal-400" />;
            case 'video': return <VideoCameraIcon className="w-5 h-5 text-green-400" />;
            default: return <UserCircleIcon className="w-5 h-5 text-slate-400" />;
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><ArrowPathIcon className="w-8 h-8 text-teal-500 animate-spin" /></div>;

    return (
        <div className="h-screen bg-slate-950 flex flex-col text-white">
            <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur z-10">
                <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg> Voltar</button>
                <h1 className="text-lg font-bold">Histórico</h1>
                <button onClick={() => fullProfile && api.generatePatientHistoryPDF(fullProfile)} className="p-2 bg-blue-900/30 text-blue-400 rounded-full hover:bg-blue-900/50"><PrinterIcon className="w-6 h-6" /></button>
            </header>

            <main className="flex-1 overflow-y-auto p-6 lg:max-w-2xl lg:mx-auto w-full">
                {fullProfile?.timeline && fullProfile.timeline.length > 0 ? (
                    <div className="relative pl-6 border-l-2 border-slate-800 space-y-8">
                        {fullProfile.timeline.map((event, index) => (
                            <div key={index} className="relative">
                                <div className="absolute -left-[31px] bg-slate-900 p-2 rounded-full border border-slate-800 shadow-md">{getEventIcon(event.type)}</div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1 font-mono">{new Date(event.timestamp).toLocaleString('pt-BR')}</p>
                                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                        <h2 className="text-base font-bold text-white mb-1">{event.title}</h2>
                                        <p className="text-sm text-slate-400">{event.description}</p>
                                        
                                        {/* Render Video Link */}
                                        {event.url && event.type === 'video' && (
                                            <a href={event.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-blue-400 hover:underline mt-2">
                                                Ver Mídia <ChevronRightIcon className="w-3 h-3 ml-1" />
                                            </a>
                                        )}

                                        {/* Render Meal Image */}
                                        {event.url && event.type === 'meal' && (
                                            <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden border border-slate-700">
                                                <img src={event.url} alt="Refeição" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center">
                        <XMarkIcon className="w-16 h-16 mb-4 text-slate-700" />
                        <p>Nenhum evento registrado.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PatientHistory;
