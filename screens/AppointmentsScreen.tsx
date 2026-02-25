
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Appointment, DaySlotStatus } from '../types';
import { CalendarDaysIcon, ArrowPathIcon, PlusIcon, XMarkIcon, CheckCircleIcon, ClockIcon } from '../components/icons';

interface AppointmentsScreenProps {
    onBack: () => void;
}

const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({ onBack }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [daySlots, setDaySlots] = useState<DaySlotStatus[]>([]); // New structure
    const [fetchingSlots, setFetchingSlots] = useState(false);

    // Form state for adding appointment
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [newAppType, setNewAppType] = useState<'consultation' | 'exam_review' | 'follow_up'>('consultation');
    const [newAppNotes, setNewAppNotes] = useState('');
    const [addingApp, setAddingApp] = useState(false);
    const [addError, setAddError] = useState('');
    const [currentUserDoctorId, setCurrentUserDoctorId] = useState<string | null>(null);

    const fetchAppointmentsAndSlots = async () => {
        setLoading(true);
        setFetchingSlots(true);
        try {
            const user = await api.getUser();
            setCurrentUserDoctorId(user.doctorId || null);

            if (!user.id) throw new Error("ID do paciente não encontrado.");

            let fetchedAppointments: Appointment[] = [];
            let fetchedSlots: DaySlotStatus[] = [];

            if (user.doctorId) {
                fetchedAppointments = await api.getPatientAppointments(user.id);
                // Busca o status de todos os horários do dia
                fetchedSlots = await api.getDayScheduleStatus(user.doctorId, currentDate);
            }
            
            setAppointments(fetchedAppointments);
            setDaySlots(fetchedSlots);

        } catch (e: any) {
            console.error("Error loading appointments or slots:", e);
            setAddError(e.message || "Erro ao carregar consultas ou horários disponíveis.");
        } finally {
            setLoading(false);
            setFetchingSlots(false);
        }
    };

    useEffect(() => {
        fetchAppointmentsAndSlots();
    }, [currentDate]); // Refetch when date changes

    const handleAddAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingApp(true);
        setAddError('');

        if (!selectedSlot || !currentUserDoctorId) {
            setAddError("Selecione um horário e certifique-se de ter um médico atribuído.");
            setAddingApp(false);
            return;
        }

        try {
            const user = await api.getUser();
            if (!user.id) {
                throw new Error("ID do paciente não encontrado.");
            }
            
            await api.createAppointment(user.id, currentUserDoctorId, currentDate, selectedSlot, newAppType, newAppNotes);
            
            // Reload appointments and available slots after adding
            await fetchAppointmentsAndSlots();

            setShowAddModal(false);
            setSelectedSlot(null);
            setNewAppType('consultation');
            setNewAppNotes('');
        } catch (e: any) {
            setAddError(e.message || "Erro ao agendar consulta. O horário pode ter sido preenchido.");
        } finally {
            setAddingApp(false);
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentDate(e.target.value);
    };

    const handleOpenAddModal = (slot: string) => {
        setSelectedSlot(slot);
        setAddError(''); // Clear previous errors
        setShowAddModal(true);
    };

    if (loading && fetchingSlots) {
        return (
            <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950">
                <ArrowPathIcon className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen bg-white dark:bg-slate-950 flex flex-col">
            <header className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm z-10">
                <button onClick={onBack} className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-white flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    Voltar
                </button>
                <h1 className="text-lg font-bold text-center flex-1 text-slate-800 dark:text-white">Minhas Consultas</h1>
                <div className="w-10"></div> {/* Spacer to balance header */}
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:max-w-2xl lg:mx-auto w-full">
                {/* Date Selector */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Selecione a Data</label>
                    <input 
                        type="date" 
                        value={currentDate}
                        onChange={handleDateChange}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>

                {!currentUserDoctorId ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
                        <CalendarDaysIcon className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-700" />
                        <p className="font-medium text-slate-600 dark:text-slate-400">Você ainda não tem um médico atribuído.</p>
                        <p className="text-xs mt-2">Por favor, escolha um médico para agendar consultas.</p>
                    </div>
                ) : (
                    <>
                        {/* Day Slots Grid */}
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Agenda do Dia ({new Date(currentDate).toLocaleDateString('pt-BR')})</h2>
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {daySlots.map(slot => {
                                const isAvailable = slot.status === 'available';
                                const isBlocked = slot.status === 'blocked';
                                const isBooked = slot.status === 'booked';
                                
                                return (
                                    <button
                                        key={slot.time}
                                        onClick={() => isAvailable && handleOpenAddModal(slot.time)}
                                        disabled={!isAvailable}
                                        className={`font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors border ${
                                            isAvailable 
                                                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-800 border-transparent cursor-pointer' 
                                                : isBlocked
                                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-400 border-red-200 dark:border-red-800 opacity-80 cursor-not-allowed'
                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-400 border-red-200 dark:border-red-800 opacity-80 cursor-not-allowed' // Same visual for booked/blocked for user simplicity, or could vary
                                        }`}
                                        title={isBlocked ? "Horário indisponível (Bloqueio do Médico)" : isBooked ? "Horário já agendado" : "Agendar"}
                                    >
                                        <ClockIcon className="w-5 h-5" /> 
                                        {slot.time}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Your Scheduled Appointments */}
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Suas Próximas Consultas</h2>
                        {appointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
                                <CalendarDaysIcon className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
                                <p className="font-medium text-slate-600 dark:text-slate-400">Nenhuma consulta agendada.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {appointments
                                    .filter(appt => new Date(`${appt.date}T${appt.time}`).getTime() >= new Date().getTime()) // Show future/current appointments
                                    .sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
                                    .map(appt => (
                                    <div key={appt.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                        <div className={`p-3 rounded-full flex-shrink-0 ${appt.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                            <CalendarDaysIcon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800 dark:text-white">
                                                {appt.type === 'consultation' ? 'Consulta Médica' : appt.type === 'exam_review' ? 'Revisão de Exames' : 'Retorno'}
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(appt.date).toLocaleDateString('pt-BR')} às {appt.time}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{appt.doctorName || 'Seu Médico'}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${appt.status === 'scheduled' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                            {appt.status === 'scheduled' ? 'Agendada' : 'Concluída'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Add Appointment Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Confirmar Consulta</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                                <XMarkIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddAppointment} className="p-6">
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Data e Hora</label>
                                <p className="text-lg font-bold text-slate-800 dark:text-white">{new Date(currentDate).toLocaleDateString('pt-BR')} às {selectedSlot}</p>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Tipo de Consulta</label>
                                <select 
                                    value={newAppType}
                                    onChange={e => setNewAppType(e.target.value as any)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="consultation">Consulta Médica</option>
                                    <option value="exam_review">Revisão de Exames</option>
                                    <option value="follow_up">Retorno</option>
                                </select>
                            </div>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Notas (Opcional)</label>
                                <textarea
                                    value={newAppNotes}
                                    onChange={e => setNewAppNotes(e.target.value)}
                                    placeholder="Detalhes adicionais para o médico..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 h-24 resize-none"
                                ></textarea>
                            </div>
                            
                            {addError && <p className="mb-4 text-red-500 text-sm">{addError}</p>}

                            <button 
                                type="submit" 
                                disabled={addingApp}
                                className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {addingApp ? (
                                    <>
                                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                        Agendando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Confirmar Agendamento
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentsScreen;
