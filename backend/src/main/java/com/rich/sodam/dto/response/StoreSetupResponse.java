package com.rich.sodam.dto.response;

import java.util.List;

/**
 * 매장 설정 완성도 + 다음 한 가지 액션 (GR-NEW-06).
 *
 * <p>유령매장(설정 미완) 절벽을 줄이는 activation 신호. 사장 전용.
 * 체크 항목별 완료 여부와 완성도 %를 내려주고, 미완 첫 항목을 "지금 할 한 가지"로 제시한다.
 *
 * @param storeId          매장 ID
 * @param completionRate   완성도 % (완료 항목 / 전체 항목, 0~100 정수)
 * @param items            체크 항목별 완료 여부
 * @param nextActionKey    다음 할 한 가지 항목 키 (모두 완료 시 null)
 * @param nextActionLabel  다음 할 한 가지 라벨 (모두 완료 시 null)
 */
public record StoreSetupResponse(
        Long storeId,
        int completionRate,
        List<SetupItem> items,
        String nextActionKey,
        String nextActionLabel
) {
    /**
     * 설정 체크 항목 1개.
     *
     * @param key   항목 키 (FE 딥링크 분기용)
     * @param label 사장에게 보일 라벨
     * @param done  완료 여부
     */
    public record SetupItem(String key, String label, boolean done) {
    }
}
