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
