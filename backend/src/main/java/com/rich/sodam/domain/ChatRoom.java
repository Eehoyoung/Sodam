package com.rich.sodam.domain;

import com.rich.sodam.domain.type.ChatRoomStatus;
import com.rich.sodam.domain.type.ChatSourceType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 채팅방 — 채용 매칭(제안 수락 §15 / 지원 응답 §19) 1건당 1개만 개설된다
 * (recruitment-monetization-gamification-plan.md §4, Phase D).
 *
 * <p><b>개설 트리거</b>(§4.5 "매칭 전 임의 접촉은 애초에 채널 자체가 없다"):
 * <ul>
 *     <li>{@link ChatSourceType#OFFER}: 사장이 먼저 제안을 보내는 방향이라 후보자 동의 전에는 채널이
 *     없어야 한다 — 구직자가 {@code JobOffer}를 <b>수락(ACCEPTED)</b>한 시점에만 개설한다.</li>
 *     <li>{@link ChatSourceType#APPLICATION}: 구직자가 먼저 지원해 접촉에 동의한 상태이므로, 사장이
 *     지원서에 응답(수락/거절, {@code respondToApplication})하는 시점에 개설한다 — §2.3이 과금하는
 *     행위 자체가 "열람"이고 수락 여부와 무관하다는 기존 결정(JobApplicationService 참고)과 정합하도록
 *     응답 결과에 관계없이 개설한다.</li>
 * </ul>
 * 이 비대칭이 §4.6 보관 정책과도 맞물린다: APPLICATION 방향은 개설 시점에 이미 거절 상태일 수 있어
 * {@link #matchedAt} 기준 유예기간이 곧바로 시작될 수 있고, OFFER 방향은 수락(성사)한 경우에만 방이
 * 생기므로 사실상 영구 활성 상태로 남는다.</p>
 *
 * <p>매칭 원본({@code JobOffer}/{@code JobApplication})의 조건(시급·근무일·시간)은 나중에 바뀌어도
 * 채팅 상단 컨텍스트 카드는 매칭 성립 시점의 스냅샷을 보여줘야 하므로 이 엔티티에 값을 복사해 둔다
 * (§4.1 컨텍스트 핀).</p>
 *
 * <p>{@code (sourceType, sourceId)} 유니크 제약(V73)으로 동시 요청에도 매칭 1건당 채팅방 1개만
 * 보장한다 — 애플리케이션은 저장 전 존재 여부를 조회하고, {@link org.springframework.dao.DataIntegrityViolationException}
 * 을 이중 방어로 흡수한다(JobOffer/JobApplication과 동일 패턴).</p>
 */
@Entity
@Table(name = "chat_room", indexes = {
        @Index(name = "idx_chat_room_master", columnList = "master_user_id"),
        @Index(name = "idx_chat_room_counterpart", columnList = "counterpart_user_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_chat_room_source", columnNames = {"source_type", "source_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /** 사장 참여자. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "master_user_id", nullable = false)
    private User masterUser;

    /** 구직자(지원자/제안대상자) 참여자. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "counterpart_user_id", nullable = false)
    private User counterpartUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private ChatSourceType sourceType;

    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    /** 매칭 성립 시점 근무 조건 스냅샷(§4.1 컨텍스트 핀) — {@code JobWorkType} 이름. */
    @Column(name = "work_type", nullable = false, length = 20)
    private String workType;

    @Column(name = "work_date")
    private LocalDate workDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "hourly_wage", nullable = false)
    private Integer hourlyWage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ChatRoomStatus status = ChatRoomStatus.ACTIVE;

    /** 매칭 성립(수락/응답) 시각 — §4.6 보관 정책의 유예기간 기산점. */
    @Column(name = "matched_at", nullable = false)
    private LocalDateTime matchedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private ChatRoom(Store store, User masterUser, User counterpartUser, ChatSourceType sourceType, Long sourceId,
                      String workType, LocalDate workDate, LocalTime startTime, LocalTime endTime, Integer hourlyWage,
                      LocalDateTime matchedAt) {
        this.store = store;
        this.masterUser = masterUser;
        this.counterpartUser = counterpartUser;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.workType = workType;
        this.workDate = workDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.hourlyWage = hourlyWage;
        this.status = ChatRoomStatus.ACTIVE;
        this.matchedAt = matchedAt;
        this.createdAt = LocalDateTime.now();
    }

    public static ChatRoom open(Store store, User masterUser, User counterpartUser, ChatSourceType sourceType,
                                 Long sourceId, String workType, LocalDate workDate, LocalTime startTime,
                                 LocalTime endTime, Integer hourlyWage, LocalDateTime matchedAt) {
        return new ChatRoom(store, masterUser, counterpartUser, sourceType, sourceId, workType, workDate,
                startTime, endTime, hourlyWage, matchedAt == null ? LocalDateTime.now() : matchedAt);
    }

    /** 읽기 전용 전환(lazy 판정, 서비스 레이어가 유예기간 경과를 확인한 뒤 호출). */
    public void markReadOnly() {
        this.status = ChatRoomStatus.READ_ONLY;
    }

    public boolean isReadOnly() {
        return this.status == ChatRoomStatus.READ_ONLY;
    }

    public boolean isParticipant(Long userId) {
        if (userId == null) {
            return false;
        }
        return userId.equals(masterUser.getId()) || userId.equals(counterpartUser.getId());
    }

    /** 참여자 본인이 아닌 상대방을 반환한다. 참여자가 아니면 호출측 책임으로 검증돼야 한다(사전 {@link #isParticipant}). */
    public User otherParticipant(Long userId) {
        return userId.equals(masterUser.getId()) ? counterpartUser : masterUser;
    }
}
