import { apiFetch } from "./api";
import type { NfcTag } from "./backend-types";

/** 매장 NFC 태그 목록 — GET /api/stores/{storeId}/nfc-tags. 발급(POST)은 모바일 전용, 웹은 조회+비활성화만. */
export function fetchStoreNfcTags(storeId: number): Promise<NfcTag[]> {
  return apiFetch<NfcTag[]>(`/api/stores/${storeId}/nfc-tags`);
}

/** NFC 태그 비활성화 — DELETE /api/stores/{storeId}/nfc-tags/{tagPk}. */
export function deactivateNfcTag(storeId: number, tagPk: number): Promise<void> {
  return apiFetch<void>(`/api/stores/${storeId}/nfc-tags/${tagPk}`, { method: "DELETE" });
}
