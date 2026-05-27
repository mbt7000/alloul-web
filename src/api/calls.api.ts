import { apiFetch } from "./client";

export interface CallLog {
  id: number;
  call_type: "video" | "audio";
  status: "ringing" | "accepted" | "rejected" | "missed" | "ended";
  duration?: number;
  started_at?: string;
  is_outgoing: boolean;
  other_user_id: number;
  other_user_name: string;
  other_user_avatar?: string;
}

export interface InitiateCallResult {
  call_id: number;
  room_name: string;
  token: string;
  ws_url: string;
}

export interface AcceptCallResult {
  call_id: number;
  room_name: string;
  token: string;
  ws_url: string;
}

export interface PresenceStatus {
  user_id: number;
  presence_status: "online" | "busy" | "offline" | "away";
}

export const initiateCall = (receiver_id: number, call_type: "video" | "audio" = "video") =>
  apiFetch<InitiateCallResult>("/call/initiate", {
    method: "POST",
    body: JSON.stringify({ receiver_id, call_type }),
  });

export const acceptCall = (call_id: number) =>
  apiFetch<AcceptCallResult>(`/call/accept/${call_id}`, { method: "POST" });

export const rejectCall = (call_id: number) =>
  apiFetch<{ ok: boolean }>(`/call/reject/${call_id}`, { method: "POST" });

export const endCall = (call_id: number) =>
  apiFetch<{ ok: boolean; duration?: number }>(`/call/end/${call_id}`, { method: "POST" });

export const getCallHistory = () =>
  apiFetch<CallLog[]>("/call/history");

export const getUserPresence = (user_id: number) =>
  apiFetch<PresenceStatus>(`/users/${user_id}/presence`);

export const updatePresence = (status: "online" | "busy" | "offline" | "away") =>
  apiFetch<{ status: string }>("/users/presence", {
    method: "PUT",
    body: JSON.stringify({ status }),
  });

export const saveExpoPushToken = (token: string) =>
  apiFetch<{ ok: boolean }>("/users/expo-push-token", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
