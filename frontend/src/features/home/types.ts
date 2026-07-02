/**
 * 홈 화면 관련 타입 정의
 */

export interface HomeSection {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
}

/**
 * 이벤트 인터페이스
 */
export interface Event {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    date: string;
    endDate?: string;
    url?: string;
}

/**
 * 정책 정보 인터페이스
 */
export interface Policy {
    id: string;
    title: string;
    description?: string;
    content: string;
    date: string;
    category: string;
    imageUrl?: string;
    url?: string;
}

/**
 * 세금 정보 인터페이스
 */
export interface TaxInfo {
    id: string;
    title: string;
    description?: string;
    content: string;
    date: string;
    category: string;
    imageUrl?: string;
    url?: string;
}

/**
 * 노동법 정보 인터페이스
 */
export interface LaborInfo {
    id: string;
    title: string;
    description?: string;
    content: string;
    date: string;
    category: string;
    imageUrl?: string;
    url?: string;
}

/**
 * 운영 팁 인터페이스
 */
export interface Tip {
    id: string;
    title: string;
    description?: string;
    content: string;
    date: string;
    category: string;
    imageUrl?: string;
    url?: string;
}

/**
 * 서비스 인터페이스
 */
export interface Service {
    id: string;
    title: string;
    description: string;
    iconUrl?: string;
    screenName: string;
}

/**
 * 사용자 후기 인터페이스
 */
export interface Testimonial {
    id: string;
    name: string;
    role: string;
    content: string;
    avatarUrl?: string;
}
