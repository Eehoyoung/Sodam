package com.rich.sodam.domain;

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
     * 마케팅 정보 수신 동의 일시 (선택, 동의 철회 시 null 로 회수)
     */
    @Column(name = "marketing_agreed_at")
    private LocalDateTime marketingAgreedAt;

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
     * 생성 시간 자동 설정
     */
    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
