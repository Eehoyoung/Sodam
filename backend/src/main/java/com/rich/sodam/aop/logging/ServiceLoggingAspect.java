package com.rich.sodam.aop.logging;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

/**
 * 서비스 메서드 로깅을 위한 AOP
 */
@Aspect
@Component
@Slf4j
public class ServiceLoggingAspect {

    /**
     * 서비스 계층 메서드 로깅
     */
    @Around("execution(* com.rich.sodam.service..*.*(..))")
    public Object logServiceMethodExecution(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String methodName = signature.getMethod().getName();
        String className = signature.getDeclaringType().getSimpleName();
        Object[] args = joinPoint.getArgs();

        // 위경도 등 위치정보(PII) 평문 로깅 방지: 좌표/좌표쌍 마스킹
        log.info("실행 시작: {}.{}() 매개변수: {}", className, methodName, LogArgMasker.mask(args));

        long startTime = System.currentTimeMillis();
        Object result;
        try {
            result = joinPoint.proceed();
            log.info("실행 완료: {}.{}() 반환값: {}", className, methodName,
                    LogArgMasker.mask(new Object[]{result}));
            return result;
        } catch (Exception e) {
            log.error("실행 오류: {}.{}() 예외: {}", className, methodName, e.getMessage(), e);
            throw e;
        } finally {
            long executionTime = System.currentTimeMillis() - startTime;
            log.info("실행 시간: {}.{}() {}ms", className, methodName, executionTime);
        }
    }
}