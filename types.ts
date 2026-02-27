
import React from 'react';

export interface User {
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  deviceConnected: boolean;
  lastSync: string;
  batteryLevel: number;
  hasFirstMeasurement: boolean;
  // Novos campos pessoais
  birthDate?: string;
  height?: string;
  weight?: string;
  id?: string; // Adicionado ID opcional para facilitar listagens
  // Campos Médico/Perfil
  crm?: string;
  specialty?: string;
  avatarUrl?: string;
  doctorId?: string; // ID do médico responsável (se for paciente)
  bio?: string; // Novo: Biografia do médico
  customAiInstructions?: string; // Filosofia de tratamento do médico
  elevenLabsVoiceId?: string; // ID da voz clonada na ElevenLabs
  instagramHandle?: string; // Novo: Usuário do Instagram
  
  // METRICAS DO MEDICO
  manualPatientCount?: number; // Contagem manual (fora da plataforma)
  patientCount?: number; // Contagem automática (dentro da plataforma)
  experienceYears?: number; // Anos de experiência

  // COMPLIANCE CFM
  telemedicineConsent?: boolean;
  telemedicineConsentDate?: string;

  // REMINDERS - Notificações
  lastRemindersViewedAt?: string; // Timestamp of last time reminders were viewed
}

export interface Measure {
  id: string;
  title: string;
  value: string;
  date: string;
  type: 'heart' | 'steps' | 'sleep' | 'calories' | 'spo2' | 'pressure' | 'glucose' | 'temp' | 'stress' | 'hrv'; // Added stress, hrv
  trend: 'up' | 'down';
  created_at?: string; // Para ordenação na timeline
}

export type MeasureSource = 'ring' | 'estimated' | 'manual';

export interface MeasureBatch {
    type: Measure['type'];
    value: string;
    source: MeasureSource;
    confidence?: number;
    deviceTimestamp?: string;
}

export interface MeasureValidationResult {
    isValid: boolean;
    error?: string;
    normalizedValue?: string;
}

export interface PatientSummary {
  heartRate: string;
  steps: string;
  sleep: string;
  calories: string;
  spo2?: string;
  bloodPressure?: string;
  stress?: string; // Novo: Nível de estresse (HRV)
}

export interface DoctorMetric {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  iconName: 'exclamation' | 'users' | 'sparkles' | 'trending';
  color: string;
}

export interface UrgentCase {
    id: string;
    name: string;
    age: number;
    condition: string;
    risk: string;
    glucose: string;
    timestamp: string;
    status: 'online' | 'paused' | 'SOS'; // Added SOS status
    avatarUrl?: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai' | 'doctor';
  text: string;
  time: string;
  created_at?: string; // Para ordenação na timeline
  attachmentUrl?: string; // URL da imagem/arquivo anexado
  attachmentType?: 'image' | 'file';
  suggestedReminder?: SuggestedReminder; // New: AI suggested reminder in chat
}

export interface FamilyMember {
    id: string;
    memberId: string; // ID do perfil do usuário conectado
    name: string;
    relation: string; // 'Pai', 'Mãe', 'Filho', etc.
    status: 'active' | 'inactive';
    lastSeen: string;
    sharedData: boolean;
    avatarColor: string;
}

export interface Meal {
    id: string;
    userId: string;
    image: string; // Base64
    foods: string[];
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    portion: string;
    timestamp: string; // ISO string
}

// --- ANÁLISE NUTRICIONAL ---
export interface NutritionInsight {
    message: string;
    category: 'positive' | 'needs_attention' | 'recommendation';
    severity?: 'low' | 'medium' | 'high'; // Optional severity
}

export interface NutritionReport {
    dailyAverageCalories: number;
    totalMealsLogged: number;
    macroDistribution: {
        protein: number; // percentage
        carbs: number;   // percentage
        fat: number;     // percentage
    };
    score: number; // 0-100 Performance Score
    insights: NutritionInsight[]; // Changed to array of structured insights
    streakDays: number;
}

// --- PLANO DE AÇÃO MÉDICA (JSON Content) ---
export interface MedicalActionPlan {
    type: 'emergency' | 'weekly_review' | 'adjustment';
    severity: 'high' | 'medium' | 'low';
    summary: string;
    actions: {
        medication?: string[];
        lifestyle?: string[];
        exams?: string[];
    };
    generatedAt: string;
    validityDays?: number; // Validade da receita/atestado
}

// --- PRESCRIÇÃO PERSISTIDA (Tabela do Banco) ---
export interface Prescription {
    id: string;
    doctorId: string;
    patientId: string;
    content: MedicalActionPlan;
    createdAt: string;
    // COMPLIANCE CFM
    digitalSignatureHash?: string; // Hash simulando assinatura ICP-Brasil
    signedBy?: string; // Nome do médico signatário
    crm?: string; // CRM no momento da assinatura
}

// --- PRONTUÁRIO CLÍNICO (Medical Records) ---
export interface ClinicalCondition {
    id: string;
    name: string;
    type: 'chronic' | 'allergy' | 'surgery' | 'family_history';
    notes?: string;
    diagnosedDate?: string;
    severity?: 'low' | 'medium' | 'high';
}

export interface LabMarker {
    name: string;
    value: string;
    unit: string;
    referenceRange?: string;
    status: 'normal' | 'high' | 'low' | 'critical';
}

export interface LabExam {
    id: string;
    title: string; // ex: Hemograma Completo
    date: string;
    url?: string; // URL do arquivo original
    markers: LabMarker[];
    summary?: string; // Resumo IA
}

