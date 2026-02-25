
import React, { useState, useRef, useMemo } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { UserCircleIcon, ArrowPathIcon, CameraIcon, ScaleIcon, ChevronRightIcon } from '../components/icons';

interface EditProfileProps {
    user: User;
    onCancel: () => void;
    onSaveSuccess: (updatedUser: User) => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ user, onCancel, onSaveSuccess }) => {
    const [name, setName] = useState(user.name);
    const [birthDate, setBirthDate] = useState(user.birthDate || '');
    const [height, setHeight] = useState(user.height || '');
    const [weight, setWeight] = useState(user.weight || '');
    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const bmiData = useMemo(() => {
        const h = parseFloat(height.replace(',', '.'));
        const w = parseFloat(weight.replace(',', '.'));
        if (h > 0 && w > 0) {
            const bmi = w / (h * h);
            return { value: bmi.toFixed(1), category: bmi < 18.5 ? 'Abaixo do peso' : bmi < 24.9 ? 'Normal' : 'Sobrepeso', color: bmi < 18.5 ? 'text-blue-400' : bmi < 24.9 ? 'text-green-400' : 'text-yellow-400' };
        }
        return null;
    }, [height, weight]);

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
            if (fileToUpload) finalUrl = await api.uploadAvatar(fileToUpload);
            const updated = await api.updateProfile(name, { birthDate, height: height.replace(',', '.'), weight: weight.replace(',', '.'), avatarUrl: finalUrl });
            onSaveSuccess(updated);
        } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-950 text-white">
             <header className="bg-slate-950/90 backdrop-blur-md p-4 flex items-center border-b border-slate-800 sticky top-0 z-10">
                <button onClick={onCancel} className="text-slate-400 font-medium hover:text-white flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg> Voltar
                </button>
                <h1 className="text-lg font-bold text-center flex-1 mr-8">Editar Perfil</h1>
            </header>

            <main className="flex-1 p-6 lg:max-w-2xl lg:mx-auto w-full overflow-y-auto">
                <div className="flex flex-col items-center mb-8">
                     <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-28 h-28 rounded-full bg-slate-900 overflow-hidden flex items-center justify-center border-4 border-slate-800 shadow-xl group-hover:border-slate-700 transition-colors">
                            {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <UserCircleIcon className="w-20 h-20 text-slate-600" />}
                        </div>
                        <div className="absolute bottom-0 right-0 bg-teal-600 p-2.5 rounded-full shadow-lg border border-slate-900 hover:bg-teal-500 transition-colors">
                            <CameraIcon className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 focus:outline-none focus:border-teal-500 text-white placeholder:text-slate-600" placeholder="Seu nome" />
                    </div>
                    
                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><ScaleIcon className="w-4 h-4 text-teal-400" /> Biometria & IMC</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nascimento</label>
                                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-teal-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Altura (m)</label>
                                <input type="number" step="0.01" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="1.75" className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-teal-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Peso (kg)</label>
                                <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="80" className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-teal-500" />
                            </div>
                        </div>
                        {bmiData && (
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                                <div><p className="text-xs text-slate-500 font-bold uppercase">IMC</p><p className="text-xl font-bold text-white">{bmiData.value}</p></div>
                                <div className={`text-xs font-bold ${bmiData.color} bg-white/5 px-3 py-1 rounded-full`}>{bmiData.category}</div>
                            </div>
                        )}
                    </div>
                    
                    {error && <div className="p-3 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-900/50">{error}</div>}

                    <div className="mt-4 flex gap-3 pb-6">
                        <button type="button" onClick={onCancel} className="flex-1 bg-slate-900 text-slate-400 font-bold py-4 rounded-xl hover:bg-slate-800">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="flex-1 bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-500 shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2">
                            {isLoading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Salvar'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default EditProfile;
