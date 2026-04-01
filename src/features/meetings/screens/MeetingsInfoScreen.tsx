import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { colors } from "../../../theme/colors";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import GlassCard from "../../../shared/components/GlassCard";
import ListRow from "../../../shared/ui/ListRow";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { getDashboardActivity, getHandoverWorkItems, getProjects, type DashboardActivityItem, type HandoverWorkItem, type ProjectRow } from "../../../api";

export default function MeetingsInfoScreen() {
  const navigation = useNavigation<any>();
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [handoverItems, setHandoverItems] = useState<HandoverWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, p, h] = await Promise.all([
        getDashboardActivity(12).catch(() => [] as DashboardActivityItem[]),
        getProjects().catch(() => [] as ProjectRow[]),
        getHandoverWorkItems().catch(() => [] as HandoverWorkItem[]),
      ]);
      setActivity(Array.isArray(a) ? a : []);
      setProjects(Array.isArray(p) ? p : []);
      setHandoverItems(Array.isArray(h) ? h : []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to load meetings";
      setError(msg);
      setActivity([]);
      setProjects([]);
      setHandoverItems([]);
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

  const agendaRows = useMemo(() => {
    if (activity.length > 0) {
      return activity.slice(0, 6).map((item, idx) => ({
        key: `${item.type}-${idx}`,
        title: item.title || `Meeting item ${idx + 1}`,
        subtitle: item.time ? `${item.type} · ${item.time}` : item.type,
        icon: "videocam-outline" as const,
      }));
    }
    return handoverItems.slice(0, 6).map((item) => ({
      key: item.id,
      title: item.title,
      subtitle: `${item.owner_name} -> ${item.current_assignee_name}`,
      icon: "swap-horizontal-outline" as const,
    }));
  }, [activity, handoverItems]);

  const todayCount = Math.min(agendaRows.length, 4);
  const weekCount = Math.min(agendaRows.length + projects.length, 12);

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader
        title="Meetings"
        rightActions={<AppButton label="Projects" size="sm" onPress={() => navigation.navigate("Projects")} />}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
      >
        <GlassCard style={styles.card}>
          <AppText variant="bodySm" tone="secondary">
            Keep weekly meetings tied to projects, handovers, and current activity.
          </AppText>
          <View style={styles.summaryRow}>
            <MiniStat label="Today" value={loading ? "..." : String(todayCount)} />
            <MiniStat label="This week" value={loading ? "..." : String(weekCount)} />
            <MiniStat label="Projects" value={loading ? "..." : String(projects.length)} />
          </View>
          <View style={styles.actionsRow}>
            <AppButton label="Handover" tone="glass" size="sm" onPress={() => navigation.navigate("Handover")} />
            <AppButton label="Teams" tone="glass" size="sm" onPress={() => navigation.navigate("Teams")} />
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
          ) : agendaRows.length === 0 ? (
            <GlassCard style={styles.card}>
              <AppText variant="caption" tone="muted">
                No meeting items yet. Activity from dashboard will show here once available.
              </AppText>
            </GlassCard>
          ) : (
            agendaRows.map((row) => (
              <ListRow
                key={row.key}
                title={row.title}
                subtitle={row.subtitle}
                iconLeft={row.icon}
                onPress={() => navigation.navigate("Projects")}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <AppText variant="micro" tone="muted" weight="bold">
        {label}
      </AppText>
      <AppText variant="bodySm" weight="bold" style={{ marginTop: 4 }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 110, gap: 12 },
  card: { padding: 16 },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  miniStat: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.bgCard,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  listWrap: { gap: 10 },
  loadingWrap: { paddingVertical: 24, alignItems: "center" },
});
