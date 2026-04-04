import React, { useCallback, useMemo, useState } from "react";
import { View, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../layout/Screen";
import AppHeader from "../layout/AppHeader";
import GlassCard from "../components/GlassCard";
import AppText from "../ui/AppText";
import ListRow from "../ui/ListRow";
import AppButton from "../ui/AppButton";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import {
  getCompanyMembers,
  getDashboardActivity,
  getDashboardStats,
  getDeals,
  getProjects,
  type CompanyMemberRow,
  type DashboardActivityItem,
  type DashboardStats,
  type DealRow,
  type ProjectRow,
} from "../../api";

export default function ReportsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    body: { padding: 16, paddingBottom: 110, gap: 10 },
    card: { padding: 18 },
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 8,
      marginTop: 12,
    },
    stat: {
      width: "48%",
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: c.bgCard,
    },
    actions: { flexDirection: "row" as const, gap: 8, marginTop: 12 },
    listWrap: { gap: 10 },
    loadingWrap: { paddingVertical: 24, alignItems: "center" as const },
  }));

  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [members, setMembers] = useState<CompanyMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, a, p, d, m] = await Promise.all([
        getDashboardStats().catch(() => null),
        getDashboardActivity(12).catch(() => [] as DashboardActivityItem[]),
        getProjects().catch(() => [] as ProjectRow[]),
        getDeals().catch(() => [] as DealRow[]),
        getCompanyMembers().catch(() => [] as CompanyMemberRow[]),
      ]);
      setStats(s);
      setActivity(Array.isArray(a) ? a : []);
      setProjects(Array.isArray(p) ? p : []);
      setDeals(Array.isArray(d) ? d : []);
      setMembers(Array.isArray(m) ? m : []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to load reports";
      setError(msg);
      setStats(null);
      setActivity([]);
      setProjects([]);
      setDeals([]);
      setMembers([]);
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

  const reportRows = useMemo(() => {
    return activity.slice(0, 8).map((item, i) => ({
      key: `${item.type}-${i}`,
      title: item.title,
      subtitle: item.time ? `${item.type} · ${item.time}` : item.type,
    }));
  }, [activity]);

  function Stat({ title, value }: { title: string; value: string }) {
    return (
      <View style={styles.stat}>
        <AppText variant="micro" tone="muted" weight="bold">
          {title}
        </AppText>
        <AppText variant="bodySm" weight="bold" style={{ marginTop: 4 }}>
          {value}
        </AppText>
      </View>
    );
  }

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader
        title="Reports"
        rightActions={<AppButton label="Dashboard" size="sm" onPress={() => navigation.navigate("Dashboard")} />}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
      >
        <GlassCard style={styles.card}>
          <AppText variant="bodySm" tone="secondary">
            Reports combine KPIs, activity, projects, and pipeline in one operational snapshot.
          </AppText>
          <View style={styles.grid}>
            <Stat title="Knowledge health" value={loading ? "..." : `${stats?.knowledge_health_score ?? "—"}%`} />
            <Stat title="Pending tasks" value={loading ? "..." : String(stats?.pending_tasks ?? "—")} />
            <Stat title="Team size" value={loading ? "..." : String(members.length)} />
            <Stat title="Deals" value={loading ? "..." : String(deals.length)} />
            <Stat title="Projects" value={loading ? "..." : String(projects.length)} />
            <Stat title="Activity" value={loading ? "..." : String(activity.length)} />
          </View>
          <View style={styles.actions}>
            <AppButton label="CRM" tone="glass" size="sm" onPress={() => navigation.navigate("CRM")} />
            <AppButton label="Projects" tone="glass" size="sm" onPress={() => navigation.navigate("Projects")} />
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
          ) : reportRows.length === 0 ? (
            <GlassCard style={styles.card}>
              <AppText variant="caption" tone="muted">
                No report rows available yet.
              </AppText>
            </GlassCard>
          ) : (
            reportRows.map((r) => (
              <ListRow key={r.key} title={r.title} subtitle={r.subtitle} iconLeft="bar-chart-outline" onPress={() => navigation.navigate("Dashboard")} />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

