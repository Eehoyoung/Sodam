// DB_OPTIMIZATION_PLAN.md Phase 8(초대형 규모 확장, 2026-07-11) — 시나리오 D: 여러 매장에서 동시에
// 근로계약서를 작성·저장(POST /api/stores/{storeId}/labor-contracts). 사용자 요청으로 추가된 시나리오 —
// "근로계약서 작성(여러매장에서 동시 작성요청 및 저장)".
//
// LoadTestSeedRunner가 매장 소유주(loadtest-owner-*)에게 PRO 플랜을 부여해뒀다 — 이 엔드포인트가
// @RequirePlan(min=PRO, features=E_CONTRACT)로 게이팅돼 있어 구독 없이는 전부 402가 난다.
//
// 각 (매장, 직원) 조합마다 정확히 1건만 작성한다(shared-iterations) — 실제 계약서 작성도 "직원당 1회성"
// 행위라 시나리오 A와 같은 이유로 반복 루프 대신 shared-iterations를 쓴다.
//
// 실행:
//   docker run --rm -i --network sodam-network -e TARGET_HOST=sodam-be -e TARGET_PORT=7070 \
//     -e STORE_COUNT=1000 -e EMPLOYEES_PER_STORE=20 -e VUS=300 \
//     grafana/k6 run - < scenario-d-labor-contract.js

import http from 'k6/http';
import {check} from 'k6';
import {Trend} from 'k6/metrics';

const HOST = `http://${__ENV.TARGET_HOST || 'localhost'}:${__ENV.TARGET_PORT || '7070'}`;
const STORE_COUNT = parseInt(__ENV.STORE_COUNT || '1000', 10);
const EMPLOYEES_PER_STORE = parseInt(__ENV.EMPLOYEES_PER_STORE || '20', 10);
const PASSWORD = __ENV.SEED_PASSWORD || 'sodamLoad1234';
const VUS = parseInt(__ENV.VUS || '300', 10);

const contractCreateTrend = new Trend('sodam_labor_contract_create_duration');

export const options = {
    scenarios: {
        concurrent_contracts: {
            executor: 'shared-iterations',
            vus: VUS,
            iterations: VUS,
            maxDuration: __ENV.DURATION || '3m',
        },
    },
    // setup()이 매장·직원 자격증명 확보를 위해 VU마다 3회 순차 호출한다 — 초대형 규모에서 기본
    // 60초를 넘길 수 있어 여유 있게 늘림(scenario-a 참조).
    setupTimeout: '10m',
    thresholds: {
        sodam_labor_contract_create_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.05'],
    },
};

export function setup() {
    // 매장 사장(owner) 자격증명 + 그 매장 소속 직원 1명 확보 — VU 수만큼만.
    const owners = [];
    for (let i = 0; i < VUS; i++) {
        const storeIndex = i % STORE_COUNT;
        const empIndex = Math.floor(i / STORE_COUNT) % EMPLOYEES_PER_STORE;
        const fakeIp = `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;
        const ownerEmail = `loadtest-owner-${storeIndex}@sodam.load`;

        const loginRes = http.post(`${HOST}/api/login`, JSON.stringify({email: ownerEmail, password: PASSWORD}), {
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

        // 이 매장의 직원 목록에서 empIndex번째 직원 id 확보(순서는 생성 순 — loadtest-emp-{storeIndex}-{empIndex}).
        const empListRes = http.get(`${HOST}/api/stores/${storeId}/employees`, {
            headers: {Authorization: `Bearer ${token}`, 'X-Forwarded-For': fakeIp},
        });
        let employeeId = null;
        if (empListRes.status === 200) {
            const emps = empListRes.json();
            const target = Array.isArray(emps)
                ? emps.find(e => e.email === `loadtest-emp-${storeIndex}-${empIndex}@sodam.load`)
                : null;
            employeeId = target ? (target.id ?? target.userId) : null;
        }
        if (!employeeId) {
            continue;
        }
        owners.push({token, storeId, employeeId, fakeIp});
    }
    return {owners};
}

export default function (data) {
    if (!data.owners || data.owners.length === 0) {
        return;
    }
    const cred = data.owners[__VU % data.owners.length];
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cred.token}`,
        'X-Forwarded-For': cred.fakeIp,
    };

    // §17 필수 기재사항을 채운 최소 유효 시급제 계약(HOURLY) — 스케줄 자동산출 모드 대신 직접입력 모드.
    const body = JSON.stringify({
        employeeId: cred.employeeId,
        periodType: 'PERMANENT',
        hourlyWage: 12000,
        payType: 'HOURLY',
        wagePaymentMethod: 'BANK_TRANSFER',
        wageComponents: '기본시급 + 주휴수당(부하테스트 자동 생성 계약)',
        contractedHoursPerWeek: 40.0,
        workStartTime: '09:00',
        workEndTime: '18:00',
        breakMinutes: 60,
        contractedWeeklyDays: 5,
        weeklyHolidayDay: 'SUNDAY',
        annualLeaveNote: '근로기준법 §60에 따라 부여',
        workLocation: '부하테스트 매장',
        jobDescription: '카페 홀 서빙',
        probation: false,
        simpleLabor: true,
        employmentInsurance: true,
        industrialAccidentInsurance: true,
        nationalPension: true,
        healthInsurance: true,
    });

    const res = http.post(`${HOST}/api/stores/${cred.storeId}/labor-contracts`, body, {headers});
    contractCreateTrend.add(res.timings.duration);
    check(res, {'labor contract create 2xx or 4xx(non-5xx)': r => r.status < 500});
}
