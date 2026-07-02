package com.rich.sodam.domain;

import com.rich.sodam.config.crypto.StringCryptoConverter;
import com.rich.sodam.domain.type.UserGrade;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 사용자 엔티티
 * 시스템 사용자 정보를 관리합니다.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "user", indexes = {
        @Index(name = "idx_user_email", columnList = "email"),
        @Index(name = "idx_user_grade", columnList = "user_grade"),
        @Index(name = "idx_user_created_at", columnList = "created_at")
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    /**
     * 사용자 이메일 (로그인 ID로 사용)
     */
    @Column(nullable = false, unique = true, length = 100)
    private String email;

    /**
     * 사용자 이름
     */
    @Column(nullable = false, length = 50)
    private String name;

    /**
     * 사용자 등급
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserGrade userGrade;

    /**
     * 계정 생성 시간
     */
    @Column(nullable = false)
    private LocalDateTime createdAt;

    /**
     * 사용자 비밀번호 (해시된 값)
     */
    @com.fasterxml.jackson.annotation.JsonIgnore // 응답 직렬화 시 BCrypt 해시 노출 차단(광역 방어)
    @Column(length = 255)
    private String password;

    /**
     * 이용약관 동의 일시 (필수, 미동의 시 null = 가입 무효)
     */
    @Column(name = "terms_agreed_at")
    private LocalDateTime termsAgreedAt;

    /**
     * 개인정보처리방침 동의 일시 (필수)
     */
    @Column(name = "privacy_agreed_at")
    private LocalDateTime privacyAgreedAt;

    /**
     * 만 14세 이상 확인 일시 (필수)
     */
    @Column(name = "age_confirmed_at")
    private LocalDateTime ageConfirmedAt;

    /**
     * 위치정보 수집·이용 동의 일시 (GPS 출퇴근 사용 시 필수 — 위치정보법 §18·§19).
     * 미동의(null) 시 위치기반 출퇴근 기능을 제공할 수 없다.
     */
    @Column(name = "location_info_agreed_at")
    private LocalDateTime locationInfoAgreedAt;

    /**
     * 마케팅 정보 수신 동의 일시 (선택, 동의 철회 시 null 로 회수)
     */
    @Column(name = "marketing_agreed_at")
    private LocalDateTime marketingAgreedAt;

    /**
     * 휴대폰 번호 — 최초 가입 시 미입력, ProfileBasics 보강 단계에서 수집.
     * 형식: 010XXXXXXXX (저장은 숫자만, 표시는 FE 에서 하이픈 삽입).
     * NotificationService SMS 발송·고객지원 식별 등에 사용.
     *
     * PIPA §29: AES/GCM 양방향 암호화 저장(StringCryptoConverter).
     * 키 미설정 dev/test 는 평문 폴백 — 컬럼은 암호문 길이 대비 VARCHAR(255).
     */
    @Convert(converter = StringCryptoConverter.class)
    @Column(name = "phone", length = 255)
    private String phone;

    /**
     * 생년월일 (선택) — 만 14세 검증·맞춤 콘텐츠에 사용.
     */
    @Column(name = "birth_date")
    private java.time.LocalDate birthDate;

    /**
     * 프로필 기본정보 완성 시점 — null 이면 로그인 후 ProfileBasics 로 강제 진입.
     */
    @Column(name = "profile_completed_at")
    private LocalDateTime profileCompletedAt;

    /**
     * 회원 탈퇴 시점 — null 이면 정상 회원.
     * PIPA §21: 처리방침상 탈퇴 후 90일 보관 후 PII(phone/birthDate/name) 익명화.
     * UserDataRetentionScheduler 가 본 시점 기준 90일 경과분을 익명화한다.
     */
    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    /**
     * 탈퇴 후 90일 경과 시 PII 익명화 완료 시점 — null 이면 아직 익명화 전.
     * (배치 재실행 시 중복 처리 방지 마커)
     */
    @Column(name = "pii_anonymized_at")
    private LocalDateTime piiAnonymizedAt;

    /**
     * 기본 생성자 (이메일과 이름으로 사용자 생성)
     *
     * @param email 사용자 이메일
     * @param name  사용자 이름
     */
    public User(String email, String name) {
        this.email = email;
        this.name = name;
        this.userGrade = UserGrade.Personal;
        this.createdAt = LocalDateTime.now();
    }

    /**
     * 전체 필드 생성자
     *
     * @param id        사용자 ID
     * @param email     사용자 이메일
     * @param name      사용자 이름
     * @param userGrade 사용자 등급
     * @param createdAt 생성 시간
     * @param password  비밀번호
     */
    public User(Long id, String email, String name, UserGrade userGrade, LocalDateTime createdAt, String password) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.userGrade = userGrade;
        this.createdAt = createdAt;
        this.password = password;
    }

    /**
     * 사용자를 마스터로 변경
     */
    public void changeToMaster() {
        this.userGrade = UserGrade.MASTER;
    }

    /**
     * 사용자를 직원으로 변경
     */
    public void changeToEmployee() {
        this.userGrade = UserGrade.EMPLOYEE;
    }

    /**
     * 프로필 기본정보 완성 처리 — phone 필수 검증 + 완성 시점 마킹.
     * FE 가 로그인 후 profileCompleted=false 면 ProfileBasics 로 강제 진입,
     * 본 메서드 호출 후 응답 profileCompleted=true 로 정상 라우팅.
     */
    public void completeProfile(String phone, String name, java.time.LocalDate birthDate) {
        if (phone == null || phone.isBlank()) {
            throw new IllegalArgumentException("phone is required");
        }
        // 숫자만 저장 (FE 가 하이픈 표시 책임)
        this.phone = phone.replaceAll("[^0-9]", "");
        if (name != null && !name.isBlank()) {
            this.name = name.trim();
        }
        if (birthDate != null) {
            this.birthDate = birthDate;
        }
        this.profileCompletedAt = LocalDateTime.now();
    }

    /**
     * 프로필 완성 여부 (로그인 응답 + FE 분기 판정에 사용).
     */
    public boolean isProfileCompleted() {
        return this.profileCompletedAt != null;
    }

    /**
     * 탈퇴 마킹 — 탈퇴 시점 기록 (90일 PII 파기 기산점).
     * 이미 탈퇴된 경우 기존 시점 유지(재호출 멱등).
     */
    public void markWithdrawn() {
        if (this.withdrawnAt == null) {
            this.withdrawnAt = LocalDateTime.now();
        }
    }

    /**
     * 탈퇴 여부.
     */
    public boolean isWithdrawn() {
        return this.withdrawnAt != null;
    }

    /**
     * PII 익명화 (PIPA §21) — 탈퇴 후 보관기간 경과 시 호출.
     * phone/birthDate 는 파기(null), name 은 '탈퇴회원' 으로 대체.
     * 멱등: 이미 익명화된 경우 재실행해도 안전.
     */
    public void anonymizePii() {
        this.phone = null;
        this.birthDate = null;
        this.name = "탈퇴회원";
        this.piiAnonymizedAt = LocalDateTime.now();
    }

    /**
     * PII 익명화 완료 여부 (배치 중복 처리 방지).
     */
    public boolean isPiiAnonymized() {
        return this.piiAnonymizedAt != null;
    }

    /**
     * 필수 약관(이용약관·개인정보·만14세) 동의 완료 여부.
     * 카카오 등 소셜 가입은 이 값이 false 인 채 생성되므로, 후속 동의 화면에서 수집해야 한다(PIPA §22).
     * 위치정보 동의는 GPS 출퇴근 사용 시점에 별도 요구하므로 필수 가입요건에서 제외한다.
     */
    public boolean hasCompletedRequiredConsents() {
        return termsAgreedAt != null && privacyAgreedAt != null && ageConfirmedAt != null;
    }

    /** 위치정보 동의 여부 (GPS 출퇴근 가능 여부 판정). */
    public boolean hasAgreedLocationInfo() {
        return locationInfoAgreedAt != null;
    }

    /**
     * 생성 시간 자동 설정
     */
    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
