-- Sign in with Apple 지원: User.appleSub (Apple sub 클레임) 컬럼 추가
-- email 은 재로그인 시 identityToken 에 재전송되지 않을 수 있어(이메일 릴레이 등) sub 을 기본 조회 키로 사용한다.
-- NULL 허용 + UNIQUE INDEX — MySQL 은 UNIQUE INDEX 에서 NULL 을 다중 허용하므로 기존 로우(카카오/이메일 가입)는 영향 없음.
ALTER TABLE `user` ADD COLUMN `apple_sub` VARCHAR(255) NULL;
ALTER TABLE `user` ADD UNIQUE INDEX `uk_user_apple_sub` (`apple_sub`);
