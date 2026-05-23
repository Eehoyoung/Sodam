# O-401 · 콘텐츠 관리 (CMS)

## 목적
정보허브 5종 (노무/세무/정책/팁/FAQ) 콘텐츠 등록·수정·게시.

## 레이아웃
```
[카테고리: 노무 ▼]  [+ 새 글]
─────────────────────────────────────────
제목                            상태     조회수  게시일
주휴수당 계산법 완벽 정리         공개     1,245   05-15
4대보험 가입 자격                초안     —       —
─────────────────────────────────────────
```

### 에디터 (행 클릭 또는 +새 글)
- 제목
- 마크다운 본문 (라이브 프리뷰)
- 이미지 업로드 → S3 (ObjectStorage)
- 게시 상태: 초안 / 공개 / 숨김
- 노출 우선순위
- 태그 (검색용)
- 작성자
- SEO 메타 (Phase 3)

## API
- `GET /api/admin/cms/{type}?status=`
- `POST /api/admin/cms/{type}`
- `PUT /api/admin/cms/{type}/{id}`
- `DELETE /api/admin/cms/{type}/{id}`
- `POST /api/admin/cms/upload-image` (multipart)

## 권한
공개 변경 시 작성자/리뷰어 로그 (audit_log).
