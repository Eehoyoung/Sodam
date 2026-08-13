package com.rich.sodam.service.crypto;

import com.rich.sodam.config.crypto.StringCryptoConverter;
import com.rich.sodam.service.crypto.PiiEncryptionBackfillService.PiiColumn;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PII 백필 대상이 매핑과 어긋나지 않는지 지킨다 (RELEASE_GATES T-1).
 *
 * <p>대상 목록을 코드에 손으로 적어 두면 새 PII 필드가 조용히 빠지고, 백필은 성공했다고 보고하는데
 * 실제로는 평문이 남는다. 그래서 대상은 매핑에서 뽑고, 여기서 그 도출이 실제 엔티티와 맞는지
 * 확인한다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
class PiiEncryptionBackfillServiceTest {

    @Autowired
    private PiiEncryptionBackfillService backfillService;

    @Test
    @DisplayName("PII 컨버터가 붙은 필드를 하나도 빠뜨리지 않고 대상으로 잡는다")
    void 컨버터가_붙은_모든_필드를_대상으로_잡는다() {
        List<PiiColumn> targets = backfillService.findEncryptedColumns();
        Set<String> qualified = targets.stream()
                .map(PiiColumn::qualifiedName)
                .collect(Collectors.toSet());

        // 현재 @Convert(StringCryptoConverter) 가 걸린 필드들 — 새 PII 필드를 추가하면서
        // 컨버터를 붙이면 이 목록도 함께 늘어나야 한다.
        assertThat(qualified).contains(
                "user.phone",
                "store.business_number",
                "store.store_phone_number",
                "customer_inquiry.name",
                "customer_inquiry.email");

        // 테이블·PK·컬럼이 모두 채워져야 SQL 을 만들 수 있다.
        assertThat(targets).allSatisfy(target -> {
            assertThat(target.table()).isNotBlank();
            assertThat(target.idColumn()).isNotBlank();
            assertThat(target.column()).isNotBlank();
        });
    }

    @Test
    @DisplayName("암호화 키가 없는 환경에서는 백필을 실행하지 않는다")
    void 키가_없으면_실행하지_않는다() {
        // test 프로필은 키를 주입하지 않는다 — 이 상태에서 돌리면 컨버터가 평문을 그대로
        // 저장하므로 아무것도 바뀌지 않는다. 헛돌지 않고 빠져나가는지 확인한다.
        assertThat(StringCryptoConverter.isKeyConfigured()).isFalse();
        assertThat(backfillService.backfillAll()).isEmpty();
    }

    @Test
    @DisplayName("평문 현황 조회가 모든 대상 테이블에 대해 SQL 오류 없이 동작한다")
    void 평문_현황_조회가_동작한다() {
        // 도출한 테이블·컬럼명이 실제 스키마와 다르면 여기서 SQL 예외로 드러난다.
        assertThat(backfillService.countPlaintext()).isNotNull();
    }
}