// --- AVALIAÇÃO DO MÉDICO ---
export interface DoctorReview {
    id: string;
    doctorId: string;
    patientName?: string; // Join
    patientAvatar?: string;
    patientInstagram?: string;
    rating: number; // 1-5
    comment: string;
    createdAt: string;
}

// --- CHAMADA DE VOZ IA ---
export interface CallLog {
    id: string;
    transcript: { speaker: 'user' | 'ai', text: string }[];
    evaluation: string;
    durationSeconds: number;
    createdAt: string;
}

// --- SONO ---
export type SleepStageType = 'awake' | 'light' | 'deep' | 'rem';

export interface SleepStage {
    stage: SleepStageType;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    durationMinutes: number;
}

export interface SleepSession {
    totalDuration: string;
    efficiency: number; // 0-100
    stages: {
        awake: string;
        light: string;
        deep: string;
        rem: string;
    };
    timeline: SleepStage[]; // Para o gráfico (Hipnograma)
}

// --- NOVOS TIPOS PARA O DASHBOARD CLÍNICO RICO ---

export interface TimelineEvent {
    id: string;
    type: 'measure' | 'chat' | 'meal' | 'alert' | 'prescription' | 'appointment' | 'video' | 'reminder'; // Added appointment, video, reminder
    title: string;
    description: string;
    timestamp: string; // ISO
    icon: 'heart' | 'chat' | 'meal' | 'alert' | 'doc' | 'calendar' | 'video' | 'bell'; // Added calendar, video, bell
    severity?: 'info' | 'warning' | 'critical';
    value?: string;
    url?: string; // For videos or external links
}

export interface PatientFullProfile {
    basic: UrgentCase;
    biometrics: {
        height: string;
        weight: string;
        bmi: string;
        age: number;
    };
    stats: {
        healthScore: number; // 0-100
        consistency: number; // 0-100% (Dias ativos / 7)
        activityGraph: number[]; // Array de 7 dias (volume de dados)
        totalInteractions: number;
    };
    timeline: TimelineEvent[];
    // Dados detalhados para abas específicas
    nutritionReport?: NutritionReport;
    meals?: Meal[];
    prescriptionHistory?: Prescription[];
    videos?: VideoEntry[]; // New: For recorded patient videos
    reminders?: Reminder[]; // New: For patient reminders
    measures?: Measure[]; // Added: For vital signs history
}

// --- AGENDAMENTOS ---
export interface Appointment {
    id: string;
    patientId: string;
    doctorId: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    type: 'consultation' | 'exam_review' | 'follow_up';
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
    doctorName?: string; // Populated via join
    patientName?: string; // Populated via join
}

// --- BLOQUEIOS DE DISPONIBILIDADE DO MÉDICO ---
export interface DoctorAvailabilityBlock {
    id: string;
    doctorId: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    reason?: string;
    createdAt?: string;
}

export interface DaySlotStatus {
    time: string;
    status: 'available' | 'booked' | 'blocked';
    reason?: string; // Opcional, para debug ou UI avançada
}

// --- LEMBRETES ---
export interface Reminder {
    id: string;
    userId: string;
    message: string;
    type: 'medication' | 'measurement' | 'appointment' | 'general';
    time: string; // HH:mm (daily reminder)
    frequency: 'daily' | 'weekly' | 'once';
    isActive: boolean;
    lastTriggered?: string; // ISO Date String
    createdAt: string; // Add created_at for comparison
}

export interface SuggestedReminder {
    message: string;
    type: 'medication' | 'measurement' | 'appointment' | 'general';
    time: string; // HH:mm (daily reminder)
    frequency: 'daily' | 'weekly' | 'once';
}

// --- VÍDEOS CAPTURADOS ---
export interface VideoEntry {
    id: string;
    patientId: string;
    doctorId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string; // Optional: URL to a video thumbnail
    videoUrl: string; // URL to the stored video file
    createdAt: string; // ISO Date String
}


// --- TIPOS PARA O SDK DO ANEL (ATUALIZADO PARA SUPORTAR O RING CONTROLLER) ---

export interface RingScanConfig {
    scan_timeout_seconds?: number;
    min_rssi?: number;
}

export interface RingConnectConfig {
    device_mac: string;
    auto_reconnect?: boolean;
}

export interface RingDeviceInfo {
    id: string; // MAC or UUID
    name: string;
    batteryLevel: number;
    firmwareVersion?: string;
    manufacturerName?: string;
    model?: string;
    charging?: boolean;
}

export interface RingRealtimeData {
    heartRate?: number;
    spo2?: number;
    steps?: number;
    calories?: number;
    bloodPressure?: { sys: number, dia: number };
    temperature?: number;
    hrv?: number; // Added HRV
    batteryLevel?: number; // Added Battery Level
    ecgWaveform?: number[]; // Array of values for graph
    source?: 'standard' | 'proprietary'; // Track protocol source
}

// Novos tipos para RingController Catalog
export interface RingConnectionState {
    state: 0 | 1 | 2; // 0=Disconnected, 1=Connecting, 2=Connected
    mac: string | null;
}

export interface RingHistoryOptions {
    dataType: 'heart' | 'sleep' | 'sport' | 'temperature' | 'ecg' | 'spo2' | 'bp';
    from?: string; // ISO
    to?: string; // ISO
}

export interface RingSetHeartMonitorConfig {
    enabled: boolean;
    interval_minutes?: number;
}

// --- WEB SPEECH API ---
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
