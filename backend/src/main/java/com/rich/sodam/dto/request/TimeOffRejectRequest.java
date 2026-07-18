package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 휴가 신청 거부 사유 요청 본문.
 *
 * <p>거부 사유는 §60⑤ 시기변경권("사업 운영에 막대한 지장")이 사장이 연차 사용을
 * 거부할 수 있는 유일한 법적 근거이자, 개인정보(직원 관련 사유 텍스트)를 담을 수 있어
 * 쿼리 파라미터가 아닌 요청 본문으로 받는다(URL·서버 로그 노출 방지).</p>
 */
public class TimeOffRejectRequest {

    @NotBlank
    @Size(min = 2, max = 500)
    private String reason;

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
