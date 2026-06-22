import api from '../../../common/utils/api';

/** 직원 서류함(A5). BE: /api/stores/{storeId}/employees/{employeeId}/documents */
export type DocumentType = 'HEALTH_CERTIFICATE' | 'LABOR_CONTRACT' | 'BANKBOOK' | 'ID_CARD' | 'ETC';
export type ExpiryStatus = 'OK' | 'EXPIRING' | 'EXPIRED';

export const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  HEALTH_CERTIFICATE: '보건증',
  LABOR_CONTRACT: '근로계약서',
  BANKBOOK: '통장사본',
  ID_CARD: '신분증',
  ETC: '기타',
};

export const DOC_TYPE_ORDER: DocumentType[] = [
  'HEALTH_CERTIFICATE',
  'LABOR_CONTRACT',
  'BANKBOOK',
  'ID_CARD',
  'ETC',
];

export interface EmployeeDocument {
  id: number;
  employeeId: number;
  storeId: number;
  type: DocumentType;
  typeLabel: string;
  title: string;
  fileRef?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  expiryStatus: ExpiryStatus;
  daysUntilExpiry?: number | null;
}

export interface DocumentCreateBody {
  type: DocumentType;
  title: string;
  issuedAt?: string;
  expiresAt?: string;
  fileRef?: string;
}

const base = (storeId: number, employeeId: number) =>
  `/api/stores/${storeId}/employees/${employeeId}/documents`;

export async function fetchDocuments(storeId: number, employeeId: number): Promise<EmployeeDocument[]> {
  const {data} = await api.get<EmployeeDocument[]>(base(storeId, employeeId));
  return data;
}

export async function addDocument(
  storeId: number,
  employeeId: number,
  body: DocumentCreateBody,
): Promise<EmployeeDocument> {
  const {data} = await api.post<EmployeeDocument>(base(storeId, employeeId), body);
  return data;
}

export async function deleteDocument(
  storeId: number,
  employeeId: number,
  docId: number,
): Promise<void> {
  await api.delete(`${base(storeId, employeeId)}/${docId}`);
}
