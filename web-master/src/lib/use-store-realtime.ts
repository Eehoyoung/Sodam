"use client";

import { useEffect } from "react";
import { Client } from "@stomp/stompjs";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./env";

/**
 * 매장 실시간 동기화 — 기존 STOMP 토픽(`/topic/store.{storeId}`) 구독.
 * 백엔드는 페이로드에 실데이터를 담지 않고 "다시 조회하라"는 트리거만 보낸다
 * (WebSocketConfig.java 문서 참고) — 그래서 메시지 수신 시 관련 쿼리를 무효화(refetch)하기만 한다.
 * 세션 쿠키 기반 인증은 핸드셰이크(GET /ws) 시 브라우저가 자동 동봉하므로 별도 헤더 불필요.
 */
export function useStoreRealtime(storeId: number | null, queryKeyPrefixes: unknown[][]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storeId) return;

    const wsUrl = API_BASE_URL.replace(/^http/, "ws") + "/ws";
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 3000,
      onConnect: () => {
        console.info(`[realtime] STOMP connected — subscribing /topic/store.${storeId}`);
        client.subscribe(`/topic/store.${storeId}`, () => {
          queryKeyPrefixes.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        });
      },
      // 기본값은 실패를 조용히 삼킨다 — 인증 거부(STOMP ERROR 프레임)나 소켓 오류를 콘솔에 남겨
      // 디버깅 가능하게 한다.
      onStompError: (frame) => {
        console.error("[realtime] STOMP ERROR", frame.headers["message"], frame.body);
      },
      onWebSocketError: (event) => {
        console.error("[realtime] WebSocket error", event);
      },
    });

    client.activate();
    return () => {
      client.deactivate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);
}
