
import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface UserContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, pass: string, role: 'patient' | 'doctor') => Promise<void>;
    register: (email: string, pass: string, name: string, role: 'patient' | 'doctor') => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>; // Crucial para atualizar bateria e dados editados
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const updatedUser = await api.getUser();
            setUser(updatedUser);
        } catch (error) {
            console.error("Failed to refresh user:", error);
            // Não desloga automaticamente no refresh para evitar UX ruim em falhas de rede intermitentes
        }
    };

    useEffect(() => {
        const checkSession = async () => {
            try {
                const sessionUser = await api.getSession();
                setUser(sessionUser);
            } catch (error) {
                console.log("No active session");
            } finally {
                setIsLoading(false);
            }
        };
        checkSession();
    }, []);

    const login = async (email: string, pass: string, role: 'patient' | 'doctor') => {
        setIsLoading(true);
        try {
            const loggedUser = await api.login(email, pass, role);
            setUser(loggedUser);
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email: string, pass: string, name: string, role: 'patient' | 'doctor') => {
        setIsLoading(true);
        try {
            const registeredUser = await api.register(email, pass, name, role);
            setUser(registeredUser);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await api.logout();
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ 
            user, 
            isLoading, 
            isAuthenticated: !!user, 
            login, 
            register, 
            logout, 
            refreshUser 
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
