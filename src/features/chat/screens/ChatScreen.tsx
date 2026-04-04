import React, { useCallback, useMemo, useState } from "react";
import { View, ScrollView, RefreshControl, ActivityIndicator, type ViewStyle } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import ListRow from "../../../shared/ui/ListRow";
import AppButton from "../../../shared/ui/AppButton";
import { getAgentHistory, getDashboardActivity, getNotifications, type AgentMessageRow, type DashboardActivityItem, type NotificationItem } from "../../../api";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import CompanyWorkModeTopBar from "../../companies/components/CompanyWorkModeTopBar";
import { useCompanyDailyRoom } from "../../../lib/useCompanyDailyRoom";

export default function ChatScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { openCompanyDaily, dailyLoading } = useCompanyDailyRoom();
  const styles = useThemedStyles((c) => ({
    body: { padding: 16, paddingBottom: 110, gap: 10 },
    card: { padding: 18 },
    statsRow: { flexDirection: "row" as const, gap: 8, marginTop: 12 },
    pill: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: c.bgCard,
    },
    listWrap: { gap: 10 },
    loadingWrap: { paddingVertical: 24, alignItems: "center" as const },
  }));
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
    <Screen style={{ backgroundColor: colors.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title="المحادثات"
        leftButton="none"
        rightActions={<AppButton label="التنبيهات" size="sm" onPress={() => navigation.navigate("Notifications")} />}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
      >
        <GlassCard style={styles.card}>
          <AppText variant="bodySm" tone="secondary">
            Private channels, team rooms, and direct messages connected to notifications and company activity.
          </AppText>
          <View style={styles.statsRow}>
            <MiniPill label="Unread" value={loading ? "..." : String(unread)} pillStyle={styles.pill} />
            <MiniPill label="Threads" value={loading ? "..." : String(threads.length)} pillStyle={styles.pill} />
            <MiniPill label="Activity" value={loading ? "..." : String(activity.length)} pillStyle={styles.pill} />
          </View>
          <View style={{ height: 12 }} />
          <View style={{ gap: 8 }}>
            <ListRow
              title="غرفة Daily — فيديو وشات"
              subtitle={dailyLoading ? "جاري التحميل…" : "اجتماع الفريق عبر Daily (توكن من الخادم)"}
              iconLeft="videocam-outline"
              onPress={() => {
                if (!dailyLoading) void openCompanyDaily();
              }}
            />
            <ListRow title="Company announcements" subtitle="General updates and leadership notes" iconLeft="megaphone-outline" onPress={() => navigation.navigate("CompanyFeed")} />
            <ListRow title="Project handover room" subtitle="Track progress between assignees" iconLeft="swap-horizontal-outline" onPress={() => navigation.navigate("Handover")} />
            <ListRow title="Direct messages" subtitle="One-to-one collaboration" iconLeft="chatbubble-ellipses-outline" onPress={() => navigation.navigate("Teams")} />
          </View>
        </GlassCard>

        <View style={styles.listWrap}>
          {loading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accentCyan} />
            </View>
          ) : error ? (
            <GlassCard style={styles.card}>
              <AppText variant="caption" style={{ color: colors.danger }}>
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

function MiniPill({ label, value, pillStyle }: { label: string; value: string; pillStyle: ViewStyle }) {
  return (
    <View style={pillStyle}>
      <AppText variant="micro" tone="muted" weight="bold">
        {label}
      </AppText>
      <AppText variant="bodySm" weight="bold" style={{ marginTop: 2 }}>
        {value}
      </AppText>
    </View>
  );
}
