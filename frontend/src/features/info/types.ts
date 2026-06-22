/**
 * 정보 제공 관련 타입 정의
 */

export interface InfoCategory {
    id: string;
    name: string;
    description: string;
    icon?: string;
}

export interface InfoArticle {
    id: string;
    categoryId: string;
    title: string;
    summary: string;
    content: string;
    publishDate: string;
    author?: string;
    tags: string[];
    imageUrl?: string;
}

export interface LaborInfo extends InfoArticle {
    lawReference?: string;
    effectiveDate?: string;
}

export interface TaxInfo extends InfoArticle {
    taxYear?: string;
    applicableGroups?: string[];
}

export interface PolicyInfo extends InfoArticle {
    policyNumber?: string;
    eligibilityCriteria?: string[];
    applicationDeadline?: string;
}

export interface TipsInfo extends InfoArticle {
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    estimatedTime?: string;
}

/**
 * BE 공통 정보 DTO (정책·세금·팁 공유 형태).
 * 매퍼가 실제로 참조하는 필드만 선언 — 응답 키가 누락돼도 안전하게 좁힐 수 있도록 모두 optional.
 */
export interface InfoDto {
    id: number | string;
    title?: string;
    content?: string;
    createdAt?: string;
    imagePath?: string;
}
