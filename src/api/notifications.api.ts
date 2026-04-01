import { apiFetch } from "./client";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  reference_id?: string;
  actor_name?: string;
  actor_avatar?: string;
  created_at?: string;
}

export const getNotifications = (limit = 50) =>
  apiFetch<NotificationItem[]>(`/notifications/?limit=${limit}`);

export const getUnreadCount = () =>
  apiFetch<{ count: number }>("/notifications/unread-count").then((r) => r.count);

export const markRead = (id: number) =>
  apiFetch(`/notifications/${id}/read`, { method: "PATCH" });

export const markAllNotificationsRead = () =>
  apiFetch("/notifications/read-all", { method: "POST" });
