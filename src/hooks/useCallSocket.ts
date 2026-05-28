import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../state/auth/AuthContext";
import { getToken } from "../storage/token";
import { type IncomingCallPayload } from "../features/meetings/screens/IncomingCallScreen";
import { chatBus } from "../lib/chatBus";

const WS_BASE = "wss://api.alloul.app";
const PING_MS = 25_000;
const RECONNECT_MS = 4_000;

export type CallEvent =
  | { type: "incoming_call"; payload: IncomingCallPayload }
  | { type: "call_accepted"; call_id: number }
  | { type: "call_rejected"; call_id: number }
  | { type: "call_ended"; call_id: number; duration?: number };

interface Options {
  onEvent: (event: CallEvent) => void;
}

/** Singleton ref exposed so other hooks can send events without opening a second connection. */
export const _wsRef = { current: null as WebSocket | null };

export function sendWsEvent(data: Record<string, unknown>): void {
  const ws = _wsRef.current;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function useCallSocket({ onEvent }: Options) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const clearTimers = useCallback(() => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
  }, []);

  const connect = useCallback(async () => {
    if (!user?.id || !mountedRef.current) return;
    const token = await getToken();
    if (!token) return;

    clearTimers();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(`${WS_BASE}/ws/${user.id}`, ["bearer", token]);
    wsRef.current = ws;
    _wsRef.current = ws;

    ws.onopen = () => {
      clearTimers();
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_MS);
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "pong") return;
        if (data.type === "incoming_call") {
          onEventRef.current({ type: "incoming_call", payload: data as IncomingCallPayload });
        } else if (data.type === "call_accepted") {
          onEventRef.current({ type: "call_accepted", call_id: data.call_id });
        } else if (data.type === "call_rejected") {
          onEventRef.current({ type: "call_rejected", call_id: data.call_id });
        } else if (data.type === "call_ended") {
          onEventRef.current({ type: "call_ended", call_id: data.call_id, duration: data.duration });
        } else if (data.type === "chat:message") {
          chatBus.emit({ type: "chat:message", channel_id: data.channel_id, message: data.message });
        } else if (data.type === "chat:typing") {
          chatBus.emit({ type: "chat:typing", channel_id: data.channel_id, user_id: data.user_id, user_name: data.user_name });
        }
      } catch { /* malformed JSON — ignore */ }
    };

    ws.onclose = () => {
      clearTimers();
      if (_wsRef.current === ws) _wsRef.current = null;
      if (!mountedRef.current) return;
      reconnectRef.current = setTimeout(() => {
        if (mountedRef.current) void connect();
      }, RECONNECT_MS);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [user?.id, clearTimers]);

  useEffect(() => {
    mountedRef.current = true;
    if (user?.id) void connect();
    return () => {
      mountedRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user?.id, connect, clearTimers]);
}
