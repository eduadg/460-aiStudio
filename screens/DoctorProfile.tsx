
import React, { useState, useEffect, useRef } from 'react';
import { api, formatError } from '../services/api';
import { User, DoctorReview } from '../types';
import { 
    UserCircleIcon, CameraIcon, PencilIcon, CheckCircleIcon, ArrowPathIcon, 
    LockClosedIcon, StarIcon, BellIcon, TrashIcon, ExclamationTriangleIcon, 
    ChartBarIcon, InstagramIcon, ShieldCheckIcon, NeuralIcon, ArrowRightOnRectangleIcon, EnvelopeIcon
} from '../components/icons';

interface DoctorProfileProps {
    onBack: () => void;
    onLogout: () => void;
}

// --- EDIT PROFILE FORM COMPONENT ---
const DoctorEditProfileForm: React.FC<{ user: User, onCancel: () => void, onSave: (u: User) => void }> = ({ user, onCancel, onSave }) => {
    const [name, setName] = useState(user.name || '');
    const [specialty, setSpecialty] = useState(user.specialty || '');
    const [crm, setCrm] = useState(user.crm || '');
    const [bio, setBio] = useState(user.bio || '');
    const [instagram, setInstagram] = useState(user.instagramHandle || '');
    const [experience, setExperience] = useState(user.experienceYears?.toString() || '');
    const [manualCount, setManualCount] = useState(user.manualPatientCount?.toString() || '');
    const [aiInstructions, setAiInstructions] = useState(user.customAiInstructions || '');
    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
    
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFileToUpload(file);
            const reader = new FileReader();
            reader.onload = (ev) => { if (typeof ev.target?.result === 'string') setAvatarUrl(ev.target.result); };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let finalUrl = avatarUrl;
            if (fileToUpload) {
                finalUrl = await api.uploadAvatar(fileToUpload);
            }
            const updatedUser = await api.updateProfile(name, {
                specialty,
                crm,
                bio,
                instagramHandle: instagram,
                avatarUrl: finalUrl,
                experienceYears: parseInt(experience) || 0,
                manualPatientCount: parseInt(manualCount) || 0,
                customAiInstructions: aiInstructions
            });
            onSave(updatedUser);
        } catch (e: any) {
            alert("Erro ao salvar perfil: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] p-6 border border-slate-800 shadow-2xl animate-fade-in mb-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-xl flex items-center gap-3">
                    <div className="bg-teal-500/20 p-2 rounded-full text-teal-400">
                        <PencilIcon className="w-5 h-5" />
                    </div>
                    Editar Perfil
                </h3>
                <button onClick={onCancel} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </button>
            </div>
            
            <div className="flex flex-col items-center mb-8">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-32 h-32 rounded-full bg-slate-800 overflow-hidden border-4 border-slate-700 shadow-2xl group-hover:border-teal-500/50 transition-all duration-300">
                        {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <UserCircleIcon className="w-full h-full text-slate-600" />}
                    </div>
                    <div className="absolute bottom-1 right-1 bg-teal-600 p-2.5 rounded-full border-4 border-slate-900 shadow-lg group-hover:bg-teal-500 transition-colors">
                        <CameraIcon className="w-5 h-5 text-white" />
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                <p className="text-xs text-slate-500 mt-3 font-medium uppercase tracking-wider">Alterar Foto</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Nome Profissional</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-teal-500 transition-colors focus:ring-1 focus:ring-teal-500/50"
                            placeholder="Dr. Nome Sobrenome"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Especialidade</label>
                            <input 
                                type="text" 
                                value={specialty} 
                                onChange={e => setSpecialty(e.target.value)} 
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                                placeholder="Ex: Cardiologia"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">CRM</label>
                            <input 
                                type="text" 
                                value={crm} 
                                onChange={e => setCrm(e.target.value)} 
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                                placeholder="00000-UF"
                            />
                        </div>
                    </div>
                </div>

                {/* Bio & Social */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Bio Profissional</label>
                    <textarea 
                        value={bio} 
                        onChange={e => setBio(e.target.value)} 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors h-28 resize-none"
                        placeholder="Descreva sua experiência, formação e abordagem..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Instagram</label>
                    <div className="relative">
                        <InstagramIcon className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
                        <input 
                            type="text" 
                            value={instagram} 
                            onChange={e => setInstagram(e.target.value)} 
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-teal-500 transition-colors"
                            placeholder="@seu.perfil"
                        />
                    </div>
                </div>

                {/* Professional Stats Block */}
                <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-800">
                    <h4 className="text-sm font-bold text-blue-300 mb-4 flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4" /> Estatísticas Públicas
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Anos de Exp.</label>
                            <input 
                                type="number" 
                                value={experience} 
                                onChange={e => setExperience(e.target.value)} 
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                                placeholder="Ex: 10"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Pacientes</label>
                            <input 
                                type="number" 
                                value={manualCount} 
                                onChange={e => setManualCount(e.target.value)} 
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                                placeholder="Ex: 1000"
                            />
                        </div>
                    </div>
                </div>

                {/* AI Configuration Block */}
                <div className="bg-purple-900/10 p-5 rounded-2xl border border-purple-500/20">
                    <h4 className="text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                        <NeuralIcon className="w-4 h-4" /> Configuração da IA (Dr. X)
                    </h4>
                    <p className="text-[11px] text-purple-400/70 mb-3 leading-tight">
                        Instrua como o Dr. X deve se comportar ao interagir com seus pacientes.
                    </p>
                    <textarea 
                        value={aiInstructions} 
                        onChange={e => setAiInstructions(e.target.value)} 
                        className="w-full bg-slate-950/80 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors h-28 resize-none text-sm placeholder:text-purple-300/30"
                        placeholder="Ex: Seja formal, foque em prevenção, cite estudos recentes, evite gírias..."
                    />
                </div>

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckCircleIcon className="w-5 h-5" />}
                        Salvar Todas as Alterações
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- ACCOUNT SETTINGS COMPONENT ---
const AccountSettings: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    
    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [changingPass, setChangingPass] = useState(false);

    // Email Change State
    const [newEmail, setNewEmail] = useState('');
    const [changingEmail, setChangingEmail] = useState(false);
    const [emailSuccess, setEmailSuccess] = useState(false);

    const handleUpdatePassword = async () => {
        try { await api.updatePassword(newPassword); alert("Senha alterada com sucesso!"); setChangingPass(false); setNewPassword(''); } catch(e:any){ alert(e.message); }
    };

    const handleUpdateEmail = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            alert("E-mail inválido.");
            return;
        }
        try {
            await api.updateEmail(newEmail);
            setEmailSuccess(true);
            setTimeout(() => {
                setEmailSuccess(false);
                setChangingEmail(false);
                setNewEmail('');
            }, 3000);
        } catch (e: any) {
            alert(formatError(e));
        }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            await api.deleteAccount();
            onLogout();
        } catch (e: any) { alert(e.message); setDeleting(false); setShowDeleteModal(false); }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Dados de Acesso Block */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2rem] p-6 border border-slate-800 shadow-sm">
                <h3 className="text-white font-bold flex items-center gap-3 mb-4 text-lg"><EnvelopeIcon className="w-6 h-6 text-teal-400" /> Dados de Acesso</h3>
                
                {!changingEmail ? (
                    <div className="space-y-3">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">E-mail Atual</p>
                                <p className="text-white font-medium text-sm">{user.email}</p>
                            </div>
                            <button onClick={() => setChangingEmail(true)} className="text-xs font-bold text-teal-400 hover:text-teal-300">Alterar</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50">
                        {emailSuccess ? (
                            <div className="flex flex-col items-center justify-center py-4 text-green-400">
                                <CheckCircleIcon className="w-8 h-8 mb-2" />
                                <p className="text-xs text-center font-bold">Link de confirmação enviado para o novo e-mail!</p>
                            </div>
                        ) : (
                            <>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Novo E-mail</label>
                                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="novo@email.com" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-teal-500 outline-none transition-colors" />
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setChangingEmail(false)} className="flex-1 bg-slate-800 text-slate-400 hover:text-white font-bold py-3 rounded-xl text-sm transition-colors">Cancelar</button>
                                    <button onClick={handleUpdateEmail} disabled={!newEmail} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">Salvar E-mail</button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 text-center italic">Você precisará confirmar o novo endereço.</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2rem] p-6 border border-slate-800 shadow-sm">
                <h3 className="text-white font-bold flex items-center gap-3 mb-4 text-lg"><BellIcon className="w-6 h-6 text-yellow-400" /> Notificações</h3>
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                    <span className="text-slate-300 text-sm font-medium">Alertas Push</span>
                    <span className="text-green-400 text-xs font-bold bg-green-900/20 px-3 py-1 rounded-full border border-green-500/20">Ativo</span>
                </div>
                <p className="text-slate-500 text-xs mt-3 ml-1">Gerencie os alertas de pacientes críticos nas configurações do sistema.</p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2rem] p-6 border border-slate-800 shadow-sm">
                <h3 className="text-white font-bold flex items-center gap-3 mb-4 text-lg"><LockClosedIcon className="w-6 h-6 text-blue-400" /> Segurança</h3>
                
                {!changingPass ? (
                    <button onClick={() => setChangingPass(true)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold text-white border border-slate-700 transition-colors flex justify-between items-center px-6">
                        Alterar Senha
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-500"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
                    </button>
                ) : (
                    <div className="space-y-3 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nova Senha</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-teal-500 outline-none transition-colors" />
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setChangingPass(false)} className="flex-1 bg-slate-800 text-slate-400 hover:text-white font-bold py-3 rounded-xl text-sm transition-colors">Cancelar</button>
                            <button onClick={handleUpdatePassword} disabled={!newPassword} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">Salvar Senha</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2rem] p-6 border border-slate-800 shadow-sm">
                <h3 className="text-red-500 font-bold flex items-center gap-3 mb-4 text-lg"><TrashIcon className="w-6 h-6" /> Zona de Perigo</h3>
                <button onClick={() => setShowDeleteModal(true)} className="w-full py-4 bg-red-950/30 hover:bg-red-900/50 rounded-xl text-sm font-bold text-red-500 border border-red-900/30 transition-colors">Excluir minha conta</button>
                <p className="text-[10px] text-slate-500 mt-3 text-center italic">Esta ação apagará permanentemente todos os seus dados e vínculos.</p>
            </div>

            <button onClick={onLogout} className="w-full py-4 text-slate-300 font-bold bg-slate-800 hover:bg-slate-700 hover:text-white rounded-2xl border border-slate-700 transition-all mt-4 flex items-center justify-center gap-2">
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Sair da Conta
            </button>

            {/* Modal de Exclusão */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                        <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <ExclamationTriangleIcon className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-white text-center mb-2 tracking-tight">Tem certeza?</h3>
                        <p className="text-slate-400 text-center text-sm mb-8 leading-relaxed">Você perderá o acesso a todos os prontuários e monitoramento dos seus pacientes ativos.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleDeleteAccount} disabled={deleting} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-900/40 active:scale-95">
                                {deleting ? <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto" /> : 'Sim, Excluir Conta'}
                            </button>
                            <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="w-full py-4 text-slate-400 font-bold hover:text-white transition-colors">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN PROFILE COMPONENT ---
const DoctorProfile: React.FC<DoctorProfileProps> = ({ onBack, onLogout }) => {
    const [user, setUser] = useState<User | null>(null);
    const [reviews, setReviews] = useState<DoctorReview[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Simplification: Only two tabs
    const [activeTab, setActiveTab] = useState<'overview' | 'account'>('overview');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        const load = async () => {
            const u = await api.getUser();
            setUser(u);
            const myReviews = await api.getDoctorReviews(u.id!);
            setReviews(myReviews);
            setLoading(false);
        };
        load();
    }, []);

    const handleSaveProfile = (updatedUser: User) => {
        setUser(updatedUser);
        setIsEditing(false);
    };

    if (loading || !user) return <div className="h-screen bg-slate-950 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 text-teal-500 animate-spin"/></div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Header */}
            <header className="p-4 flex items-center gap-4 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-800">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 transition-colors">
                    <ArrowPathIcon className="w-5 h-5 rotate-180" />
                </button>
                <h1 className="text-lg font-bold flex-1 text-center pr-9">Perfil do Especialista</h1>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:max-w-2xl lg:mx-auto w-full">
                
                {/* Simplified Tabs */}
                {!isEditing && (
                    <div className="flex p-1 bg-slate-900 rounded-2xl mb-6 border border-slate-800">
                        <button 
                            onClick={() => setActiveTab('overview')} 
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Visão Geral
                        </button>
                        <button 
                            onClick={() => setActiveTab('account')} 
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'account' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Minha Conta
                        </button>
                    </div>
                )}

                {/* Conditional Rendering */}
                {isEditing ? (
                    <DoctorEditProfileForm user={user} onCancel={() => setIsEditing(false)} onSave={handleSaveProfile} />
                ) : activeTab === 'overview' ? (
                    <div className="space-y-6 animate-fade-in">
                        
                        {/* Profile Card */}
                        <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-800 relative overflow-hidden shadow-xl text-center group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
                            
                            {/* Avatar with Edit Button */}
                            <div className="relative inline-block mx-auto mb-6">
                                <div className="w-32 h-32 rounded-full border-4 border-slate-800 bg-slate-800 overflow-hidden shadow-2xl">
                                    {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Profile" /> : <UserCircleIcon className="w-full h-full text-slate-600" />}
                                </div>
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="absolute bottom-0 right-0 bg-slate-700 hover:bg-teal-600 text-white p-2.5 rounded-full border-4 border-slate-900 shadow-lg transition-colors z-10"
                                    title="Editar Perfil"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-white mb-1">{user.name}</h2>
                            <p className="text-teal-400 font-medium uppercase text-xs tracking-wider mb-2">{user.specialty || 'Especialidade não definida'}</p>
                            
                            {user.crm && (
                                <div className="inline-flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 mb-6">
                                    <ShieldCheckIcon className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] font-mono text-slate-300">CRM {user.crm}</span>
                                </div>
                            )}

                            {/* Stats */}
                            {(user.experienceYears || user.manualPatientCount) && (
                                <div className="flex justify-center gap-8 mb-6 border-t border-slate-800 pt-6">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-white">{user.experienceYears || 0}+</p>
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Anos Exp.</p>
                                    </div>
                                    <div className="w-px bg-slate-800"></div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-white">{user.manualPatientCount || 0}</p>
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Pacientes</p>
                                    </div>
                                </div>
                            )}

                            {user.bio && (
                                <p className="text-slate-400 text-sm italic mb-6 max-w-md mx-auto leading-relaxed">"{user.bio}"</p>
                            )}

                            {user.instagramHandle && (
                                <a href={`https://instagram.com/${user.instagramHandle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-xs font-bold transition-colors bg-slate-800 px-4 py-2 rounded-full">
                                    <InstagramIcon className="w-4 h-4 text-pink-500" />
                                    {user.instagramHandle}
                                </a>
                            )}
                        </div>
                        
                        {/* AI Persona Card */}
                        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-[2rem] p-6 border border-indigo-500/20 relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                    <NeuralIcon className="w-5 h-5" />
                                </div>
                                <h3 className="text-indigo-200 font-bold text-sm uppercase tracking-wide">Dr. X Persona</h3>
                            </div>
                            {user.customAiInstructions ? (
                                <p className="text-sm text-slate-300 italic">"{user.customAiInstructions.slice(0, 150)}{user.customAiInstructions.length > 150 ? '...' : ''}"</p>
                            ) : (
                                <p className="text-sm text-slate-500 italic">Nenhuma instrução personalizada definida.</p>
                            )}
                            <button onClick={() => setIsEditing(true)} className="text-[10px] font-bold text-indigo-400 mt-4 uppercase tracking-wider hover:text-indigo-300 transition-colors">
                                Editar Comportamento &rarr;
                            </button>
                        </div>

                        {/* Reviews */}
                        <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-6 border border-slate-800 shadow-lg">
                            <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg"><StarIcon className="w-5 h-5 text-yellow-400" /> Avaliações ({reviews.length})</h3>
                            {reviews.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-2xl">
                                    <p className="text-slate-500 text-sm">Nenhuma avaliação recebida.</p>
                                </div>
                            ) : (
                                reviews.map(r => (
                                    <div key={r.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800/50 mb-3 hover:border-slate-700 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-slate-200 text-sm font-bold">{r.patientName}</p>
                                            <div className="flex text-yellow-500 text-[10px]">{'★'.repeat(r.rating)}</div>
                                        </div>
                                        <p className="text-slate-400 text-sm italic">"{r.comment}"</p>
                                        <p className="text-slate-600 text-[10px] mt-2 text-right">{new Date(r.createdAt).toLocaleDateString()}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    // Account Settings Tab
                    <AccountSettings user={user} onLogout={onLogout} />
                )}
            </main>
        </div>
    );
};

export default DoctorProfile;
