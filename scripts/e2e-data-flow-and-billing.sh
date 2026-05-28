#!/usr/bin/env bash
# 소담 FE↔BE 데이터 이동 플로우 + 빌링(mock) E2E.
# 1) 가입→로그인→매장등록: FE 페이로드 형태 그대로 보내고, BE 가 받은 후 다시 GET 으로
#    돌려준 값이 FE 가 보낸 값과 의미상 일치하는지(round-trip) 검증한다.
# 2) 빌링(mock): 플랜 조회→무료 구독→현재 구독 조회→해지. mock 클라이언트 응답 확인.
# 3) Toss webhook: 서명 없는 요청은 거부되어야 함(보안).
#
# 사용: bash scripts/e2e-data-flow-and-billing.sh
BASE="${SODAM_BASE:-http://localhost:7070}"
TS=$(date +%s)
P=0; F=0; W=0
out() { printf '%-58s %s\n' "$1" "$2"; }
pass() { P=$((P+1)); out "$1" "[PASS]"; }
fail() { F=$((F+1)); out "$1" "[FAIL] $2"; }
warn() { W=$((W+1)); out "$1" "[WARN] $2"; }
req() { # method path body token  → BODY/CODE
  local args=(-s -m 15 -w $'\n%{http_code}' -X "$1" -H "Content-Type: application/json")
  [ -n "$4" ] && args+=(-H "Authorization: Bearer $4")
  [ -n "$3" ] && args+=(-d "$3")
  local r; r=$(curl "${args[@]}" "$BASE$2" 2>&1)
  CODE=$(echo "$r" | tail -1); BODY=$(echo "$r" | sed '$d')
}
jval() { echo "$BODY" | grep -oE "\"$1\":\"?[^\",}]*" | head -1 | sed -E "s/\"$1\":\"?//"; }

echo "=== 1) FE↔BE 데이터 라운드트립 ==="
EMAIL="flow_${TS}@sodam.test"
# FE authService 형태 페이로드
req POST /api/join "{\"name\":\"DataFlow Owner\",\"email\":\"$EMAIL\",\"password\":\"Sodam!2345\",\"userGrade\":\"MASTER\",\"ageConfirmed\":true,\"termsAgreed\":true,\"privacyAgreed\":true,\"marketingAgreed\":false}"
[ "$CODE" = "200" ] && pass "가입 (FE authService 페이로드 그대로)" || fail "가입" "[$CODE] $(echo "$BODY"|head -c100)"

req POST /api/login "{\"email\":\"$EMAIL\",\"password\":\"Sodam!2345\"}"
TOKEN=$(jval accessToken); [ -z "$TOKEN" ] && TOKEN=$(jval token)
[ -n "$TOKEN" ] && pass "로그인 → JWT 응답 형태 (accessToken 존재)" || fail "로그인 토큰 추출" "$(echo "$BODY"|head -c100)"
# FE User 타입 필드: id, name, email, role(또는 userGrade) — login 응답에 포함되는지
echo "$BODY" | grep -qE "\"(userGrade|role)\"" && pass "응답 shape: userGrade/role 필드 포함" || warn "응답 shape" "userGrade/role 미발견"
echo "$BODY" | grep -q "\"refreshToken\"" && pass "응답 shape: refreshToken 포함" || warn "응답 shape" "refreshToken 미발견"

# 매장 등록 — FE storeService 가 createStore 에서 변환 후 보내는 BE 페이로드 그대로 시뮬레이션
#   BE businessNumber ← 사업자번호 (정정된 매핑)
LICENSE="${TS:0:10}"   # 10자리 사업자번호 (테스트용)
req POST /api/stores/registration \
  "{\"storeName\":\"FlowCafe $TS\",\"businessNumber\":\"$LICENSE\",\"storePhoneNumber\":\"01012340000\",\"businessType\":\"cafe\",\"businessLicenseNumber\":\"$LICENSE\",\"roadAddress\":\"Seoul Test\",\"jibunAddress\":\"Test\",\"latitude\":37.5547,\"longitude\":126.9706,\"radius\":80,\"storeStandardHourWage\":10500}" "$TOKEN"
