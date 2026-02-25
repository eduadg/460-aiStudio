
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import BottomNav from './components/BottomNav';
import PatientHome from './screens/PatientHome';
import Chat from './screens/Chat';
import Measures from './screens/Measures';
import Profile from './screens/Profile';
import DoctorDashboard from './screens/DoctorDashboard';
import { DoctorPatientDetail } from './screens/DoctorPatientDetail';
import ConnectDevice from './screens/ConnectDevice';
import FirstMeasurement from './screens/FirstMeasurement';
import Login from './screens/Login';
import EditProfile from './screens/EditProfile';
import RegisterMeal from './screens/RegisterMeal';
import FamilyManager from './screens/FamilyManager';
import FamilyMemberDetail from './screens/FamilyMemberDetail';
import SleepDetail from './screens/SleepDetail'; 
import ChooseDoctor from './screens/ChooseDoctor';
import PatientPrescriptions from './screens/PatientPrescriptions';
import AIVoiceCall from './screens/AIVoiceCall';
import DoctorPresentation from './screens/DoctorPresentation';
import AppointmentsScreen from './screens/AppointmentsScreen'; 
import PatientHistory from './screens/PatientHistory'; 
import ReminderList from './screens/ReminderList'; 
import ResetPassword from './screens/ResetPassword';
import MedicalRecords from './screens/MedicalRecords'; // NEW IMPORT
import { api } from './services/api';
import { ringService } from './services/ringIntegration'; 
import { FamilyMember } from './types';
import { useUser } from './contexts/UserContext';
import { supabase } from './services/supabaseClient';

type Screen = 'inicio' | 'conversa' | 'medidas' | 'perfil';
type View = Screen | 'connectDevice' | 'firstMeasurement' | 'editProfile' | 'registerMeal' | 'familyManager' | 'familyMemberDetail' | 'doctorPatientDetail' | 'sleepDetail' | 'chooseDoctor' | 'patientPrescriptions' | 'aiVoiceCall' | 'doctorPresentation' | 'appointments' | 'patientHistory' | 'reminders' | 'resetPassword' | 'medicalRecords';

