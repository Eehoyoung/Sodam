/**
 * 채용 채팅(chat) FE 타입 — BE DTO 와 1:1 대응
 * (recruitment-monetization-gamification-plan.md §4, Phase D).
 *
 * 실제 필드명은 계획서가 아니라 아래 실제 구현 파일을 기준으로 한다(다르면 실제 구현이 우선):
 *   - backend/src/main/java/com/rich/sodam/dto/response/ChatRoomListItemResponse.java
 *   - backend/src/main/java/com/rich/sodam/dto/response/ChatMessageResponse.java
 *   - backend/src/main/java/com/rich/sodam/domain/type/ChatReportReason.java
 *   - backend/src/main/java/com/rich/sodam/domain/type/ChatRoomStatus.java
 *   - backend/src/main/java/com/rich/sodam/domain/type/ChatMessageType.java
 */
import type {JobSeekingType} from '../recruitment/types';

/** 채팅방 상태 — `ChatRoomStatus`(BE) 1:1. READ_ONLY 는 조회 시점 lazy 판정 결과(§4.6). */
export type ChatRoomStatus = 'ACTIVE' | 'READ_ONLY';

/** 메시지 종류 — `ChatMessageType`(BE) 1:1. SYSTEM 이면 senderUserId/senderName 은 null. */
export type ChatMessageType = 'USER' | 'SYSTEM';

/** 메시지 신고 사유 3종(§4.4) — `ChatReportReason`(BE) 1:1. */
export type ChatReportReason = 'SPAM' | 'INAPPROPRIATE_LANGUAGE' | 'FRAUD_SUSPECTED';

export const CHAT_REPORT_REASON_OPTIONS: ChatReportReason[] = [
    'SPAM',
    'INAPPROPRIATE_LANGUAGE',
    'FRAUD_SUSPECTED',
];

export const CHAT_REPORT_REASON_LABELS: Record<ChatReportReason, string> = {
    SPAM: '스팸 · 광고성 메시지',
    INAPPROPRIATE_LANGUAGE: '부적절한 언어 사용',
    FRAUD_SUSPECTED: '사기 의심',
};

/** `GET /api/chat-rooms/me` 응답 항목 — `ChatRoomListItemResponse` 1:1. */
export interface ChatRoomListItem {
    id: number;
    storeId: number;
    storeName: string;
    /** 조회 요청자 기준 상대방(사장이면 지원자/구직자, 구직자면 사장). */
    counterpartUserId: number;
    counterpartName: string;
    workType: JobSeekingType;
    workDate: string | null; // YYYY-MM-DD
    startTime: string; // "HH:mm:ss"
    endTime: string;
    hourlyWage: number;
    status: ChatRoomStatus;
    lastMessagePreview: string | null;
    lastMessageAt: string | null; // LocalDateTime "YYYY-MM-DDTHH:mm:ss"
    unreadCount: number;
    matchedAt: string;
}

/** `GET/POST .../chat-rooms/{roomId}/messages` 응답 항목 — `ChatMessageResponse` 1:1. */
export interface ChatMessage {
    id: number;
    chatRoomId: number;
    senderUserId: number | null;
    senderName: string | null;
    messageType: ChatMessageType;
    content: string;
    /** 전화번호/계좌번호 패턴 감지로 마스킹이 적용됐는지(§4.3 안내 배지 트리거). */
    masked: boolean;
    /** 조회 요청자 본인이 보낸 메시지인지(좌/우 말풍선 배치용). 시스템 메시지는 항상 false. */
    mine: boolean;
    sentAt: string;
    readAt: string | null;
}

/** §5.4 스타일 에러 코드 — FE 분기용(api-design.md). */
export type ChatErrorCode =
    | 'CHAT_ROOM_READ_ONLY'
    | 'CHAT_SENDER_RESTRICTED'
    | 'CHAT_REPORT_SELF_NOT_ALLOWED'
    | 'CHAT_REPORT_ALREADY_SUBMITTED'
    | 'CHAT_REPORT_INVALID_REASON'
    | 'USER_BLOCK_SELF_NOT_ALLOWED';

export const CHAT_ERROR_MESSAGES: Record<ChatErrorCode, string> = {
    CHAT_ROOM_READ_ONLY: '이 채팅방은 읽기 전용이에요. 지난 대화만 확인할 수 있어요.',
    CHAT_SENDER_RESTRICTED: '신고가 누적돼 채팅 발신이 잠시 제한됐어요. 운영팀 검토 후 다시 이용할 수 있어요.',
    CHAT_REPORT_SELF_NOT_ALLOWED: '본인이 보낸 메시지는 신고할 수 없어요.',
    CHAT_REPORT_ALREADY_SUBMITTED: '이미 신고한 메시지예요.',
    CHAT_REPORT_INVALID_REASON: '신고 사유가 올바르지 않아요.',
    USER_BLOCK_SELF_NOT_ALLOWED: '자기 자신은 차단할 수 없어요.',
};
