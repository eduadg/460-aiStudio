
import React from 'react';
import { HomeIcon, UserMdIcon, ChartBarIcon, UserCircleIcon } from './icons';
import { useTranslation } from '../services/i18n';

type Screen = 'inicio' | 'conversa' | 'medidas' | 'perfil';

interface BottomNavProps {
    activeScreen: Screen;
    setActiveScreen: (screen: Screen) => void;
    userAvatarUrl?: string;
}

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; notification?: boolean }> = ({ icon, label, active = false, onClick, notification = false }) => {
  const activeClasses = 'text-teal-600 dark:text-teal-400';
  const inactiveClasses = 'text-slate-500 dark:text-slate-400';
  return (
    <button 
        onClick={onClick} 
        className={`relative flex flex-col items-center justify-center gap-1 w-20 h-full ${active ? activeClasses : inactiveClasses} hover:text-teal-500 dark:hover:text-teal-300 transition-colors`}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
    >
      {notification && <span className="absolute top-1 right-5 block h-4 w-4 rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-white dark:ring-slate-900 flex items-center justify-center">2</span>}
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen, userAvatarUrl }) => {
  const { t } = useTranslation();

  const navItems: { id: Screen; label: string; icon: React.ReactNode, notification?: boolean }[] = [
    { id: 'inicio', label: t('nav.home'), icon: <HomeIcon className="h-7 w-7" /> },
    { id: 'conversa', label: t('nav.chat'), icon: <UserMdIcon className="h-7 w-7" />, notification: true },
    { id: 'medidas', label: t('nav.measures'), icon: <ChartBarIcon className="h-7 w-7" /> },
    { 
      id: 'perfil', 
      label: t('nav.profile'), 
      icon: userAvatarUrl ? (
        <div className={`w-7 h-7 rounded-full overflow-hidden border-2 ${activeScreen === 'perfil' ? 'border-teal-600 dark:border-teal-400' : 'border-slate-300 dark:border-slate-600'}`}>
            <img src={userAvatarUrl} alt="Perfil" className="w-full h-full object-cover" />
        </div>
      ) : (
        <UserCircleIcon className="h-7 w-7" /> 
      )
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 h-20 flex justify-around items-center shadow-top z-40" role="navigation" aria-label="Menu Principal">
      {navItems.map(item => (
        <NavItem 
          key={item.id}
          icon={item.icon} 
          label={item.label}
          notification={item.notification}
          active={activeScreen === item.id}
          onClick={() => setActiveScreen(item.id)}
        />
      ))}
    </nav>
  );
};

export default BottomNav;
