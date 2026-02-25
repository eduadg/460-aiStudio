
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

type Language = 'pt-BR' | 'en-US';

const translations = {
    'pt-BR': {
        // General
        'app.title': 'Dr. X Health',
        'app.tagline': 'Sua Saúde, Conectada.',
        'common.loading': 'Carregando...',
        'common.error': 'Erro',
        'common.success': 'Sucesso',
        'common.cancel': 'Cancelar',
        'common.save': 'Salvar',
        'common.back': 'Voltar',
        'common.close': 'Fechar',
        
        // Roles
        'role.patient': 'Paciente',
        'role.doctor': 'Médico',
        
        // Login Screen
        'login.welcome_back': 'Bem-vindo de volta',
        'login.doctor_portal': 'Portal do Especialista',
        'login.subtitle_patient': 'Acesse seus dados vitais e histórico.',
        'login.subtitle_doctor': 'Gerencie seus pacientes com IA.',
        'login.forgot_password': 'Resgate de Senha',
        'login.create_account': 'Criar nova conta',
        'login.label.name': 'NOME COMPLETO',
        'login.label.email': 'E-MAIL',
        'login.label.password': 'SENHA',
        'login.placeholder.name': 'Seu nome',
        'login.placeholder.email': 'seu@email.com',
        'login.placeholder.password': '••••••••',
        'login.btn.forgot': 'ESQUECEU?',
        'login.btn.enter': 'Entrar',
        'login.btn.register': 'Criar Conta',
        'login.btn.send_link': 'Enviar Link',
        'login.msg.recovery_sent': 'E-mail de recuperação enviado!',
        'login.link.back_login': 'Voltar para o Login',
        'login.link.no_account': 'Não tem conta? Cadastre-se',
        'login.link.has_account': 'Já tem conta? Entrar',
        'login.install.ios': 'Instalar no iOS',
        'login.install.app': 'App',
        
        // Navigation
        'nav.home': 'Início',
        'nav.chat': 'Dr. X',
        'nav.measures': 'Medidas',
        'nav.profile': 'Perfil',

        // Patient Home
        'home.hello': 'Olá',
        'home.summary_title': 'Resumo de Hoje',
        'home.live': 'AO VIVO',
        'home.signals_normal': 'Sinais Normais',
        'home.attention_needed': 'Atenção Necessária',
        'home.main_functions': 'Principais Funções',
        'home.quick_log': 'Registro Rápido',
        'home.my_doctor': 'Meu Médico',
        'home.my_appointments': 'Minhas Consultas',
        'home.prescriptions': 'Receitas & Planos',
        'home.log_meal': 'Registrar Refeição',
        'home.quick_analysis': 'Análise Rápida',
        'home.sos_title': 'Serviços Médicos',
        'home.sos_subtitle': 'Atendimento 24h • IA Voz',
        'home.alert_detail': 'Detalhes dos Alertas',

        // Metrics
        'metric.heart': 'Coração',
        'metric.spo2': 'SpO2',
        'metric.stress': 'Estresse',
        'metric.pressure': 'Pressão',
        'metric.steps': 'Passos',
        'metric.sleep': 'Sono',

        // Weather
        'weather.now': 'Agora',
        'weather.feels_like': 'Sensação',
        'weather.locating': 'Localizando...',
        'weather.condition.clear': 'Céu Limpo',
        'weather.condition.cloudy': 'Nublado',
        'weather.condition.fog': 'Neblina',
        'weather.condition.rain': 'Chuva',
        'weather.condition.snow': 'Neve',
        'weather.condition.storm': 'Tempestade',
        'weather.condition.normal': 'Normal',

        // Doctor Dashboard
        'doctor.dash.title': 'Painel Médico',
        'doctor.dash.online': 'ONLINE',
        'doctor.dash.paused': 'PAUSA',
        'doctor.dash.emergency_alerts': 'Alertas de Emergência',
        'doctor.dash.active_monitoring': 'Monitoramento Ativo',
        'doctor.dash.agenda': 'Agenda de Hoje',
        'doctor.dash.live_feed': 'Live Feed',
        'doctor.dash.ai_summary': 'Resumo da IA',
        'doctor.dash.no_patients': 'Nenhum paciente ativo no momento.',
        'doctor.dash.no_appointments': 'Sem agendamentos para hoje.',
        
        // Doctor Patient Detail
        'doctor.tab.dashboard': 'Dashboard',
        'doctor.tab.nutrition': 'Nutrição',
        'doctor.tab.journal': 'Chat & Jornal',
        'doctor.tab.prescriptions': 'Prescrições',
        'doctor.tab.videos': 'Vídeos',
        'doctor.tab.reminders': 'Lembretes',
        'doctor.action.generate_plan': 'Gerar Plano de Ação IA',
        'doctor.action.record_video': 'Gravar Novo',
        'doctor.action.create_reminder': 'Criar Lembrete'
    },
    'en-US': {
        // General
        'app.title': 'Dr. X Health',
        'app.tagline': 'Your Health, Connected.',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.back': 'Back',
        'common.close': 'Close',
        
        // Roles
        'role.patient': 'Patient',
        'role.doctor': 'Doctor',
        
        // Login Screen
        'login.welcome_back': 'Welcome Back',
        'login.doctor_portal': 'Specialist Portal',
        'login.subtitle_patient': 'Access your vitals and history.',
        'login.subtitle_doctor': 'Manage patients with AI.',
        'login.forgot_password': 'Password Recovery',
        'login.create_account': 'Create new account',
        'login.label.name': 'FULL NAME',
        'login.label.email': 'E-MAIL',
        'login.label.password': 'PASSWORD',
        'login.placeholder.name': 'Your name',
        'login.placeholder.email': 'you@email.com',
        'login.placeholder.password': '••••••••',
        'login.btn.forgot': 'FORGOT?',
        'login.btn.enter': 'Sign In',
        'login.btn.register': 'Sign Up',
        'login.btn.send_link': 'Send Link',
        'login.msg.recovery_sent': 'Recovery email sent!',
        'login.link.back_login': 'Back to Login',
        'login.link.no_account': 'No account? Sign up',
        'login.link.has_account': 'Have an account? Sign in',
        'login.install.ios': 'Install on iOS',
        'login.install.app': 'App',

        // Navigation
        'nav.home': 'Home',
        'nav.chat': 'Dr. X',
        'nav.measures': 'Vitals',
        'nav.profile': 'Profile',

        // Patient Home
        'home.hello': 'Hello',
        'home.summary_title': "Today's Summary",
        'home.live': 'LIVE',
        'home.signals_normal': 'Normal Signals',
        'home.attention_needed': 'Attention Needed',
        'home.main_functions': 'Key Functions',
        'home.quick_log': 'Quick Log',
        'home.my_doctor': 'My Doctor',
        'home.my_appointments': 'My Appointments',
        'home.prescriptions': 'Plans & Rx',
        'home.log_meal': 'Log Meal',
        'home.quick_analysis': 'Quick Analysis',
        'home.sos_title': 'Medical Services',
        'home.sos_subtitle': '24h Support • AI Voice',
        'home.alert_detail': 'Alert Details',

        // Metrics
        'metric.heart': 'Heart',
        'metric.spo2': 'SpO2',
        'metric.stress': 'Stress',
        'metric.pressure': 'Pressure',
        'metric.steps': 'Steps',
        'metric.sleep': 'Sleep',

        // Weather
        'weather.now': 'Now',
        'weather.feels_like': 'Feels like',
        'weather.locating': 'Locating...',
        'weather.condition.clear': 'Clear Sky',
        'weather.condition.cloudy': 'Cloudy',
        'weather.condition.fog': 'Foggy',
        'weather.condition.rain': 'Rain',
        'weather.condition.snow': 'Snow',
        'weather.condition.storm': 'Storm',
        'weather.condition.normal': 'Normal',

        // Doctor Dashboard
        'doctor.dash.title': 'Medical Dashboard',
        'doctor.dash.online': 'ONLINE',
        'doctor.dash.paused': 'PAUSED',
        'doctor.dash.emergency_alerts': 'Emergency Alerts',
        'doctor.dash.active_monitoring': 'Active Monitoring',
        'doctor.dash.agenda': "Today's Agenda",
        'doctor.dash.live_feed': 'Live Feed',
        'doctor.dash.ai_summary': 'AI Summary',
        'doctor.dash.no_patients': 'No active patients at the moment.',
        'doctor.dash.no_appointments': 'No appointments for today.',

        // Doctor Patient Detail
        'doctor.tab.dashboard': 'Dashboard',
        'doctor.tab.nutrition': 'Nutrition',
        'doctor.tab.journal': 'Chat & Journal',
        'doctor.tab.prescriptions': 'Rx & Plans',
        'doctor.tab.videos': 'Videos',
        'doctor.tab.reminders': 'Reminders',
        'doctor.action.generate_plan': 'Generate AI Action Plan',
        'doctor.action.record_video': 'Record New',
        'doctor.action.create_reminder': 'Create Reminder'
    }
};

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations['pt-BR']) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('pt-BR');

    useEffect(() => {
        const savedLang = localStorage.getItem('drx_language') as Language;
        if (savedLang) {
            setLanguage(savedLang);
        } else {
            const browserLang = navigator.language.startsWith('en') ? 'en-US' : 'pt-BR';
            setLanguage(browserLang);
        }
    }, []);

    const changeLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('drx_language', lang);
    };

    const t = (key: string): string => {
        // @ts-ignore
        return translations[language][key] || key;
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within an I18nProvider');
    }
    return context;
};
