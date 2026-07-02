package com.rich.sodam.service;

import com.rich.sodam.repository.StoreRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 사업자등록번호 검증 서비스
 * 사업자등록번호의 형식 검증, 국세청 API 연동 검증, 중복 검증 기능을 제공합니다.
 */
@Service
public class ValidationService {
    private static final Logger logger = LoggerFactory.getLogger(ValidationService.class);
    private static final String TAX_OFFICE_API_URL = "https://api.odcloud.kr/api/nts-businessman/v1/status";
    private final StoreRepository storeRepository;
    @Value("${tax.office.api.key:}")
    private String serviceKey;

    /**
     * ValidationService 생성자
     *
     * @param storeRepository 매장 저장소
     */
    public ValidationService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    /**
     * 사업자등록번호 형식 검증 (10자리 숫자)
     *
     * @param businessNumber 검증할 사업자등록번호
     * @return 형식 유효성 여부
     */
    public boolean validateFormat(String businessNumber) {
        return businessNumber != null && businessNumber.matches("\\d{10}");
    }

    /**
     * 국세청 API 연동을 통한 사업자등록번호 유효성 검증
     *
     * @param businessNumber 검증할 사업자등록번호
     * @return 유효성 여부
     */
    public boolean validateWithTaxOffice(String businessNumber) {
        if (!validateFormat(businessNumber)) {
            logger.warn("사업자등록번호 형식이 올바르지 않습니다: {}", businessNumber);
            return false;
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            Map<String, List<String>> requestBody = new HashMap<>();
            requestBody.put("b_no", List.of(businessNumber));

            HttpEntity<Map<String, List<String>>> entity = new HttpEntity<>(requestBody, headers);

            String url = TAX_OFFICE_API_URL + "?serviceKey=" + serviceKey;
            logger.debug("국세청 API 호출: {}", url);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();

                // 응답 상태 코드 확인
                if ("OK".equals(responseBody.get("status_code"))) {
                    List<Map<String, Object>> data = (List<Map<String, Object>>) responseBody.get("data");

                    if (data != null && !data.isEmpty()) {
                        Map<String, Object> businessInfo = data.get(0);

                        // 계속사업자 여부 확인 (b_stt: "계속사업자", b_stt_cd: "01")
                        boolean isValid = "계속사업자".equals(businessInfo.get("b_stt")) ||
                                "01".equals(businessInfo.get("b_stt_cd"));

                        if (isValid) {
                            logger.info("유효한 사업자등록번호입니다: {}", businessNumber);
                        } else {
                            logger.warn("유효하지 않은 사업자등록번호입니다: {}, 상태: {}",
                                    businessNumber, businessInfo.get("b_stt"));
                        }

                        return isValid;
                    }
                }
            }

            logger.warn("국세청 API 응답이 유효하지 않습니다. 사업자등록번호: {}", businessNumber);
            return false;
        } catch (RestClientException e) {
            logger.error("국세청 API 호출 중 오류 발생: {}", e.getMessage(), e);
            return false;
        } catch (Exception e) {
            logger.error("사업자등록번호 검증 중 예상치 못한 오류 발생: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * 사업자등록번호 중복 검증
     * 이미 등록된 사업자등록번호인지 확인합니다.
     *
     * @param businessNumber 검증할 사업자등록번호
     * @return 중복 여부 (true: 중복, false: 중복 아님)
     */
    public boolean isDuplicate(String businessNumber) {
        if (!validateFormat(businessNumber)) {
            logger.warn("중복 검증 실패: 사업자등록번호 형식이 올바르지 않습니다: {}", businessNumber);
            return false;
        }

        try {
            boolean exists = storeRepository.findByBusinessNumber(businessNumber).isPresent();

            if (exists) {
                logger.info("이미 등록된 사업자등록번호입니다: {}", businessNumber);
            } else {
                logger.debug("등록되지 않은 사업자등록번호입니다: {}", businessNumber);
            }

            return exists;
        } catch (Exception e) {
            logger.error("사업자등록번호 중복 검증 중 오류 발생: {}", e.getMessage(), e);
            return false;
        }
    }
}
