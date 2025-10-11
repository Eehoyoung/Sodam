# 소담(SODAM) RN 연동용 백엔드 API 문서 인덱스

## 📋 개요

- 작성일: 2025-09-30
- 작성자: Backend Team
- 문서 유형: 가이드
- 관련 이슈: RN 연동용 컨트롤러별 API 문서화

## 🎯 목적

React Native 팀이 즉시 연동할 수 있도록 컨트롤러 단위로 API 스펙을 정리했습니다. 각 문서는 인증/헤더, 엔드포인트, 요청/응답 스키마, 에러 코드, curl 및 Axios 예제(React
Native)까지 포함합니다.

## 📝 내용

컨트롤러별 문서 목록:

- [AttendanceController — 출퇴근 관리](./AttendanceController_API_문서.md)
- [LaborInfoController — 노무 정보](./LaborInfoController_API_문서.md)
- [LoginController — 인증/토큰/회원가입](./LoginController_API_문서.md)
- [MasterController — 사장 마이페이지/관리](./MasterController_API_문서.md)
- [PayrollController — 급여 관리](./PayrollController_API_문서.md)
- [PayrollPolicyController — 급여 정책](./PayrollPolicyController_API_문서.md)
- [PolicyInfoController — 국가정책 정보](./PolicyInfoController_API_문서.md)
- [QnaInfoController — 사이트 질문](./QnaInfoController_API_문서.md)
- [StoreController — 매장 등록/직원배치/갱신](./StoreController_API_문서.md)
- [StoreQueryController — 매장 조회/통계](./StoreQueryController_API_문서.md)
- [TaxInfoController — 세무 정보](./TaxInfoController_API_문서.md)
- [TimeOffController — 휴가 신청/승인](./TimeOffController_API_문서.md)
- [TipInfoController — 소상공인 꿀팁](./TipInfoController_API_문서.md)
- [UserController — 사용자 관리](./UserController_API_문서.md)
- [UsersPurposeController — 사용자 목적 설정](./UsersPurposeController_API_문서.md)
- [WageController — 임금 관리](./WageController_API_문서.md)
- [TestController — 표준 응답/예외 테스트(내부)](./TestController_API_문서.md)

## 🔐 공통

- 인증: Bearer JWT (Authorization: Bearer {accessToken})
- 콘텐츠 타입: application/json (파일 업로드는 multipart/form-data)
- 시간/날짜 형식:
    - DATETIME: ISO-8601 (예: 2025-05-01T09:00:00)
    - DATE: yyyy-MM-dd (예: 2025-05-01)

## 🔗 관련 문서

- JWT 및 RN 연동 가이드: ../JWT_인증_API_및_RN_연동_가이드.md

## 📅 변경 이력

 날짜         | 버전  | 변경 내용 | 작성자          
------------|-----|-------|--------------
 2025-09-30 | 1.0 | 초기 작성 | Backend Team 
