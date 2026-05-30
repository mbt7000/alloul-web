'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getToken, getCachedUser } from '@/lib/auth';

export interface IncomingCallPayload {
  type: 'incoming_call';
  call_id: number;
  caller_id: number;
  caller_name: string;
  caller_avatar?: string | null;
  call_type: 'video' | 'audio';
  room_name: string;
}

type CallEvent =
  | IncomingCallPayload
  | { type: 'call_accepted'; call_id: number }
  | { type: 'call_rejected'; call_id: number }
  | { type: 'call_ended'; call_id: number; duration?: number }
  | { type: 'call_missed'; call_id: number; caller_id: number; caller_name: string }
  | { type: 'pong' };

interface Options {
  onEvent: (event: CallEvent) => void;
}

const WS_BASE = 'wss://api.alloul.app';
const PING_INTERVAL = 25_000;
const RECONNECT_DELAY = 4_000;

export function useCallSocket({ onEvent }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const cleanup = useCallback(() => {
    if (pingRef.current) clearInterval(pingRef.current);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const token = getToken();
    const user = getCachedUser();
    if (!token || !user?.id) return;

    cleanup();

    const ws = new WebSocket(`${WS_BASE}/ws/${user.id}`, ['bearer', token]);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, PING_INTERVAL);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as CallEvent;
        onEventRef.current(data);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (!mountedRef.current) return;
      reconnectRef.current = setTimeout(() => connect(), RECONNECT_DELAY);
    };

    ws.onerror = () => ws.close();
  }, [cleanup]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [connect, cleanup]);
}
