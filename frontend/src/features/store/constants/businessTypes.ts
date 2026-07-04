/**
 * 표준 업종분류 — 소상공인 매장 등록용 간이 분류.
 * 통계청 표준산업분류(KSIC)를 소상공인 매장 단위로 간소화해 그룹핑했다.
 * 목록에 없는 업종은 각 그룹 안의 "기타" 항목 또는 최하단 "직접 입력"으로 처리한다.
 */

export interface BusinessTypeGroup {
    key: string;
    label: string;
    items: string[];
}

export const BUSINESS_TYPE_GROUPS: BusinessTypeGroup[] = [
    {
        key: 'food',
        label: '음식점업',
        items: [
            '한식', '중식', '일식', '양식', '분식',
            '치킨/호프', '주점', '카페/디저트', '베이커리',
            '패스트푸드', '배달전문', '기타 음식점업',
        ],
    },
    {
        key: 'retail',
        label: '소매업',
        items: [
            '편의점', '슈퍼마켓/마트', '정육점', '청과물', '수산물',
            '꽃집', '문구/서점', '의류/잡화', '화장품', '휴대폰/전자기기',
            '기타 소매업',
        ],
    },
    {
        key: 'beauty',
        label: '미용/뷰티',
        items: ['미용실', '네일샵', '피부관리', '이발소', '마사지/스파', '기타 미용업'],
    },
    {
        key: 'health',
        label: '건강/의료',
        items: ['약국', '한의원', '의원', '동물병원', '기타 의료업'],
    },
    {
        key: 'education',
        label: '교육',
        items: ['어학원', '입시/보습학원', '예체능학원', '스터디카페', '유치원/어린이집', '기타 교육서비스업'],
    },
    {
        key: 'life',
        label: '생활서비스',
        items: ['세탁소', '사진관', '수선실', '부동산중개', '렌탈업', '기타 생활서비스업'],
    },
    {
        key: 'leisure',
        label: '숙박/여가',
        items: ['숙박업', 'PC방', '노래방', '헬스장/필라테스', '볼링장/당구장', '기타 여가서비스업'],
    },
    {
        key: 'transport',
        label: '운송/수리',
        items: ['자동차정비', '세차장', '주유소', '택배/물류', '기타 운송·수리업'],
    },
    {
        key: 'other',
        label: '제조/기타',
        items: ['제조업', '도매업', '건설/인테리어', '기타 서비스업'],
    },
];

export const CUSTOM_BUSINESS_TYPE_VALUE = '__custom__';

/** 자유 입력 값이 표준 목록에 포함되는지 확인(수정 화면에서 기존 값 하이라이트용). */
export const isKnownBusinessType = (value: string): boolean =>
    BUSINESS_TYPE_GROUPS.some(group => group.items.includes(value));
