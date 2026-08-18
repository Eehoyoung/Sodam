import {performanceMonitor} from '../../src/services/PerformanceMonitor';
import {JSIPerformanceMonitor} from '../../src/services/JSIPerformanceMonitor';

// [Test Mapping] C-6 — RN 에는 표준 메모리 API 가 없다. 예전 구현은 Math.random()·애니메이션 개수로
// 지어낸 값을 실측처럼 다뤄 근거 없는 메모리 경고를 띄웠다. 측정 불가는 null 이어야 하고,
// 헬스/점수 판정은 그 값을 근거로 삼지 않아야 한다.

describe('메모리 측정 불가(RN) 처리', () => {
    beforeEach(() => {
        performanceMonitor.clearPerformanceData();
        jest.useFakeTimers();
    });
    afterEach(() => {
        performanceMonitor.stopMonitoring();
        jest.useRealTimers();
    });

    it('performance.memory 가 없으면 memoryUsage 는 null 로 남는다 (추정값 생성 금지)', () => {
        expect((performance as any).memory).toBeUndefined();

        performanceMonitor.startMonitoring();
        jest.advanceTimersByTime(15000); // 메모리 모니터 3회 tick

        expect(performanceMonitor.getMetrics().memoryUsage).toBeNull();
    });

    it('메모리 미측정 상태에서 메모리 경고/감점이 발생하지 않는다', () => {
        performanceMonitor.startMonitoring();
        jest.advanceTimersByTime(15000);

        const summary = performanceMonitor.getPerformanceSummary();
        expect(summary.issues.filter(i => i.type === 'memory')).toHaveLength(0);
        expect(summary.suggestions.filter(s => s.category === 'memory')).toHaveLength(0);
    });

    it('JSI 모니터의 헬스 판정도 메모리 미측정 시 메모리 이슈를 만들지 않는다', () => {
        const health = JSIPerformanceMonitor.getHealthStatus();
        expect(health.issues.some(i => i.toLowerCase().includes('memory'))).toBe(false);
    });
});
