import {useCallback, useEffect, useRef, useState} from 'react';
import {useStorage} from './useStorage';

interface FirstLaunchHook {
    isFirstLaunch: boolean;
    setFirstLaunchComplete: () => Promise<void>;
    checkFirstLaunch: () => Promise<void>;
    loading: boolean;
}

const FIRST_LAUNCH_KEY = 'hasLaunched';

export const useFirstLaunch = (): FirstLaunchHook => {
    const [isFirstLaunch, setIsFirstLaunch] = useState(true);
    const [loading, setLoading] = useState(true); // Start with loading true
    const {getItem, setItem} = useStorage();
    const hasInitialized = useRef(false);

    const checkFirstLaunch = useCallback(async () => {
        try {
            setLoading(true);
            const hasLaunched = await getItem(FIRST_LAUNCH_KEY);
            setIsFirstLaunch(!hasLaunched);
            console.log('[useFirstLaunch] First launch check:', !hasLaunched);
        } catch (error) {
            console.error('[useFirstLaunch] Check failed:', error);
            setIsFirstLaunch(true);
        } finally {
            setLoading(false);
        }
    }, [getItem]);

    // Auto-initialize on first use
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        let isMounted = true;

        const initializeFirstLaunch = async () => {
            try {
                const hasLaunched = await getItem(FIRST_LAUNCH_KEY);
                if (isMounted) {
                    setIsFirstLaunch(!hasLaunched);
                    console.log('[useFirstLaunch] Auto-initialized, first launch:', !hasLaunched);
                }
            } catch (error) {
                console.error('[useFirstLaunch] Auto-initialization failed:', error);
                if (isMounted) {
                    setIsFirstLaunch(true); // Default to first launch on error
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            if (isMounted) {
                console.warn('[useFirstLaunch] Initialization timeout, defaulting to first launch');
                setIsFirstLaunch(true);
                setLoading(false);
            }
        }, 2000);

        initializeFirstLaunch().finally(() => {
            clearTimeout(timeoutId);
        });

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [getItem]);

    const setFirstLaunchComplete = useCallback(async () => {
        try {
            setLoading(true);
            await setItem(FIRST_LAUNCH_KEY, 'true');
            setIsFirstLaunch(false);
            console.log('[useFirstLaunch] First launch completed');
        } catch (error) {
            console.error('[useFirstLaunch] Set complete failed:', error);
        } finally {
            setLoading(false);
        }
    }, [setItem]);

    return {
        isFirstLaunch,
        setFirstLaunchComplete,
        checkFirstLaunch,
        loading,
    };
};
