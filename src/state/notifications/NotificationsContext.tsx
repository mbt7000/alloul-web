import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "../../api";
import { formatApiError } from "../../shared/utils/apiErrors";

type NotificationsContextValue = {
  notifications: NotificationItem[];
  displayUnreadCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdatedAt: number | null;
  refresh: (options?: { mode?: NotificationsRefreshMode }) => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;
  markAllNotificationsReadAndSync: () => Promise<void>;
  clearError: () => void;
};

export type NotificationsRefreshMode = "default" | "pull" | "focus";

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  const [unreadFromApi, setUnreadFromApi] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const listUnread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const displayUnreadCount = unreadFromApi !== null ? unreadFromApi : listUnread;

  const reset = useCallback(() => {
    setNotifications([]);
    setUnreadFromApi(null);
    setError(null);
    setLoading(false);
    setRefreshing(false);
    setLastUpdatedAt(null);
  }, []);

  useEffect(() => {
    if (!user) reset();
  }, [user, reset]);

  const refresh = useCallback(async (options?: { mode?: NotificationsRefreshMode }) => {
    if (!userRef.current) return;
    const mode = options?.mode ?? "default";
    setError(null);
    if (mode === "pull") setRefreshing(true);
    else if (mode === "focus" && notificationsRef.current.length > 0) setRefreshing(true);
    else setLoading(true);
    try {
      const [list, count] = await Promise.all([
        getNotifications(80),
        getUnreadCount().catch((): null => null),
      ]);
      const arr = Array.isArray(list) ? list : [];
      setNotifications(arr);
      setUnreadFromApi(typeof count === "number" ? count : null);
      setLastUpdatedAt(Date.now());
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void refresh({ mode: "default" });
  }, [user?.id, refresh]);

  const markNotificationRead = useCallback(async (id: number) => {
    try {
      await markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadFromApi((u) => (u !== null ? Math.max(0, u - 1) : null));
    } catch {
      // Keep optimistic UI; next refresh reconciles.
    }
  }, []);

  const markAllNotificationsReadAndSync = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadFromApi(0);
      setLastUpdatedAt(Date.now());
    } catch {
      // no-op
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      displayUnreadCount,
      loading,
      refreshing,
      error,
      lastUpdatedAt,
      refresh,
      markNotificationRead,
      markAllNotificationsReadAndSync,
      clearError,
    }),
    [
      notifications,
      displayUnreadCount,
      loading,
      refreshing,
      error,
      lastUpdatedAt,
      refresh,
      markNotificationRead,
      markAllNotificationsReadAndSync,
      clearError,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
