import { apiFetch } from "./client";

/** بيانات الاتصال بـ GetStream (دردشة / مكالمات داخل التطبيق) — من `/stream/credentials` */
export type StreamCredentials = {
  api_key: string;
  user_id: string;
  user_token: string;
  user_name: string;
  user_image?: string | null;
};

export const getStreamCredentials = () => apiFetch<StreamCredentials>("/stream/credentials");

/** معرّف المستخدم لدى Stream (يجب أن يطابق ما يولّده الخادم لـ JWT) */
export function streamUserIdForAppUser(userId: number): string {
  return `user_${userId}`;
}
