import React, { useCallback, useMemo, useState } from "react";
import { View, Pressable, FlatList, RefreshControl, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import Screen from "../../../shared/layout/Screen";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import AppInput from "../../../shared/ui/AppInput";
import { type NotificationItem } from "../../../api";
import { useNotifications } from "../../../state/notifications/NotificationsContext";
import InlineErrorRetry from "../../../shared/ui/InlineErrorRetry";
import PendingApprovalCard from "../components/PendingApprovalCard";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";
import { radius } from "../../../theme/radius";

type MainTab = "approvals" | "inbox";

type PendingRow = {
  id: string;
  title: string;
  department: string;
  timeLabel: string;
};

function timeShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

function makePendingMock(): PendingRow[] {
  return [
    { id: "p1", title: "طلب شراء معدات تقنية", department: "قسم التقنية", timeLabel: "منذ 2 س" },
    { id: "p2", title: "طلب إجازة سنوية", department: "الموارد البشرية", timeLabel: "منذ 5 س" },
    { id: "p3", title: "اعتماد ميزانية فرعيّة", department: "المالية", timeLabel: "منذ يوم" },
    { id: "p4", title: "تعيين مستشار خارجي", department: "الإدارة العليا", timeLabel: "منذ يومين" },
  ];
}

type InboxRow = {
  kind: "chat" | "notification";
  id: string;
  title: string;
  preview: string;
  time: string;
  unread: boolean;
  raw?: NotificationItem;
};

type ApprovalsListItem = PendingRow | InboxRow;

function makeMockChats(): InboxRow[] {
  return [
    {
      kind: "chat",
      id: "c1",
      title: "فريق العمليات",
      preview: "مراجعة مسودة التسليم قبل نهاية اليوم",
      time: "الآن",
      unread: true,
    },
    {
      kind: "chat",
      id: "c2",
      title: "رسالة مباشرة · سارة",
      preview: "أشارت إليك في ملاحظة",
      time: "12:40",
      unread: true,
    },
  ];
}

export default function ApprovalsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    list: { paddingHorizontal: 16, paddingBottom: 110 },
    topRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 12,
      gap: 12,
    },
    titleBlock: { flex: 1 },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: c.cardElevated,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabs: { flexDirection: "row" as const, gap: 8, marginBottom: 14 },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: "rgba(255,255,255,0.04)",
    },
    tabActive: {
      backgroundColor: c.white,
      borderColor: c.white,
    },
    search: { marginBottom: 8 },
    inboxRow: {
      flexDirection: "row" as const,
      gap: 12,
      padding: 14,
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      marginBottom: 10,
    },
    inboxIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "rgba(56,232,255,0.10)",
      borderWidth: 1,
      borderColor: "rgba(56,232,255,0.22)",
    },
    emptyCard: { padding: 24, marginTop: 8, borderRadius: radius.xxl },
  }));

  const {
    notifications,
    refresh,
    refreshing,
    loading: notifLoading,
    error: notifError,
    markNotificationRead,
    markAllNotificationsReadAndSync,
    clearError,
  } = useNotifications();

  const [tab, setTab] = useState<MainTab>("approvals");
  const [q, setQ] = useState("");
  const pending = useMemo(() => makePendingMock(), []);

  useFocusEffect(
    useCallback(() => {
      void refresh({ mode: "focus" });
    }, [refresh])
  );

  const chats = useMemo(() => makeMockChats(), []);

  const inboxRows: InboxRow[] = useMemo(() => {
    const notiRows: InboxRow[] = notifications.map((n) => ({
      kind: "notification",
      id: `n-${n.id}`,
      title: n.title || "تنبيه",
      preview: n.body || n.type,
      time: timeShort(n.created_at),
      unread: !n.read,
      raw: n,
    }));
    return [...chats, ...notiRows];
  }, [notifications, chats]);

  const filteredPending = useMemo(() => {
    const s = q.trim();
    if (!s) return pending;
    return pending.filter((p) => `${p.title} ${p.department}`.includes(s));
  }, [pending, q]);

  const filteredInbox = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return inboxRows;
    return inboxRows.filter((r) => `${r.title} ${r.preview}`.toLowerCase().includes(s));
  }, [inboxRows, q]);

  const listLoading = notifLoading && notifications.length === 0 && tab === "inbox";

  const onApprove = useCallback(
    (row: PendingRow) => {
      navigation.navigate("ApprovalDetail", { id: row.id, title: row.title });
    },
    [navigation]
  );

  const onReject = useCallback((row: PendingRow) => {
    Alert.alert("رفض الطلب", `هل تريد رفض «${row.title}»؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "رفض", style: "destructive", onPress: () => Alert.alert("تم", "سجّلنا الرفض (واجهة تجريبية).") },
    ]);
  }, []);

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />
      <FlatList<ApprovalsListItem>
        style={{ flex: 1 }}
        data={tab === "approvals" ? filteredPending : filteredInbox}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh({ mode: "pull" })}
            tintColor={colors.accentCyan}
          />
        }
        ListHeaderComponent={
          <View style={{ paddingTop: 8 }}>
            {notifError ? (
              <View style={{ marginBottom: 12 }}>
                <InlineErrorRetry
                  message={notifError}
                  onRetry={() => {
                    clearError();
                    void refresh({ mode: "pull" });
                  }}
                />
              </View>
            ) : null}

            <View style={styles.topRow}>
              <View style={styles.titleBlock}>
                <AppText variant="h2" weight="bold">
                  {tab === "approvals" ? "الموافقات المعلقة" : "الوارد"}
                </AppText>
                {tab === "approvals" ? (
                  <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                    راجع الطلبات واتخذ قراراً بسرعة
                  </AppText>
                ) : (
                  <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                    محادثات وتنبيهات في مكان واحد
                  </AppText>
                )}
              </View>
              {tab === "approvals" ? (
                <View style={styles.badge}>
                  <AppText variant="micro" weight="bold" tone="secondary">
                    {filteredPending.length} طلبات
                  </AppText>
                </View>
              ) : (
                <Pressable
                  style={[styles.badge, { flexDirection: "row", alignItems: "center", gap: 6 }]}
                  onPress={() => void markAllNotificationsReadAndSync()}
                >
                  <Ionicons name="checkmark-done-outline" size={16} color={colors.accentCyan} />
                  <AppText variant="micro" weight="bold" tone="cyan">
                    تعليم الكل
                  </AppText>
                </Pressable>
              )}
            </View>

            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, tab === "approvals" && styles.tabActive]}
                onPress={() => setTab("approvals")}
              >
                <AppText variant="micro" weight="bold" style={{ color: tab === "approvals" ? colors.black : colors.textSecondary }}>
                  الموافقات
                </AppText>
              </Pressable>
              <Pressable style={[styles.tab, tab === "inbox" && styles.tabActive]} onPress={() => setTab("inbox")}>
                <AppText variant="micro" weight="bold" style={{ color: tab === "inbox" ? colors.black : colors.textSecondary }}>
                  الوارد
                </AppText>
              </Pressable>
            </View>

            <AppInput
              value={q}
              onChangeText={setQ}
              placeholder={tab === "approvals" ? "ابحث في الطلبات…" : "ابحث في الوارد…"}
              iconLeft="search-outline"
              style={styles.search}
            />
          </View>
        }
        ListEmptyComponent={
          listLoading ? (
            <GlassCard style={styles.emptyCard}>
              <AppText variant="body" tone="secondary" style={{ textAlign: "center" }}>
                جارٍ التحميل…
              </AppText>
            </GlassCard>
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Ionicons name="folder-open-outline" size={36} color={colors.textMuted} style={{ alignSelf: "center" }} />
              <AppText variant="body" tone="secondary" style={{ textAlign: "center", marginTop: 10 }}>
                لا يوجد شيء هنا
              </AppText>
              <AppText variant="caption" tone="muted" style={{ textAlign: "center", marginTop: 6 }}>
                جرّب تغيير البحث أو التبويب
              </AppText>
            </GlassCard>
          )
        }
        renderItem={({ item }) => {
          if (tab === "approvals") {
            const row = item as PendingRow;
            return (
              <PendingApprovalCard
                title={row.title}
                department={row.department}
                timeLabel={row.timeLabel}
                onApprove={() => onApprove(row)}
                onReject={() => onReject(row)}
                onPressCard={() => navigation.navigate("ApprovalDetail", { id: row.id, title: row.title })}
              />
            );
          }
          const r = item as InboxRow;
          return (
            <Pressable
              style={({ pressed }) => [styles.inboxRow, pressed && { opacity: 0.92 }]}
              onPress={() => {
                if (r.kind === "chat") navigation.navigate("Chat");
                else if (r.raw) {
                  void markNotificationRead(r.raw.id);
                  navigation.navigate("Notifications");
                }
              }}
            >
              <View style={styles.inboxIcon}>
                <Ionicons name={r.kind === "chat" ? "chatbubble-ellipses-outline" : "notifications-outline"} size={18} color={colors.accentCyan} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <AppText variant="bodySm" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                    {r.title}
                  </AppText>
                  <AppText variant="micro" tone="muted" weight="bold">
                    {r.time}
                  </AppText>
                </View>
                <AppText variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 4 }}>
                  {r.preview}
                </AppText>
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
