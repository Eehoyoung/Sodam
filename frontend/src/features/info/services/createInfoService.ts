import api from '../../../common/api/client';
import {InfoCategory, InfoDto} from '../types';
import {logger} from '../../../utils/logger';

/**
 * 정보 게시물 서비스 공용 팩토리 — 노무/정책/세무/팁 4개 서비스가 매퍼의 고정값(카테고리·작성자)과
 * 엔드포인트 접두사만 다른 채로 거의 그대로 복붙돼 있던 것을 하나로 합쳤다(P3-8).
 *
 * 함께 정리한 것:
 *  - `getXByCategory(categoryId)` 가 categoryId 를 받고도 쿼리에 싣지 않아 항상 전체 목록을
 *    반환하던 동작은 **그대로 보존**했다(BE 에 카테고리 필터가 없다). 대신 인자 이름과 주석으로
 *    "지금은 전체 목록"임을 드러낸다 — 조용히 무시되는 파라미터가 가장 위험하다.
 *  - search / recent / popular / deadline / region / difficulty 계열은 호출자가 0건이고 일부는
 *    BE 에 존재하지 않는 경로였다(계약 테스트의 FE_ONLY 표시) — 제거했다.
 */
export interface InfoServiceConfig<T> {
    /** BE 경로 접두사. 예: `/api/labor-info` */
    basePath: string;
    /** DTO → 화면 타입 매퍼. */
    map: (dto: InfoDto) => T;
    /** 로그 문구에 쓰이는 사람이 읽는 이름. 예: '노무 정보' */
    label: string;
}

export interface InfoService<T> {
    getCategories: () => Promise<InfoCategory[]>;
    /** BE 에 카테고리 필터가 없어 현재는 전체 목록을 반환한다(인자는 화면 호환용). */
    getByCategory: (categoryId: string) => Promise<T[]>;
    getById: (id: string) => Promise<T>;
}

export function createInfoService<T>({basePath, map, label}: InfoServiceConfig<T>): InfoService<T> {
    return {
        getCategories: async () => [{id: 'ALL', name: '전체', description: '전체 보기'}],

        getByCategory: async (_categoryId: string) => {
            try {
                const res = await api.get<InfoDto[]>(basePath);
                return (res.data || []).map(map);
            } catch (error) {
                logger.error(`${label} 목록을 가져오는 중 오류가 발생했습니다:`, error);
                throw error;
            }
        },

        getById: async (id: string) => {
            try {
                const res = await api.get<InfoDto>(`${basePath}/${id}`);
                return map(res.data);
            } catch (error) {
                logger.error(`${label} 상세를 가져오는 중 오류가 발생했습니다:`, error);
                throw error;
            }
        },
    };
}

/** 4개 도메인이 공유하는 매퍼 뼈대 — 고정값만 다르다. */
export const mapInfoDto = (dto: InfoDto, categoryId: string, author: string) => ({
    id: String(dto.id),
    categoryId,
    title: dto.title ?? '',
    summary: dto.content ? String(dto.content).slice(0, 100) : '',
    content: dto.content ?? '',
    publishDate: dto.createdAt ?? new Date().toISOString(),
    author,
    tags: [] as string[],
    imageUrl: dto.imagePath ? dto.imagePath : undefined,
});
