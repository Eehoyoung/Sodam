/**
 * Enhanced Component Lifecycle Management Utilities
 * Provides safe hooks and utilities for managing component state, async operations, and cleanup
 *
 * Created: 2025-07-21 05:43 (Local Time)
 * Purpose: Prevent lifecycle-related errors and memory leaks
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {reportAsyncError, reportLifecycleError} from '../utils/errorMonitoring';

// Type definitions for DOM events (React Native compatible)
type EventListener = (event: any) => void;
type AddEventListenerOptions = {
    capture?: boolean;
    once?: boolean;
    passive?: boolean;
};

/**
 * Hook for tracking component mount status
 * Prevents state updates after component unmount
 */
export const useMountedState = () => {
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    return useCallback(() => mountedRef.current, []);
};

/**
 * Safe state setter that only updates if component is mounted
 */
export const useSafeState = <T>(initialState: T): [T, (newState: T | ((prev: T) => T)) => void] => {
    const [state, setState] = useState<T>(initialState);
    const isMounted = useMountedState();

    const safeSetState = useCallback((newState: T | ((prev: T) => T)) => {
        if (isMounted()) {
            setState(newState);
        } else {
            reportLifecycleError('Attempted to set state on unmounted component', undefined, {
                action: 'safeSetState',
                additionalData: {attemptedState: newState}
            });
        }
    }, [isMounted]);

    return [state, safeSetState];
};

/**
 * Safe async operation hook with automatic cleanup
 */
export const useSafeAsync = () => {
    const isMounted = useMountedState();
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const executeAsync = useCallback(async <T>(
        asyncOperation: (signal: AbortSignal) => Promise<T>,
        onSuccess?: (result: T) => void,
        onError?: (error: Error) => void
    ): Promise<T | null> => {
        try {
            // Create new AbortController for this operation
            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;

            const result = await asyncOperation(signal);

            // Only process result if component is still mounted and operation wasn't aborted
            if (isMounted() && !signal.aborted) {
                if (onSuccess) {
                    onSuccess(result);
                }
                return result;
            }

            return null;
        } catch (error) {
            const err = error as Error;

            // Only handle error if component is still mounted and operation wasn't aborted
            if (isMounted() && !abortControllerRef.current?.signal.aborted) {
                reportAsyncError(`Safe async operation failed: ${err.message}`, err.stack, {
                    action: 'useSafeAsync.executeAsync'
                });

                if (onError) {
                    onError(err);
                }
            }

            return null;
        }
    }, [isMounted]);

    const cancelAsync = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    return {executeAsync, cancelAsync};
};

/**
 * Safe timer hook with automatic cleanup
 */
export const useSafeTimer = () => {
    const isMounted = useMountedState();
    const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());

    useEffect(() => {
        return () => {
            // Clear all timers on unmount
            timersRef.current.forEach(timer => clearTimeout(timer));
            timersRef.current.clear();
        };
    }, []);

    const safeSetTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout | null => {
        if (!isMounted()) {
            reportLifecycleError('Attempted to set timeout on unmounted component', undefined, {
                action: 'safeSetTimeout',
                additionalData: {delay}
            });
            return null;
        }

        const timer = setTimeout(() => {
            if (isMounted()) {
                try {
                    callback();
                } catch (error) {
                    const err = error as Error;
                    reportLifecycleError(`Timer callback error: ${err.message}`, err.stack, {
                        action: 'safeSetTimeout.callback'
                    });
                }
            }
            timersRef.current.delete(timer);
        }, delay);

        timersRef.current.add(timer);
        return timer;
    }, [isMounted]);

    const safeSetInterval = useCallback((callback: () => void, interval: number): NodeJS.Timeout | null => {
        if (!isMounted()) {
            reportLifecycleError('Attempted to set interval on unmounted component', undefined, {
                action: 'safeSetInterval',
                additionalData: {interval}
            });
            return null;
        }

        const timer = setInterval(() => {
            if (isMounted()) {
                try {
                    callback();
                } catch (error) {
                    const err = error as Error;
                    reportLifecycleError(`Interval callback error: ${err.message}`, err.stack, {
                        action: 'safeSetInterval.callback'
                    });
                }
            } else {
                // Auto-clear interval if component is unmounted
                clearInterval(timer);
                timersRef.current.delete(timer);
            }
        }, interval);

        timersRef.current.add(timer);
        return timer;
    }, [isMounted]);

    const clearSafeTimer = useCallback((timer: NodeJS.Timeout) => {
        clearTimeout(timer);
        clearInterval(timer);
        timersRef.current.delete(timer);
    }, []);

    const clearAllTimers = useCallback(() => {
        timersRef.current.forEach(timer => {
            clearTimeout(timer);
            clearInterval(timer);
        });
        timersRef.current.clear();
    }, []);

    return {
        safeSetTimeout,
        safeSetInterval,
        clearSafeTimer,
        clearAllTimers
    };
};

/**
 * Hook for managing multiple async operations with cleanup
 */
