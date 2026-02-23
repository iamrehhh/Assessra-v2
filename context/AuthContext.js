'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { ALLOWED_USERS } from '@/lib/users';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // On mount, check if user is already stored in localStorage
        const stored = localStorage.getItem('assessra_user');
        if (stored) setUser(stored);
        setLoading(false);
    }, []);

    function login(username, password) {
        if (ALLOWED_USERS[username] && ALLOWED_USERS[username] === password) {
            localStorage.setItem('assessra_user', username);
            setUser(username);
            return true;
        }
        return false;
    }

    function logout() {
        localStorage.removeItem('assessra_user');
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
