package com.rich.sodam.exception;

/**
 * 채팅 발신 자동 제한(§4.4) — 서로 다른 신고자로부터 누적 신고 임계치를 넘긴 계정이 메시지를
 * 보내려 할 때. 자동 영구정지가 아니라 "운영 검토 대기" 상태이므로, RBAC 위반 성격의
 * {@link org.springframework.security.access.AccessDeniedException}(RBAC 우회 시도 Sentry 알람이
 * 함께 발동한다, {@code GlobalExceptionHandler.handleAccessDenied})과는 별도 예외로 분리한다.
 */
public class ChatSenderRestrictedException extends BusinessException {

    public static final String ERROR_CODE = "CHAT_SENDER_RESTRICTED";

    public ChatSenderRestrictedException() {
        super("신고가 누적돼 채팅 발신이 잠시 제한됐어요. 운영팀 검토 후 다시 이용할 수 있어요.", ERROR_CODE);
    }
}
