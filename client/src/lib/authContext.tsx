import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'employee' | 'manager';

export interface User {
    id: string;
    name: string;
    role: UserRole;
    bankCode: string;
}

// Mock users per bank
const MOCK_USERS: Record<string, User[]> = {
    'ibbl': [
        { id: 'ibbl-emp-1', name: 'Karim Hassan', role: 'employee', bankCode: 'ibbl' },
        { id: 'ibbl-mgr-1', name: 'Dr. Rafiq Ahmed', role: 'manager', bankCode: 'ibbl' },
    ],
    'sonali': [
        { id: 'sonali-emp-1', name: 'Fatima Begum', role: 'employee', bankCode: 'sonali' },
        { id: 'sonali-mgr-1', name: 'Mr. Shahid Khan', role: 'manager', bankCode: 'sonali' },
    ],
};

interface AuthContextType {
    user: User | null;
    isManager: boolean;
    login: (userId: string) => void;
    logout: () => void;
    availableUsers: User[];
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isManager: false,
    login: () => {},
    logout: () => {},
    availableUsers: [],
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    bankCode: string;
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ bankCode, children }) => {
    const [user, setUser] = useState<User | null>(null);
    const availableUsers = MOCK_USERS[bankCode] || [];

    // Load user from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(`chequemate_user_${bankCode}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Verify user still exists
            const found = availableUsers.find(u => u.id === parsed.id);
            if (found) setUser(found);
        }
    }, [bankCode]);

    const login = (userId: string) => {
        const found = availableUsers.find(u => u.id === userId);
        if (found) {
            setUser(found);
            localStorage.setItem(`chequemate_user_${bankCode}`, JSON.stringify(found));
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(`chequemate_user_${bankCode}`);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isManager: user?.role === 'manager',
            login,
            logout,
            availableUsers,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

