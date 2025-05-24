package com.rich.sodam.aop.performance;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * 성능 모니터링을 위한 AOP
 */
@Aspect
@Component
@Slf4j
public class PerformanceMonitoringAspect {

    /**
     * 메서드 실행 시간을 로깅하는 AOP
     */
    @Around("@annotation(com.rich.sodam.aop.performance.PerformanceLog)")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();

        try {
            return joinPoint.proceed();
        } finally {
            long executionTime = System.currentTimeMillis() - startTime;

            String methodName = joinPoint.getSignature().getName();
            String className = joinPoint.getSignature().getDeclaringTypeName();

            if (executionTime > 1000) {  // 1초 이상 소요된 경우 경고 로그
                log.warn("성능 경고: {}.{}() - 실행 시간: {}ms", className, methodName, executionTime);
            } else {
                log.debug("성능 측정: {}.{}() - 실행 시간: {}ms", className, methodName, executionTime);
            }
        }
    }
}