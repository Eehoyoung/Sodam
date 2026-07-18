package com.rich.sodam.config;

import com.rich.sodam.domain.Store;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * PII 핫픽스(§-1) 이전에 평문으로 저장된 {@code store.business_number} 행의 블라인드 인덱스
 * (§2.6) 백필 — Phase 6에서 실제 운영 데이터에 실행하는 1회성 배치.
 *
 * <p>기본 비활성. {@code sodam.security.pii.backfill-business-number-hash=true} 로 명시적으로
 * 켠 상태로 1회 기동해야만 실행된다(매 부팅마다 도는 상시 배치 아님) — 되돌릴 수 없는 데이터
 * 변경(재암호화)이 섞여 있으므로 운영 적용 전 스테이징에서 먼저 검증할 것.
 *
 * <p>멱등: {@code business_number_search_hash IS NULL} 인 행만 대상으로 하므로, 중간에 중단되거나
 * 여러 번 실행돼도 이미 백필된 행은 다시 건드리지 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "sodam.security.pii", name = "backfill-business-number-hash", havingValue = "true")
public class BusinessNumberSearchHashBackfillRunner implements ApplicationRunner {

    private final StoreRepository storeRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Store> targets = storeRepository.findAllByBusinessNumberSearchHashIsNull();
        if (targets.isEmpty()) {
            log.info("business_number_search_hash 백필 대상 없음 — 스킵.");
            return;
        }
        targets.forEach(Store::backfillBusinessNumberSearchHash);
        storeRepository.saveAll(targets);
        log.info("business_number_search_hash 백필 완료 — {}건 처리.", targets.size());
    }
}
