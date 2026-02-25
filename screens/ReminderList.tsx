
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Reminder } from '../types';
import { BellIcon, ArrowPathIcon, PlusIcon, XMarkIcon, CheckCircleIcon, TrashIcon, ClockIcon } from '../components/icons';

interface ReminderListProps {
    onBack: () => void;
    onRemindersViewed?: () => void;
}

const ReminderList: React.FC<ReminderListProps> = ({ onBack, onRemindersViewed }) => {
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [newType, setNewType] = useState<Reminder['type']>('general');
    const [newTime, setNewTime] = useState('08:00');
    const [newFrequency, setNewFrequency] = useState<Reminder['frequency']>('daily');
    const [addingReminder, setAddingReminder] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const user = await api.getUser();
                setReminders(await api.getReminders(user.id!));
                if (onRemindersViewed) onRemindersViewed();
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, [onRemindersViewed]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingReminder(true);
        try {
            const user = await api.getUser();
            await api.createReminder(user.id!, { message: newMessage, type: newType, time: newTime, frequency: newFrequency, isActive: true });
            setReminders(await api.getReminders(user.id!));
            setShowAddModal(false);
            setNewMessage('');
        } catch (e) { alert("Erro ao criar."); } finally { setAddingReminder(false); }
    };

    const handleToggle = async (id: string, status: boolean) => {
        try {
            await api.updateReminderStatus(id, !status);
            setReminders(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: string) => {
        try { await api.deleteReminder(id); setReminders(prev => prev.filter(r => r.id !== id)); } catch (e) { console.error(e); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><ArrowPathIcon className="w-8 h-8 text-teal-500 animate-spin" /></div>;

    return (
        <div className="h-screen bg-slate-950 flex flex-col text-white">
            <header className="p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 bg-slate-950/90 backdrop-blur z-10">
                <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg> Voltar</button>
                <h1 className="text-lg font-bold">Lembretes</h1>
                <button onClick={() => setShowAddModal(true)} className="p-2 bg-teal-600/20 text-teal-400 rounded-full hover:bg-teal-600/40"><PlusIcon className="w-6 h-6" /></button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:max-w-2xl lg:mx-auto w-full">
                {reminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center">
                        <BellIcon className="w-16 h-16 mb-4 text-slate-700" />
                        <p className="font-medium">Nenhum lembrete ativo.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reminders.map(rem => (
                            <div key={rem.id} className={`bg-slate-900 p-5 rounded-2xl shadow-sm border flex items-center gap-4 ${rem.isActive ? 'border-teal-900/50' : 'border-slate-800 opacity-60'}`}>
                                <div className={`p-3 rounded-full ${rem.isActive ? 'bg-teal-900/30 text-teal-400' : 'bg-slate-800 text-slate-500'}`}><BellIcon className="w-6 h-6" /></div>
                                <div className="flex-1">
                                    <h3 className={`font-bold ${rem.isActive ? 'text-white' : 'text-slate-400 line-through'}`}>{rem.message}</h3>
                                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><ClockIcon className="w-3 h-3" /> {rem.time} • {rem.frequency}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => handleToggle(rem.id, rem.isActive)} className={`p-2 rounded-full ${rem.isActive ? 'bg-green-900/20 text-green-400' : 'bg-slate-800 text-slate-400'}`}>{rem.isActive ? <CheckCircleIcon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}</button>
                                    <button onClick={() => handleDelete(rem.id)} className="p-2 bg-red-900/20 text-red-400 rounded-full hover:bg-red-900/40"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-800 animate-fade-in-up p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-white">Novo Lembrete</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAdd}>
                            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Tomar remédio..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 mb-4 text-white focus:outline-none focus:border-teal-500" required />
                            <div className="flex gap-2 mb-4">
                                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" required />
                                <select value={newFrequency} onChange={e => setNewFrequency(e.target.value as any)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500">
                                    <option value="daily">Diário</option>
                                    <option value="weekly">Semanal</option>
                                    <option value="once">Uma vez</option>
                                </select>
                            </div>
                            <button type="submit" disabled={addingReminder} className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-500 disabled:opacity-50">{addingReminder ? 'Salvando...' : 'Criar'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReminderList;
