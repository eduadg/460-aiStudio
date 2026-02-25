
import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { RingRealtimeData } from '../types';

export const useRealtimeVitals = (userId: string | undefined) => {
    const [data, setData] = useState<RingRealtimeData | null>(null);
    const [isLive, setIsLive] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!userId) return;

        const unsubscribe = api.subscribeToRealtimeVitals(userId, (incomingData) => {
            setIsLive(true);
            setData(prev => ({ ...prev, ...incomingData })); // Merge data to keep fields like battery if not updated in this chunk

            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
            // Define status como offline se não receber dados por 5 segundos
            timeoutRef.current = setTimeout(() => {
                setIsLive(false);
            }, 5000);
        });

        return () => {
            unsubscribe();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [userId]);

    return { data, isLive };
};
