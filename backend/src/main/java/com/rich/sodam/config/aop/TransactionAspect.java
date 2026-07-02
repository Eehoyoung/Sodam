package com.rich.sodam.config.aop;

import org.aspectj.lang.annotation.Aspect;
import org.springframework.aop.Advisor;
import org.springframework.aop.aspectj.AspectJExpressionPointcut;
import org.springframework.aop.support.DefaultPointcutAdvisor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.TransactionManager;
import org.springframework.transaction.interceptor.MatchAlwaysTransactionAttributeSource;
import org.springframework.transaction.interceptor.RollbackRuleAttribute;
import org.springframework.transaction.interceptor.RuleBasedTransactionAttribute;
import org.springframework.transaction.interceptor.TransactionInterceptor;

import java.util.Collections;

/**
 * 트랜잭션 AOP 설정
 */
@Aspect
@Configuration
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