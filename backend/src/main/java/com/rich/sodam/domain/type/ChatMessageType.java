package com.rich.sodam.domain.type;

/**
 * 채팅 메시지 종류(§4.1) — 사용자가 보낸 메시지와, 채팅방 개설/신고 접수 등을 안내하는
 * 시스템 메시지(연한 회색 중앙정렬 UI)를 구분한다.
 */
public enum ChatMessageType {
    USER,
    SYSTEM
}
