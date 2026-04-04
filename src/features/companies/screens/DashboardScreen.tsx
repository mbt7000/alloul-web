import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import SectionHeader from "../../../shared/components/SectionHeader";
import StatCard from "../../../shared/components/cards/StatCard";
import ActionCard from "../../../shared/components/cards/ActionCard";
import AIInsightCard from "../../../shared/components/cards/AIInsightCard";
import GlassCard from "../../../shared/components/GlassCard";
import {
  getDashboardStats,
  getDashboardActivity,
  getProjects,
  type DashboardStats,
  type DashboardActivityItem,
  type ProjectRow,
} from "../../../api";

function num(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return String(n);
}

function riskLabel(risks: number | undefined): string {
  if (risks == null) return "—";
  if (risks <= 0) return "None";
  if (risks <= 2) return "Low";
  if (risks <= 5) return "Medium";
  return "High";
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    eyebrow: { color: c.textMuted, fontSize: 12, fontWeight: "600", letterSpacing: 1 },
    title: { color: c.textPrimary, fontSize: 20, fontWeight: "800" },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderWidth: 1,
      borderColor: c.border,
    },
    scroll: { padding: 16, paddingBottom: 80, gap: 18 },
    section: { gap: 12 },
    row: { flexDirection: "row" as const, gap: 12 },
    projectCard: { padding: 14, gap: 6 },
    projectHeader: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
    projectTitle: { color: c.textPrimary, fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
    projectTag: { color: c.accentTeal, fontSize: 11, fontWeight: "700" },
    projectMeta: { color: c.textMuted, fontSize: 12 },
    projectFooter: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
    projectMetric: { color: c.textSecondary, fontSize: 12 },
    activityRow: { padding: 12, gap: 4 },
    activityTitle: { color: c.textPrimary, fontSize: 14, fontWeight: "600" },
    activityMeta: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
    activityType: { color: c.textMuted, fontSize: 11, textTransform: "uppercase" as const },
    activityTime: { color: c.accentCyan, fontSize: 11 },
    muted: { color: c.textMuted, fontSize: 13, lineHeight: 20 },
    centered: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, padding: 24, gap: 16 },
    errText: { color: c.danger, textAlign: "center" as const, fontSize: 14 },
    retryBtn: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
    },
    retryBtnText: { color: c.accentBlue, fontWeight: "700" },
  }));
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, a, p] = await Promise.all([
        getDashboardStats(),
        getDashboardActivity(12),
        getProjects(),
      ]);
      setStats(s);
      setActivity(Array.isArray(a) ? a : []);
      setProjects(Array.isArray(p) ? p : []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Load failed";
      setError(msg);
      setStats(null);
      setActivity([]);
      setProjects([]);
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

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const brief =
    stats == null
      ? "Connect to the workspace API to see your executive summary here."
      : `Snapshot: ${num(stats.pending_tasks)} pending tasks, ${num(stats.total_handovers)} handovers, ${num(
          stats.team_size
        )} team size. Knowledge health ~${num(stats.knowledge_health_score)}%.`;

  const topProjects = projects.slice(0, 4);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Company Mode</Text>
          <Text style={styles.title}>Operations Dashboard</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="pulse" size={18} color={colors.accentCyan} />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accentCyan} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentCyan} />}
        >
          <View style={styles.section}>
            <SectionHeader title="Operational Pulse" actionLabel="Live data" />
            <View style={styles.row}>
              <StatCard label="Pending tasks" value={num(stats?.pending_tasks)} icon="checkmark-done" tone="ember" />
              <StatCard label="Team size" value={num(stats?.team_size)} icon="people" tone="cyan" />
            </View>
            <View style={styles.row}>
              <StatCard label="Handovers" value={num(stats?.total_handovers)} icon="swap-horizontal" tone="lime" />
              <StatCard label="Memory items" value={num(stats?.total_memory_items)} icon="library" tone="cobalt" />
            </View>
            <View style={styles.row}>
              <StatCard label="Critical risks" value={riskLabel(stats?.critical_risks)} icon="warning" tone="rose" />
              <StatCard
                label="Knowledge health"
                value={`${num(stats?.knowledge_health_score)}%`}
                icon="school"
                tone="cobalt"
              />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Quick Actions" actionLabel="Workspace" />
            <View style={styles.row}>
              <ActionCard title="Projects" subtitle="Open task boards" icon="folder-open" tone="cobalt" />
              <ActionCard title="Handover" subtitle="Transfers" icon="swap-horizontal" tone="lime" />
            </View>
            <View style={styles.row}>
              <ActionCard title="Memory" subtitle="Knowledge base" icon="book" tone="cyan" />
              <ActionCard title="Deals" subtitle="Pipeline" icon="trending-up" tone="ember" />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Your projects" actionLabel={`${projects.length} total`} />
            {topProjects.length === 0 ? (
              <Text style={styles.muted}>No projects yet — create one from the API or web app.</Text>
            ) : (
              topProjects.map((pr) => (
                <GlassCard key={pr.id} style={styles.projectCard}>
                  <View style={styles.projectHeader}>
                    <Text style={styles.projectTitle}>{pr.name}</Text>
                    <Text style={styles.projectTag}>{pr.status}</Text>
                  </View>
                  {pr.description ? <Text style={styles.projectMeta} numberOfLines={2}>{pr.description}</Text> : null}
                  <View style={styles.projectFooter}>
                    <Text style={styles.projectMetric}>
                      Tasks {pr.completed_count ?? 0}/{pr.tasks_count ?? 0}
                    </Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.accentCyan} />
                  </View>
                </GlassCard>
              ))
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Recent activity" actionLabel="API" />
            {activity.length === 0 ? (
              <Text style={styles.muted}>No recent activity rows from the server.</Text>
            ) : (
              activity.map((item, i) => (
                <GlassCard key={`${item.type}-${i}`} style={styles.activityRow}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityType}>{item.type}</Text>
                    {item.time ? <Text style={styles.activityTime}>{item.time}</Text> : null}
                  </View>
                </GlassCard>
              ))
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader title="Workspace brief" actionLabel="From stats" />
            <AIInsightCard summary={brief} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
