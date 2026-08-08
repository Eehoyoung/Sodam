-- 개인 모드(PRD §2.1, §4.14 / 260807 마스터 실행계획서 WP-H·WP-K)
--
-- 개인 모드는 역할이 아니라 상태다. user_grade 를 Personal 로 낮추는 대신 이 플래그를 둔다 —
-- 등급을 낮추면 인증채용·채용채팅·경력증명서(@EmployeeOrMaster)가 전부 403 이 되어
-- 퇴사자의 데이터 연속성이 깨지기 때문이다.
--
-- 기본값 false: 기존 사용자는 전부 개인 모드 꺼짐 상태로 시작한다(소급 활성화 없음).

ALTER TABLE `user`
    ADD COLUMN personal_mode_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '개인 모드 사용 여부(역할 아님)',
    ADD COLUMN personal_mode_agreed_at DATETIME NULL COMMENT '개인 모드 전환 동의 시점';

-- 랜딩 판정(활성 매장 0건 + 개인 모드 ON → 개인 홈)에서 함께 조회된다.
CREATE INDEX idx_user_personal_mode ON `user` (personal_mode_enabled);
