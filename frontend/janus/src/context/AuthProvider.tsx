import { createContext, useState, useEffect, useCallback } from "react";
import type { UserSession } from "../models/user-session";
import { setSignOutFunction } from "../api/interceptor";

export interface AuthSession {
    user?: UserSession
    balance?: any
}

interface AuthContextType {
    auth: AuthSession;
    setAuth: (auth: AuthSession) => void;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

interface AuthProviderProps {
    children: any;
}

const STORAGE_KEY = 'jw_session';

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [auth, setAuth] = useState<AuthSession>(() => {
        // Initialize state from localStorage if available
        const storedAuth = localStorage.getItem(STORAGE_KEY);
        return storedAuth ? JSON.parse(storedAuth) : {};
    });

    // Save to localStorage whenever auth changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    }, [auth]);

    const signOut = useCallback(() => {
        setAuth({});
        localStorage.removeItem(STORAGE_KEY);
    }, []);
    
    // Register the signOut function
    setSignOutFunction(signOut);
    

    return (
        <AuthContext.Provider value={{ auth, setAuth, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;