// DB_OPTIMIZATION_PLAN.md Phase 8 — 시나리오 A: 피크 시간대(예: 09:00 전후) 동시 체크인/체크아웃.
//
// LoadTestSeedRunner(@Profile("loadtest"))로 시드한 loadtest-owner-{s}@sodam.load /
// loadtest-emp-{s}-{e}@sodam.load 계정을 사용한다. 좌표·매장 코드는 시더의 생성 공식과 동일하게
// 재현해야 반경 검증(Store.isUserInRadius)을 통과한다 — LoadTestSeedRunner.seedOneStore() 참조.
//
// 실제 출퇴근은 "직원 1명이 하루 1번" 하는 행위라 — VU가 반복 루프로 같은 직원의 체크인/체크아웃을
// 되풀이하면 두 번째 시도부터 "이미 출근 처리됨" 류의 정상적인 업무 규칙 거부(4xx)가 대량 발생해
// http_req_failed 지표가 무의미해진다(초판 실행에서 실측 발견 — DB_OPTIMIZATION_PLAN.md Phase 8 실행
// 노트 참조). 대신 shared-iterations executor로 "서로 다른 직원 N명이 동시에 각자 1번씩" 체크인하는
// 실제 피크 시나리오를 재현한다 — iterations는 setup()에서 확보한 자격증명 수만큼만 실행된다.
//
// 실행:
//   docker run --rm -i --network sodam-network -e TARGET_HOST=sodam-be -e TARGET_PORT=7070 \
//     -e STORE_COUNT=50 -e EMPLOYEES_PER_STORE=20 -e VUS=50 \
//     grafana/k6 run - < scenario-a-checkin.js

import http from 'k6/http';
import {check, sleep} from 'k6';
import {Trend} from 'k6/metrics';

const HOST = `http://${__ENV.TARGET_HOST || 'localhost'}:${__ENV.TARGET_PORT || '7070'}`;
const STORE_COUNT = parseInt(__ENV.STORE_COUNT || '50', 10);
const EMPLOYEES_PER_STORE = parseInt(__ENV.EMPLOYEES_PER_STORE || '20', 10);
const PASSWORD = __ENV.SEED_PASSWORD || 'sodamLoad1234';
const VUS = parseInt(__ENV.VUS || '50', 10);

const checkInTrend = new Trend('sodam_checkin_duration');
const checkOutTrend = new Trend('sodam_checkout_duration');

export const options = {
    scenarios: {
        peak_checkin: {
            executor: 'shared-iterations',
            vus: VUS,
            iterations: VUS, // 자격증명 1개당 정확히 1회(하루 1번 체크인 실제 업무 규칙과 일치)
            maxDuration: __ENV.DURATION || '2m',
        },
    },
    // 초대형 규모(VUS 2000)에서 setup()이 로그인 2,000회+매장조회 2,000회를 순차 실행하면 기본
    // 60초를 넘긴다(실측 발견) — 여유 있게 늘림.
    setupTimeout: '10m',
    thresholds: {
        sodam_checkin_duration: ['p(95)<1000'],
        sodam_checkout_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.01'],
    },
};

// 시더의 좌표 생성 공식과 동일 — LoadTestSeedRunner.seedOneStore() 참조.
function storeCoords(storeIndex) {
    return {
        lat: 37.50 + (storeIndex % 50) * 0.001,
        lon: 126.97 + (storeIndex % 50) * 0.001,
    };
}

export function setup() {
    // 매 VU가 서로 다른 (매장, 직원) 조합을 쓰도록 VU 수만큼만 로그인해둔다 — 전체 시드 인원을
    // 전부 로그인하지 않아 setup 비용을 억제한다(설계 노트: DB_OPTIMIZATION_PLAN.md Phase 8 실행 노트).
    const vus = parseInt(__ENV.VUS || '50', 10);
    const credentials = [];
    for (let i = 0; i < vus; i++) {
        const storeIndex = i % STORE_COUNT;
        const empIndex = Math.floor(i / STORE_COUNT) % EMPLOYEES_PER_STORE;
        const email = `loadtest-emp-${storeIndex}-${empIndex}@sodam.load`;

        // 로그인 rate limit(RateLimitFilter, 5회/분)은 의도상 IP+이메일 조합 키지만 request.getParameter
        // ("email")이 JSON 바디를 파싱하지 못해 실제로는 "같은 IP의 모든 JSON 로그인이 버킷 하나를
        // 공유"하는 버그가 있다(이번 세션에서 실측 발견, Phase 8 범위 밖이라 코드 수정은 안 함 —
        // DB_OPTIMIZATION_PLAN.md Phase 8 실행 노트에 별도 이슈로 기록). 부하테스트 목적상 실제 서로 다른
        // 사용자가 서로 다른 IP에서 접속하는 상황을 재현하려고 X-Forwarded-For를 VU마다 다르게 보낸다
        // (RateLimitFilter.resolveClientIp가 XFF를 신뢰하므로 코드 변경 없이 우회 가능).
        const fakeIp = `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;
        const loginRes = http.post(`${HOST}/api/login`, JSON.stringify({email, password: PASSWORD}), {
            headers: {'Content-Type': 'application/json', 'X-Forwarded-For': fakeIp},
        });
        if (loginRes.status !== 200) {
            continue; // 시드가 이 조합까지 커버 못하면 건너뜀(스케일 축소 실행 대비)
        }
        const body = loginRes.json();
        const token = body.data ? body.data.accessToken : body.accessToken;
        const userId = body.data ? body.data.userId : body.userId;

        // 이 직원이 속한 매장 storeId 조회.
        const storesRes = http.get(`${HOST}/api/stores/employee/${userId}`, {
            headers: {Authorization: `Bearer ${token}`},
        });
        let storeId = null;
        if (storesRes.status === 200) {
            const list = storesRes.json();
            if (Array.isArray(list) && list.length > 0) {
                storeId = list[0].id ?? list[0].storeId;
            }
        }
        if (!storeId) {
            continue;
        }
        const coords = storeCoords(storeIndex);
        credentials.push({token, storeId, employeeId: userId, fakeIp, ...coords});
    }
    return {credentials};
}

export default function (data) {
    if (!data.credentials || data.credentials.length === 0) {
        return;
    }
    const cred = data.credentials[__VU % data.credentials.length];
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cred.token}`,
        'X-Forwarded-For': cred.fakeIp,
    };
    const body = JSON.stringify({
        employeeId: cred.employeeId,
        storeId: cred.storeId,
        latitude: cred.lat,
        longitude: cred.lon,
    });

    const inRes = http.post(`${HOST}/api/attendance/check-in`, body, {headers});
    checkInTrend.add(inRes.timings.duration);
    check(inRes, {'check-in 2xx or 4xx(already checked in)': r => r.status < 500});

    sleep(1); // 근무 중 — 실제 시나리오에서는 몇 시간이지만 부하테스트는 곧바로 체크아웃

    const outRes = http.post(`${HOST}/api/attendance/check-out`, body, {headers});
    checkOutTrend.add(outRes.timings.duration);
    check(outRes, {'check-out 2xx or 4xx': r => r.status < 500});

    sleep(1);
}
