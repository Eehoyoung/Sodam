package com.rich.sodam.service.crypto;

import com.rich.sodam.config.crypto.StringCryptoConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.metamodel.EntityType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * PII 평문 → 암호문 일괄 전환 배치 (RELEASE_GATES T-1).
 *
 * <p>{@link StringCryptoConverter} 는 키를 켠 뒤에도 기존 평문 행이 깨지지 않도록
 * "복호화 실패 == 평문" 폴백을 둔다. 무중단 전환에는 좋지만, 그 행이 <b>다시 저장되기 전까지는
 * 평문으로 남는다</b>. 한 번도 수정되지 않는 행(예: 폐업 매장의 사업자등록번호)은 영원히 평문이라
 * 개인정보보호법 §29 저장 시 암호화 의무를 실질적으로 충족하지 못한다.</p>
 *
 * <p><b>대상은 손으로 적지 않고 매핑에서 뽑는다.</b> {@code @Convert(converter =
 * StringCryptoConverter.class)} 가 붙은 필드를 엔티티 메타모델에서 찾아 테이블·컬럼명을 도출한다.
 * 물리 이름 목록을 코드에 박아 두면 새 PII 필드가 생겼을 때 조용히 빠진다 — 그건 백필이 있으나
 * 마나가 되는 실패다.</p>
 *
 * <p>이미 접두사가 붙은 행은 조회 단계에서 걸러지므로 여러 번 돌려도 안전하다(멱등).</p>
 *
 * <p><b>운영 주의</b>: 실행 전 DB 백업 필수. 잘못된 키로 돌리면 평문이 그 키로 암호화돼
 * 원래 키로 되돌릴 수 없다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PiiEncryptionBackfillService {

    /** 한 번에 처리할 행 수. 잠금 구간을 짧게 유지한다. */
    private static final int CHUNK_SIZE = 500;

    private final EntityManager entityManager;
    private final JdbcTemplate jdbcTemplate;

    /**
     * 평문으로 남아 있는 PII 를 전부 암호문으로 전환한다.
     *
     * @return {@code 테이블.컬럼 → 전환 건수} (전환할 게 없으면 빈 맵)
     */
    public Map<String, Integer> backfillAll() {
        if (!StringCryptoConverter.isKeyConfigured()) {
            // 키가 없으면 컨버터가 평문을 그대로 저장한다 — 돌려도 바뀌는 게 없다.
            log.warn("[PII 백필] 암호화 키가 설정되지 않아 실행하지 않는다");
            return Map.of();
        }

        Map<String, Integer> converted = new LinkedHashMap<>();
        for (PiiColumn target : findEncryptedColumns()) {
            int count = backfillColumn(target);
            if (count > 0) {
                converted.put(target.qualifiedName(), count);
            }
        }

        if (converted.isEmpty()) {
            log.info("[PII 백필] 전환 대상 없음 — 모든 PII 가 이미 암호문이다");
        } else {
            log.info("[PII 백필] 전환 완료: {}", converted);
        }
        return converted;
    }

    /** 아직 평문으로 남아 있는 건수만 센다(전환하지 않음). 운영 점검용. */
    public Map<String, Integer> countPlaintext() {
        Map<String, Integer> pending = new LinkedHashMap<>();
        for (PiiColumn target : findEncryptedColumns()) {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + quote(target.table())
                            + " WHERE " + quote(target.column()) + " IS NOT NULL"
                            + " AND " + quote(target.column()) + " NOT LIKE ?",
                    Integer.class, StringCryptoConverter.cipherPrefix() + "%");
            if (count != null && count > 0) {
                pending.put(target.qualifiedName(), count);
            }
        }
        return pending;
    }

    @Transactional
    public int backfillColumn(PiiColumn target) {
        int total = 0;
        while (true) {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT " + quote(target.idColumn()) + " AS pk, " + quote(target.column()) + " AS val"
                            + " FROM " + quote(target.table())
                            + " WHERE " + quote(target.column()) + " IS NOT NULL"
                            + " AND " + quote(target.column()) + " NOT LIKE ?"
                            + " LIMIT " + CHUNK_SIZE,
                    StringCryptoConverter.cipherPrefix() + "%");
            if (rows.isEmpty()) {
                return total;
            }

            for (Map<String, Object> row : rows) {
                Object plain = row.get("val");
                if (plain == null) {
                    continue;
                }
                jdbcTemplate.update(
                        "UPDATE " + quote(target.table()) + " SET " + quote(target.column()) + " = ?"
                                + " WHERE " + quote(target.idColumn()) + " = ?",
                        StringCryptoConverter.encryptForBackfill(plain.toString()), row.get("pk"));
                total++;
            }

            if (rows.size() < CHUNK_SIZE) {
                return total;
            }
        }
    }

    /**
     * PII 컨버터가 걸린 컬럼을 엔티티 매핑에서 찾아낸다.
     *
     * <p>공개 메서드인 이유는 커버리지 테스트가 "컨버터가 붙은 필드를 하나도 빠뜨리지 않는지"를
     * 이 결과로 검증하기 때문이다.</p>
     */
    public List<PiiColumn> findEncryptedColumns() {
        List<PiiColumn> targets = new ArrayList<>();
        for (EntityType<?> entityType : entityManager.getMetamodel().getEntities()) {
            Class<?> javaType = entityType.getJavaType();
            if (javaType == null || !javaType.isAnnotationPresent(Entity.class)) {
                continue;
            }
            String idColumn = findIdColumn(javaType);
            if (idColumn == null) {
                continue;
            }
            for (Field field : javaType.getDeclaredFields()) {
                Convert convert = field.getAnnotation(Convert.class);
                if (convert == null || convert.converter() != StringCryptoConverter.class) {
                    continue;
                }
                targets.add(new PiiColumn(tableName(javaType), idColumn, columnName(field)));
            }
        }
        return targets;
    }

    private static String findIdColumn(Class<?> entity) {
        for (Field field : entity.getDeclaredFields()) {
            if (field.isAnnotationPresent(Id.class)) {
                return columnName(field);
            }
        }
        return null;
    }

    private static String tableName(Class<?> entity) {
        Table table = entity.getAnnotation(Table.class);
        return table != null && !table.name().isBlank() ? table.name() : toSnakeCase(entity.getSimpleName());
    }

    private static String columnName(Field field) {
        Column column = field.getAnnotation(Column.class);
        return column != null && !column.name().isBlank() ? column.name() : toSnakeCase(field.getName());
    }

    /** Spring Boot 기본 물리 명명 전략(CamelCaseToUnderscores)과 동일하게 변환한다. */
    private static String toSnakeCase(String name) {
        StringBuilder out = new StringBuilder(name.length() + 8);
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (Character.isUpperCase(c) && i > 0 && !Character.isUpperCase(name.charAt(i - 1))) {
                out.append('_');
            }
            out.append(Character.toLowerCase(c));
        }
        return out.toString();
    }

    /**
     * 예약어 테이블(user 등)을 위해 식별자를 인용한다.
     *
     * <p>인용 문자는 DB 마다 다르다 — MySQL 은 백틱, H2 는 큰따옴표다. 하드코딩하면 운영에서는
     * 되고 테스트에서는 "Table not found" 로 깨진다(그 반대도 마찬가지). JDBC 메타데이터에서
     * 실제 값을 받아 쓴다.</p>
     */
    private String quote(String identifier) {
        return identifierQuote() + identifier + identifierQuote();
    }

    private String identifierQuote() {
        if (cachedQuote == null) {
            cachedQuote = jdbcTemplate.execute(
                    (org.springframework.jdbc.core.ConnectionCallback<String>) connection -> {
                        String quote = connection.getMetaData().getIdentifierQuoteString();
                        // 스펙상 인용을 지원하지 않으면 공백 한 칸을 돌려준다.
                        return quote == null || quote.isBlank() ? "" : quote;
                    });
        }
        return cachedQuote;
    }

    private volatile String cachedQuote;

    /** 백필 대상 컬럼 한 개. */
    public record PiiColumn(String table, String idColumn, String column) {
        public String qualifiedName() {
            return table + "." + column;
        }
    }
}
