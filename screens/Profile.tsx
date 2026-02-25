
import React, { useState, useMemo } from 'react';
import { UserCircleIcon, RingIcon, ChevronRightIcon, ArrowPathIcon, RulerIcon, ScaleIcon, CakeIcon, ChartBarIcon, SparklesIcon, TrashIcon, ExclamationTriangleIcon } from '../components/icons';
import { api } from '../services/api';
import { useUser } from '../contexts/UserContext';

interface ProfileProps {
    // user prop removed, consumed from context
    onConnectDeviceClick: () => void;
    onLogout: () => void;
    onEditProfile?: () => void;
    onViewHistory?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onConnectDeviceClick, onLogout, onEditProfile, onViewHistory }) => {
    const { user } = useUser();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const getBMI = (heightStr?: string, weightStr?: string) => {
        if (!heightStr || !weightStr) return null;
        const h = parseFloat(heightStr.toString().replace(',', '.'));
        const w = parseFloat(weightStr.toString().replace(',', '.'));
        if (h <= 0 || w <= 0) return null;
        const bmi = w / (h * h);
        const value = bmi.toFixed(1);
        let category = '', color = '', iconColor = '';
        if (bmi < 18.5) { category = 'Abaixo do Peso'; color = 'text-blue-400'; iconColor = 'text-blue-500'; }
        else if (bmi < 24.9) { category = 'Peso Normal'; color = 'text-green-400'; iconColor = 'text-green-500'; }
        else if (bmi < 29.9) { category = 'Sobrepeso'; color = 'text-yellow-400'; iconColor = 'text-yellow-500'; }
        else { category = 'Obesidade'; color = 'text-red-400'; iconColor = 'text-red-500'; }
        return { value, category, color, iconColor };
    };

    const bmiData = useMemo(() => user ? getBMI(user.height, user.weight) : null, [user]);

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            await api.deleteAccount();
            onLogout(); // Redireciona para login limpando estado global após deleção bem-sucedida
        } catch (e: any) {
            alert(e.message);
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const ProfileItem: React.FC<{ icon: React.ReactNode; label: string; value?: string; onClick?: () => void; active?: boolean; destructive?: boolean }> = ({ icon, label, value, onClick, active, destructive }) => (
        <button onClick={onClick} className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors mb-3 group">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${destructive ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : active ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    {icon}
                </div>
                <div className="text-left">
                    <p className={`font-bold ${destructive ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>{label}</p>
                    {value && <p className="text-sm text-slate-400 dark:text-slate-500">{value}</p>}
                </div>
            </div>
            <ChevronRightIcon className={`w-5 h-5 ${destructive ? 'text-red-400' : 'text-slate-400 dark:text-slate-600'}`} />
        </button>
    );

    if (!user) return null;

    return (
        <div className="p-4 md:p-6 lg:max-w-4xl lg:mx-auto pb-24">
            <header className="flex flex-col items-center py-6">
                <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden">
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="Perfil" className="w-full h-full object-cover" /> : <UserCircleIcon className="w-16 h-16 text-slate-400 dark:text-slate-500" />}
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
                <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
                <button onClick={onEditProfile} className="mt-2 text-teal-600 dark:text-teal-400 text-sm font-semibold hover:underline">Editar Perfil</button>
            </header>

            <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm text-center border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-center mb-2"><CakeIcon className="w-5 h-5 text-pink-400" /></div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Idade</p>
                    <p className="font-bold text-slate-800 dark:text-white text-lg">{user.birthDate ? `${new Date().getFullYear() - new Date(user.birthDate).getFullYear()} anos` : '--'}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm text-center border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    <div className="flex justify-center mb-2"><SparklesIcon className={`w-5 h-5 ${bmiData ? bmiData.iconColor : 'text-slate-400'}`} /></div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">IMC</p>
                    <p className={`font-bold text-lg ${bmiData ? bmiData.color : 'text-slate-800 dark:text-white'}`}>{bmiData ? bmiData.value : '--'}</p>
                    {bmiData && <p className={`text-[10px] font-bold uppercase mt-1 ${bmiData.color} opacity-80`}>{bmiData.category}</p>}
                </div>
            </div>

            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 px-1">Dispositivos</h2>
            <ProfileItem icon={<RingIcon className="w-6 h-6" />} label="Smart Ring" value={user.deviceConnected ? `Conectado • Bateria ${user.batteryLevel}%` : "Não conectado"} active={user.deviceConnected} onClick={onConnectDeviceClick} />

            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 px-1 mt-6">Dados & Segurança</h2>
            {onViewHistory && <ProfileItem icon={<ChartBarIcon className="w-6 h-6" />} label="Histórico Completo" value="Suas interações e sinais vitais" onClick={onViewHistory} />}
            
            <ProfileItem 
                icon={<TrashIcon className="w-6 h-6" />} 
                label="Excluir minha conta" 
                value="Remover permanentemente todos os dados" 
                destructive 
                onClick={() => setShowDeleteModal(true)} 
            />

            <div className="mt-8 mb-4">
                <button onClick={onLogout} className="w-full py-4 text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800/50 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">Sair da Conta</button>
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-red-500/20 shadow-2xl">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ExclamationTriangleIcon className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2 tracking-tight">Excluir Conta?</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-6 leading-relaxed">Esta ação removerá todos os seus registros de saúde, refeições e histórico de chat de forma permanente.</p>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleDeleteAccount} 
                                disabled={deleting} 
                                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 active:scale-95"
                            >
                                {deleting ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Sim, excluir permanentemente'}
                            </button>
                            <button 
                                onClick={() => setShowDeleteModal(false)} 
                                disabled={deleting} 
                                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
