import React, {createContext, useContext, useMemo, useState} from 'react';

interface AuthMockState {
    isAuthenticated: boolean;
    isLoading: boolean;
    signIn: () => Promise<void> | void;
    signOut: () => Promise<void> | void;
}

const defaultValue: AuthMockState = {
    isAuthenticated: false,
    isLoading: false,
    signIn: () => {
    },
    signOut: () => {
    },
};

const AuthMockContext = createContext<AuthMockState>(defaultValue);

export const useAuthMock = (): AuthMockState => {
    const ctx = useContext(AuthMockContext);
    return ctx ?? defaultValue;
};

interface Props {
    children: React.ReactNode;
    initialAuthenticated?: boolean;
}

/**
 * AuthMockProvider: side-effect-free authentication context for early iterations.
 * - No storage, no network, no native modules
 * - Provides in-memory isAuthenticated state and simple signIn/signOut
 */
export const AuthMockProvider: React.FC<Props> = ({children, initialAuthenticated = false}) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialAuthenticated);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const signIn = () => {
        // Keep synchronous and safe; extend later if needed
        setIsLoading(true);
        try {
            setIsAuthenticated(true);
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = () => {
        setIsLoading(true);
        try {
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const value = useMemo<AuthMockState>(() => ({
        isAuthenticated,
        isLoading,
        signIn,
        signOut,
    }), [isAuthenticated, isLoading]);

    return (
        <AuthMockContext.Provider value={value}>
            {children}
        </AuthMockContext.Provider>
    );
};

export default AuthMockProvider;
