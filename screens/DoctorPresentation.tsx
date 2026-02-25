
import React, { useEffect, useState, useRef } from 'react';
import { api, formatError } from '../services/api';
import { User, DoctorReview, TimelineEvent, VideoEntry } from '../types';
import { 
    UserCircleIcon, XMarkIcon, InstagramIcon, StarIcon, 
    CheckCircleIcon, ArrowPathIcon, ShareIcon, SparklesIcon, 
    ShieldCheckIcon, CameraIcon, PhoneIcon, ChatBubbleOvalLeftEllipsisIcon,
    CalendarDaysIcon, VideoCameraIcon, BoltIcon, ChevronRightIcon
} from '../components/icons';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface DoctorPresentationProps {
    doctorId: string;
    onClose: () => void;
    onNavigateToChat?: (msg?: string) => void;
    onCallDrX?: () => void;
    onBookAppointment?: () => void;
}

const DoctorPresentation: React.FC<DoctorPresentationProps> = ({ 
    doctorId, 
    onClose, 
    onNavigateToChat, 
    onCallDrX,
    onBookAppointment 
}) => {
    const [doctor, setDoctor] = useState<User | null>(null);
    const [reviews, setReviews] = useState<DoctorReview[]>([]);
    const [patientVideos, setPatientVideos] = useState<VideoEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [relationshipInsight, setRelationshipInsight] = useState<string>('');
    const [isMonitoring, setIsMonitoring] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const user = await api.getUser();
                const myDoc = await api.getMyDoctor();
                const fullProfile = await api.getPatientFullProfile(user.id!);
                
                // Set doctor data
                const targetDoc = myDoc && myDoc.id === doctorId ? myDoc : (await api.getAllDoctors()).find(d => d.id === doctorId);
                setDoctor(targetDoc || null);

                if (targetDoc?.id) {
                    const [docReviews] = await Promise.all([
                        api.getDoctorReviews(targetDoc.id)
                    ]);
                    setReviews(docReviews);
                    setPatientVideos(fullProfile.videos || []);
                    
                    // Simula se o médico está online/monitorando
                    setIsMonitoring(Math.random() > 0.3);
                    
                    // Gerar Insight de Relacionamento via Gemini
                    generateRelationshipInsight(targetDoc, fullProfile.timeline);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [doctorId]);

    const generateRelationshipInsight = async (doc: User, timeline: TimelineEvent[]) => {
        try {
            const ai = new GoogleGenerativeAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY as string });
            const lastEvents = timeline.slice(0, 3).map(e => `${e.title} em ${new Date(e.timestamp).toLocaleDateString()}`).join(', ');
            
            const prompt = `Gere uma frase curta (máximo 120 caracteres) e acolhedora em português sobre a relação entre o paciente e seu médico Dr. ${doc.name}. 
            Contexto recente: ${lastEvents || 'Início do acompanhamento agora'}. 
            Exemplo: "O Dr. ${doc.name.split(' ')[0]} revisou seus últimos sinais vitais há 2 dias e mantém seu plano ativo."`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ parts: [{ text: prompt }] }]
            });
            setRelationshipInsight(response.text || '');
        } catch (e) {
            setRelationshipInsight(`Dr. ${doc.name.split(' ')[0]} está acompanhando sua evolução de perto.`);
        }
    };

    if (loading) return (
        <div className="fixed inset-0 bg-slate-950 z-[110] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
                <p className="text-teal-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando com Especialista</p>
            </div>
        </div>
    );

    if (!doctor) return null;

    return (
        <div className="fixed inset-0 bg-slate-950 z-[110] overflow-y-auto animate-fade-in text-white pb-32">
            
            {/* 1. IMMERSIVE HEADER */}
            <div className="relative h-[40vh] min-h-[350px]">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-slate-950 to-slate-950 z-0"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                
                {/* Top Nav */}
                <div className="relative z-20 p-6 flex justify-between items-center">
                    <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 hover:bg-white/20 transition-all">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    <div className="flex gap-2">
                        <button className="p-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10"><ShareIcon className="w-6 h-6" /></button>
                    </div>
                </div>

                {/* Hero Info */}
                <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex flex-col items-center">
                    <div className="relative mb-6 group">
                        <div className={`absolute -inset-1.5 bg-gradient-to-r from-teal-400 to-blue-600 rounded-full opacity-75 blur transition duration-1000 ${isMonitoring ? 'animate-pulse' : ''}`}></div>
                        <div className="relative w-32 h-32 rounded-full border-4 border-slate-950 bg-slate-800 overflow-hidden shadow-2xl">
                            {doctor.avatarUrl ? (
                                <img src={doctor.avatarUrl} className="w-full h-full object-cover" alt={doctor.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><UserCircleIcon className="w-20 h-20 text-slate-600" /></div>
                            )}
                        </div>
                        {isMonitoring && (
                            <div className="absolute top-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center" title="Monitorando agora">
                                <BoltIcon className="w-3 h-3 text-white animate-pulse" />
                            </div>
                        )}
                    </div>
                    
                    <h1 className="text-3xl font-black tracking-tight text-center">{doctor.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-teal-400 font-bold uppercase tracking-[0.2em] text-[10px]">{doctor.specialty}</span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                        <span className="text-slate-500 font-mono text-[10px]">CRM {doctor.crm}</span>
                    </div>
                </div>
            </div>

            <div className="px-6 space-y-8 max-w-2xl mx-auto">
                
                {/* 2. AI RELATIONSHIP INSIGHT */}
                {relationshipInsight && (
                    <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                            <SparklesIcon className="w-20 h-20 text-indigo-400" />
                        </div>
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Sincronia Dr. X</p>
                                <p className="text-sm text-slate-200 leading-relaxed font-medium">"{relationshipInsight}"</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. RECENT VIDEOS FROM DOCTOR */}
                {patientVideos.length > 0 && (
                    <section>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">Vídeos de Orientação</h3>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                            {patientVideos.map(video => (
                                <div key={video.id} className="min-w-[200px] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg group cursor-pointer hover:border-teal-500/30 transition-all">
                                    <div className="relative aspect-video bg-black">
                                        {video.thumbnailUrl ? (
                                            <img src={video.thumbnailUrl} className="w-full h-full object-cover opacity-60" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-20"><VideoCameraIcon className="w-8 h-8" /></div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <VideoCameraIcon className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-xs font-bold text-white truncate">{video.title}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">{new Date(video.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 4. BIO & EXPERIENCE */}
                <section className="bg-slate-900/40 rounded-[2rem] p-6 border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <ShieldCheckIcon className="w-5 h-5 text-teal-500" /> Sobre o Profissional
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed italic mb-6">
                        "{doctor.bio || 'Especialista focado em medicina de precisão e acompanhamento contínuo.'}"
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                            <p className="text-2xl font-bold text-white">{doctor.experienceYears || '10'}+</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Anos de Prática</p>
                        </div>
                        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                            <p className="text-2xl font-bold text-white">Top 1%</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Especialidade</p>
                        </div>
                    </div>
                </section>

                {/* 5. REVIEWS */}
                <section>
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Avaliações</h3>
                        <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                            <StarIcon className="w-4 h-4 fill-yellow-400" />
                            <span>{reviews.length > 0 ? (reviews.reduce((a,b)=>a+b.rating,0)/reviews.length).toFixed(1) : '5.0'}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {reviews.slice(0, 2).map(rev => (
                            <div key={rev.id} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50">
                                <p className="text-sm text-slate-300 italic mb-2">"{rev.comment}"</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{rev.patientName}</span>
                                    <div className="flex text-yellow-500 text-[10px]">{'★'.repeat(rev.rating)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* 6. FLOATING ACTION BAR */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-11/12 max-w-md z-[120] animate-fade-in-up">
                <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-full p-2 flex items-center justify-between shadow-2xl shadow-black/50">
                    <button 
                        onClick={() => onCallDrX && onCallDrX()}
                        className="flex-1 flex flex-col items-center gap-1 py-3 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <div className="p-2 bg-red-500/20 rounded-full text-red-400"><PhoneIcon className="w-5 h-5" /></div>
                        <span className="text-[9px] font-bold uppercase text-slate-400">Emergência</span>
                    </button>
                    
                    <button 
                        onClick={() => onNavigateToChat && onNavigateToChat()}
                        className="flex-1 flex flex-col items-center gap-1 py-3 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <div className="p-2 bg-blue-500/20 rounded-full text-blue-400"><ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" /></div>
                        <span className="text-[9px] font-bold uppercase text-slate-400">Mensagem</span>
                    </button>
                    
                    <button 
                        onClick={() => onBookAppointment && onBookAppointment()}
                        className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 h-14 rounded-full flex items-center justify-center gap-2 px-6 shadow-lg shadow-teal-900/40 hover:scale-105 active:scale-95 transition-all"
                    >
                        <CalendarDaysIcon className="w-5 h-5 text-white" />
                        <span className="text-sm font-black text-white uppercase tracking-wider">Agendar</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DoctorPresentation;
