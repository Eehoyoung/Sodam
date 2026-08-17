package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 퇴사일 조율(왕복 협의) 제안 이력 — append-only(260817 퇴사 처리 기능 계획서 WP-3, 3차 정정).
 *
 * <p>수정·삭제 없음. {@link EmployeeResignationRequest#getAgreedResignationDate()}는 마지막으로
 * {@link #accepted}가 true가 된 제안의 {@link #proposedDate}를 복사한 캐시일 뿐이고, source of
 * truth는 이 이력 테이블이다 — 분쟁("내가 먼저 이 날짜를 제안했는데 무시당했다")이 생기면 이
 * 이력이 곧 증거가 된다.</p>
 *
 * <p>{@code proposedDate}는 데이터 캡처 전용이다(HC-1/HC-8) — 급여 계산·보존기간 기산 로직
 * 어디에도 전달하지 않는다.</p>
 */
@Entity
@Table(name = "employee_resignation_date_proposal", indexes = {
        @Index(name = "idx_resignation_proposal_request", columnList = "request_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeResignationDateProposal {

    public enum ProposerRole { EMPLOYEE, MASTER }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private EmployeeResignationRequest request;

    @Enumerated(EnumType.STRING)
    @Column(name = "proposer_role", nullable = false, length = 20)
    private ProposerRole proposerRole;

    @Column(name = "proposed_date", nullable = false)
    private LocalDate proposedDate;

    @Column(name = "proposed_at", nullable = false)
    private LocalDateTime proposedAt;

    @Column(nullable = false)
    private boolean accepted = false;

    public static EmployeeResignationDateProposal create(
            EmployeeResignationRequest request, ProposerRole proposerRole, LocalDate proposedDate) {
        EmployeeResignationDateProposal p = new EmployeeResignationDateProposal();
        p.request = request;
        p.proposerRole = proposerRole;
        p.proposedDate = proposedDate;
        p.proposedAt = LocalDateTime.now();
        return p;
    }

    public void markAccepted() {
        this.accepted = true;
    }
}
