import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, Pressable, FlatList, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { colors } from "../../../theme/colors";
import Screen from "../../../shared/layout/Screen";
import SegmentedControl from "../../../shared/ui/SegmentedControl";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import AppInput from "../../../shared/ui/AppInput";
import { type NotificationItem } from "../../../api";
import { useNotifications } from "../../../state/notifications/NotificationsContext";
import InlineErrorRetry from "../../../shared/ui/InlineErrorRetry";

type InboxTab = "all" | "chats" | "notifications" | "approvals";
type FilterKey = "unread" | "mentions" | "priority" | "today";

type InboxRow =
  | {
      kind: "chat";
      id: string;
      title: string;
      preview: string;
      time: string;
      unread: boolean;
      badge?: string;
    }
  | {
      kind: "notification";
      id: string;
      title: string;
      preview: string;
      time: string;
      unread: boolean;
      badge?: string;
      raw: NotificationItem;
    }
  | {
      kind: "approval";
      id: string;
      title: string;
      preview: string;
      time: string;
      unread: boolean;
      badge?: string;
      priority?: "low" | "med" | "high";
    };

function timeShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function makeMockChats(): InboxRow[] {
  return [
    {
      kind: "chat",
      id: "c1",
      title: "Team Ops",
      preview: "Mohamed: Can you review the handover draft?",
      time: "Now",
      unread: true,
      badge: "TEAM",
    },
    {
      kind: "chat",
      id: "c2",
      title: "Direct · Sara",
      preview: "Mentioned you in a note @Mohamed",
      time: "12:40",
      unread: true,
      badge: "DM",
    },
    {
      kind: "chat",
      id: "c3",
      title: "Project Alpha",
      preview: "New file uploaded: sprint-plan.pdf",
      time: "Yesterday",
      unread: false,
      badge: "PROJECT",
    },
  ];
}

function makeMockApprovals(t: (k: string, o?: any) => string): InboxRow[] {
  return [
    {
      kind: "approval",
      id: "a1",
      title: t("approvals.humanCapital"),
      preview: "1 pending request · Needs your decision",
      time: "Today",
      unread: true,
      badge: "APPROVAL",
      priority: "high",
    },
    {
      kind: "approval",
      id: "a2",
      title: t("approvals.leavesPermissions"),
      preview: "2 pending · Leave & permission updates",
      time: "Today",
      unread: true,
      badge: "APPROVAL",
      priority: "med",
    },
    {
      kind: "approval",
      id: "a3",
      title: t("approvals.procurement"),
      preview: "No pending items",
      time: "Mar 21",
      unread: false,
      badge: "APPROVAL",
      priority: "low",
    },
  ];
}

