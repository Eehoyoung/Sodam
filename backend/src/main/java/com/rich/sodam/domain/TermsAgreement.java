package com.rich.sodam.domain;

import com.rich.sodam.domain.type.TermsType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 약관 동의 이력 (감사 추적). PIPA는 동의를 받은 사실·시점·내용을 입증할 수 있어야 하므로,
 * 동의/철회를 버전과 함께 불변 이력으로 적재한다(약관 버전관리·동의 입증 결함 해소).
 *
 * <p>한 사용자가 같은 약관에 대해 (재동의·철회로) 여러 행을 가질 수 있다. 현재 유효 상태는
 * {@code agreed} 최신 행으로 판단한다.</p>
 */
@Entity
@Table(name = "terms_agreement",
        indexes = @Index(name = "idx_terms_agreement_user", columnList = "user_id, terms_type"))
@Getter
@NoArgsConstructor
public class TermsAgreement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "terms_agreement_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "terms_type", nullable = false, length = 40)
    private TermsType termsType;

    /** 동의/철회한 약관 버전 식별자(예: tos-v1.0). */
    @Column(name = "terms_version", nullable = false, length = 40)
    private String termsVersion;

    /** true=동의, false=철회. */
    @Column(name = "agreed", nullable = false)
    private boolean agreed;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    private TermsAgreement(Long userId, TermsType termsType, String termsVersion,
                           boolean agreed, LocalDateTime recordedAt) {
        this.userId = userId;
        this.termsType = termsType;
        this.termsVersion = termsVersion;
        this.agreed = agreed;
        this.recordedAt = recordedAt;
    }

    public static TermsAgreement of(Long userId, TermsType type, String version,
                                    boolean agreed, LocalDateTime at) {
        return new TermsAgreement(userId, type, version, agreed, at);
    }
}