const App: React.FC = () => {
  const { user, isLoading, logout, refreshUser } = useUser();
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<View>('inicio');
  const [initialChatMessage, setInitialChatMessage] = useState<string>('');
  const [initialMeasureMetric, setInitialMeasureMetric] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<FamilyMember | null>(null);
  const [presentationDoctorId, setPresentationDoctorId] = useState<string | null>(null);
  const [lastMealTime, setLastMealTime] = useState<string | null>(null);

  // Listen for Password Recovery or Auth Events
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            setActiveView('resetPassword');
        } else if (event === 'SIGNED_IN') {
            if (!user && session?.user) {
                refreshUser();
            }
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, [user, refreshUser]);

  // Initial Logic whenever user state changes (login or refresh)
  useEffect(() => {
    if (user) {
        if (activeView === 'resetPassword') {
            return;
        }

        if (user.role === 'patient') {
            // Attempt Auto-Reconnect to Ring
            if (user.id) {
                ringService.tryAutoReconnect(user.id).then((connected) => {
                    if (connected) refreshUser(); 
                });
            }

            if (!user.hasFirstMeasurement && activeView !== 'firstMeasurement') setActiveView('firstMeasurement');
            else if (!user.doctorId && activeView !== 'chooseDoctor' && activeView !== 'firstMeasurement') setActiveView('chooseDoctor');
        } 
        
        // Fetch auxiliary data
        api.getLastMeal().then(meal => {
            if (meal) setLastMealTime(meal.timestamp);
        }).catch(() => {});
    } else {
        if (activeView !== 'resetPassword') {
            setActiveView('inicio');
            setCurrentHeartRate(null);
        }
    }
  }, [user]); 

  const handleNavigateToChat = (message?: string) => {
    setInitialChatMessage(message || '');
    setActiveView('conversa');
  };

  const handleDeviceConnected = async () => {
    try {
        await api.updateDeviceStatus(true);
        if (user?.id) ringService.startBackgroundSync(user.id);
        await refreshUser(); 
    } catch (e) {
        console.error(e);
    } finally { 
        setActiveView('inicio'); 
    }
  };

  const handleFirstMeasurementComplete = async (bpmValue: number) => {
      await refreshUser();
      setCurrentHeartRate(bpmValue); 
      setActiveView('chooseDoctor');
  };
  
  const handleDoctorChosen = async () => {
      await refreshUser();
      setActiveView('inicio');
  };

  const handleUpdateProfileSuccess = async () => {
      await refreshUser();
      setActiveView('perfil');
  };

  const handleHeartRateUpdate = (bpm: number) => setCurrentHeartRate(bpm);
  const handleMealSaved = () => { setLastMealTime(new Date().toISOString()); setActiveView('inicio'); };
  const handleDoctorSelectPatient = (patientId: string) => { setSelectedPatientId(patientId); setActiveView('doctorPatientDetail'); };
  const handleDoctorBackToDashboard = () => { setSelectedPatientId(null); setActiveView('inicio'); };
  const handleFamilyMemberSelect = (member: FamilyMember) => { setSelectedFamilyMember(member); setActiveView('familyMemberDetail'); };
  const handleOpenDoctorPresentation = (doctorId: string) => { setPresentationDoctorId(doctorId); setActiveView('doctorPresentation'); };
  const handleViewGeneralMeasures = () => { setInitialMeasureMetric(null); setActiveView('medidas'); };
  const handleViewMetricDetail = (type: string) => { setInitialMeasureMetric(type); setActiveView('medidas'); };
  const handleViewSleepDetail = () => setActiveView('sleepDetail');
  const handleClearInitialSelectedMetric = () => setInitialMeasureMetric(null);
  
  const handleMarkRemindersAsViewed = async () => {
    if (user?.id) {
        try {
            await api.markRemindersAsViewed(user.id);
            await refreshUser(); 
        } catch (e) {}
    }
  };

  const getDynamicBackground = () => {
      if (activeView === 'resetPassword') return 'bg-slate-950';
      if (user?.role === 'doctor') return 'bg-slate-900';
      if (activeView === 'aiVoiceCall') return 'bg-slate-900';
      if (activeView === 'medicalRecords') return 'bg-slate-950'; // Ensure records screen is dark
      if (!currentHeartRate) return 'bg-gray-50 dark:bg-slate-950';
      if (currentHeartRate > 115) return 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-100 dark:from-red-950 dark:via-rose-950 dark:to-slate-900 transition-colors duration-1000';
      else if (currentHeartRate > 90) return 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-slate-900 transition-colors duration-1000';
      else return 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950 dark:via-teal-950 dark:to-slate-900 transition-colors duration-1000';
  };

  const renderScreen = () => {
    if (activeView === 'resetPassword') return <ResetPassword onComplete={() => setActiveView('inicio')} />;

    if (!user) return null;
    
    if (user.role === 'doctor') {
        if (activeView === 'doctorPatientDetail' && selectedPatientId) return <DoctorPatientDetail patientId={selectedPatientId} onBack={handleDoctorBackToDashboard} />;
        return <DoctorDashboard onSelectPatient={handleDoctorSelectPatient} onLogout={logout} />;
    }

    // Patient Views
    switch (activeView) {
      case 'firstMeasurement': return <FirstMeasurement user={user} onComplete={handleFirstMeasurementComplete} />;
      case 'chooseDoctor': return <ChooseDoctor onComplete={handleDoctorChosen} />;
      case 'inicio': return <PatientHome onNavigateToChat={handleNavigateToChat} onHeartRateUpdate={handleHeartRateUpdate} onRegisterMeal={() => setActiveView('registerMeal')} onViewNutrition={() => setActiveView('registerMeal')} onViewPrescriptions={() => setActiveView('patientPrescriptions')} onCallDrX={() => setActiveView('aiVoiceCall')} onOpenDoctorPresentation={handleOpenDoctorPresentation} onViewAppointments={() => setActiveView('appointments')} onViewReminders={() => setActiveView('reminders')} onViewGeneralMeasures={handleViewGeneralMeasures} onViewMetricDetail={handleViewMetricDetail} onViewSleepDetail={handleViewSleepDetail} lastMealTime={lastMealTime} onMarkRemindersAsViewed={handleMarkRemindersAsViewed} onViewMedicalRecords={() => setActiveView('medicalRecords')} />;
      case 'conversa': return <Chat initialMessage={initialChatMessage} onClearInitialMessage={() => setInitialChatMessage('')} />;
      case 'medidas': return <Measures onFamilyClick={() => setActiveView('familyManager')} onSleepClick={handleViewSleepDetail} initialSelectedMetric={initialMeasureMetric} onClearInitialSelectedMetric={handleClearInitialSelectedMetric} />;
      case 'perfil': return <Profile onConnectDeviceClick={() => setActiveView('connectDevice')} onLogout={logout} onEditProfile={() => setActiveView('editProfile')} onViewHistory={() => setActiveView('patientHistory')} />;
      case 'connectDevice': return <ConnectDevice onBack={() => setActiveView('perfil')} onConnect={handleDeviceConnected} />
      case 'editProfile': return <EditProfile user={user} onCancel={() => setActiveView('perfil')} onSaveSuccess={handleUpdateProfileSuccess} />;
      case 'registerMeal': return <RegisterMeal onBack={() => setActiveView('inicio')} onSaveSuccess={handleMealSaved} />;
      case 'familyManager': return <FamilyManager onBack={() => setActiveView('medidas')} onSelectMember={handleFamilyMemberSelect} />;
      case 'familyMemberDetail': return selectedFamilyMember ? <FamilyMemberDetail memberId={selectedFamilyMember.memberId} memberName={selectedFamilyMember.name} onBack={() => setActiveView('familyManager')} /> : <FamilyManager onBack={() => setActiveView('medidas')} />;
      case 'sleepDetail': return <SleepDetail onBack={() => setActiveView('medidas')} />;
      case 'patientPrescriptions': return <PatientPrescriptions onBack={() => setActiveView('inicio')} />;
      case 'aiVoiceCall': return <AIVoiceCall onHangup={() => setActiveView('inicio')} />;
      case 'doctorPresentation': return presentationDoctorId ? <DoctorPresentation doctorId={presentationDoctorId} onClose={() => setActiveView('inicio')} onNavigateToChat={handleNavigateToChat} onCallDrX={() => setActiveView('aiVoiceCall')} onBookAppointment={() => setActiveView('appointments')} /> : <PatientHome onNavigateToChat={handleNavigateToChat} onHeartRateUpdate={handleHeartRateUpdate} onRegisterMeal={() => setActiveView('registerMeal')} onViewNutrition={() => setActiveView('registerMeal')} onViewPrescriptions={() => setActiveView('patientPrescriptions')} onCallDrX={() => setActiveView('aiVoiceCall')} onOpenDoctorPresentation={handleOpenDoctorPresentation} onViewAppointments={() => setActiveView('appointments')} onViewReminders={() => setActiveView('reminders')} onViewGeneralMeasures={handleViewGeneralMeasures} onViewMetricDetail={handleViewMetricDetail} onViewSleepDetail={handleViewSleepDetail} lastMealTime={lastMealTime} onMarkRemindersAsViewed={handleMarkRemindersAsViewed} onViewMedicalRecords={() => setActiveView('medicalRecords')} />;
      case 'appointments': return <AppointmentsScreen onBack={() => setActiveView('inicio')} />;
      case 'patientHistory': return <PatientHistory onBack={() => setActiveView('perfil')} />; 
      case 'reminders': return <ReminderList onBack={() => setActiveView('inicio')} onRemindersViewed={handleMarkRemindersAsViewed} />; 
      case 'medicalRecords': return <MedicalRecords onBack={() => setActiveView('inicio')} />;
      default: return null;
    }
  };

  if (isLoading && activeView !== 'resetPassword') return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 text-teal-600 animate-pulse">Carregando Dr. X...</div>;
  if (!user && activeView !== 'resetPassword') return <Login />;
  
  const isBottomNavVisible = user?.role === 'patient' && ['inicio', 'conversa', 'medidas', 'perfil'].includes(activeView);

  return (
    <div className={`font-sans antialiased text-slate-800 dark:text-slate-100 ${getDynamicBackground()} min-h-screen transition-colors duration-1000`}>
      <div className="relative min-h-screen">
        <main className={isBottomNavVisible ? "pb-24" : ""}>{renderScreen()}</main>
        {isBottomNavVisible && <BottomNav activeScreen={activeView as Screen} setActiveScreen={setActiveView} userAvatarUrl={user?.avatarUrl} />}
      </div>
    </div>
  );
};

export default App;