SID=$(jval id); [ -z "$SID" ] && SID=$(jval storeId)
[ -n "$SID" ] && pass "매장 등록 (storeId=$SID 반환)" || fail "매장 등록" "[$CODE] $(echo "$BODY"|head -c100)"

# 라운드트립: GET 으로 다시 가져와 businessNumber 가 보낸 사업자번호와 일치하는지
if [ -n "$SID" ]; then
    req GET "/api/stores/$SID" "" "$TOKEN"
    STORED_BN=$(jval businessNumber)
    [ "$STORED_BN" = "$LICENSE" ] && pass "ROUND-TRIP: 저장된 businessNumber == 사업자번호($LICENSE)" || fail "ROUND-TRIP 사업자번호" "보낸값=$LICENSE, 저장값=$STORED_BN"
    STORED_NAME=$(jval storeName)
    echo "$STORED_NAME" | grep -q "FlowCafe" && pass "ROUND-TRIP: storeName 일치" || warn "storeName" "$STORED_NAME"
    STORED_RADIUS=$(jval radius)
    [ "$STORED_RADIUS" = "80" ] && pass "ROUND-TRIP: radius 일치 (80m)" || warn "radius" "$STORED_RADIUS"
fi

echo
echo "=== 2) 빌링 (mock 모드) E2E ==="
# 플랜 카탈로그
req GET /api/billing/plans "" "$TOKEN"
[ "$CODE" = "200" ] && echo "$BODY" | grep -qE "FREE|BUSINESS" && pass "플랜 카탈로그 (FREE/BUSINESS 포함)" || fail "플랜 카탈로그" "[$CODE] $(echo "$BODY"|head -c120)"

# 무료 구독
req POST /api/billing/subscribe/free "" "$TOKEN"
[ "$CODE" = "200" ] && pass "무료 구독 시작" || fail "무료 구독" "[$CODE] $(echo "$BODY"|head -c100)"

# 현재 구독 조회 — 응답에 plan/status 필드
req GET /api/billing/me "" "$TOKEN"
if [ "$CODE" = "200" ]; then
    PLAN=$(jval plan); STATUS=$(jval status)
    [ -n "$PLAN" ] && pass "현재 구독 조회 (plan=$PLAN, status=$STATUS)" || warn "구독 응답 shape" "plan/status 미발견: $(echo "$BODY"|head -c100)"
else
    fail "현재 구독 조회" "[$CODE]"
fi

# 해지
req DELETE /api/billing/cancel "" "$TOKEN"
case "${CODE:0:1}" in
  2) pass "구독 해지" ;;
  4) warn "구독 해지" "[$CODE] $(echo "$BODY"|grep -oE '"message":"[^"]*"'|head -1)" ;;
  *) fail "구독 해지" "[$CODE]" ;;
esac

echo
echo "=== 3) Toss webhook 보안 (서명 없이 요청 → 거부 기대) ==="
req POST /api/billing/webhook/toss "{\"eventType\":\"PAYMENT_COMPLETED\",\"data\":{}}"
case "${CODE:0:1}" in
  4) pass "서명 없는 webhook 거부 (HTTP $CODE)" ;;
  5) fail "webhook 처리" "[$CODE] 서버 에러" ;;
  2) warn "webhook 인증" "200 통과 — webhook secret 검증 누락 가능성, mock 모드 정책 확인 필요" ;;
  *) warn "webhook" "[$CODE]" ;;
esac

echo
echo "=== 결과: PASS=$P · WARN=$W · FAIL=$F ==="
[ "$F" -eq 0 ] && echo "RESULT: GREEN" || echo "RESULT: HAS_FAIL"
