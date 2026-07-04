-- 정규직(월급제) 지원: 고용형태 + 월급 + 개인별 4대보험 가입 여부 (직원-매장 관계 단위).
-- employment_type: HOURLY(시급제, 기본) / MONTHLY_SALARY(월급제 — monthly_salary 필수)
-- social_insurance_enrolled: NULL=매장 PayrollPolicy(taxPolicyType) 따름, 1=4대보험 공제, 0=3.3% 원천징수 (개인 오버라이드)
ALTER TABLE `employee_store_relation`
    ADD COLUMN `employment_type`           VARCHAR(20) NOT NULL DEFAULT 'HOURLY' COMMENT '고용형태 HOURLY/MONTHLY_SALARY',
    ADD COLUMN `monthly_salary`            INT         NULL COMMENT '월급(원, 세전) — MONTHLY_SALARY 전용',
    ADD COLUMN `social_insurance_enrolled` BIT         NULL COMMENT '개인별 4대보험 가입(NULL=매장 정책 따름)';

-- 고용형태 전환 이력 — 과거 급여 소급 방지 증빙용(언제부터 월급제였는지 분쟁 대비).
CREATE TABLE `employment_type_change_log` (
    `employment_type_change_log_id` BIGINT      NOT NULL AUTO_INCREMENT,
    `relation_id`                   BIGINT      NOT NULL COMMENT '직원-매장 관계 id',
    `from_type`                     VARCHAR(20) NOT NULL,
    `to_type`                       VARCHAR(20) NOT NULL,
    `monthly_salary`                INT         NULL COMMENT '전환 후 월급 스냅샷(시급제 전환이면 NULL)',
    `changed_by`                    BIGINT      NOT NULL COMMENT '변경 수행 사장 userId',
    `changed_at`                    DATETIME(6) NOT NULL,
    PRIMARY KEY (`employment_type_change_log_id`),
    KEY `idx_etcl_relation` (`relation_id`, `changed_at`),
    CONSTRAINT `fk_etcl_relation` FOREIGN KEY (`relation_id`) REFERENCES `employee_store_relation` (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
