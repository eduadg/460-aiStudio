
import { supabase } from './supabaseClient';
import { Measure, DoctorMetric, UrgentCase, User, ChatMessage, PatientSummary, FamilyMember, Meal, SleepSession, SleepStage, NutritionReport, MedicalActionPlan, Prescription, CallLog, DoctorReview, PatientFullProfile, TimelineEvent, Appointment, Reminder, VideoEntry, SuggestedReminder, NutritionInsight, DoctorAvailabilityBlock, DaySlotStatus, ClinicalCondition, LabExam, LabMarker } from '../types';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { offlineService, STORES_CONST } from './offline';

// Helper para formatar erros de forma segura
export const formatError = (error: any): string => {
    if (!error) return "Erro desconhecido";
    if (typeof error === 'string') {
        if (error.includes('Failed to fetch')) return "Modo Offline. Dados salvos localmente.";
        return error;
    }
    if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) return "Modo Offline. Dados salvos localmente.";
        return error.message;
    }
    if (error.message) return error.message;
    if (error.error_description) return error.error_description;
    try {
        return JSON.stringify(error);
    } catch (e) {
        return "Erro no objeto de erro";
    }
};

// Helper interno para formatar data relativa
const formatTimeAgo = (isoString: string) => {
    if (!isoString || isoString === 'Nunca') return 'Desconhecido';
    if (!isoString.includes('T')) return isoString; 
    
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    return date.toLocaleDateString('pt-BR');
};

const mapProfileToUser = (p: any): User | null => {
    if (!p) return null;
    return {
        ...p,
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role ? p.role.toLowerCase() : 'patient', 
        avatarUrl: p.avatar_url,
        doctorId: p.doctor_id,
        deviceConnected: !!p.device_connected,
        batteryLevel: p.battery_level || 0,
        hasFirstMeasurement: !!p.has_first_measurement,
        lastSync: formatTimeAgo(p.last_sync),
        birthDate: p.birth_date,
        height: p.height,
        weight: p.weight,
        crm: p.crm,
        specialty: p.specialty,
        bio: p.bio,
        customAiInstructions: p.custom_ai_instructions,
        elevenLabsVoiceId: p.elevenlabs_voice_id,
        instagramHandle: p.instagram_handle,
        manualPatientCount: p.manual_patient_count,
        patientCount: p.patient_count,
        experienceYears: p.experience_years,
        telemedicineConsent: p.telemedicine_consent,
        telemedicineConsentDate: p.telemedicine_consent_date,
        lastRemindersViewedAt: p.last_reminders_viewed_at,
    };
};

