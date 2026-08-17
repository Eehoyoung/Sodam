package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 직원 사직서 (직원 → 사장). 상태: PENDING → WITHDRAWN | ACKNOWLEDGED
 * (260817 퇴사 처리 기능 계획서 WP-1, 3차 정정).
 *
 * <p><b>REJECTED가 없는 이유</b>: 사직은 근로자의 일방적 의사표시라(민법 §660) 사장이 "거절"할
 * 법적 권한이 없다. 사용자가 거부할 수 있는 상태를 만들지 않는다 — {@link Status} 참고.</p>
 *
 * <p><b>ACKNOWLEDGED는 비활성화가 아니다</b>: {@link #acknowledge()}는 상태만 바꾸고
 * {@code EmployeeStoreRelation.changeActive(false)}를 호출하지 않는다. 실제 비활성화는 여전히
 * 기존 사장 토글({@code StoreController.setEmployeeActive})이 별도 시점에 담당한다 — 희망
 * 퇴사일이 미래인데 확인 즉시 비활성화하면 그 순간부터 출퇴근을 못 찍게 되는 결함을 피하기
 * 위함이다.</p>
 *
 * <p><b>desiredResignationDate/agreedResignationDate는 데이터 캡처 전용</b>이다 — 급여 계산·
 * 보존기간 기산 로직 어디에서도 참조하지 않는다(HC-1, G-15·G-6 게이트 회신 전까지).</p>
 */
@Entity
@Table(name = "employee_resignation_request", indexes = {
        @Index(name = "idx_resignation_request_relation", columnList = "relation_id"),
        @Index(name = "idx_resignation_request_requester", columnList = "requester_id"),
        @Index(name = "idx_resignation_request_status", columnList = "status")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeResignationRequest {

    public enum Status { PENDING, WITHDRAWN, ACKNOWLEDGED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "relation_id", nullable = false)
    private EmployeeStoreRelation relation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @Column(name = "desired_resignation_date", nullable = false)
    private LocalDate desiredResignationDate;

    /** 협의 확정일(WP-3). null이면 아직 협의 중 — 서명 개시(WP-4)의 전제조건. */
    @Column(name = "agreed_resignation_date")
    private LocalDate agreedResignationDate;

    @Column(length = 200)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(nullable = false)
    private LocalDateTime requestedAt;
    private LocalDateTime decidedAt;

    /** WP-4 전자서명 봉투 연결(선택적 — HC-13, 서명 완료를 확인의 전제조건으로 두지 않는다). */
    @Column(name = "signature_envelope_id")
    private Long signatureEnvelopeId;

    /** 낙관적 락(이 코드베이스 컨벤션). */
    @Version
    @Column(nullable = false)
    private Long version;

    public static EmployeeResignationRequest create(
            EmployeeStoreRelation relation, User requester, LocalDate desiredResignationDate, String reason) {
        EmployeeResignationRequest r = new EmployeeResignationRequest();
        r.relation = relation;
        r.requester = requester;
        r.desiredResignationDate = desiredResignationDate;
        r.reason = reason;
        r.status = Status.PENDING;
        r.requestedAt = LocalDateTime.now();
        return r;
    }

    public boolean isPending() {
        return this.status == Status.PENDING;
    }

    public void withdraw() {
        this.status = Status.WITHDRAWN;
        this.decidedAt = LocalDateTime.now();
    }

    /** 접수 확인 — 비활성화가 아니다(클래스 javadoc 참고). 협의 확정(agreedResignationDate) 후에만 호출한다. */
    public void acknowledge() {
        this.status = Status.ACKNOWLEDGED;
        this.decidedAt = LocalDateTime.now();
    }

    /** WP-3 — 상대의 마지막 제안에 동의해 협의를 확정한다. */
    public void agreeOn(LocalDate date) {
        this.agreedResignationDate = date;
    }

    /** WP-4 — 서명 봉투 연결(서명 완료 여부와 무관하게 상태는 바뀌지 않는다, HC-2). */
    public void linkSignatureEnvelope(Long envelopeId) {
        this.signatureEnvelopeId = envelopeId;
    }
}
