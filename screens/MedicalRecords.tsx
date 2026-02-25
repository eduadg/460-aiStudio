
import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowPathIcon, DocumentTextIcon, BeakerIcon, CloudArrowUpIcon, 
    PhotoIcon, PlusIcon, XMarkIcon, ChevronRightIcon, CheckCircleIcon,
    ExclamationTriangleIcon, ShieldCheckIcon, CameraIcon
} from '../components/icons';
import { api, formatError } from '../services/api';
import { ClinicalCondition, LabExam, LabMarker } from '../types';

interface MedicalRecordsProps {
    onBack: () => void;
}

const MedicalRecords: React.FC<MedicalRecordsProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'clinical' | 'exams'>('clinical');
    const [conditions, setConditions] = useState<ClinicalCondition[]>([]);
    const [exams, setExams] = useState<LabExam[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Scanner State
    const [showScanner, setShowScanner] = useState(false);
    const [scanStep, setScanStep] = useState<'upload' | 'analyzing' | 'review' | 'saving'>('upload');
    const [scannedImage, setScannedImage] = useState<string | null>(null);
    const [scannedFile, setScannedFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null); // Raw JSON from AI
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await api.getUser();
            const records = await api.getMedicalRecords(user.id!);
            setConditions(records.conditions);
            setExams(records.exams);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- SCANNER LOGIC ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setScannedFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (typeof ev.target?.result === 'string') {
                    setScannedImage(ev.target.result);
                    startAnalysis(file);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const startAnalysis = async (file: File) => {
        setScanStep('analyzing');
        try {
            const result = await api.analyzeMedicalExam(file);
            setAnalysisResult(result);
            setScanStep('review');
        } catch (e: any) {
            alert("Erro na análise IA: " + formatError(e));
            setScanStep('upload');
        }
    };

    const handleSaveExam = async () => {
        if (!analysisResult) return;
        setScanStep('saving');
        try {
            await api.saveLabExam(analysisResult, scannedImage || undefined);
            await loadData(); // Reload lists
            setShowScanner(false);
            setScanStep('upload');
            setScannedImage(null);
            setAnalysisResult(null);
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
            setScanStep('review');
        }
    };

    // --- RENDERERS ---

    const renderConditionCard = (c: ClinicalCondition) => (
        <div key={c.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-3 flex items-start gap-4">
            <div className={`p-3 rounded-full mt-1 ${c.type === 'allergy' ? 'bg-red-900/20 text-red-500' : 'bg-blue-900/20 text-blue-500'}`}>
                <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
            <div>
                <h4 className="font-bold text-white text-base">{c.name}</h4>
                <div className="flex gap-2 mt-1">
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase font-bold">{c.type === 'family_history' ? 'Histórico Familiar' : c.type === 'allergy' ? 'Alergia' : 'Condição Crônica'}</span>
                    {c.severity && <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${c.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{c.severity}</span>}
                </div>
                {c.notes && <p className="text-xs text-slate-500 mt-2 italic">"{c.notes}"</p>}
            </div>
        </div>
    );

    const renderExamCard = (exam: LabExam) => (
        <div key={exam.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 mb-4 shadow-sm hover:border-slate-700 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="bg-teal-900/20 p-2.5 rounded-xl text-teal-500 group-hover:text-teal-400 transition-colors">
                        <BeakerIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-base">{exam.title}</h4>
                        <p className="text-xs text-slate-500">{new Date(exam.date).toLocaleDateString()}</p>
                    </div>
                </div>
                {exam.url && <div className="text-slate-600 hover:text-white"><PhotoIcon className="w-5 h-5" /></div>}
            </div>
            
            {/* Markers Preview */}
            <div className="space-y-2">
                {exam.markers.slice(0, 3).map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-800/50 pb-1 last:border-0">
                        <span className="text-slate-400">{m.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">{m.value} <span className="text-[10px] font-normal text-slate-600">{m.unit}</span></span>
                            {m.status !== 'normal' && (
                                <span className={`w-2 h-2 rounded-full ${m.status === 'high' ? 'bg-red-500' : m.status === 'low' ? 'bg-blue-500' : 'bg-red-600 animate-pulse'}`}></span>
                            )}
                        </div>
                    </div>
                ))}
                {exam.markers.length > 3 && <p className="text-center text-[10px] text-slate-600 pt-1">+{exam.markers.length - 3} biomarcadores</p>}
            </div>
        </div>
    );

    if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 text-teal-600 animate-spin"/></div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col relative">
            
            {/* --- HEADER --- */}
            <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-10">
                <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1">
                    <ChevronRightIcon className="w-5 h-5 rotate-180" /> Voltar
                </button>
                <h1 className="text-lg font-bold">Prontuário Digital</h1>
                <div className="w-10"></div>
            </header>

            {/* --- TABS --- */}
            <div className="flex p-4 gap-4">
                <button 
                    onClick={() => setActiveTab('clinical')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'clinical' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900'}`}
                >
                    Resumo Clínico
                </button>
                <button 
                    onClick={() => setActiveTab('exams')}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'exams' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-900'}`}
                >
                    Exames
                </button>
            </div>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto px-4 pb-24">
                
                {/* Clinical Tab */}
                {activeTab === 'clinical' && (
                    <div className="animate-fade-in">
                        {conditions.length === 0 ? (
                            <div className="text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                                <ShieldCheckIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">Nenhuma condição registrada.</p>
                            </div>
                        ) : (
                            conditions.map(renderConditionCard)
                        )}
                        
                        {/* Placeholder for Add Condition Button (Future Feature) */}
                        <button className="w-full mt-4 py-3 border border-slate-800 rounded-xl text-slate-500 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors">
                            <PlusIcon className="w-4 h-4" /> Adicionar Condição
                        </button>
                    </div>
                )}

                {/* Exams Tab */}
                {activeTab === 'exams' && (
                    <div className="animate-fade-in">
                        {/* Smart Scan CTA */}
                        <div 
                            onClick={() => setShowScanner(true)}
                            className="bg-gradient-to-r from-teal-900/40 to-blue-900/40 border border-teal-500/30 rounded-2xl p-6 mb-6 cursor-pointer group hover:border-teal-500/60 transition-all shadow-lg"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="bg-teal-500 p-2.5 rounded-xl shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
                                        <CameraIcon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Smart Scan</h3>
                                </div>
                                <span className="bg-teal-500/20 text-teal-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border border-teal-500/20">Novo</span>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Fotografe seu exame de sangue. A IA irá extrair e salvar os resultados automaticamente.
                            </p>
                        </div>

                        {exams.length === 0 ? (
                            <div className="text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                                <BeakerIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">Nenhum exame importado.</p>
                            </div>
                        ) : (
                            exams.map(renderExamCard)
                        )}
                    </div>
                )}
            </main>

            {/* --- SMART SCANNER MODAL --- */}
            {showScanner && (
                <div className="fixed inset-0 bg-black/95 z-50 flex flex-col animate-fade-in">
                    <div className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900">
                        <h2 className="font-bold text-lg flex items-center gap-2"><CameraIcon className="w-5 h-5 text-teal-500"/> Smart Scan</h2>
                        <button onClick={() => { setShowScanner(false); setScanStep('upload'); setScannedImage(null); }} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><XMarkIcon className="w-5 h-5 text-slate-400"/></button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                        
                        {/* Step 1: Upload */}
                        {scanStep === 'upload' && (
                            <div className="text-center w-full max-w-sm animate-fade-in-up">
                                <div className="border-4 border-dashed border-slate-700 rounded-[2rem] h-80 flex flex-col items-center justify-center bg-slate-900/50 mb-8 cursor-pointer hover:border-teal-500/50 hover:bg-slate-800/50 transition-all relative group" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xl">
                                        <CloudArrowUpIcon className="w-10 h-10 text-teal-500" />
                                    </div>
                                    <p className="font-bold text-slate-300">Toque para enviar foto</p>
                                    <p className="text-xs text-slate-500 mt-2">JPG, PNG ou PDF</p>
                                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
                                </div>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto">Certifique-se de que a imagem esteja bem iluminada e os textos legíveis.</p>
                            </div>
                        )}

                        {/* Step 2: Analyzing */}
                        {scanStep === 'analyzing' && (
                            <div className="text-center animate-fade-in">
                                <div className="relative w-32 h-32 mx-auto mb-8">
                                    <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full animate-ping"></div>
                                    <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                                    {scannedImage && <img src={scannedImage} className="w-full h-full object-cover rounded-full opacity-50 p-2" />}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Analisando...</h3>
                                <p className="text-slate-400 text-sm">Identificando biomarcadores e valores de referência.</p>
                            </div>
                        )}

                        {/* Step 3: Review */}
                        {scanStep === 'review' && analysisResult && (
                            <div className="w-full h-full flex flex-col animate-fade-in">
                                <div className="bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-800">
                                    <h3 className="font-bold text-lg text-white">{analysisResult.title}</h3>
                                    <p className="text-xs text-slate-500">{analysisResult.date}</p>
                                    <p className="text-sm text-slate-300 mt-2 italic bg-slate-950 p-2 rounded-lg border border-slate-800">"{analysisResult.summary}"</p>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4 custom-scrollbar">
                                    {analysisResult.markers.map((m: any, idx: number) => (
                                        <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-sm text-slate-200">{m.name}</p>
                                                <p className="text-[10px] text-slate-500">Ref: {m.referenceRange}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono font-bold text-white">{m.value} <span className="text-[10px] font-normal text-slate-500">{m.unit}</span></p>
                                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${m.status === 'normal' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>{m.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button onClick={handleSaveExam} className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-teal-500 flex items-center justify-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5" /> Confirmar e Salvar
                                </button>
                            </div>
                        )}
                        
                        {/* Step 4: Saving */}
                        {scanStep === 'saving' && (
                             <div className="text-center animate-fade-in">
                                <ArrowPathIcon className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4" />
                                <p className="text-white font-bold">Salvando no Prontuário...</p>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicalRecords;
