/**
 * Safe Logger Utility
 * LogBox 무한 루프를 방지하기 위한 안전한 로깅 유틸리티
 */

interface SafeLoggerOptions {
    enableConsole?: boolean;
    enableLogBox?: boolean;
    maxLogBoxErrors?: number;
}

class SafeLogger {
    private logBoxErrorCount = 0;
    private maxLogBoxErrors: number;
    private enableConsole: boolean;
    private enableLogBox: boolean;
    private originalConsoleError: typeof console.error;
    private originalConsoleWarn: typeof console.warn;
    private originalConsoleLog: typeof console.log;

    constructor(options: SafeLoggerOptions = {}) {
        this.enableConsole = options.enableConsole ?? true;
        this.enableLogBox = options.enableLogBox ?? true;
        this.maxLogBoxErrors = options.maxLogBoxErrors ?? 3;

        // 원본 console 메서드 저장
        this.originalConsoleError = console.error;
        this.originalConsoleWarn = console.warn;
        this.originalConsoleLog = console.log;
    }

    /**
     * 안전한 에러 로깅
     * LogBox 관련 에러는 무시하고, 일반 에러만 로깅
     */
    error = (...args: any[]) => {
        if (!this.enableConsole) return;

        const errorMessage = args.join(' ');

        // LogBox 관련 에러인지 확인
        if (this.isLogBoxRelatedError(errorMessage)) {
            this.logBoxErrorCount++;

            // LogBox 에러가 임계값을 초과하면 LogBox 비활성화
            if (this.logBoxErrorCount >= this.maxLogBoxErrors) {
                this.originalConsoleWarn('[SafeLogger] LogBox 무한 루프 감지 - 추가 LogBox 에러 무시');
                this.enableLogBox = false;
                return;
            }

            // LogBox 에러는 warn으로 처리
            this.originalConsoleWarn('[SafeLogger] LogBox 에러 감지:', ...args);
            return;
        }

        // 일반 에러는 정상 처리
        this.originalConsoleError(...args);
    };

    /**
     * 안전한 경고 로깅
     */
    warn = (...args: any[]) => {
        if (!this.enableConsole) return;
        this.originalConsoleWarn(...args);
    };

    /**
     * 안전한 일반 로깅
     */
    log = (...args: any[]) => {
        if (!this.enableConsole) return;
        this.originalConsoleLog(...args);
    };

    /**
     * ErrorBoundary 전용 안전한 에러 로깅
     */
    errorBoundaryLog = (error: Error, errorInfo?: any) => {
        if (!this.enableConsole) return;

        // ErrorBoundary 에러는 항상 로깅하되, LogBox 트리거를 피함
        const errorMessage = `[ErrorBoundary] ${error.message}`;

        if (this.isLogBoxRelatedError(error.message)) {
            // LogBox 관련 에러는 단순 텍스트로만 로깅
            this.originalConsoleWarn('[ErrorBoundary] LogBox 관련 에러 감지:', errorMessage);
            return;
        }

        // 일반 에러는 정상 로깅
        this.originalConsoleError('[ErrorBoundary] 에러 발생:', error);
        if (errorInfo) {
            this.originalConsoleError('[ErrorBoundary] 에러 정보:', errorInfo);
        }
    };

    /**
     * AsyncStorage 관련 정보성 로깅
     * null 반환은 정상 동작이므로 INFO 레벨로 처리
     */
    asyncStorageInfo = (...args: any[]) => {
        if (!this.enableConsole) return;

        const message = args.join(' ');

        // AsyncStorage null 반환 관련 메시지는 INFO 레벨로 처리
        if (this.isAsyncStorageNullReturn(message)) {
            this.originalConsoleLog('[SafeLogger] AsyncStorage INFO:', ...args);
            return;
        }

        // 일반 정보는 log로 처리
        this.originalConsoleLog(...args);
    };

    /**
     * AsyncStorage 관련 에러 로깅
     * 실제 에러만 error 레벨로 처리
     */
    asyncStorageError = (...args: any[]) => {
        if (!this.enableConsole) return;

        const message = args.join(' ');

        // AsyncStorage null 반환은 에러가 아님
        if (this.isAsyncStorageNullReturn(message)) {
            this.originalConsoleLog('[SafeLogger] AsyncStorage null return (normal):', ...args);
            return;
        }

        // AsyncStorage 가용성 문제만 실제 에러로 처리
        if (this.isAsyncStorageUnavailable(message)) {
            this.originalConsoleError('[SafeLogger] AsyncStorage unavailable:', ...args);
            return;
        }

        // 기타 AsyncStorage 관련 문제는 warn으로 처리
        this.originalConsoleWarn('[SafeLogger] AsyncStorage warning:', ...args);
    };

    /**
     * 로거 상태 리셋
     */
    reset = () => {
        this.logBoxErrorCount = 0;
        this.enableLogBox = true;
    };

    /**
     * 현재 상태 정보
     */
    getStatus = () => ({
        logBoxErrorCount: this.logBoxErrorCount,
        enableConsole: this.enableConsole,
        enableLogBox: this.enableLogBox,
        maxLogBoxErrors: this.maxLogBoxErrors
    });

    /**
     * AsyncStorage null 반환 관련 메시지인지 확인
     */
    private isAsyncStorageNullReturn = (message: string): boolean => {
        const nullReturnKeywords = [
            'null',
            'first launch',
            'no token',
            'not found',
            'empty',
            'undefined'
        ];

        const asyncStorageKeywords = [
            'AsyncStorage',
            'getItem',
            'hasLaunched',
            'userToken',
            'token'
        ];

        const hasAsyncStorageKeyword = asyncStorageKeywords.some(keyword =>
            message.toLowerCase().includes(keyword.toLowerCase())
        );

        const hasNullKeyword = nullReturnKeywords.some(keyword =>
            message.toLowerCase().includes(keyword.toLowerCase())
        );

        return hasAsyncStorageKeyword && hasNullKeyword;
    };

    /**
     * AsyncStorage 가용성 문제인지 확인
     */
    private isAsyncStorageUnavailable = (message: string): boolean => {
        const unavailableKeywords = [
            'AsyncStorage is null',
            'NativeModule: AsyncStorage is null',
            'AsyncStorage not available',
            'AsyncStorage undefined',
            'module not found'
        ];

        return unavailableKeywords.some(keyword =>
            message.toLowerCase().includes(keyword.toLowerCase())
        );
    };

    /**
     * LogBox 관련 에러인지 확인
     */
    private isLogBoxRelatedError = (message: string): boolean => {
        const logBoxKeywords = [
            'LogBox',
            'DevTools',
            'render log messages',
            'LogBoxStateSubscription',
            'Simulated error coming from DevTools'
        ];

        return logBoxKeywords.some(keyword =>
            message.toLowerCase().includes(keyword.toLowerCase())
        );
    };
}

// 전역 SafeLogger 인스턴스
export const safeLogger = new SafeLogger({
    enableConsole: __DEV__,
    enableLogBox: __DEV__,
    maxLogBoxErrors: 3
});

export default safeLogger;