export default function ApprovalsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
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
  const [tab, setTab] = useState<InboxTab>("all");
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    unread: false,
    mentions: false,
    priority: false,
    today: false,
  });
  const [q, setQ] = useState("");
  const segOptions = useMemo(
    () => [
      { value: "all" as const, label: "All" },
      { value: "chats" as const, label: "Chats" },
      { value: "notifications" as const, label: "Notifications" },
      { value: "approvals" as const, label: "Approvals" },
    ],
    []
  );

  const toggleFilter = (k: FilterKey) => setFilters((p) => ({ ...p, [k]: !p[k] }));

  useFocusEffect(
    useCallback(() => {
      void refresh({ mode: "focus" });
    }, [refresh])
  );

  const chats = useMemo(() => makeMockChats(), []);
  const approvals = useMemo(() => makeMockApprovals(t), [t]);

  const allRows: InboxRow[] = useMemo(() => {
    const notiRows: InboxRow[] = notifications.map((n) => ({
      kind: "notification",
      id: `n-${n.id}`,
      title: n.title || "Notification",
      preview: n.body || n.type,
      time: timeShort(n.created_at),
      unread: !n.read,
      badge: "NOTIF",
      raw: n,
    }));
    return [...chats, ...notiRows, ...approvals];
  }, [notifications, chats, approvals]);

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const wantsUnread = filters.unread;
    const wantsMentions = filters.mentions;
    const wantsPriority = filters.priority;
    const wantsToday = filters.today;

    const byTab = allRows.filter((r) => {
      if (tab === "all") return true;
      return r.kind === (tab === "chats" ? "chat" : tab === "notifications" ? "notification" : "approval");
    });

    const bySearch = s
      ? byTab.filter((r) => `${r.title} ${r.preview}`.toLowerCase().includes(s))
      : byTab;

    const byFilters = bySearch.filter((r) => {
      if (wantsUnread && !r.unread) return false;
      if (wantsMentions && !(`${r.title} ${r.preview}`.includes("@") || r.preview.toLowerCase().includes("mention")))
        return false;
      if (wantsPriority) {
        if (r.kind !== "approval") return false;
        if (r.priority !== "high") return false;
      }
      if (wantsToday) {
        // heuristic for now: strings that contain "Today" or time-format
        if (!r.time) return false;
        const ok = r.time.toLowerCase().includes("today") || r.time.includes(":");
        if (!ok) return false;
      }
      return true;
    });

    // Unread first
    return byFilters.slice().sort((a, b) => Number(b.unread) - Number(a.unread));
  }, [allRows, tab, q, filters]);

  const subtitle = useMemo(() => {
    const unreadCount = allRows.reduce((acc, r) => acc + (r.unread ? 1 : 0), 0);
    return unreadCount > 0 ? `${unreadCount} unread in this view` : "All caught up in this view";
  }, [allRows]);

  const listLoading = notifLoading && notifications.length === 0;

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <FlatList
        data={filteredRows}
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
          <View style={{ paddingTop: 10 }}>
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
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <AppText variant="h2" weight="bold">
                  Inbox
                </AppText>
                <AppText variant="micro" tone="muted" weight="bold" style={{ marginTop: 4 }}>
                  {subtitle}
                </AppText>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  style={[
                    styles.iconBtn,
                    styles.markReadBtn,
                    notifications.length > 0 && notifications.every((n) => n.read) && styles.iconBtnDisabled,
                  ]}
                  onPress={() => void markAllNotificationsReadAndSync()}
                  disabled={notifications.length > 0 && notifications.every((n) => n.read)}
                  android_ripple={{ color: "#ffffff22" }}
                >
                  <Ionicons name="checkmark-done-outline" size={20} color={colors.accentCyan} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => {}} android_ripple={{ color: "#ffffff22" }}>
                  <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => {}} android_ripple={{ color: "#ffffff22" }}>
                  <Ionicons name="funnel-outline" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.segWrap}>
              <SegmentedControl<InboxTab> value={tab} options={segOptions} onChange={setTab} />
            </View>

            <AppInput
              value={q}
              onChangeText={setQ}
              placeholder="Search inbox…"
              iconLeft="search-outline"
              style={styles.search}
            />

            <View style={styles.filtersRow}>
              <FilterChip label="Unread" active={filters.unread} onPress={() => toggleFilter("unread")} />
              <FilterChip label="Mentions" active={filters.mentions} onPress={() => toggleFilter("mentions")} />
              <FilterChip label="Priority" active={filters.priority} onPress={() => toggleFilter("priority")} />
              <FilterChip label="Today" active={filters.today} onPress={() => toggleFilter("today")} />
            </View>

            <View style={styles.sectionSpacer} />
          </View>
        }
        ListEmptyComponent={
          listLoading ? (
            <GlassCard style={styles.emptyCard}>
              <AppText variant="body" tone="secondary" style={{ textAlign: "center" }}>
                Loading inbox…
              </AppText>
            </GlassCard>
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Ionicons name="mail-outline" size={36} color={colors.textMuted} style={{ alignSelf: "center" }} />
              <AppText variant="body" tone="secondary" style={{ textAlign: "center", marginTop: 10 }}>
                Nothing here yet.
              </AppText>
              <AppText variant="caption" tone="muted" style={{ textAlign: "center", marginTop: 6 }}>
                Try switching tabs or clearing filters.
              </AppText>
            </GlassCard>
          )
        }
        renderItem={({ item }) => (
          <InboxItem
            row={item}
            onPress={() => {
              if (item.kind === "chat") navigation.navigate("Chat");
              else if (item.kind === "approval") navigation.navigate("ApprovalDetail");
              else {
                void markNotificationRead(item.raw.id);
                navigation.navigate("Notifications");
              }
            }}
          />
        )}
      />
    </Screen>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <AppText variant="micro" weight="bold" tone={active ? "primary" : "muted"}>
        {label}
      </AppText>
    </Pressable>
  );
}

function InboxItem({ row, onPress }: { row: InboxRow; onPress: () => void }) {
  const icon =
    row.kind === "chat"
      ? ("chatbubble-ellipses-outline" as const)
      : row.kind === "notification"
        ? ("notifications-outline" as const)
        : ("checkmark-circle-outline" as const);
  const tone = row.kind === "approval" ? colors.accentEmber : row.kind === "chat" ? colors.accentCyan : colors.accentBlue;

  const badgeBg =
    row.kind === "approval"
      ? "rgba(255,122,89,0.12)"
      : row.kind === "chat"
        ? "rgba(56,232,255,0.10)"
        : "rgba(76,111,255,0.12)";

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <View style={[styles.itemIcon, { backgroundColor: badgeBg, borderColor: `${tone}33` }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.itemTopRow}>
          <AppText variant="bodySm" weight="bold" style={[row.unread && { color: colors.textPrimary }]}>
            {row.title}
          </AppText>
          <AppText variant="micro" tone="muted" weight="bold">
            {row.time}
          </AppText>
        </View>
        <AppText variant="caption" tone={row.unread ? "secondary" : "muted"} numberOfLines={1} style={{ marginTop: 3 }}>
          {row.preview}
        </AppText>
        {row.badge ? (
          <View style={styles.typeRow}>
            <View style={styles.typePill}>
              <AppText variant="micro" weight="bold" style={{ color: tone }}>
                {row.badge}
              </AppText>
            </View>
            {row.unread ? <View style={styles.unreadDot} /> : null}
          </View>
        ) : row.unread ? (
          <View style={styles.typeRow}>
            <View style={styles.unreadDot} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 110 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  headerActions: { flexDirection: "row", gap: 8 },
  markReadBtn: {
    borderColor: "rgba(56,232,255,0.28)",
    backgroundColor: "rgba(56,232,255,0.08)",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDisabled: { opacity: 0.35 },
  segWrap: { paddingTop: 12, paddingBottom: 10 },
  search: {},
  filtersRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  chipActive: {
    backgroundColor: "rgba(56,232,255,0.10)",
    borderColor: "rgba(56,232,255,0.35)",
  },
  sectionSpacer: { height: 12 },

  item: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    marginBottom: 10,
  },
  itemPressed: { transform: [{ scale: 0.99 }], opacity: 0.92, backgroundColor: "rgba(255,255,255,0.08)" },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  itemTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  typeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  typePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentCyan,
  },
  emptyCard: { padding: 20, marginTop: 8 },
});
