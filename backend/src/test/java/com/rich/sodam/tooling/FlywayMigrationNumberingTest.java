package com.rich.sodam.tooling;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Flyway 마이그레이션 번호 규칙을 지킨다 (RELEASE_GATES T-12).
 *
 * <p>이 프로젝트는 {@code out-of-order} 를 켜지 않는다. 이미 더 큰 번호가 적용된 DB 에 작은 번호를
 * 뒤늦게 추가하면 <b>조용히 건너뛴다</b> — 스키마가 환경마다 갈라지고, 그 사실이 배포 후에야
 * 드러난다. V82·V84 가 그렇게 비게 된 번호라 영구 결번으로 두고, 실수로 채우는 것을 여기서 막는다.</p>
 */
class FlywayMigrationNumberingTest {

    private static final Path MIGRATION_DIR =
            Path.of("src", "main", "resources", "db", "migration");

    private static final Pattern VERSIONED = Pattern.compile("^V(\\d+)__.+\\.sql$");

    /**
     * 영구 결번. 계획서가 예약했으나 V83+ 가 먼저 적용돼 사용할 수 없게 된 번호다.
     * (V82 = ShedLock → V90 으로 이동, V84 = Q&A 작성자 → 착수 보류)
     */
    private static final Set<Integer> PERMANENTLY_SKIPPED = Set.of(82, 84);

    private List<Integer> migrationVersions() throws IOException {
        try (Stream<Path> files = Files.list(MIGRATION_DIR)) {
            return files
                    .map(path -> path.getFileName().toString())
                    .map(VERSIONED::matcher)
                    .filter(Matcher::matches)
                    .map(matcher -> Integer.parseInt(matcher.group(1)))
                    .sorted()
                    .toList();
        }
    }

    @Test
    @DisplayName("영구 결번(V82·V84)을 다시 채우지 않는다")
    void 영구_결번을_채우지_않는다() throws IOException {
        assertThat(migrationVersions())
                .as("이 번호로 파일을 만들면 기존 환경에서 Flyway 가 건너뛴다. 다음 번호를 쓸 것")
                .doesNotContainAnyElementsOf(PERMANENTLY_SKIPPED);
    }

    @Test
    @DisplayName("마이그레이션 버전이 중복되지 않는다")
    void 버전이_중복되지_않는다() throws IOException {
        assertThat(migrationVersions())
                .as("같은 버전이 둘이면 Flyway 가 기동에 실패한다")
                .doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("결번은 문서화된 것뿐이다 — 새 구멍이 생기면 드러난다")
    void 문서화되지_않은_결번이_없다() throws IOException {
        List<Integer> versions = migrationVersions();
        assertThat(versions).isNotEmpty();

        for (int version = versions.get(0); version <= versions.get(versions.size() - 1); version++) {
            if (PERMANENTLY_SKIPPED.contains(version)) {
                continue;
            }
            assertThat(versions)
                    .as("V%d 가 비어 있다. 의도한 결번이면 RELEASE_GATES T-12 와 이 테스트에 등록할 것", version)
                    .contains(version);
        }
    }
}
