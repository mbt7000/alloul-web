import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import ListRow from "../../../shared/ui/ListRow";
import AppButton from "../../../shared/ui/AppButton";
import { getAgentHistory, getDashboardActivity, getNotifications, type AgentMessageRow, type DashboardActivityItem, type NotificationItem } from "../../../api";
import { colors } from "../../../theme/colors";

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [history, setHistory] = useState<AgentMessageRow[]>([]);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [n, h, a] = await Promise.all([
        getNotifications(20).catch(() => [] as NotificationItem[]),
        getAgentHistory("company").catch(() => [] as AgentMessageRow[]),
        getDashboardActivity(12).catch(() => [] as DashboardActivityItem[]),
      ]);
      setNotifications(Array.isArray(n) ? n : []);
      setHistory(Array.isArray(h) ? h : []);
      setActivity(Array.isArray(a) ? a : []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to load chat";
      setError(msg);
      setNotifications([]);
      setHistory([]);
      setActivity([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const unread = notifications.filter((n) => !n.read).length;
  const threads = useMemo(() => {
    if (history.length > 0) {
      return history.slice(0, 8).map((msg, i) => ({
        key: `${msg.id}-${i}`,
        title: msg.content.length > 60 ? `${msg.content.slice(0, 60)}...` : msg.content || `Message ${i + 1}`,
        subtitle: msg.created_at ? `${msg.role} · ${new Date(msg.created_at).toLocaleDateString()}` : msg.role,
        icon: msg.role === "assistant" ? "sparkles-outline" : "chatbubble-outline",
      }));
    }
    return activity.slice(0, 8).map((row, i) => ({
      key: `${row.type}-${i}`,
      title: row.title,
      subtitle: row.time ? `${row.type} · ${row.time}` : row.type,
      icon: "chatbubble-ellipses-outline",
    }));
  }, [activity, history]);

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader
        title="Chat"
        rightActions={<AppButton label="Inbox" size="sm" onPress={() => navigation.navigate("Notifications")} />}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={undefined} />}
      >
        <GlassCard style={styles.card}>
          <AppText variant="bodySm" tone="secondary">
            Private channels, team rooms, and direct messages connected to notifications and company activity.
          </AppText>
          <View style={styles.statsRow}>
            <MiniPill label="Unread" value={loading ? "..." : String(unread)} />
            <MiniPill label="Threads" value={loading ? "..." : String(threads.length)} />
            <MiniPill label="Activity" value={loading ? "..." : String(activity.length)} />
          </View>
          <View style={{ height: 12 }} />
          <View style={{ gap: 8 }}>
            <ListRow title="Company announcements" subtitle="General updates and leadership notes" iconLeft="megaphone-outline" onPress={() => navigation.navigate("CompanyFeed")} />
            <ListRow title="Project handover room" subtitle="Track progress between assignees" iconLeft="swap-horizontal-outline" onPress={() => navigation.navigate("Handover")} />
            <ListRow title="Direct messages" subtitle="One-to-one collaboration" iconLeft="chatbubble-ellipses-outline" onPress={() => navigation.navigate("Teams")} />
          </View>
        </GlassCard>

        <View style={styles.listWrap}>
          {loading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator />
            </View>
          ) : error ? (
            <GlassCard style={styles.card}>
              <AppText variant="caption" style={{ color: "#ff6f6f" }}>
                {error}
              </AppText>
              <View style={{ height: 10 }} />
              <AppButton label="Retry" onPress={() => { setLoading(true); void load(); }} />
            </GlassCard>
          ) : threads.length === 0 ? (
            <GlassCard style={styles.card}>
              <AppText variant="caption" tone="muted">
                No chat threads yet.
              </AppText>
            </GlassCard>
          ) : (
            threads.map((t) => (
              <ListRow
                key={t.key}
                title={t.title}
                subtitle={t.subtitle}
                iconLeft={t.icon as any}
                onPress={() => navigation.navigate("Notifications")}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function MiniPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <AppText variant="micro" tone="muted" weight="bold">
        {label}
      </AppText>
      <AppText variant="bodySm" weight="bold" style={{ marginTop: 2 }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 110, gap: 10 },
  card: { padding: 18 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.bgCard,
  },
  listWrap: { gap: 10 },
  loadingWrap: { paddingVertical: 24, alignItems: "center" },
});

