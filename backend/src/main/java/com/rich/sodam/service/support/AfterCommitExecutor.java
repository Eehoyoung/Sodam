package com.rich.sodam.service.support;

import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 트랜잭션 커밋 이후 실행 시점만 결정하는 공용 실행기(WP-06).
 *
 * <p>{@link AttendanceService}, {@link LiveSyncPublisher}, {@link NotificationService},
 * {@link PayrollService}, {@link StoreManagementServiceImpl} 다섯 곳에 각자 구현돼 있던
 * "활성 트랜잭션이면 afterCommit에 등록, 아니면 즉시 실행" 패턴을 한 곳으로 모았다.</p>
 *
 * <p>이 클래스는 <b>실행 시점</b>만 책임진다 — 예외를 삼키거나 로그를 남기거나 메시지를 재구성하지
 * 않는다. 실패 격리·재시도·로깅 정책은 호출측(publisher)이 이전과 동일하게 자신의 try/catch로
 * 유지한다.</p>
 */
@Component
public class AfterCommitExecutor {

    public void execute(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
