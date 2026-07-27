"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMyStores } from "./stores";
import type { StoreSummary } from "./backend-types";

const STORAGE_KEY = "sodam_web_selected_store_id";

interface StoreContextValue {
  stores: StoreSummary[];
  selectedStoreId: number | null;
  selectedStore: StoreSummary | null;
  setSelectedStoreId: (id: number) => void;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/**
 * 사장이 소유한 매장 목록 + 현재 선택된 매장(멀티매장 전환, 03_UI_UX_설계가이드.md §1).
 * 선택 상태는 localStorage 에 저장해 새로고침 후에도 유지한다.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: stores, isLoading } = useQuery({
    queryKey: ["stores", "mine"],
    queryFn: fetchMyStores,
  });

  const [selectedStoreId, setSelectedStoreIdState] = useState<number | null>(null);

  useEffect(() => {
    if (!stores || stores.length === 0) return;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const storedId = stored ? Number(stored) : null;
    const valid = storedId != null && stores.some((s) => s.id === storedId);
    setSelectedStoreIdState(valid ? storedId : stores[0].id);
  }, [stores]);

  function setSelectedStoreId(id: number) {
    setSelectedStoreIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    }
  }

  const selectedStore = useMemo(
    () => stores?.find((s) => s.id === selectedStoreId) ?? null,
    [stores, selectedStoreId],
  );

  return (
    <StoreContext.Provider
      value={{
        stores: stores ?? [],
        selectedStoreId,
        selectedStore,
        setSelectedStoreId,
        isLoading,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStoreContext 는 StoreProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