export const api = {
    // --- AUTHENTICATION & ACCOUNT ---
    login: async (email: string, pass: string, role: 'patient' | 'doctor'): Promise<User> => {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: pass });
        
        if (authError) {
            if (authError.message.includes('Invalid login credentials')) {
                throw new Error("E-mail ou senha incorretos.");
            }
            if (authError.message.includes('Email not confirmed')) {
                throw new Error("Por favor, confirme seu e-mail antes de entrar.");
            }
            throw new Error(formatError(authError));
        }

        if (!authData.user) throw new Error("Falha na autenticação: usuário não retornado.");

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

        const mappedUser = mapProfileToUser(profile);
        
        if (!mappedUser) {
            await supabase.auth.signOut();
            throw new Error("Perfil de usuário não encontrado. Entre em contato com o suporte.");
        }

        return mappedUser;
    },

    register: async (email: string, pass: string, name: string, role: 'patient' | 'doctor'): Promise<User> => {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email, 
            password: pass, 
            options: { 
                data: { name, role },
                emailRedirectTo: window.location.origin 
            }
        });
        
        if (authError) {
            if (authError.message.includes('already registered')) {
                throw new Error("Este e-mail já está em uso.");
            }
            throw new Error(formatError(authError));
        }
        
        if (authData.user && !authData.session) {
            throw new Error("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
        }
        
        if (!authData.user) throw new Error("Erro ao criar usuário.");

        const newProfileData = { 
            id: authData.user.id, 
            email, 
            name, 
            role: role.toLowerCase(), 
            device_connected: false, 
            last_sync: new Date().toISOString() 
        };
        
        const { error: insertError } = await supabase.from('profiles').insert([newProfileData]);
        if (insertError) throw new Error(`Erro ao criar perfil: ${insertError.message}`);

        return mapProfileToUser(newProfileData)!;
    },

    deleteAccount: async (): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessão expirada ou usuário não autenticado.");

        const userId = user.id;

        try {
            await Promise.all([
                supabase.from('measures').delete().eq('user_id', userId),
                supabase.from('chat_history').delete().eq('user_id', userId),
                supabase.from('meals').delete().eq('user_id', userId),
            ]);

            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (profileError) throw profileError;
            await supabase.auth.signOut();
        } catch (e: any) {
            console.error("Erro crítico na deleção:", e);
            throw new Error(`Não foi possível remover todos os dados: ${e.message}`);
        }
    },

    resetPassword: async (email: string): Promise<void> => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { 
            redirectTo: window.location.origin
        });
        if (error) throw new Error(formatError(error));
    },

    logout: async () => {
        await supabase.auth.signOut();
    },

    getSession: async (): Promise<User | null> => {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) return null;
        
        try {
            const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle();
            if (dbProfile) {
                offlineService.cacheData(STORES_CONST.PROFILE, [dbProfile]);
                return mapProfileToUser(dbProfile);
            }
        } catch (e) {
            console.warn("Offline: Reading profile from cache");
        }
        
        const cachedProfiles = await offlineService.getCachedData<any>(STORES_CONST.PROFILE);
        if (cachedProfiles.length > 0) return mapProfileToUser(cachedProfiles[0]);
        
        return null;
    },

    getUser: async (): Promise<User> => {
        const user = await api.getSession();
        if (!user) throw new Error("Usuário não autenticado");
        return user;
    },

    // --- VITALS & MEASURES ---
    getMeasures: async (): Promise<Measure[]> => {
        const user = await api.getUser();
        try {
            const { data } = await supabase.from('measures').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (data) {
                await offlineService.cacheData(STORES_CONST.MEASURES, data);
                return data.map(m => ({ id: m.id, title: m.type, value: m.value, date: new Date(m.created_at).toLocaleDateString('pt-BR'), type: m.type, trend: 'up', created_at: m.created_at }));
            }
        } catch (e) {
            console.warn("Offline: Reading measures from cache");
        }
        
        const cached = await offlineService.getCachedData<any>(STORES_CONST.MEASURES);
        return cached.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                     .map(m => ({ id: m.id, title: m.type, value: m.value, date: new Date(m.created_at).toLocaleDateString('pt-BR'), type: m.type, trend: 'up', created_at: m.created_at }));
    },

    saveSingleMeasure: async (type: Measure['type'], value: string, isSyncing = false): Promise<void> => {
        const user = await api.getUser();
        const payload = { user_id: user.id, type, value, created_at: new Date().toISOString() };
        
        if (!navigator.onLine && !isSyncing) {
            offlineService.addToQueue('SAVE_MEASURE', { type, value });
            const cached = await offlineService.getCachedData<any>(STORES_CONST.MEASURES);
            cached.push({...payload, id: `temp_${Date.now()}`});
            await offlineService.cacheData(STORES_CONST.MEASURES, cached);
            return;
        }

        try {
            await supabase.from('measures').insert(payload);
        } catch (e) {
            if (!isSyncing) offlineService.addToQueue('SAVE_MEASURE', { type, value });
            throw e;
        }
    },

    getPatientSummary: async (patientId: string): Promise<PatientSummary> => {
        try {
            const { data } = await supabase
                .from('measures')
                .select('*')
                .eq('user_id', patientId)
                .order('created_at', { ascending: false })
                .limit(50);

            const measures = data || [];
            const getVal = (type: string) => measures.find((m: any) => m.type === type)?.value;

            return { 
                heartRate: getVal('heart') || '--', 
                steps: getVal('steps') || '0', 
                sleep: getVal('sleep') || '--', 
                calories: getVal('calories') || '0', 
                spo2: getVal('spo2') || '--', 
                bloodPressure: getVal('pressure') || '--',
                stress: getVal('stress') || '--'
            };
        } catch (e) {
            console.error("Error fetching patient summary", e);
            return { heartRate: '--', steps: '0', sleep: '--', calories: '0', spo2: '--', bloodPressure: '--', stress: '--' };
        }
    },

    updateDeviceStatus: async (deviceConnected: boolean, batteryLevel?: number): Promise<void> => {
        try {
            const user = await api.getUser();
            await supabase.from('profiles').update({ device_connected: deviceConnected, battery_level: batteryLevel || 0, last_sync: new Date().toISOString() }).eq('id', user.id);
        } catch (e) { /* Ignore offline update for status */ }
    },

    completeFirstMeasurement: async (summary: PatientSummary, batteryLevel: number): Promise<void> => {
        const user = await api.getUser();
        await supabase.from('profiles').update({ has_first_measurement: true, battery_level: batteryLevel, last_sync: new Date().toISOString() }).eq('id', user.id);
        if (summary.heartRate) await api.saveSingleMeasure('heart', summary.heartRate);
        if (summary.steps) await api.saveSingleMeasure('steps', summary.steps);
        if (summary.spo2) await api.saveSingleMeasure('spo2', summary.spo2);
        if (summary.bloodPressure) await api.saveSingleMeasure('pressure', summary.bloodPressure);
    },

    updateProfile: async (name: string, updates: Partial<User>): Promise<User> => {
        const user = await api.getUser();
        await supabase.from('profiles').update({ name, birth_date: updates.birthDate, height: updates.height, weight: updates.weight, avatar_url: updates.avatarUrl, crm: updates.crm, specialty: updates.specialty, bio: updates.bio, custom_ai_instructions: updates.customAiInstructions, elevenlabs_voice_id: updates.elevenLabsVoiceId, instagram_handle: updates.instagramHandle, manual_patient_count: updates.manualPatientCount, experience_years: updates.experienceYears, telemedicine_consent: updates.telemedicineConsent, telemedicine_consent_date: updates.telemedicineConsentDate, last_reminders_viewed_at: updates.lastRemindersViewedAt }).eq('id', user.id);
        return api.getUser();
    },

    getPatientFullProfile: async (patientId: string): Promise<PatientFullProfile> => {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', patientId).maybeSingle();
        if (!p) throw new Error("Paciente não encontrado");
        const { data: chatHistory } = await supabase.from('chat_history').select('*').eq('user_id', patientId).order('created_at', { ascending: false }).limit(20);
        const { data: measures } = await supabase.from('measures').select('*').eq('user_id', patientId).order('created_at', { ascending: false }).limit(20);

        return { 
            basic: { id: p.id, name: p.name, age: p.birth_date ? (new Date().getFullYear() - new Date(p.birth_date).getFullYear()) : 30, condition: p.condition || 'Estável', risk: p.status === 'SOS' ? 'Crítico' : 'Baixo', glucose: '--', timestamp: p.last_sync, status: p.status === 'SOS' ? 'SOS' : 'online' }, 
            biometrics: { height: p.height, weight: p.weight, bmi: '24', age: p.birth_date ? (new Date().getFullYear() - new Date(p.birth_date).getFullYear()) : 30 }, 
            stats: { healthScore: 80, consistency: 90, activityGraph: [1,2,3,4,5,6,7], totalInteractions: chatHistory?.length || 0 }, 
            timeline: (chatHistory || []).map(t => ({ id: t.id, type: 'chat', title: t.sender === 'user' ? 'Mensagem do Paciente' : 'Resposta da IA', description: t.text, timestamp: t.created_at, icon: 'chat' })), 
            nutritionReport: undefined, meals: [], prescriptionHistory: [], videos: [], reminders: [],
            measures: (measures || []).map(m => ({
                id: m.id,
                title: m.type,
                value: m.value,
                date: new Date(m.created_at).toLocaleDateString('pt-BR'),
                type: m.type,
                trend: 'up',
                created_at: m.created_at
            }))
        };
    },

    // --- DOCTOR & CLINICAL ---
    getAllDoctors: async (): Promise<User[]> => {
        const { data } = await supabase.from('profiles').select('*').eq('role', 'doctor');
        return (data || []).map(p => mapProfileToUser(p)).filter(Boolean) as User[];
    },
    assignDoctor: async (doctorId: string): Promise<void> => {
        const user = await api.getUser();
        await supabase.from('profiles').update({ doctor_id: doctorId }).eq('id', user.id);
    },
    getMyDoctor: async (): Promise<User | null> => {
        const user = await api.getUser();
        if (!user.doctorId) return null;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.doctorId).maybeSingle();
        return data ? mapProfileToUser(data) : null;
    },
    getDoctorMetrics: async (): Promise<DoctorMetric[]> => {
        const user = await api.getUser();
        const { count: pCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id).eq('role', 'patient');
        const { count: aCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id).eq('status', 'SOS');
        return [
            { id: '1', label: 'Pacientes', value: pCount || 0, iconName: 'users', color: 'from-blue-600 to-indigo-600' },
            { id: '2', label: 'Alertas Ativos', value: aCount || 0, iconName: 'exclamation', color: 'from-red-600 to-orange-600' },
            { id: '3', label: 'Interações IA', value: 124, iconName: 'sparkles', color: 'from-purple-600 to-pink-600' },
            { id: '4', label: 'Engajamento', value: '85%', iconName: 'trending', color: 'from-green-600 to-teal-600' },
        ];
    },
    getUrgentCases: async (): Promise<UrgentCase[]> => {
        const user = await api.getUser();
        const { data: pts } = await supabase.from('profiles').select('*').eq('doctor_id', user.id).eq('role', 'patient');
        return (pts || []).map(p => ({ id: p.id, name: p.name, age: p.birth_date ? (new Date().getFullYear() - new Date(p.birth_date).getFullYear()) : 0, risk: p.status === 'SOS' ? 'Crítico' : 'Baixo', condition: p.condition || (p.status === 'SOS' ? 'Emergência' : 'Estável'), glucose: '--', timestamp: p.last_sync || new Date().toISOString(), status: p.status === 'SOS' ? 'SOS' : 'online', avatarUrl: p.avatar_url }));
    },
    getPatientLiveData: async (): Promise<{id: string, name: string, lastHeartRate: string, lastSync: string} | null> => {
        const user = await api.getUser();
        const { data } = await supabase.from('profiles').select('id, name, last_sync').eq('doctor_id', user.id).limit(1).maybeSingle();
        if (!data) return null;
        const summary = await api.getPatientSummary(data.id);
        return { id: data.id, name: data.name, lastHeartRate: summary.heartRate, lastSync: formatTimeAgo(data.last_sync) };
    },
    generateActionPlan: async (patientId: string): Promise<MedicalActionPlan> => {
        const healthContext = await api.getHealthContext(patientId);
        const ai = new GoogleGenerativeAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY as string });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Com base no contexto de saúde abaixo, gere um plano de ação médica curto em JSON.
            CONTEXTO: ${healthContext}
            FORMATO ESPERADO: { "type": "adjustment", "severity": "medium", "summary": "...", "actions": { "medication": [], "lifestyle": [], "exams": [] } }`
        });
        const planStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const plan = JSON.parse(planStr);
        return { ...plan, generatedAt: new Date().toISOString() };
    },

    // --- MEDICAL RECORDS & EXAMS (SMART SCAN) ---
    getMedicalRecords: async (userId: string): Promise<{conditions: ClinicalCondition[], exams: LabExam[]}> => {
        // Fallback mock if table doesn't exist yet, or proper Supabase select
        try {
            const { data: conditions } = await supabase.from('medical_conditions').select('*').eq('user_id', userId);
            const { data: exams } = await supabase.from('lab_exams').select('*').eq('user_id', userId).order('date', {ascending: false});
            return { conditions: conditions || [], exams: exams || [] };
        } catch (e) {
            console.warn("Medical Records Tables might be missing, returning empty.");
            return { conditions: [], exams: [] };
        }
    },

    saveMedicalCondition: async (condition: Omit<ClinicalCondition, 'id'>): Promise<void> => {
        const user = await api.getUser();
        await supabase.from('medical_conditions').insert({ user_id: user.id, ...condition });
    },

    analyzeMedicalExam: async (imageFile: File): Promise<any> => {
        const ai = new GoogleGenerativeAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY as string });
        
        // Convert File to Base64
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(imageFile);
        });
        
        const imageData = base64.split(',')[1];

        const prompt = `
            Analise esta imagem de um exame médico laboratorial.
            Extraia as seguintes informações em JSON estrito:
            {
                "title": "Nome do Exame (ex: Hemograma)",
                "date": "YYYY-MM-DD (ou data atual se não encontrar)",
                "summary": "Resumo de 1 frase sobre o resultado",
                "markers": [
                    {
                        "name": "Nome do biomarcador (ex: Colesterol Total)",
                        "value": "Valor numérico extraído",
                        "unit": "Unidade (ex: mg/dL)",
                        "referenceRange": "Intervalo de referência encontrado",
                        "status": "normal" | "high" | "low" | "critical" (baseado no valor e referência)
                    }
                ]
            }
            Se não for um exame legível, retorne erro no JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: imageFile.type, data: imageData } },
                    { text: prompt }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        return JSON.parse(text);
    },

    saveLabExam: async (examData: any, imageUrl?: string): Promise<void> => {
        const user = await api.getUser();
        // Assuming table 'lab_exams' exists with columns: user_id, title, date, url, markers (jsonb), summary
        await supabase.from('lab_exams').insert({
            user_id: user.id,
            title: examData.title,
            date: examData.date,
            url: imageUrl,
            markers: examData.markers,
            summary: examData.summary
        });
    },

    // --- APPOINTMENTS & AVAILABILITY ---
    getDoctorAvailabilityBlocks: async (doctorId: string, date: string): Promise<DoctorAvailabilityBlock[]> => {
        const { data } = await supabase.from('doctor_availability').select('*').eq('doctor_id', doctorId).eq('date', date);
        return (data || []).map(d => ({ id: d.id, doctorId: d.doctor_id, date: d.date, startTime: d.start_time, endTime: d.end_time, reason: d.reason }));
    },
    createDoctorAvailabilityBlock: async (doctorId: string, block: any): Promise<void> => {
        await supabase.from('doctor_availability').insert({ doctor_id: doctorId, date: block.date, start_time: block.startTime, end_time: block.endTime, reason: block.reason });
    },
    deleteDoctorAvailabilityBlock: async (id: string): Promise<void> => {
        await supabase.from('doctor_availability').delete().eq('id', id);
    },
    getDoctorAppointments: async (doctorId: string): Promise<Appointment[]> => {
        const { data } = await supabase.from('appointments').select('*, patient:profiles!appointments_patient_id_fkey(name)').eq('doctor_id', doctorId);
        return (data || []).map(a => ({ id: a.id, patientId: a.patient_id, doctorId: a.doctor_id, date: a.date, time: a.time, type: a.type, status: a.status, notes: a.notes, patientName: a.patient?.name }));
    },
    getPatientAppointments: async (patientId: string): Promise<Appointment[]> => {
        const { data } = await supabase.from('appointments').select('*, doctor:profiles!appointments_doctor_id_fkey(name)').eq('patient_id', patientId);
        return (data || []).map(a => ({ id: a.id, patientId: a.patient_id, doctorId: a.doctor_id, date: a.date, time: a.time, type: a.type, status: a.status, notes: a.notes, doctorName: a.doctor?.name }));
    },
    createAppointment: async (patientId: string, doctorId: string, date: string, time: string, type: string, notes: string): Promise<void> => {
        await supabase.from('appointments').insert({ patient_id: patientId, doctor_id: doctorId, date, time, type, notes, status: 'scheduled' });
    },
    getDayScheduleStatus: async (doctorId: string, date: string): Promise<DaySlotStatus[]> => {
        const slots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
        return slots.map(s => ({ time: s, status: 'available' as const }));
    },

    // --- REMINDERS ---
    getReminders: async (userId: string): Promise<Reminder[]> => {
        const { data } = await supabase.from('reminders').select('*').eq('user_id', userId).order('time', { ascending: true });
        return (data || []).map(r => ({ id: r.id, userId: r.user_id, message: r.message, type: r.type, time: r.time, frequency: r.frequency, isActive: r.is_active, lastTriggered: r.last_triggered, createdAt: r.created_at }));
    },
    createReminder: async (userId: string, reminder: any): Promise<void> => {
        await supabase.from('reminders').insert({ user_id: userId, message: reminder.message, type: reminder.type, time: reminder.time, frequency: reminder.frequency, is_active: reminder.isActive, created_at: new Date().toISOString() });
    },
    updateReminderStatus: async (id: string, isActive: boolean): Promise<void> => {
        await supabase.from('reminders').update({ is_active: isActive }).eq('id', id);
    },
    deleteReminder: async (id: string): Promise<void> => {
        await supabase.from('reminders').delete().eq('id', id);
    },
    markRemindersAsViewed: async (userId: string): Promise<void> => {
        await supabase.from('profiles').update({ last_reminders_viewed_at: new Date().toISOString() }).eq('id', userId);
    },
    checkUnseenReminders: async (userId: string, lastViewed: string | undefined): Promise<boolean> => {
        const { count } = await supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('user_id', userId).gt('created_at', lastViewed || '1970-01-01');
        return (count || 0) > 0;
    },

    // --- CHAT & HISTORY ---
    getChatHistory: async (userId: string): Promise<ChatMessage[]> => {
        try {
            const { data } = await supabase.from('chat_history').select('*').eq('user_id', userId).order('created_at', { ascending: true });
            if (data) {
                await offlineService.cacheData(STORES_CONST.CHAT, data);
                return (data || []).map(row => ({ sender: row.sender, text: row.text, time: row.time || new Date(row.created_at).toLocaleTimeString('pt-BR'), attachmentUrl: row.attachment_url, attachmentType: row.attachment_type, suggestedReminder: row.suggested_reminder }));
            }
        } catch (e) {
            console.warn("Offline: Reading chat from cache");
        }
        
        const cached = await offlineService.getCachedData<any>(STORES_CONST.CHAT);
        return cached.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                     .map(row => ({ sender: row.sender, text: row.text, time: row.time || new Date(row.created_at).toLocaleTimeString('pt-BR'), attachmentUrl: row.attachment_url, attachmentType: row.attachment_type, suggestedReminder: row.suggested_reminder }));
    },

    saveChatMessage: async (message: ChatMessage, targetUserId?: string, isSyncing = false): Promise<void> => {
        const user = await api.getUser();
        const payload = { user_id: targetUserId || user.id, sender: message.sender, text: message.text, time: message.time, attachment_url: message.attachmentUrl, attachment_type: message.attachmentType, suggested_reminder: message.suggestedReminder, created_at: new Date().toISOString() };
        
        if (!navigator.onLine && !isSyncing) {
            offlineService.addToQueue('SEND_CHAT', message);
            return;
        }

        try {
            await supabase.from('chat_history').insert(payload);
        } catch (e) {
            if (!isSyncing) offlineService.addToQueue('SEND_CHAT', message);
            throw e;
        }
    },

    subscribeToChat: (targetUserId: string, onMessage: (msg: ChatMessage) => void) => {
        const channel = supabase.channel(`chat:${targetUserId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_history', filter: `user_id=eq.${targetUserId}` }, (p) => {
            const n = p.new;
            onMessage({ sender: n.sender, text: n.text, time: n.time || new Date(n.created_at).toLocaleTimeString('pt-BR'), attachmentUrl: n.attachment_url, attachmentType: n.attachment_type, suggestedReminder: n.suggested_reminder });
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    },
    subscribeToRealtimeVitals: (targetUserId: string, onData: (data: any) => void) => {
        const channel = supabase.channel(`vitals:${targetUserId}`).on('broadcast', { event: 'vital_update' }, (p) => onData(p.payload)).subscribe();
        return () => { supabase.removeChannel(channel); };
    },
    getHealthContext: async (userId: string): Promise<string> => {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        const { data: measures } = await supabase.from('measures').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
        let context = `Contexto de Saúde: ${profile?.name}\n`;
        measures?.forEach(m => context += `- ${m.type}: ${m.value}\n`);
        return context;
    },

    // --- NUTRITION ---
    getLastMeal: async (): Promise<Meal | null> => {
        const user = await api.getUser();
        try {
            const { data } = await supabase.from('meals').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(1).maybeSingle();
            if (data) return { ...data, userId: data.user_id };
        } catch(e) {}
        
        const cached = await offlineService.getCachedData<any>(STORES_CONST.MEALS);
        if (cached.length > 0) {
            const last = cached.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            return { ...last, userId: last.user_id };
        }
        return null;
    },
    getPatientMeals: async (userId: string): Promise<Meal[]> => {
        try {
            const { data } = await supabase.from('meals').select('*').eq('user_id', userId).order('timestamp', { ascending: false });
            if (data) {
                await offlineService.cacheData(STORES_CONST.MEALS, data);
                return (data || []).map(m => ({ ...m, userId: m.user_id }));
            }
        } catch (e) {}
        
        const cached = await offlineService.getCachedData<any>(STORES_CONST.MEALS);
        return cached.map(m => ({ ...m, userId: m.user_id }));
    },
    getNutritionReport: async (userId: string): Promise<NutritionReport> => ({ dailyAverageCalories: 2000, totalMealsLogged: 10, macroDistribution: { protein: 30, carbs: 50, fat: 20 }, score: 80, insights: [], streakDays: 5 }),
    
    saveMeal: async (mealData: Omit<Meal, 'id' | 'userId'>, isSyncing = false): Promise<void> => {
        const user = await api.getUser();
        const payload = { user_id: user.id, image: mealData.image, foods: mealData.foods, calories: mealData.calories, protein: mealData.protein, carbs: mealData.carbs, fat: mealData.fat, portion: mealData.portion, timestamp: new Date().toISOString() };
        
        if (!navigator.onLine && !isSyncing) {
            offlineService.addToQueue('SAVE_MEAL', mealData);
            return;
        }

        try {
            await supabase.from('meals').insert(payload);
        } catch (e) {
            if (!isSyncing) offlineService.addToQueue('SAVE_MEAL', mealData);
            throw e;
        }
    },

    // --- PRESCRIPTIONS ---
    getPrescriptions: async (): Promise<Prescription[]> => {
        const user = await api.getUser();
        const { data } = await supabase.from('prescriptions').select('*').eq('patient_id', user.id).order('created_at', { ascending: false });
        return (data || []).map(p => ({ ...p, patientId: p.patient_id, doctorId: p.doctor_id }));
    },
    savePrescription: async (patientId: string, content: MedicalActionPlan): Promise<void> => {
        const user = await api.getUser();
        await supabase.from('prescriptions').insert({ patient_id: patientId, doctor_id: user.id, content, signed_by: user.name, crm: user.crm, created_at: new Date().toISOString() });
    },
    generateAndPrintPDF: (p: Prescription) => { window.print(); },
    generatePatientHistoryPDF: (profile: PatientFullProfile) => { window.print(); },

    // --- FAMILY ---
    getFamilyMembers: async (): Promise<FamilyMember[]> => {
        const user = await api.getUser();
        const { data } = await supabase.from('family_members').select('*').eq('user_id', user.id);
        return (data || []).map(f => ({ id: f.id, memberId: f.member_id, name: f.name, relation: f.relation, status: f.status, lastSeen: formatTimeAgo(f.last_seen), sharedData: f.shared_data, avatarColor: f.avatar_color }));
    },
    addFamilyMember: async (email: string, relation: string): Promise<FamilyMember[]> => {
        const user = await api.getUser();
        const { data: targetUser } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
        if (!targetUser) throw new Error("Usuário não encontrado.");
        await supabase.from('family_members').insert({ user_id: user.id, member_id: targetUser.id, name: targetUser.name, relation, status: 'pending' });
        return api.getFamilyMembers();
    },
    connectFamilyByQr: async (qrData: string): Promise<void> => {
        const user = await api.getUser();
        try {
            const data = JSON.parse(qrData);
            if (data.action !== 'drx_family_invite') throw new Error("QR Code inválido.");
            await supabase.from('family_members').insert({ user_id: user.id, member_id: data.id, name: data.name, relation: 'Familiar', status: 'active' });
        } catch (e) { throw new Error("Falha ao ler QR Code."); }
    },
    saveMeasureForMember: async (memberId: string, type: string, value: string): Promise<void> => {
        await supabase.from('measures').insert({ user_id: memberId, type, value, created_at: new Date().toISOString() });
    },

    // --- REVIEWS & PROFILE UPDATES ---
    getDoctorReviews: async (doctorId: string): Promise<DoctorReview[]> => {
        const { data } = await supabase.from('doctor_reviews').select('*').eq('doctor_id', doctorId);
        return (data || []).map(r => ({ id: r.id, doctorId: r.doctor_id, patientName: r.patient_name, rating: r.rating, comment: r.comment, createdAt: r.created_at }));
    },
    updatePassword: async (newPassword: string): Promise<void> => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    },
    updateEmail: async (newEmail: string): Promise<void> => {
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw new Error(formatError(error));
    },

    // --- SLEEP & EMERGENCY ---
    getSleepDetails: async (): Promise<SleepSession> => {
        return { totalDuration: '7h 30m', efficiency: 85, stages: { awake: '30m', light: '4h', deep: '2h', rem: '1h' }, timeline: [{ stage: 'awake', startTime: '22:00', endTime: '22:15', durationMinutes: 15 }, { stage: 'light', startTime: '22:15', endTime: '02:15', durationMinutes: 240 }, { stage: 'deep', startTime: '02:15', endTime: '04:15', durationMinutes: 120 }, { stage: 'rem', startTime: '04:15', endTime: '05:15', durationMinutes: 60 }, { stage: 'awake', startTime: '05:15', endTime: '05:30', durationMinutes: 15 }] };
    },
    triggerEmergencyAlert: async (): Promise<void> => {
        const user = await api.getUser();
        await supabase.from('profiles').update({ status: 'SOS' }).eq('id', user.id);
    },

    // --- STORAGE & MEDIA ---
    uploadAvatar: async (file: File): Promise<string> => {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) throw new Error("Sem sessão");
        const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
        if (error) throw new Error(`Erro no upload: ${error.message}`);
        return supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
    },
    uploadChatAttachment: async (file: File): Promise<string> => {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) throw new Error("Sem sessão");
        const fileName = `chat/${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
        if (error) throw new Error(`Erro no upload do anexo: ${error.message}`);
        return supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
    },
    uploadVideo: async (blob: Blob, patientId: string): Promise<{videoUrl: string, thumbnailUrl?: string}> => {
        const fileName = `videos/${patientId}/${Date.now()}.webm`;
        const { error } = await supabase.storage.from('avatars').upload(fileName, blob);
        if (error) throw error;
        return { videoUrl: supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl };
    },
    createVideoEntry: async (entry: Omit<VideoEntry, 'id'>): Promise<void> => {
        await supabase.from('video_entries').insert({ patient_id: entry.patientId, doctor_id: entry.doctorId, title: entry.title, description: entry.description, video_url: entry.videoUrl, thumbnail_url: entry.thumbnailUrl, created_at: entry.createdAt });
    },

    // --- SYSTEM HEALTH ---
    checkSystemHealth: async (): Promise<{ online: boolean, latency: number, message?: string }> => {
        const start = Date.now();
        if (!navigator.onLine) return { online: false, latency: 0, message: 'Sem Conexão' };
        
        try {
            const { error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            return { online: !error, latency: Date.now() - start, message: error ? error.message : 'Operacional' };
        } catch (e) { return { online: false, latency: 0, message: 'Erro de rede' }; }
    }
};
