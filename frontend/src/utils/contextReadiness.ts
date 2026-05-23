import {InteractionManager} from 'react-native';

/**
 * Context Readiness Manager - SIMPLIFIED VERSION
 * Always returns ready state to avoid UI blocking issues
 * Original complex timing logic temporarily disabled for white screen fix
 */
export class ContextReadinessManager {
    private static instance: ContextReadinessManager;
    private readyTimestamp: number | null = null;

    private constructor() {
        // Simplified constructor - no complex Promise setup needed
        this.readyTimestamp = Date.now();
        console.log('[CONTEXT_READINESS] ContextReadinessManager simplified - always ready');
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ContextReadinessManager {
        if (!ContextReadinessManager.instance) {
            ContextReadinessManager.instance = new ContextReadinessManager();
        }
        return ContextReadinessManager.instance;
    }

    /**
     * Check if React Native context is ready - ALWAYS TRUE
     */
    public isContextReady(): boolean {
        return true; // Always ready to avoid UI blocking
    }

    /**
     * Get a promise that resolves immediately
     */
    public waitForReady(): Promise<void> {
        return Promise.resolve(); // Resolve immediately
    }

    /**
     * Signal that React Native context is ready - simplified
     */
    public signalReady(): void {
        console.log('[CONTEXT_READINESS] signalReady called (simplified mode - no-op)');
        // No complex logic needed - always ready
    }

    /**
     * Add a callback to be executed immediately
     */
    public onReady(callback: () => void): void {
        // Execute immediately since we're always ready
        try {
            callback();
            console.log('[CONTEXT_READINESS] onReady callback executed immediately');
        } catch (error) {
            console.error('[CONTEXT_READINESS] Error in immediate callback:', error);
        }
    }

    /**
     * Get timing information for diagnostics
     */
    public getReadyTimestamp(): number | null {
        return this.readyTimestamp;
    }

    /**
     * Reset readiness state - simplified (no-op since always ready)
     */
    public reset(): void {
        console.log('[CONTEXT_READINESS] Reset called (simplified mode - no-op, always ready)');
        // No complex state to reset - always ready
        this.readyTimestamp = Date.now();
    }

    /**
     * Signal native layer - simplified (no complex communication needed)
     */
    private signalNativeLayer(): void {
        try {
            if (typeof global !== 'undefined') {
                (global as any).__REACT_CONTEXT_READY__ = true;
                (global as any).__REACT_CONTEXT_READY_TIMESTAMP__ = this.readyTimestamp;
            }
            console.log('[CONTEXT_READINESS] Native layer notified (simplified mode)');
        } catch (error) {
            console.warn('[CONTEXT_READINESS] Failed to signal native layer:', error);
        }
    }
}

/**
 * Utility function to safely execute code after React context is ready
 */
export const executeWhenReady = async <T>(
    operation: () => Promise<T> | T,
    timeoutMs: number = 5000
): Promise<T> => {
    const manager = ContextReadinessManager.getInstance();

    // If already ready, execute immediately
    if (manager.isContextReady()) {
        return operation();
    }

    // Wait for readiness with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Context readiness timeout after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        await Promise.race([manager.waitForReady(), timeoutPromise]);
        return operation();
    } catch (error) {
        console.warn('[CONTEXT_READINESS] Operation failed or timed out:', error);
        throw error;
    }
};

/**
 * Hook-like function for components to safely initialize after context is ready
 */
export const initializeAfterReady = (
    initFunction: () => void,
    dependencies: any[] = []
): void => {
    const manager = ContextReadinessManager.getInstance();

    // Use InteractionManager to ensure we don't block the UI
    InteractionManager.runAfterInteractions(() => {
        manager.onReady(() => {
            // Add a small delay to ensure everything is truly ready
            requestAnimationFrame(() => {
                initFunction();
            });
        });
    });
};

/**
 * Get the global context readiness manager instance
 */
export const getContextReadinessManager = (): ContextReadinessManager => {
    return ContextReadinessManager.getInstance();
};

/**
 * Helper to log timing information for diagnostics
 */
export const logContextReadinessTiming = (): void => {
    const manager = ContextReadinessManager.getInstance();
    const timestamp = manager.getReadyTimestamp();

    if (timestamp) {
        const initTime = timestamp - (global as any).__APP_START_TIME__ || 0;
        console.log(`[CONTEXT_READINESS] Context became ready ${initTime}ms after app start`);
    } else {
        console.log('[CONTEXT_READINESS] Context not yet ready');
    }
};
