package com.rich.sodam.dto.response;

import java.time.LocalDateTime;

/**
 * 공지 읽음확인 1건 (M-NEW-04). 사장이 "누가 읽었는지" 볼 때.
 *
 * @param employeeId 읽은 직원 ID(= User.id)
 * @param employeeName 직원 이름(표시용)
 * @param readAt 확인 시각
 */
public record NoticeReadResponse(
        Long employeeId,
        String employeeName,
        LocalDateTime readAt
) {
}
