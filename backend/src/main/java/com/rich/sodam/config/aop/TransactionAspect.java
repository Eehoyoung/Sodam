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
 * <p><b>WP-07(FE_BE_CORE_배선_리팩터링_작업계획서.md)</b>: 명시적 {@code @Transactional} 선언을
 * 단일 진실로 만들고 이 전역 advisor를 제거하는 것이 목표다. 삭제 전 단계로
 * {@code sodam.transaction.global-advisor.enabled}(기본값 true — 지금 이 커밋은 동작을 바꾸지
 * 않는다) 플래그를 추가해, 명시 트랜잭션 커버리지가 충분히 확보된 뒤 환경별로 끄고 관찰할 수
 * 있게 한다. 실제 advisor 제거·이 클래스 삭제는 그 관찰이 끝난 뒤의 별도 커밋에서 수행한다.</p>
 */
@Aspect
@Configuration
@ConditionalOnProperty(name = "sodam.transaction.global-advisor.enabled", havingValue = "true", matchIfMissing = true)
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