
import React, { useState, useEffect, useRef } from 'react';
import { api, formatError } from '../services/api';
import { FamilyMember } from '../types';
import { UsersIcon, PlusIcon, XMarkIcon, EnvelopeIcon, ArrowPathIcon, ShieldCheckIcon, ClockIcon, ShareIcon, QrCodeIcon, CameraIcon, CheckCircleIcon } from '../components/icons';
import { GoogleGenAI } from "@google/genai";

interface FamilyManagerProps {
    onBack: () => void;
    onSelectMember?: (member: FamilyMember) => void;
}

declare global {
  class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
    static getSupportedFormats(): Promise<string[]>;
  }
}

const FamilyManager: React.FC<FamilyManagerProps> = ({ onBack, onSelectMember }) => {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
    
    // Invite State
    const [email, setEmail] = useState('');
    const [relation, setRelation] = useState('');
    const [sendingInvite, setSendingInvite] = useState(false);
    
    // QR Code State
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [myQrUrl, setMyQrUrl] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scanSuccess, setScanSuccess] = useState('');
    
    const qrInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.getFamilyMembers();
                setMembers(data);
                const user = await api.getUser();
                const qrData = JSON.stringify({ action: 'drx_family_invite', id: user.id, name: user.name });
                setMyQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&color=0f172a&bgcolor=e2e8f0`);
            } catch(e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendingInvite(true);
        try {
            const newList = await api.addFamilyMember(email, relation || 'Familiar');
            setMembers(newList);
            setShowInviteModal(false);
            setEmail('');
            setRelation('');
        } catch (error) { console.error(error); } finally { setSendingInvite(false); }
    };
    
    const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setScanning(true);
        setScanError('');
        setScanSuccess('');
        
        try {
            const imageBitmap = await createImageBitmap(file);
            if ('BarcodeDetector' in window) {
                try {
                    const detector = new BarcodeDetector({ formats: ['qr_code'] });
                    const matches = await detector.detect(imageBitmap);
                    if (matches.length > 0) {
                        await api.connectFamilyByQr(matches[0].rawValue);
                        setScanSuccess("Conectado!");
                        reloadMembers();
                        return;
                    }
                } catch (e) { console.warn("Nativo falhou", e); }
            }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                try {
                    const base64Data = (reader.result as string).split(',')[1];
                    // Fix: Initializing GoogleGenAI right before the API call as per guidelines
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                    const response = await ai.models.generateContent({
                        // Fix: Updated model to gemini-3-flash-preview for latest image understanding capabilities
                        model: 'gemini-3-flash-preview',
                        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }, { text: "Read QR code JSON string only." }] }
                    });
                    const text = response.text ? response.text.replace(/```json/g, '').replace(/```/g, '').trim() : '';
                    if (text) {
                        await api.connectFamilyByQr(text);
                        setScanSuccess("Conectado via IA!");
                        reloadMembers();
                    } else {
                        throw new Error("Empty response from AI");
                    }
                } catch (aiError) { setScanError("Falha na leitura."); }
            };
        } catch (err: any) { setScanError(formatError(err)); } finally { setScanning(false); }
    };
    
    const reloadMembers = async () => {
        const data = await api.getFamilyMembers();
        setMembers(data);
        setTimeout(() => setShowQrScanner(false), 1500);
    };

    const getAvatarColor = (relation: string) => {
        if (relation.includes('Mãe') || relation.includes('Pai')) return 'bg-purple-500';
        if (relation.includes('Filho')) return 'bg-teal-500';
        return 'bg-blue-500';
    };

    const filteredMembers = members.filter(m => activeTab === 'members' ? m.status === 'active' : m.status !== 'active');

    return (
        <div className="h-screen flex flex-col bg-slate-950 text-white">
            <header className="p-4 flex items-center border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-10">
                <button onClick={onBack} className="text-slate-400 font-medium hover:text-white flex items-center gap-1 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                    Voltar
                </button>
                <h1 className="text-lg font-bold text-center flex-1 mr-8">Família</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:max-w-2xl lg:mx-auto w-full">
                {/* QR Card */}
                <div onClick={() => setShowQrScanner(true)} className="bg-slate-900 rounded-2xl p-6 shadow-lg mb-8 relative overflow-hidden cursor-pointer group border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-800 p-3 rounded-xl group-hover:bg-slate-700 transition-colors">
                                <QrCodeIcon className="w-8 h-8 text-teal-400" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">Conectar via QR</h2>
                                <p className="text-slate-400 text-sm mt-1">Adicione familiares instantaneamente</p>
                            </div>
                        </div>
                        <CameraIcon className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 border-b border-slate-800 mb-6">
                    <button onClick={() => setActiveTab('members')} className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'members' ? 'text-blue-400' : 'text-slate-500'}`}>
                        Membros Ativos
                        {activeTab === 'members' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-t-full"></span>}
                    </button>
                    <button onClick={() => setActiveTab('invites')} className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'invites' ? 'text-blue-400' : 'text-slate-500'}`}>
                        Convites
                        {activeTab === 'invites' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-t-full"></span>}
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><ArrowPathIcon className="w-8 h-8 text-slate-500 animate-spin" /></div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredMembers.length === 0 ? (
                            <div className="text-center p-12 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                                <UsersIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Nenhum registro.</p>
                                {activeTab === 'members' && <button onClick={() => setShowInviteModal(true)} className="mt-4 text-teal-400 font-bold text-sm">Adicionar Familiar</button>}
                            </div>
                        ) : (
                            filteredMembers.map(member => (
                                <div key={member.id} onClick={() => { if (member.status === 'active' && onSelectMember) onSelectMember(member); }} className={`bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between ${member.status === 'active' ? 'cursor-pointer hover:border-blue-800' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${getAvatarColor(member.relation)}`}>
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{member.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">{member.relation}</span>
                                                {member.status === 'active' && <span className="text-[10px] text-slate-500 flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {member.lastSeen}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {member.status !== 'active' && <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">Pendente</span>}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
            
            <div className="absolute bottom-6 right-6">
                <button onClick={() => setShowInviteModal(true)} className="bg-teal-600 text-white p-4 rounded-full shadow-xl hover:bg-teal-500 transition-transform active:scale-95 flex items-center gap-2 border border-white/10">
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>
            
            {showQrScanner && (
                <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 animate-fade-in">
                    <button onClick={() => setShowQrScanner(false)} className="absolute top-6 right-6 bg-white/10 p-3 rounded-full text-white hover:bg-white/20"><XMarkIcon className="w-6 h-6" /></button>
                    <h2 className="text-white font-bold text-2xl mb-8">Escanear QR</h2>
                    <div className="bg-slate-200 p-6 rounded-3xl shadow-2xl mb-8"><img src={myQrUrl} alt="QR" className="w-64 h-64 object-contain" /></div>
                    <input type="file" accept="image/*" capture="environment" className="hidden" ref={qrInputRef} onChange={handleScanFile} />
                    {scanning ? <div className="text-teal-400 font-bold animate-pulse">Lendo...</div> : <button onClick={() => qrInputRef.current?.click()} className="w-full max-w-xs bg-teal-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3"><CameraIcon className="w-6 h-6" /> Ler Câmera</button>}
                    {scanSuccess && <div className="mt-4 text-green-400 font-bold text-sm bg-green-900/30 py-2 px-4 rounded-lg">{scanSuccess}</div>}
                </div>
            )}

            {showInviteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-800 animate-fade-in-up">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-xl text-white">Convidar</h3>
                            <button onClick={() => setShowInviteModal(false)} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700"><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleInvite} className="p-6">
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">E-mail</label>
                                <div className="relative">
                                    <EnvelopeIcon className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-teal-500 text-white" required />
                                </div>
                            </div>
                            <div className="mb-8">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Parentesco</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Mãe', 'Pai', 'Filho(a)', 'Cônjuge', 'Irmão(ã)', 'Cuidador'].map(opt => (
                                        <button key={opt} type="button" onClick={() => setRelation(opt)} className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${relation === opt ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={sendingInvite} className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-500 flex items-center justify-center gap-2 disabled:opacity-70">
                                {sendingInvite ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Enviar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyManager;
