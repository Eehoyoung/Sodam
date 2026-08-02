package com.rich.sodam.service;

import com.rich.sodam.service.support.AfterCommitExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

/**
 * 실시간 인앱 동기화 신호 발행기.
 *
 * <p>매장 단위 토픽({@code /topic/store.{storeId}})으로 "무엇이 바뀌었으니 다시 조회하라"는
 * 가벼운 트리거를 보낸다. 구독 중인 사장/직원 화면이 이를 받아 해당 데이터를 REST 로 재조회한다.</p>
 *
 * <p>견고성: 발행 실패가 본래 트랜잭션(출퇴근/입사 등)을 깨지 않도록 절대 예외를 전파하지 않는다.
 * WebSocket 미연결·브로커 일시오류여도 비즈니스 로직은 정상 완료되고, 클라이언트는 다음 포커스
 * 재조회(useFocusEffect)로 따라잡는다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LiveSyncPublisher {

    private final SimpMessagingTemplate messagingTemplate;
    private final AfterCommitExecutor afterCommitExecutor;

    /** 동기화 이벤트 종류 — FE 가 어떤 데이터를 재조회할지 분기. */
    public enum SyncType {
        EMPLOYEES_CHANGED,   // 직원 입사/해지/활성토글 → 직원 목록·인원수
        ATTENDANCE_CHANGED,  // 출/퇴근 → 출근 인원·근무 상태
        STORE_UPDATED,       // 매장 정보·운영시간·시급
        PAYROLL_CHANGED,     // 급여 생성/확정/지급/취소 → 급여 목록·명세 상태
        NOTICE_CHANGED,      // 공지 발행/직원 읽음 확인 → 공지 목록·읽음 N/M
        SHIFT_CHANGED,
        TIME_OFF_CHANGED
    }

    /**
     * 매장 토픽으로 동기화 신호를 발행한다.
     *
     * <p>트랜잭션이 활성이면 <b>커밋 이후</b>에 발행한다 — 커밋 전에 보내면 클라이언트가 재조회할 때
     * 아직 미반영(stale)을 읽는 레이스가 생기기 때문. 트랜잭션 밖이면 즉시 발행. 어느 경우든
     * 실패는 삼켜 호출측에 영향 없음.</p>
     */
    public void publishStore(Long storeId, SyncType type) {
        if (storeId == null) {
            return;
        }
        afterCommitExecutor.execute(() -> doPublish(storeId, type));
    }

    private void doPublish(Long storeId, SyncType type) {
        try {
            Map<String, Object> payload = Map.of(
                    "type", type.name(),
                    "storeId", storeId,
                    "at", Instant.now().toString());
            messagingTemplate.convertAndSend("/topic/store." + storeId, payload);
        } catch (Exception e) {
            // 라이브 동기화는 best-effort — 실패는 로그만. 포커스 재조회가 백업.
            log.debug("[LiveSync] publish 실패 storeId={} type={}: {}", storeId, type, e.getMessage());
        }
    }

    /**
     * 채팅 메시지 발행 — 매장 단위가 아니라 채팅방 단위 토픽({@code /topic/chat.{chatRoomId}})을 쓴다
     * (recruitment-monetization-gamification-plan.md §4, Phase D). 매장 토픽과 달리 "다시 조회하라"는
     * 트리거가 아니라 메시지 페이로드 자체를 실어 보낸다 — 채팅방 구독자가 사장/직원 각 1인뿐이라
     * 매번 REST 재조회를 강제할 필요가 없기 때문이다(이미 PII 마스킹이 끝난 저장값만 담긴다).
     */
    public void publishChatMessage(Long chatRoomId, Object messagePayload) {
        if (chatRoomId == null) {
            return;
        }
        afterCommitExecutor.execute(() -> doPublishChat(chatRoomId, messagePayload));
    }

    private void doPublishChat(Long chatRoomId, Object messagePayload) {
        try {
            messagingTemplate.convertAndSend("/topic/chat." + chatRoomId, messagePayload);
        } catch (Exception e) {
            log.debug("[LiveSync] 채팅 publish 실패 chatRoomId={}: {}", chatRoomId, e.getMessage());
        }
    }
}
