"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

type WSEvent = {
  event: string;
  data: any;
};

export function useWebSocket(onMessage: (event: string, data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const mountedRef = useRef(true);

  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      const connectTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }, 3000);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        retryCountRef.current = 0;
      };

      ws.onmessage = (e) => {
        try {
          const msg: WSEvent = JSON.parse(e.data);
          onMessageRef.current(msg.event, msg.data);
        } catch {}
      };

      ws.onclose = () => {
        clearTimeout(connectTimeout);
        if (!mountedRef.current) return;
        const delay = Math.min(2000 * 2 ** retryCountRef.current, 15000);
        retryCountRef.current++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {}
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connected: wsRef.current?.readyState === WebSocket.OPEN };
}
