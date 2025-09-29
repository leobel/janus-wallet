import { createContext, useState, useEffect, useCallback, useMemo } from "react";
import type { UserSession } from "../models/user-session";
import { setSignOutFunction } from "../api/interceptor";
import { useAccountBalance } from "../hooks/useAccountBalance";
import type { UserBalance } from "../models/userBalance";

export interface AuthSession {
    user?: UserSession
}

interface AuthContextType {
    auth: AuthSession
    balance: UserBalance | null
    lastBalanceTime: number | null
    refreshBalance: () => void
    setAuth: (auth: AuthSession) => void
    signOut: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

interface AuthProviderProps {
    children: any;
}

const STORAGE_KEY = 'jw_session';
const BALANCE_POLLING_INTERVAL = Number(import.meta.env.VITE_BALANCE_POLLING_INTERVAL) || 60000

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [auth, setAuth] = useState<AuthSession>(() => {
        // Initialize state from localStorage if available
        const storedAuth = localStorage.getItem(STORAGE_KEY);
        return storedAuth ? JSON.parse(storedAuth) : {};
    });
    const { data, start, stop, refresh } = useAccountBalance(BALANCE_POLLING_INTERVAL);

    // Save to localStorage whenever auth changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
        if (auth.user) {
            start(auth.user.id)
        }

        return () => {
            stop()
        }
    }, [auth])


    const balance = useMemo(() => data, [data]);
    const lastBalanceTime = useMemo(() => data ? Date.now() : null, [data]);

    const signOut = useCallback(() => {
        setAuth({})
        stop()
        localStorage.removeItem(STORAGE_KEY)
    }, []);
    
    // Register the signOut function
    setSignOutFunction(signOut);
    

    return (
        <AuthContext.Provider value={{ auth, setAuth, signOut, balance, lastBalanceTime, refreshBalance: refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;