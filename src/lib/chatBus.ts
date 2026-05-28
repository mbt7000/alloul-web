/**
 * Lightweight pub/sub bus for real-time chat WebSocket events.
 * The single WS connection (in useCallSocket) emits here;
 * chat screens subscribe here instead of polling.
 */

export type ChatMessagePayload = {
  id: number;
  channel_id: number;
  user_id: number;
  content: string;
  author: { id: number; name: string; avatar_url: string | null };
  created_at: string;
  is_self: boolean;
};

export type ChatWsEvent =
  | { type: "chat:message"; channel_id: number; message: ChatMessagePayload }
  | { type: "chat:typing"; channel_id: number; user_id: number; user_name: string };

type Listener = (event: ChatWsEvent) => void;

const _listeners = new Set<Listener>();

export const chatBus = {
  emit(event: ChatWsEvent): void {
    _listeners.forEach((l) => {
      try { l(event); } catch { /* never crash the bus */ }
    });
  },
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
};
