import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import GlassCard from "../../../shared/components/GlassCard";
import ListRow from "../../../shared/ui/ListRow";
import AppButton from "../../../shared/ui/AppButton";
import { colors } from "../../../theme/colors";
import { getDashboardStats, getHandoverWorkItems, getProjects, type DashboardStats, type HandoverWorkItem, type ProjectRow } from "../../../api";

export default function TasksScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [workItems, setWorkItems] = useState<HandoverWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, p, w] = await Promise.all([
        getDashboardStats().catch(() => null),
        getProjects().catch(() => [] as ProjectRow[]),
        getHandoverWorkItems().catch(() => [] as HandoverWorkItem[]),
      ]);
      setStats(s);
      setProjects(Array.isArray(p) ? p : []);
      setWorkItems(Array.isArray(w) ? w : []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to load tasks";
      setError(msg);
      setStats(null);
      setProjects([]);
      setWorkItems([]);
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

  const dueToday = useMemo(() => projects.slice(0, 3).map((p) => ({ id: `p-${p.id}`, title: `Review project · ${p.name}` })), [projects]);
  const inProgress = useMemo(
    () => workItems.filter((w) => w.status === "open" || w.status === "in_progress").slice(0, 5).map((w) => ({ id: w.id, title: w.title })),
    [workItems]
  );
  const blocked = useMemo(() => projects.slice(0, Math.max(stats?.critical_risks ?? 0, 0)).map((p) => ({ id: `r-${p.id}`, title: `Risk review · ${p.name}` })), [projects, stats?.critical_risks]);
  const overdue = useMemo(
    () => workItems.filter((w) => w.status === "submitted").slice(0, 4).map((w) => ({ id: `o-${w.id}`, title: `Follow-up · ${w.title}` })),
    [workItems]
  );

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader
        title="Tasks"
        rightActions={<AppButton label="Projects" size="sm" onPress={() => navigation.navigate("Projects")} />}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
      >
        <GlassCard style={styles.card}>
          <AppText variant="bodySm" tone="secondary">
            Execution board generated from projects and handover lifecycle.
          </AppText>
          <View style={styles.statRow}>
            <Mini title="Today" value={loading ? "..." : String(dueToday.length)} />
            <Mini title="In progress" value={loading ? "..." : String(inProgress.length)} />
            <Mini title="Blocked" value={loading ? "..." : String(blocked.length)} />
            <Mini title="Overdue" value={loading ? "..." : String(overdue.length)} />
          </View>
          <View style={styles.actions}>
            <AppButton label="Handover" tone="glass" size="sm" onPress={() => navigation.navigate("Handover")} />
            <AppButton label="Reports" tone="glass" size="sm" onPress={() => navigation.navigate("Reports")} />
          </View>
        </GlassCard>

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
        ) : (
          <View style={styles.columnsWrap}>
            <TaskColumn title="Due today" items={dueToday} onPress={() => navigation.navigate("Projects")} />
            <TaskColumn title="In progress" items={inProgress} onPress={() => navigation.navigate("Handover")} />
            <TaskColumn title="Blocked" items={blocked} onPress={() => navigation.navigate("Reports")} />
            <TaskColumn title="Overdue" items={overdue} onPress={() => navigation.navigate("Handover")} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function TaskColumn({ title, items, onPress }: { title: string; items: { id: string; title: string }[]; onPress: () => void }) {
  return (
    <GlassCard style={styles.column}>
      <View style={styles.columnHead}>
        <AppText variant="bodySm" weight="bold">
          {title}
        </AppText>
        <AppText variant="micro" tone="muted" weight="bold">
          {items.length}
        </AppText>
      </View>
      <View style={{ gap: 8 }}>
        {items.length === 0 ? (
          <AppText variant="caption" tone="muted">
            No items
          </AppText>
        ) : (
          items.map((item) => <ListRow key={item.id} title={item.title} iconLeft="checkbox-outline" onPress={onPress} />)
        )}
      </View>
    </GlassCard>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.mini}>
      <AppText variant="micro" tone="muted" weight="bold">
        {title}
      </AppText>
      <AppText variant="bodySm" weight="bold" style={{ marginTop: 3 }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 110, gap: 10 },
  card: { padding: 18 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  mini: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.bgCard,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  loadingWrap: { paddingVertical: 24, alignItems: "center" },
  columnsWrap: { gap: 10 },
  column: { padding: 12 },
  columnHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
});

