
import React, { useState, useEffect } from 'react';
import { api, formatError } from '../services/api';
import { User } from '../types';
import { UserCircleIcon, ArrowPathIcon, CheckCircleIcon, SparklesIcon } from '../components/icons';

interface ChooseDoctorProps {
    onComplete: () => void;
}

const ChooseDoctor: React.FC<ChooseDoctorProps> = ({ onComplete }) => {
    const [doctors, setDoctors] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try { setDoctors(await api.getAllDoctors()); } 
            catch (e: any) { setError(formatError(e)); } 
            finally { setLoading(false); }
        };
        load();
    }, []);

    const filteredDoctors = doctors.filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || (doc.specialty && doc.specialty.toLowerCase().includes(searchTerm.toLowerCase())));

    const handleConfirm = async () => {
        if (!selectedDoctorId) return;
        setSaving(true);
        try { await api.assignDoctor(selectedDoctorId); onComplete(); } 
        catch (e: any) { setError(formatError(e)); setSaving(false); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><ArrowPathIcon className="w-8 h-8 text-teal-500 animate-spin" /></div>;

    return (
        <div className="h-screen bg-slate-950 flex flex-col text-white">
            <header className="p-8 bg-gradient-to-b from-teal-900/20 to-slate-950">
                <h1 className="text-2xl font-bold mb-1">Seu Especialista</h1>
                <p className="text-slate-400 text-sm">Escolha quem irá monitorar sua saúde com IA.</p>
            </header>

            <main className="flex-1 overflow-y-auto px-6 pb-6 lg:max-w-2xl lg:mx-auto w-full">
                <div className="mb-6">
                    <input 
                        type="text"
                        placeholder="Buscar médico ou especialidade..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 text-white placeholder:text-slate-600"
                    />
                </div>

                {error && <div className="mb-4 p-3 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-900/50">{error}</div>}

                <div className="grid grid-cols-1 gap-4">
                    {filteredDoctors.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">Nenhum médico encontrado.</div>
                    ) : (
                        filteredDoctors.map(doctor => (
                            <div 
                                key={doctor.id}
                                onClick={() => setSelectedDoctorId(doctor.id || null)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                                    selectedDoctorId === doctor.id 
                                    ? 'bg-teal-900/20 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.15)]' 
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                }`}
                            >
                                <div className="w-14 h-14 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700">
                                    {doctor.avatarUrl ? <img src={doctor.avatarUrl} alt={doctor.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><UserCircleIcon className="w-8 h-8 text-slate-600" /></div>}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-white text-lg">{doctor.name}</h3>
                                    <p className="text-teal-400 text-xs font-bold uppercase tracking-wide">{doctor.specialty || 'Geral'}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-slate-500 text-[10px] bg-slate-950 px-2 py-0.5 rounded">CRM {doctor.crm || '---'}</span>
                                        {doctor.customAiInstructions && <SparklesIcon className="w-3 h-3 text-purple-400" />}
                                    </div>
                                </div>
                                {selectedDoctorId === doctor.id && <CheckCircleIcon className="w-6 h-6 text-teal-500" />}
                            </div>
                        ))
                    )}
                </div>
            </main>

            <footer className="p-6 bg-slate-950 border-t border-slate-900">
                <button 
                    onClick={handleConfirm}
                    disabled={!selectedDoctorId || saving}
                    className="w-full bg-teal-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-teal-900/30 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {saving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Confirmar Médico'}
                </button>
            </footer>
        </div>
    );
};

export default ChooseDoctor;
