package com.rich.sodam.config.aop;

import org.aspectj.lang.annotation.Aspect;
import org.springframework.aop.Advisor;
import org.springframework.aop.aspectj.AspectJExpressionPointcut;
import org.springframework.aop.support.DefaultPointcutAdvisor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.TransactionManager;
import org.springframework.transaction.interceptor.MatchAlwaysTransactionAttributeSource;
import org.springframework.transaction.interceptor.RollbackRuleAttribute;
import org.springframework.transaction.interceptor.RuleBasedTransactionAttribute;
import org.springframework.transaction.interceptor.TransactionInterceptor;

import java.util.Collections;

/**
 * 전역 트랜잭션 AOP 설정 — {@code com.rich.sodam.service} 패키지 전체 메서드에 write
 * 트랜잭션을 일괄 적용한다(read-only 분기는 미사용 dead code, {@link #transactionAdvice()} 참고).
 *
 * <p><b>WP-07(FE_BE_CORE_배선_리팩터링_작업계획서.md) B-5</b>: {@code sodam.transaction.global-advisor.enabled}
 * 기본값을 false로 전환했다(2026-07-19) — B-1(checked exception rollbackFor 감사)·B-2
 * (TransactionBoundaryTest)·B-3(advisor off 전체 스위트 관찰, 923개 중 922개 무영향 확인)·B-4
 * (ElectronicSignatureWorker REQUIRES_NEW 격리)가 모두 끝난 뒤의 전환이다. 이 클래스 자체의 삭제는
 * 이 전환 이후 한 사이클(로컬 dev 기동 + 스모크) 관찰을 거친 별도 커밋에서 수행한다 — 환경변수로
 * {@code sodam.transaction.global-advisor.enabled=true}를 주면 즉시 이전 동작으로 롤백 가능하다.</p>
 */
@Aspect
@Configuration
@ConditionalOnProperty(name = "sodam.transaction.global-advisor.enabled", havingValue = "true", matchIfMissing = false)
// @EnableTransactionManagement 제거 - Spring Boot가 자동으로 설정하도록 함
public class TransactionAspect {

    private static final String TRANSACTION_EXPRESSION =
            "execution(* com.rich.sodam.service..*.*(..))";

    private final TransactionManager transactionManager;

    public TransactionAspect(TransactionManager transactionManager) {
        this.transactionManager = transactionManager;
    }

    @Bean
    public TransactionInterceptor transactionAdvice() {
        // 읽기 전용 메서드에 대한 트랜잭션 속성
        RuleBasedTransactionAttribute readOnlyAttribute;
        readOnlyAttribute = new RuleBasedTransactionAttribute();
        readOnlyAttribute.setReadOnly(true);

        // 일반 메서드에 대한 트랜잭션 속성 (Exception 발생시 롤백)
        RuleBasedTransactionAttribute writeAttribute = new RuleBasedTransactionAttribute();
        writeAttribute.setRollbackRules(Collections.singletonList(new RollbackRuleAttribute(Exception.class)));

        // 트랜잭션 속성 소스 설정
        MatchAlwaysTransactionAttributeSource source = new MatchAlwaysTransactionAttributeSource();
        source.setTransactionAttribute(writeAttribute);

        return new TransactionInterceptor(transactionManager, source);
    }

    @Bean
    public Advisor transactionAdvisor() {
        AspectJExpressionPointcut pointcut = new AspectJExpressionPointcut();
        pointcut.setExpression(TRANSACTION_EXPRESSION);

        return new DefaultPointcutAdvisor(pointcut, transactionAdvice());
    }
}