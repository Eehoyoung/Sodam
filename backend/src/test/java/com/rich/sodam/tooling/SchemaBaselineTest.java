package com.rich.sodam.tooling;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Flyway V1 baseline 생성기.
 *
 * <p>{@code schemagen} 프로필로 부팅하면 Hibernate 의 jakarta.persistence schema-generation 이
 * 엔티티 메타데이터에서 MySQL 방언 DDL 을 {@code build/generated/V1__baseline.sql} 로 출력한다.
 * 생성된 파일을 {@code src/main/resources/db/migration/V1__baseline.sql} 로 옮겨 baseline 으로 쓴다.</p>
 *
 * <p>평소엔 {@code @Disabled} — baseline 재생성 시에만 수동 실행:
 * {@code ./gradlew test --tests "com.rich.sodam.tooling.SchemaBaselineTest"} (@Disabled 임시 제거).</p>
 */
@SpringBootTest
@ActiveProfiles("schemagen")
@Disabled("baseline 재생성 시에만 수동 실행")
class SchemaBaselineTest {

    @Test
    void contextLoadsAndGeneratesSchema() {
        // 컨텍스트 로드만으로 schema-generation 이 DDL 파일을 출력한다.
    }
}
