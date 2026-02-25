
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Prescription } from '../types';
import { ArrowPathIcon, ClipboardDocumentCheckIcon, ShareIcon, ChevronRightIcon, ShieldCheckIcon, PrinterIcon } from '../components/icons';

interface PatientPrescriptionsProps {
    onBack: () => void;
}

const PatientPrescriptions: React.FC<PatientPrescriptionsProps> = ({ onBack }) => {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.getPrescriptions();
                setPrescriptions(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleShare = (p: Prescription) => {
        const text = `*Dr. X Health - Prescrição Digital*\n` + 
                     `Paciente: Você\n` + 
                     `Médico: ${p.signedBy || 'Dr. X'} (CRM: ${p.crm || '---'})\n` +
                     `Resumo: ${p.content.summary}\n\n` + 
                     `Acesse o documento oficial no App para validação.`;
        
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handlePrint = (p: Prescription) => {
        api.generateAndPrintPDF(p);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950"><ArrowPathIcon className="w-8 h-8 text-teal-600 animate-spin" /></div>;

    // --- DETAIL VIEW (DOCUMENT STYLE) ---
    if (selectedPrescription) {
        const p = selectedPrescription.content;
        return (
            <div className="h-screen bg-slate-100 dark:bg-slate-950 flex flex-col animate-fade-in-right">
                <header className="p-4 flex items-center bg-white dark:bg-slate-900 shadow-sm z-10 sticky top-0">
                    <button onClick={() => setSelectedPrescription(null)} className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-white flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                        Voltar
                    </button>
                    <h1 className="text-lg font-bold text-center flex-1 mr-8 text-slate-800 dark:text-white">Documento Digital</h1>
                </header>

                <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
                    
                    {/* DOCUMENT PAPER */}
                    <div className="bg-white w-full max-w-lg shadow-xl rounded-none sm:rounded-sm p-8 text-slate-900 relative min-h-[600px] flex flex-col">
                        
                        {/* Header */}
                        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
                            <div>
                                <h1 className="text-2xl font-serif font-bold text-slate-900">Dr. X Health</h1>
                                <p className="text-xs text-slate-500 uppercase tracking-widest">Prescrição Médica Eletrônica</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-sm">{selectedPrescription.signedBy || 'Dr. Médico'}</p>
                                <p className="text-xs text-slate-600">CRM: {selectedPrescription.crm || '---'}</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <div className="mb-6">
                                <p className="text-sm font-bold text-slate-400 uppercase mb-1">Paciente</p>
                                <p className="text-lg font-medium">Usuário do Sistema</p>
                                <p className="text-xs text-slate-500">{new Date(selectedPrescription.createdAt).toLocaleDateString()} às {new Date(selectedPrescription.createdAt).toLocaleTimeString()}</p>
                            </div>

                            <div className="space-y-6">
                                {p.summary && (
                                    <div>
                                        <h3 className="font-bold text-slate-900 border-b border-slate-200 mb-2 pb-1">Resumo Clínico</h3>
                                        <p className="font-serif text-base">{p.summary}</p>
                                    </div>
                                )}

                                {p.actions.medication && p.actions.medication.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-slate-900 border-b border-slate-200 mb-2 pb-1">Uso Medicamentoso</h3>
                                        <ul className="list-decimal list-inside space-y-2 font-serif text-lg">
                                            {p.actions.medication.map((item, i) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {p.actions.exams && p.actions.exams.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-slate-900 border-b border-slate-200 mb-2 pb-1">Solicitação de Exames</h3>
                                        <ul className="list-disc list-inside space-y-1 font-serif">
                                            {p.actions.exams.map((item, i) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {p.actions.lifestyle && p.actions.lifestyle.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-slate-900 border-b border-slate-200 mb-2 pb-1">Orientações Gerais</h3>
                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                            {p.actions.lifestyle.map((item, i) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer / Signature */}
                        <div className="mt-12 pt-6 border-t border-slate-200 text-center">
                            <div className="flex justify-center mb-2">
                                <ShieldCheckIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tight">
                                Assinado Digitalmente • Hash: {selectedPrescription.digitalSignatureHash || 'PENDING'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Documento válido em território nacional conforme MP 2.200-2/2001.
                            </p>
                        </div>
                    </div>

                    <div className="w-full max-w-lg mt-6 pb-6 px-4 space-y-3">
                        <button 
                            onClick={() => handlePrint(selectedPrescription)}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <PrinterIcon className="w-5 h-5" />
                            Baixar PDF Oficial
                        </button>
                        <button 
                            onClick={() => handleShare(selectedPrescription)}
                            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <ShareIcon className="w-5 h-5" />
                            Encaminhar para Farmácia
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // --- LIST VIEW ---
    return (
        <div className="h-screen bg-white dark:bg-slate-950 flex flex-col">
            <header className="p-4 flex items-center border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm z-10">
                <button onClick={onBack} className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-white flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    Voltar
                </button>
                <h1 className="text-lg font-bold text-center flex-1 mr-8 text-slate-800 dark:text-white">Minhas Prescrições</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:max-w-2xl lg:mx-auto w-full">
                {prescriptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
                        <ClipboardDocumentCheckIcon className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-700" />
                        <p className="font-medium text-slate-600 dark:text-slate-400">Nenhuma prescrição encontrada.</p>
                        <p className="text-xs mt-2">Suas receitas médicas e planos de ação aparecerão aqui.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {prescriptions.map(pres => (
                            <button 
                                key={pres.id}
                                onClick={() => setSelectedPrescription(pres)}
                                className="w-full bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98] text-left group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full mt-1 ${pres.content.type === 'emergency' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-teal-50 dark:bg-teal-900/20 text-teal-500'}`}>
                                        <ClipboardDocumentCheckIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                            {pres.content.type === 'emergency' ? 'Emergência' : pres.content.type === 'weekly_review' ? 'Revisão de Rotina' : 'Ajuste Clínico'}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1">{new Date(pres.createdAt).toLocaleDateString()} • {pres.content.summary.slice(0, 30)}...</p>
                                        
                                        <div className="flex gap-2 mt-2">
                                            {pres.content.actions.medication && (
                                                <span className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">
                                                    {pres.content.actions.medication.length} Meds
                                                </span>
                                            )}
                                            {pres.digitalSignatureHash && (
                                                <span className="text-[10px] bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <ShieldCheckIcon className="w-3 h-3" /> Assinado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRightIcon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PatientPrescriptions;
