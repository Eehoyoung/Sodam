package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 명세서 월1회 무료발급 소진 기록 (B4/GR-NEW-04) — <b>키-레디</b>.
 *
 * <p>매장×년월당 1건(unique)으로 "이번 달 무료발급 사용함"을 표시. 멱등 단위.
 * <p><b>⚠️ TODO[승인]</b>: 실제 페이월 게이팅(무료 1회 후 402) 활성화는 인간 승인 대상.
 * 본 테이블·서비스는 카운터만 제공하고, 명세서 발급 게이트({@code @RequirePlan})에 배선하지 않는다.
 */
@Entity
@Table(name = "payslip_free_grant", uniqueConstraints = {
        @UniqueConstraint(name = "uq_payslip_free_grant", columnNames = {"store_id", "year_month_key"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PayslipFreeGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payslip_free_grant_id")
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    /** 년월 키 "YYYY-MM". */
    @Column(name = "year_month_key", length = 7, nullable = false)
    private String yearMonthKey;

    @Column(name = "granted_at", nullable = false)
    private LocalDateTime grantedAt;

    private PayslipFreeGrant(Long storeId, String yearMonthKey) {
        this.storeId = storeId;
        this.yearMonthKey = yearMonthKey;
        this.grantedAt = LocalDateTime.now();
    }

    public static PayslipFreeGrant of(Long storeId, String yearMonthKey) {
        return new PayslipFreeGrant(storeId, yearMonthKey);
    }
}
