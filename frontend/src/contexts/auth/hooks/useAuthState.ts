import {useCallback, useState} from 'react';
import {User} from '../../../features/auth/services/authService';

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
}

interface AuthStateHook extends AuthState {
    setAuthState: (state: Partial<AuthState>) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setAuthenticated: (authenticated: boolean) => void;
    resetAuth: () => void;
}

const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    loading: true,
};

export const useAuthState = (): AuthStateHook => {
    const [authState, setAuthStateInternal] = useState<AuthState>(initialState);

    const setAuthState = useCallback((newState: Partial<AuthState>) => {
        setAuthStateInternal(prev => ({...prev, ...newState}));
    }, []);

    const setUser = useCallback((user: User | null) => {
        setAuthState({
            user,
            isAuthenticated: !!user,
            loading: false
        });
    }, [setAuthState]);

    const setLoading = useCallback((loading: boolean) => {
        setAuthState({loading});
    }, [setAuthState]);

    const setAuthenticated = useCallback((authenticated: boolean) => {
        setAuthState({isAuthenticated: authenticated});
    }, [setAuthState]);

    const resetAuth = useCallback(() => {
        setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
        });
    }, [setAuthState]);

    return {
        ...authState,
        setAuthState,
        setUser,
        setLoading,
        setAuthenticated,
        resetAuth,
    };
};
