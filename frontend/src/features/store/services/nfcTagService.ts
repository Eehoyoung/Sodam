import api from '../../../common/utils/api';

/**
 * 매장 NFC 태그 관리(사장 전용) — 대리출근 방지를 위한 매장-태그 매핑.
 * BE: NfcTagController (`/api/stores/{storeId}/nfc-tags`).
 *
 * ⚠️ 이 서비스는 "사장이 물리 태그를 등록/조회/비활성화"하는 관리용이다.
 * "직원이 태그를 찍어 출퇴근하는" 검증 플로우와는 별개 — 여기서 건드리지 않는다.
 */

/** BE StoreNfcTagResponse 와 정합 */
export interface StoreNfcTag {
  id: number;
  storeId: number;
  tagId: string;
  label?: string | null;
  active: boolean;
  createdAt: string;
}

// [API Mapping] POST /api/stores/{storeId}/nfc-tags — 태그 등록
export async function registerNfcTag(
  storeId: number,
  tagId: string,
  label?: string,
): Promise<StoreNfcTag> {
  const {data} = await api.post<StoreNfcTag>(`/api/stores/${storeId}/nfc-tags`, {
    tagId,
    label,
  });
  return data;
}

// [API Mapping] GET /api/stores/{storeId}/nfc-tags — 태그 목록(활성+비활성)
export async function fetchNfcTags(storeId: number): Promise<StoreNfcTag[]> {
  const {data} = await api.get<StoreNfcTag[]>(`/api/stores/${storeId}/nfc-tags`);
  return Array.isArray(data) ? data : [];
}

// [API Mapping] DELETE /api/stores/{storeId}/nfc-tags/{tagPk} — 태그 비활성화
export async function deactivateNfcTag(storeId: number, tagPk: number): Promise<void> {
  await api.delete(`/api/stores/${storeId}/nfc-tags/${tagPk}`);
}

// [API Mapping] PATCH /api/stores/{storeId}/nfc-tags/{tagPk}/activate — 태그 재활성화
export async function activateNfcTag(storeId: number, tagPk: number): Promise<void> {
  await api.patch(`/api/stores/${storeId}/nfc-tags/${tagPk}/activate`);
}

const nfcTagService = {
  registerNfcTag,
  fetchNfcTags,
  deactivateNfcTag,
  activateNfcTag,
};

export default nfcTagService;
