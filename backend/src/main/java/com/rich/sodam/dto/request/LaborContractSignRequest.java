package com.rich.sodam.dto.request;

/**
 * 근로계약서 서명 요청.
 *
 * @param signatureImage base64 서명 이미지. 캔버스 미지원 환경에서는 null 로 전송할 수 있다.
 */
public record LaborContractSignRequest(String signatureImage) {
}
