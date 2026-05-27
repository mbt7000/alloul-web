import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { Alert as RNAlert } from "react-native";
import { apiFetch } from "../../api/client";
import { useCallSocket } from "../../hooks/useCallSocket";
import type { IncomingCallPayload } from "../../features/meetings/screens/IncomingCallScreen";

interface CallContextValue {
  incomingCall: IncomingCallPayload | null;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  pendingCallId: number | null;
}

const CallContext = createContext<CallContextValue>({
  incomingCall: null,
  acceptCall: async () => {},
  rejectCall: () => {},
  pendingCallId: null,
});

export function useCall() {
  return useContext(CallContext);
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const acceptingRef = useRef(false);

  // عند بدء التطبيل بعد نقر إشعار مكالمة واردة
  useEffect(() => {
    const pending = (globalThis as any).__pendingIncomingCall;
    if (pending) {
      delete (globalThis as any).__pendingIncomingCall;
      acceptingRef.current = false;
      setIncomingCall(pending as IncomingCallPayload);
    }

    // فحص دوري قصير في حال تأخر ضبط القيمة
    const t = setTimeout(() => {
      const p = (globalThis as any).__pendingIncomingCall;
      if (p) {
        delete (globalThis as any).__pendingIncomingCall;
        acceptingRef.current = false;
        setIncomingCall(p as IncomingCallPayload);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const handleEvent = useCallback((event: any) => {
    if (event.type === "incoming_call") {
      acceptingRef.current = false;
      setIncomingCall(event.payload);
    } else if (event.type === "call_rejected" || event.type === "call_ended") {
      acceptingRef.current = false;
      setIncomingCall(null);
    }
  }, []);

  useCallSocket({ onEvent: handleEvent });

  const acceptCall = useCallback(async () => {
    if (!incomingCall || acceptingRef.current) return;
    acceptingRef.current = true;

    const snapshot = incomingCall;
    try {
      const data = await apiFetch<{
        call_id: number;
        room_name: string;
        token: string;
        ws_url: string;
      }>(`/call/accept/${snapshot.call_id}`, { method: "POST" });

      setIncomingCall(null);

      const appModule = require("../../../App");
      const navRef = appModule?.navigationRef;
      if (navRef?.isReady?.()) {
        navRef.navigate("LiveRoom", {
          room_name: data.room_name,
          token: data.token,
          ws_url: data.ws_url,
          call_id: data.call_id,
          title: `مكالمة مع ${snapshot.caller_name}`,
        });
      }
    } catch {
      acceptingRef.current = false;
      setIncomingCall(null);
      RNAlert.alert("خطأ", "تعذّر قبول المكالمة — حاول مرة أخرى");
    }
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    const callId = incomingCall.call_id;
    setIncomingCall(null);
    acceptingRef.current = false;
    apiFetch(`/call/reject/${callId}`, { method: "POST" }).catch(() => {});
  }, [incomingCall]);

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        acceptCall,
        rejectCall,
        pendingCallId: incomingCall?.call_id ?? null,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
