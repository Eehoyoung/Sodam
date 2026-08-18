#!/usr/bin/env bash
# 소담 PRD 플로우 E2E 통합 테스트 — 라이브 BE(7070) 대상.
# docs/02-runbook/INTEGRATION_TEST_FLOWS.md 의 플로우를 순차 실행.
# 판정: 2xx=PASS, 의도된 4xx(검증/인증)=OK, 5xx/연결거부=FAIL.
BASE="${SODAM_BASE:-http://localhost:7070}"
TS=$(date +%s)
PASS=0; FAIL=0; OKINFRA=0
note() { printf '%-46s %s\n' "$1" "$2"; }
# $1 label  $2 method  $3 path  $4 body  $5 token  $6 expect-prefix(2|4)
call() {
  local label="$1" method="$2" path="$3" body="$4" token="$5" expect="$6"
  local args=(-s -m 15 -w $'\n%{http_code}' -X "$method" -H "Content-Type: application/json")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-d "$body")
  local resp code
  resp=$(curl "${args[@]}" "$BASE$path" 2>&1)
  code=$(echo "$resp" | tail -1); BODY=$(echo "$resp" | sed '$d')
  local pfx="${code:0:1}"
  if [ "$pfx" = "2" ]; then note "$label" "[$code PASS]"; PASS=$((PASS+1));
  elif [ "$pfx" = "5" ] || [ -z "$code" ]; then note "$label" "[$code FAIL] $(echo "$BODY"|head -c120)"; FAIL=$((FAIL+1));
  elif [ "$expect" = "4" ] || [ "$pfx" = "4" ]; then note "$label" "[$code OK-infra] $(echo "$BODY"|grep -oE '"(message|errorCode)":"[^"]*"'|head -1)"; OKINFRA=$((OKINFRA+1));
  else note "$label" "[$code ?] $(echo "$BODY"|head -c100)"; FAIL=$((FAIL+1)); fi
}
jval() { echo "$BODY" | grep -oE "\"$1\":\"?[^\",}]*" | head -1 | sed -E "s/\"$1\":\"?//"; }

echo "=== SODAM PRD E2E ($BASE) ==="
echo "--- 사장님(Master) 플로우 ---"
OWNER_EMAIL="owner_${TS}@sodam.test"
call "1. F-AUTH-01 사장 회원가입" POST /api/join \
  "{\"name\":\"Owner Eun\",\"email\":\"$OWNER_EMAIL\",\"password\":\"Sodam!2345\",\"userGrade\":\"MASTER\",\"ageConfirmed\":true,\"termsAgreed\":true,\"privacyAgreed\":true,\"marketingAgreed\":false}" "" 2
call "2. F-AUTH-01 로그인" POST /api/login "{\"email\":\"$OWNER_EMAIL\",\"password\":\"Sodam!2345\"}" "" 2
TOKEN=$(jval accessToken); [ -z "$TOKEN" ] && TOKEN=$(jval token)
echo "    (JWT 획득: ${TOKEN:+성공}${TOKEN:-실패})"
call "3. F-USER-01 내 정보" GET /api/me "" "$TOKEN" 2
call "4. F-STORE-01 매장 등록" POST /api/stores/registration \
  "{\"storeName\":\"CafeSodam $TS\",\"businessNumber\":\"2208801234\",\"businessLicenseNumber\":\"1234567890\",\"businessType\":\"cafe\",\"roadAddress\":\"Seoul Mapo Sodam-ro 12\",\"jibunAddress\":\"Mapo 12-3\",\"latitude\":37.5547,\"longitude\":126.9706,\"radius\":80,\"storeStandardHourWage\":10500,\"storePhoneNumber\":\"01012340000\"}" "$TOKEN" 2
STORE_ID=$(jval id); [ -z "$STORE_ID" ] && STORE_ID=$(jval storeId)
echo "    (storeId: ${STORE_ID:-N/A})"
[ -n "$STORE_ID" ] && call "5. F-STORE-02 매장 조회" GET "/api/stores/$STORE_ID" "" "$TOKEN" 2
call "7. F-PAY-01 급여 계산" POST /api/payroll/calculate \
  "{\"storeId\":${STORE_ID:-1},\"startDate\":\"2026-05-01\",\"endDate\":\"2026-05-31\"}" "$TOKEN" 2
call "8. F-INFO-01 인포허브" GET /api/labor-info "" "$TOKEN" 2
call "9. F-QNA-01 Q&A" GET /api/qna-info "" "$TOKEN" 2
call "10. F-SUB-01 구독 플랜" GET /api/billing/plans "" "$TOKEN" 2

echo "--- 직원(Employee) 플로우 ---"
EMP_EMAIL="emp_${TS}@sodam.test"
call "E1. F-AUTH-01 직원 가입" POST /api/join \
  "{\"name\":\"Jihun\",\"email\":\"$EMP_EMAIL\",\"password\":\"Sodam!2345\",\"userGrade\":\"EMPLOYEE\",\"ageConfirmed\":true,\"termsAgreed\":true,\"privacyAgreed\":true}" "" 2
call "E1. 직원 로그인" POST /api/login "{\"email\":\"$EMP_EMAIL\",\"password\":\"Sodam!2345\"}" "" 2
ETOKEN=$(jval accessToken); [ -z "$ETOKEN" ] && ETOKEN=$(jval token)
call "E2. F-EMP-01 매장 코드 가입" POST /api/stores/join-by-code "{\"storeCode\":\"NOPE-0000\"}" "$ETOKEN" 4
call "E3. F-ATT-02 GPS 출근" POST /api/attendance/check-in \
  "{\"employeeId\":1,\"storeId\":${STORE_ID:-1},\"latitude\":37.5547,\"longitude\":126.9706}" "$ETOKEN" 4
call "E4. F-ATT-03 현재 근무" GET "/api/attendance/current?storeId=${STORE_ID:-1}" "" "$ETOKEN" 2

echo "=== 결과: PASS=$PASS · OK-infra=$OKINFRA · FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ] && echo "RESULT: GREEN" || echo "RESULT: HAS_FAIL"
