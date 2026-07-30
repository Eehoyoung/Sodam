-- 사용자 아바타(프로필 사진) — ObjectStorage 에 저장된 파일의 공개 URL/스토리지 키만 보관한다.
-- URL/키는 개인식별정보가 아니므로 PII 암호화 컨버터 대상이 아니다.
ALTER TABLE user
    ADD COLUMN avatar_url VARCHAR(500) NULL,
    ADD COLUMN avatar_key VARCHAR(300) NULL;
