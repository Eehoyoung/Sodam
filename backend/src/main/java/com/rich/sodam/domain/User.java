package com.rich.sodam.domain;

import com.rich.sodam.config.crypto.PiiSearchHashSupport;
import com.rich.sodam.config.crypto.LocalDateCryptoConverter;
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
     * Apple의 sub 클레임 — 앱+사용자 조합의 안정적 불변 식별자.
     * Apple identityToken 은 재로그인 시 email 클레임을 재전송하지 않을 수 있어(특히 이메일 릴레이 사용 시)
     * email 단일 매칭(카카오 방식)으로는 사용자를 못 찾을 수 있다. 그래서 이 컬럼을 기본 조회 키로 쓴다.
     * nullable(카카오/이메일 가입 사용자는 값 없음) — MySQL UNIQUE INDEX 는 NULL 다중 허용.
     */
    @Column(name = "apple_sub", unique = true, length = 255)
    private String appleSub;

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
     * 휴대폰 번호 블라인드 인덱스(HMAC-SHA256, DB_OPTIMIZATION_PLAN.md §2.6) — phone이 AES-GCM
     * 암호화라 동등검색이 불가능해진 대신 이 컬럼으로 조회한다. 아직 이 해시로 조회하는 기능은 없다
     * (§5 확정 정책 — 향후 검색 기능 추가 대비 선제 도입). {@link #completeProfile}에서만 계산한다 —
     * {@code setPhone()}(Lombok, DevSeedRunner 시드용) 직접 호출은 해시가 갱신되지 않는다.
     */
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "phone_search_hash", length = 64)
    private String phoneSearchHash;

    /**
     * 생년월일 (선택) — 만 14세 검증·맞춤 콘텐츠에 사용.
     */
    @Convert(converter = LocalDateCryptoConverter.class)
    @Column(name = "birth_date", length = 255)
    private java.time.LocalDate birthDate;

    /**
     * 프로필 기본정보 완성 시점 — null 이면 로그인 후 ProfileBasics 로 강제 진입.
     */
    @Column(name = "profile_completed_at")
    private LocalDateTime profileCompletedAt;

    /**
     * 개인 모드 사용 여부 — 매장에 속하지 않고 혼자 근무를 기록하는 상태(PRD §2.1, §4.14).
     *
     * <p><b>역할이 아니라 상태다.</b> 이 값이 true 여도 {@code userGrade}는 바꾸지 않는다 —
     * 등급을 {@code Personal}로 낮추면 인증채용·채용채팅·경력증명서가 모두
     * {@code @EmployeeOrMaster}에 막혀 403 이 되고, 퇴사자의 데이터 연속성이 깨진다.</p>
     */
    @Column(name = "personal_mode_enabled", nullable = false)
    private boolean personalModeEnabled = false;

    /**
     * 개인 모드 전환에 동의한 시점 — null 이면 미동의.
     * 동의 <b>버전</b> 이력은 {@code Consent}(TermsType.PERSONAL_MODE_CONVERSION)에 별도로 남는다.
     */
    @Column(name = "personal_mode_agreed_at")
    private LocalDateTime personalModeAgreedAt;

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
     * 아바타(프로필 사진) 공개 URL — ObjectStorage 가 반환한 publicUrl. null 이면 기본 이미지 사용(FE 처리).
     * URL/스토리지 키는 개인식별정보가 아니므로 PII 암호화 컨버터 대상이 아니다.
     */
    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    /**
     * 아바타 ObjectStorage 키 (예: "users/{userId}/avatar/{uuid}.jpg") — 교체/삭제 시 기존 파일 정리에 사용.
     */
    @Column(name = "avatar_key", length = 300)
    private String avatarKey;

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
        this.phoneSearchHash = PiiSearchHashSupport.hashPhone(this.phone);
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
        this.phoneSearchHash = null; // 해시만 남아있으면 평문 파기 후에도 동일 번호 존재 여부가 상관관계로 새어나감
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
     * 아바타 교체 — 새 파일 저장 완료 후 URL/키를 함께 갱신한다(교체 방식, 1인 1장).
     */
    public void updateAvatar(String avatarUrl, String avatarKey) {
        this.avatarUrl = avatarUrl;
        this.avatarKey = avatarKey;
    }

    /**
     * 아바타 초기화(기본 이미지로 되돌림) — 컬럼을 null 로 비운다. 실제 파일 삭제는 서비스가 ObjectStorage 로 별도 수행.
     */
    public void clearAvatar() {
        this.avatarUrl = null;
        this.avatarKey = null;
    }

    /**
     * 개인 모드를 켠다 — 동의 시점을 기록하되 {@code userGrade}는 건드리지 않는다(PRD §2.1).
     * 이미 켜져 있으면 최초 동의 시점을 유지한다(재동의로 이력이 덮이지 않도록).
     */
    public void enablePersonalMode(LocalDateTime agreedAt) {
        this.personalModeEnabled = true;
        if (this.personalModeAgreedAt == null) {
            this.personalModeAgreedAt = agreedAt;
        }
    }

    /**
     * 개인 모드를 끈다 — 동의 이력({@code personalModeAgreedAt})은 남긴다.
     * 매장 재입사 시에도 자동으로 끄지 않는다(겸업이 흔하다, PRD §4.14 H.5).
     */
    public void disablePersonalMode() {
        this.personalModeEnabled = false;
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
