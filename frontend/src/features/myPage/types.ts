/**
 * 마이페이지 관련 타입 정의
 */

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    profileImage?: string;
    phoneNumber?: string;
    address?: string;
}

export enum UserRole {
    EMPLOYEE = 'EMPLOYEE',
    MANAGER = 'MANAGER',
    MASTER = 'MASTER',
    USER = 'USER',
}

export interface EmployeeProfile extends UserProfile {
    workplaces: Workplace[];
    attendanceRecords: AttendanceRecord[];
    salaryRecords: SalaryRecord[];
}

export interface ManagerProfile extends UserProfile {
    managedWorkplaces: Workplace[];
    employees: UserProfile[];
}

export interface MasterProfile extends UserProfile {
    ownedWorkplaces: Workplace[];
    subscriptionInfo: SubscriptionInfo;
}

export interface Workplace {
    id: string;
    name: string;
    address: string;
    businessNumber: string;
}

export interface AttendanceRecord {
    id: string;
    date: string;
    checkIn: string;
    checkOut: string;
    workHours: number;
}

export interface SalaryRecord {
    id: string;
    period: string;
    amount: number;
    status: 'PENDING' | 'PAID';
    paymentDate?: string;
}

export interface SubscriptionInfo {
    plan: 'FREE' | 'BASIC' | 'PREMIUM';
    startDate: string;
    endDate: string;
    autoRenew: boolean;
}

export interface SalaryStatistics {
    totalAmount: number;
    averageAmount: number;
    totalEmployees: number;
    paidCount: number;
    pendingCount: number;
    monthlyStats: MonthlyStats[];
}

export interface MonthlyStats {
    month: string; // YYYY-MM format
    totalAmount: number;
    employeeCount: number;
    paidAmount: number;
    pendingAmount: number;
}

export interface SalaryPolicy {
    id: string;
    workplaceId: string;
    baseHourlyWage: number;
    overtimeRate: number;
    nightShiftRate: number;
    holidayRate: number;
    deductions: SalaryDeduction[];
    allowances: SalaryAllowance[];
    paymentDay: number; // 1-31
    taxSettings: TaxSettings;
}

export interface SalaryDeduction {
    type: 'TAX' | 'INSURANCE' | 'OTHER';
    name: string;
    amount: number;
    isPercentage: boolean;
}

export interface SalaryAllowance {
    type: 'MEAL' | 'TRANSPORT' | 'OTHER';
    name: string;
    amount: number;
    isPercentage: boolean;
}

export interface TaxSettings {
    incomeTaxRate: number;
    localTaxRate: number;
    nationalPensionRate: number;
    healthInsuranceRate: number;
    employmentInsuranceRate: number;
}

export interface UpdateSalaryStatusData {
    status: 'PENDING' | 'PAID';
    paymentDate?: string;
}
