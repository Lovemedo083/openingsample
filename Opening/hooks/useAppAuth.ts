import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { User, ConsultingBooking, Quote } from '../types';
import { fetchConsultings, fetchQuotes } from '../utils/api';

// [수정] 기본 관리자 계정 정보 제거 (Auth Flow 도입)
const ADMIN_USER: User = {
    id: 'guest-user',
    name: '게스트',
    phone: '',
    type: 'PHONE',
    joinedDate: new Date().toLocaleDateString()
};

export const useAppAuth = () => {
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    // Data states managed by auth context usually, but kept here for now
    const [consultingBookings, setConsultingBookings] = useState<ConsultingBooking[]>([]);
    const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            handleSession(session);
            setIsAuthChecking(false);
        };
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSession = (session: any) => {
        if (session?.user) {
            setUser({
                id: session.user.id,
                name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '사장님',
                phone: session.user.email || '',
                type: 'KAKAO',
                joinedDate: new Date(session.user.created_at).toLocaleDateString()
            });
            setIsAuthenticated(true);
            loadUserData();
        } else {
            // Session expired or logged out
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    const loadUserData = () => {
        Promise.all([
            fetchConsultings().then(setConsultingBookings),
            fetchQuotes().then(setSavedQuotes)
        ]).catch(console.error);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setIsAuthenticated(false);
        setConsultingBookings([]);
        setSavedQuotes([]);
    };

    const handleGuestLogin = () => {
        setUser(ADMIN_USER);
        setIsAuthenticated(true);
        // Load public data or empty state for guest
        loadUserData();
    };

    return {
        user,
        isAuthenticated,
        isAuthChecking,
        consultingBookings,
        savedQuotes,
        setConsultingBookings,
        setSavedQuotes,
        handleLogout,
        handleGuestLogin
    };
};
