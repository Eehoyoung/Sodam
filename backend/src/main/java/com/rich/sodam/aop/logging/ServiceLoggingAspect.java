package com.rich.sodam.aop.logging;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * 서비스 메서드 로깅을 위한 AOP
 */
@Aspect
@Component
@Slf4j
public class ServiceLoggingAspect {

    private static final long SLOW_CALL_THRESHOLD_MILLIS = 500;

    /**
     * 서비스 계층 메서드 로깅
     */
    @Around("execution(* com.rich.sodam.service..*.*(..))")
    public Object logServiceMethodExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getSignature().getDeclaringType().getSimpleName();

        // 서비스 인자·반환값은 계약/급여/PII를 중첩 포함할 수 있으므로 allow-list 없이는 기록하지 않는다.
        log.debug("실행 시작: {}.{}()", className, methodName);

        long startTime = System.currentTimeMillis();
        Object result;
        try {
            result = joinPoint.proceed();
            log.debug("실행 완료: {}.{}()", className, methodName);
            return result;
        } catch (Exception e) {
            log.error("실행 오류: {}.{}() 예외유형: {}", className, methodName,
                    e.getClass().getSimpleName());
            throw e;
        } finally {
            long executionTime = System.currentTimeMillis() - startTime;
            if (executionTime >= SLOW_CALL_THRESHOLD_MILLIS) {
                log.info("느린 서비스 호출: {}.{}() {}ms", className, methodName, executionTime);
            } else {
                log.debug("실행 시간: {}.{}() {}ms", className, methodName, executionTime);
            }
        }
    }
}
