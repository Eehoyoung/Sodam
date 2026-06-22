package com.rich.sodam.service;

import com.rich.sodam.repository.StoreNfcTagRepository;
import com.rich.sodam.service.model.NfcVerifyResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * NFC 검증 — 등록된 active 태그만 통과, 미등록/비활성/형식불량/storeId 누락은 거부.
 * 대리출근 방지의 물리적 현장 인증을 보장하는 핵심 테스트.
 */
@ExtendWith(MockitoExtension.class)
class NfcVerificationServiceTest {

    @Mock
    private StoreNfcTagRepository tagRepository;

    @InjectMocks
    private NfcVerificationService service;

    private static final Long STORE_ID = 10L;
    private static final String REGISTERED_TAG = "SODAM-FRONT-001";

    @Test
    @DisplayName("매장에 active 로 등록된 태그면 통과")
    void registeredActiveTagPasses() {
        lenient().when(tagRepository.existsByStore_IdAndTagIdAndActiveTrue(STORE_ID, REGISTERED_TAG))
                .thenReturn(true);

        NfcVerifyResult result = service.verifyTag(STORE_ID, REGISTERED_TAG);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getReason()).isNull();
    }

    @Test
    @DisplayName("형식은 맞지만 매장에 미등록(또는 비활성) 태그면 거부")
    void unregisteredTagRejected() {
        lenient().when(tagRepository.existsByStore_IdAndTagIdAndActiveTrue(STORE_ID, REGISTERED_TAG))
                .thenReturn(false);

        NfcVerifyResult result = service.verifyTag(STORE_ID, "SODAM-UNKNOWN-9");

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getReason()).isEqualTo("INVALID_TAG");
    }

    @Test
    @DisplayName("형식 불량(접두/길이) 태그는 DB 조회 전에 거부")
    void malformedTagRejectedBeforeDb() {
        NfcVerifyResult prefixFail = service.verifyTag(STORE_ID, "RANDOM-1234567");
        NfcVerifyResult lengthFail = service.verifyTag(STORE_ID, "SODAM-1");

        assertThat(prefixFail.isSuccess()).isFalse();
        assertThat(prefixFail.getReason()).isEqualTo("INVALID_TAG");
        assertThat(lengthFail.isSuccess()).isFalse();
        // 형식 단계에서 컷 — DB 미조회.
        verifyNoInteractions(tagRepository);
    }

    @Test
    @DisplayName("빈/널 tagId 는 거부")
    void blankTagRejected() {
        assertThat(service.verifyTag(STORE_ID, null).isSuccess()).isFalse();
        assertThat(service.verifyTag(STORE_ID, "  ").isSuccess()).isFalse();
        verifyNoInteractions(tagRepository);
    }

    @Test
    @DisplayName("storeId 가 null 이면 매장 대조 불가 → 거부(대리출근 구멍 방지)")
    void nullStoreIdRejected() {
        NfcVerifyResult result = service.verifyTag(null, REGISTERED_TAG);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getReason()).isEqualTo("INVALID_TAG");
        verifyNoInteractions(tagRepository);
    }
}
