// DB_OPTIMIZATION_PLAN.md Phase 8 — 시나리오 C: 목록/대시보드 읽기(사장 화면) 반복 조회.
// Phase 1 인덱스 정비 + Phase 9 합성 엔드포인트가 실제로 응답시간을 개선했는지 확인한다.
//
// 실행:
//   docker run --rm -i --network sodam-network -e TARGET_HOST=sodam-be -e TARGET_PORT=7070 \
//     -e STORE_COUNT=50 -e VUS=30 -e DURATION=1m \
//     grafana/k6 run - < scenario-c-dashboard.js

import http from 'k6/http';
import {check, sleep} from 'k6';
import {Trend} from 'k6/metrics';

const HOST = `http://${__ENV.TARGET_HOST || 'localhost'}:${__ENV.TARGET_PORT || '7070'}`;
const STORE_COUNT = parseInt(__ENV.STORE_COUNT || '50', 10);
const PASSWORD = __ENV.SEED_PASSWORD || 'sodamLoad1234';

const employeeListTrend = new Trend('sodam_employee_list_duration');
const dashboardTrend = new Trend('sodam_dashboard_duration');

export const options = {
    vus: parseInt(__ENV.VUS || '30', 10),
    duration: __ENV.DURATION || '1m',
    // 초대형 규모에서 setup()의 순차 로그인이 기본 60초를 넘길 수 있어 여유 있게 늘림(scenario-a 참조).
    setupTimeout: '10m',
    thresholds: {
        sodam_employee_list_duration: ['p(95)<800'],
        sodam_dashboard_duration: ['p(95)<800'],
        http_req_failed: ['rate<0.01'],
    },
};

export function setup() {
    const vus = parseInt(__ENV.VUS || '30', 10);
    const owners = [];
    for (let i = 0; i < vus; i++) {
        const storeIndex = i % STORE_COUNT;
        const email = `loadtest-owner-${storeIndex}@sodam.load`;
        // scenario-a-checkin.js와 동일한 사유(RateLimitFilter의 JSON 바디 미파싱 버그 우회) — VU마다
        // 다른 X-Forwarded-For로 서로 다른 클라이언트를 재현한다.
        const fakeIp = `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;
        const loginRes = http.post(`${HOST}/api/login`, JSON.stringify({email, password: PASSWORD}), {
            headers: {'Content-Type': 'application/json', 'X-Forwarded-For': fakeIp},
        });
        if (loginRes.status !== 200) {
            continue;
        }
        const body = loginRes.json();
        const token = body.data ? body.data.accessToken : body.accessToken;

        const storesRes = http.get(`${HOST}/api/stores/master/current`, {
            headers: {Authorization: `Bearer ${token}`, 'X-Forwarded-For': fakeIp},
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
        owners.push({token, storeId, fakeIp});
    }
    return {owners};
}

export default function (data) {
    if (!data.owners || data.owners.length === 0) {
        return;
    }
    const owner = data.owners[__VU % data.owners.length];
    const headers = {Authorization: `Bearer ${owner.token}`, 'X-Forwarded-For': owner.fakeIp};

    const listRes = http.get(`${HOST}/api/stores/${owner.storeId}/employees`, {headers});
    employeeListTrend.add(listRes.timings.duration);
    check(listRes, {'employee list 2xx': r => r.status === 200});

    const dashRes = http.get(`${HOST}/api/store-queries/${owner.storeId}/stats/dashboard`, {headers});
    dashboardTrend.add(dashRes.timings.duration);
    check(dashRes, {'dashboard 2xx': r => r.status === 200});

    // 실제 대시보드 화면은 초당 수십 회씩 새로고침하지 않는다 — 페이싱 없이 반복하면 RateLimitFilter의
    // 일반 버킷(IP당 120회/분)에 걸려 서버 응답이 아니라 클라이언트 폭주가 실패율을 지배하게 된다
    // (초판 실행에서 실측 발견 — DB_OPTIMIZATION_PLAN.md Phase 8 실행 노트 참조). 사장이 화면을 열어두고
    // 몇 초에 한 번 보는 정도의 현실적 폴링 간격을 흉내낸다.
    sleep(2);
}
