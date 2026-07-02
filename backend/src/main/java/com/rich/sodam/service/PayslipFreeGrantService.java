package com.rich.sodam.service;

import com.rich.sodam.domain.PayslipFreeGrant;
import com.rich.sodam.repository.PayslipFreeGrantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;

/**
 * 명세서 월1회 무료발급 카운터 (B4/GR-NEW-04) — <b>키-레디</b>.
 *
 * <p>수익화 v3.1 §1 최우선 A/B: "0회 완전잠금 vs 월1회 실발급 후 페이월(가치 각인 후 결제 최적점)".
 *
 * <p><b>✅ 활성화됨(2026-06-18 대표 승인)</b>: {@code PayrollService#generatePayrollPdf} 에서
 * 무료 플랜 사장의 이번 달 첫 발급은 {@link #tryConsumeFreeGrant} 가 true → 워터마크 없이 정식 발급,
 * 2건째부터 워터마크(미리보기). (하드 402 대신 워터마크 방식 유지 — 직원 본인 조회 보호.)
 */
@Service
@RequiredArgsConstructor
public class PayslipFreeGrantService {

    private final PayslipFreeGrantRepository repository;

    /** 이번 달 무료발급을 이미 썼는지(읽기). */
    @Transactional(readOnly = true)
    public boolean hasUsedThisMonth(Long storeId, YearMonth month) {
        return repository.existsByStoreIdAndYearMonthKey(storeId, month.toString());
    }

    /**
     * 이번 달 무료발급 1회 소진 시도. 아직 안 썼으면 기록하고 true(무료 허용), 이미 썼으면 false.
     * 멱등: 같은 달 두 번째 호출은 false.
     */
    @Transactional
    public boolean tryConsumeFreeGrant(Long storeId, YearMonth month) {
        String key = month.toString();
        if (repository.existsByStoreIdAndYearMonthKey(storeId, key)) {
            return false;
        }
        repository.save(PayslipFreeGrant.of(storeId, key));
        return true;
    }
}
