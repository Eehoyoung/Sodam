/** 기존 백엔드 REST API 응답 DTO와 1:1 대응하는 타입 — backend/src/main/java/com/rich/sodam/dto/response/*.java 참고. */

export interface StoreSummary {
  id: number;
  storeName: string;
  businessNumber: string;
  storePhoneNumber: string;
  businessType: string;
  storeCode: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  radius: number;
  storeStandardHourWage: number;
  employeeCount: number;
  taxAccountantEmail: string | null;
  createdAt: string;
  updatedAt: string;
  monthlyLaborCost: number | null;
  todayAttendance: number | null;
  monthlyRevenue: number | null;
}

export interface StoreEmployee {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  userGrade: string | null;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  storeId: number;
  storeName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  appliedHourlyWage: number | null;
  workingHours: number | null;
  dailyWage: number | null;
}

export interface WorkShift {
  id: number;
  employeeId: number;
  storeId: number;
  shiftDate: string;
  startTime: string;
  endTime: string;
  memo: string | null;
  crossesMidnight: boolean;
  /** 낙관적 락 버전 — 수정 요청 시 그대로 되돌려보내야 모바일↔웹 동시편집 충돌을 서버가 감지한다. */
  version: number;
}

export interface NfcTag {
  id: number;
  storeId: number;
  tagId: string;
  label: string | null;
  active: boolean;
  createdAt: string;
}

export interface AttendanceApprovalRequestItem {
  id: number;
  employeeId: number;
  employeeName: string;
  storeId: number;
  type: string;
  requestedTime: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  resultAttendanceId: number | null;
  rejectReason: string | null;
  requestedAt: string;
  decidedAt: string | null;
}
