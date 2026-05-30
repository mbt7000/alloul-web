'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useCallSocket, type IncomingCallPayload } from '@/hooks/useCallSocket';
import { apiFetch } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallMode = 'idle' | 'calling' | 'incoming' | 'active';

export interface OutgoingCallInfo {
  receiver_id: number;
  receiver_name: string;
  call_id: number;
  call_type: 'audio' | 'video';
  room_name: string;
  token: string;
  ws_url: string;
}

export interface ActiveRoomInfo {
  call_id?: number;
  token: string;
  ws_url: string;
  title: string;
}

interface CallContextValue {
  mode: CallMode;
  incoming: IncomingCallPayload | null;
  outgoing: OutgoingCallInfo | null;
  activeRoom: ActiveRoomInfo | null;
  /** Initiate a 1-on-1 call to a team member */
  initiateCall: (receiverId: number, receiverName: string, callType: 'audio' | 'video') => Promise<void>;
  /** Start/join any room directly (group meetings, etc.) */
  startRoom: (room: ActiveRoomInfo) => void;
  /** Receiver accepts incoming call */
  acceptCall: () => Promise<void>;
  /** Receiver rejects incoming call */
  rejectCall: () => void;
  /** Caller cancels before receiver answers */
  cancelCall: () => void;
  /** Either party ends an active call */
  endCall: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CallContext = createContext<CallContextValue>({
  mode: 'idle',
  incoming: null,
  outgoing: null,
  activeRoom: null,
  initiateCall: async () => {},
  startRoom: () => {},
  acceptCall: async () => {},
  rejectCall: () => {},
  cancelCall: () => {},
  endCall: () => {},
});

export function useCallContext() { return useContext(CallContext); }

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [mode,       setMode]       = useState<CallMode>('idle');
  const [incoming,   setIncoming]   = useState<IncomingCallPayload | null>(null);
  const [outgoing,   setOutgoing]   = useState<OutgoingCallInfo | null>(null);
  const [activeRoom, setActiveRoom] = useState<ActiveRoomInfo | null>(null);

  // Stable refs so WS event handler sees fresh state without re-subscribing
  const modeRef     = useRef(mode);
  const outgoingRef = useRef(outgoing);
  modeRef.current     = mode;
  outgoingRef.current = outgoing;

  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoTimeout = () => {
    if (autoTimeoutRef.current) { clearTimeout(autoTimeoutRef.current); autoTimeoutRef.current = null; }
  };

  const resetToIdle = useCallback(() => {
    clearAutoTimeout();
    setMode('idle');
    setIncoming(null);
    setOutgoing(null);
    setActiveRoom(null);
  }, []);

  // ── WebSocket event handler ───────────────────────────────────────────────

  const handleEvent = useCallback((event: any) => {
    const currentMode = modeRef.current;

    switch (event.type as string) {
      case 'incoming_call':
        if (currentMode === 'idle') {
          setIncoming(event as IncomingCallPayload);
          setMode('incoming');
        }
        break;

      case 'call_accepted':
        // Receiver accepted → move caller into the room using stored credentials
        if (currentMode === 'calling') {
          clearAutoTimeout();
          const og = outgoingRef.current;
          if (og) {
            setActiveRoom({ call_id: og.call_id, token: og.token, ws_url: og.ws_url, title: `مكالمة مع ${og.receiver_name}` });
            setOutgoing(null);
            setMode('active');
          }
        }
        break;

      case 'call_rejected':
      case 'call_missed':
        if (currentMode === 'calling') {
          clearAutoTimeout();
          setOutgoing(null);
          setMode('idle');
        } else if (currentMode === 'incoming') {
          setIncoming(null);
          setMode('idle');
        }
        break;

      case 'call_ended':
        if (currentMode !== 'idle') {
          resetToIdle();
        }
        break;
    }
  }, [resetToIdle]);

  useCallSocket({ onEvent: handleEvent });

  // ── Actions ───────────────────────────────────────────────────────────────

  const initiateCall = useCallback(async (
    receiverId: number, receiverName: string, callType: 'audio' | 'video'
  ) => {
    if (modeRef.current !== 'idle') return;
    try {
      const data = await apiFetch<{ call_id: number; room_name: string; token: string; ws_url: string }>(
        '/call/initiate',
        { method: 'POST', body: JSON.stringify({ receiver_id: receiverId, call_type: callType }) }
      );
      setOutgoing({
        receiver_id: receiverId, receiver_name: receiverName,
        call_id: data.call_id, call_type: callType,
        room_name: data.room_name, token: data.token, ws_url: data.ws_url,
      });
      setMode('calling');

      // Auto-cancel after 45s if no answer
      autoTimeoutRef.current = setTimeout(() => {
        if (modeRef.current === 'calling') {
          const og = outgoingRef.current;
          if (og) apiFetch(`/call/reject/${og.call_id}`, { method: 'POST' }).catch(() => {});
          setOutgoing(null);
          setMode('idle');
        }
      }, 45_000);
    } catch (e: any) {
      const msg = (e?.message ?? '') as string;
      alert(msg.includes('مشغول') ? 'المستخدم مشغول حالياً في مكالمة أخرى' : 'تعذّر بدء المكالمة — تحقق من الاتصال');
    }
  }, []);

  const startRoom = useCallback((room: ActiveRoomInfo) => {
    clearAutoTimeout();
    setActiveRoom(room);
    setOutgoing(null);
    setIncoming(null);
    setMode('active');
  }, []);

  const acceptCall = useCallback(async () => {
    if (!incoming || modeRef.current !== 'incoming') return;
    const snap = incoming;
    try {
      const data = await apiFetch<{ call_id: number; room_name: string; token: string; ws_url: string }>(
        `/call/accept/${snap.call_id}`, { method: 'POST' }
      );
      setIncoming(null);
      setActiveRoom({ call_id: data.call_id, token: data.token, ws_url: data.ws_url, title: `مكالمة مع ${snap.caller_name}` });
      setMode('active');
    } catch {
      alert('تعذّر قبول المكالمة — تحقق من الاتصال وحاول مجدداً');
    }
  }, [incoming]);

  const rejectCall = useCallback(() => {
    if (!incoming) return;
    const callId = incoming.call_id;
    setIncoming(null);
    setMode('idle');
    apiFetch(`/call/reject/${callId}`, { method: 'POST' }).catch(() => {});
  }, [incoming]);

  const cancelCall = useCallback(() => {
    clearAutoTimeout();
    const og = outgoing;
    if (!og) return;
    setOutgoing(null);
    setMode('idle');
    apiFetch(`/call/reject/${og.call_id}`, { method: 'POST' }).catch(() => {});
  }, [outgoing]);

  const endCall = useCallback(() => {
    const callId = activeRoom?.call_id;
    resetToIdle();
    if (callId) apiFetch(`/call/end/${callId}`, { method: 'POST' }).catch(() => {});
  }, [activeRoom, resetToIdle]);

  return (
    <CallContext.Provider value={{
      mode, incoming, outgoing, activeRoom,
      initiateCall, startRoom, acceptCall, rejectCall, cancelCall, endCall,
    }}>
      {children}
    </CallContext.Provider>
  );
}
