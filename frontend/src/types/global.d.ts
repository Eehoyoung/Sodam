declare namespace NodeJS {
    interface Timeout {
        _idleTimeout: number;
        _idlePrev: Timeout | null;
        _idleNext: Timeout | null;
        _idleStart: number;
        _onTimeout: () => void;
        _timerArgs: unknown[];
        _repeat: (() => void) | null;
    }
}

// Global object extensions for App.tsx
declare global {
    // Browser environment fallback
    interface Window {
        __APP_START_TIME__?: number;
    }
}

// NodeJS Global interface extension
declare namespace NodeJS {
    interface Global {
        __APP_START_TIME__?: number;
    }
}