export const useAsyncOperationManager = () => {
    const isMounted = useMountedState();
    const operationsRef = useRef<Map<string, AbortController>>(new Map());

    useEffect(() => {
        return () => {
            // Abort all operations on unmount
            operationsRef.current.forEach(controller => controller.abort());
            operationsRef.current.clear();
        };
    }, []);

    const startOperation = useCallback(async <T>(
        operationId: string,
        asyncOperation: (signal: AbortSignal) => Promise<T>,
        onSuccess?: (result: T) => void,
        onError?: (error: Error) => void
    ): Promise<T | null> => {
        try {
            // Cancel existing operation with same ID
            const existingController = operationsRef.current.get(operationId);
            if (existingController) {
                existingController.abort();
            }

            // Create new controller for this operation
            const controller = new AbortController();
            operationsRef.current.set(operationId, controller);

            const result = await asyncOperation(controller.signal);

            // Only process result if component is still mounted and operation wasn't aborted
            if (isMounted() && !controller.signal.aborted) {
                operationsRef.current.delete(operationId);

                if (onSuccess) {
                    onSuccess(result);
                }
                return result;
            }

            return null;
        } catch (error) {
            const err = error as Error;

            // Clean up operation reference
            operationsRef.current.delete(operationId);

            // Only handle error if component is still mounted and operation wasn't aborted
            if (isMounted() && err.name !== 'AbortError') {
                reportAsyncError(`Async operation '${operationId}' failed: ${err.message}`, err.stack, {
                    action: 'useAsyncOperationManager.startOperation',
                    additionalData: {operationId}
                });

                if (onError) {
                    onError(err);
                }
            }

            return null;
        }
    }, [isMounted]);

    const cancelOperation = useCallback((operationId: string) => {
        const controller = operationsRef.current.get(operationId);
        if (controller) {
            controller.abort();
            operationsRef.current.delete(operationId);
        }
    }, []);

    const cancelAllOperations = useCallback(() => {
        operationsRef.current.forEach(controller => controller.abort());
        operationsRef.current.clear();
    }, []);

    const getActiveOperations = useCallback(() => {
        return Array.from(operationsRef.current.keys());
    }, []);

    return {
        startOperation,
        cancelOperation,
        cancelAllOperations,
        getActiveOperations
    };
};

/**
 * Hook for safe event listener management
 */
export const useSafeEventListener = () => {
    const isMounted = useMountedState();
    const listenersRef = useRef<Array<{ target: EventTarget; event: string; listener: EventListener }>>([]);

    useEffect(() => {
        return () => {
            // Remove all event listeners on unmount
            listenersRef.current.forEach(({target, event, listener}) => {
                target.removeEventListener(event, listener);
            });
            listenersRef.current = [];
        };
    }, []);

    const addEventListener = useCallback((
        target: EventTarget,
        event: string,
        listener: EventListener,
        options?: boolean | AddEventListenerOptions
    ) => {
        if (!isMounted()) {
            reportLifecycleError('Attempted to add event listener on unmounted component', undefined, {
                action: 'addEventListener',
                additionalData: {event}
            });
            return;
        }

        const safeListener: EventListener = (e) => {
            if (isMounted()) {
                try {
                    listener(e);
                } catch (error) {
                    const err = error as Error;
                    reportLifecycleError(`Event listener error for '${event}': ${err.message}`, err.stack, {
                        action: 'addEventListener.listener',
                        additionalData: {event}
                    });
                }
            }
        };

        target.addEventListener(event, safeListener, options);
        listenersRef.current.push({target, event, listener: safeListener});
    }, [isMounted]);

    const removeEventListener = useCallback((target: EventTarget, event: string, listener: EventListener) => {
        const index = listenersRef.current.findIndex(
            item => item.target === target && item.event === event && item.listener === listener
        );

        if (index !== -1) {
            const {listener: safeListener} = listenersRef.current[index];
            target.removeEventListener(event, safeListener);
            listenersRef.current.splice(index, 1);
        }
    }, []);

    return {addEventListener, removeEventListener};
};

/**
 * Comprehensive lifecycle management hook that combines all utilities
 */
export const useLifecycleManagement = () => {
    const isMounted = useMountedState();
    const {executeAsync, cancelAsync} = useSafeAsync();
    const {safeSetTimeout, safeSetInterval, clearAllTimers} = useSafeTimer();
    const {startOperation, cancelAllOperations, getActiveOperations} = useAsyncOperationManager();
    const {addEventListener, removeEventListener} = useSafeEventListener();

    const cleanup = useCallback(() => {
        cancelAsync();
        clearAllTimers();
        cancelAllOperations();
    }, [cancelAsync, clearAllTimers, cancelAllOperations]);

    return {
        isMounted,
        executeAsync,
        safeSetTimeout,
        safeSetInterval,
        startOperation,
        addEventListener,
        removeEventListener,
        cleanup,
        getActiveOperations
    };
};
