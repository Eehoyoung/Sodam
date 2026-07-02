/**
 * Q&A 관련 타입 정의
 */

export interface Question {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: string;
    updatedAt: string;
    status: QuestionStatus;
    category: QuestionCategory;
    tags: string[];
    viewCount: number;
    answers: Answer[];
}

export enum QuestionStatus {
    OPEN = 'OPEN',
    ANSWERED = 'ANSWERED',
    CLOSED = 'CLOSED',
}

export enum QuestionCategory {
    LABOR_LAW = 'LABOR_LAW',
    TAX = 'TAX',
    SALARY = 'SALARY',
    ATTENDANCE = 'ATTENDANCE',
    WORKPLACE = 'WORKPLACE',
    OTHER = 'OTHER',
}

export interface Answer {
    id: string;
    questionId: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: string;
    updatedAt: string;
    isAccepted: boolean;
    upvotes: number;
    downvotes: number;
}

export interface QuestionFilter {
    category?: QuestionCategory;
    status?: QuestionStatus;
    searchTerm?: string;
    tags?: string[];
    authorId?: string;
}
