import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../layout/Screen";
import AppHeader from "../layout/AppHeader";
import GlassCard from "../components/GlassCard";
import AppText from "../ui/AppText";
import ListRow from "../ui/ListRow";
import AppInput from "../ui/AppInput";
import AppButton from "../ui/AppButton";
import { getDashboardActivity, getHandovers, getHandoverWorkItems, unifiedSearch, type DashboardActivityItem, type HandoverRow, type HandoverWorkItem, type SearchResultItem } from "../../api";
import { colors } from "../../theme/colors";

export default function KnowledgeBaseScreen() {
  const navigation = useNavigation<any>();
  const [handovers, setHandovers] = useState<HandoverRow[]>([]);
  const [workItems, setWorkItems] = useState<HandoverWorkItem[]>([]);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [h, w, a] = await Promise.all([
        getHandovers().catch(() => [] as HandoverRow[]),
        getHandoverWorkItems().catch(() => [] as HandoverWorkItem[]),
        getDashboardActivity(10).catch(() => [] as DashboardActivityItem[]),
      ]);
      setHandovers(Array.isArray(h) ? h : []);
      setWorkItems(Array.isArray(w) ? w : []);
      setActivity(Array.isArray(a) ? a : []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to load knowledge";
      setError(msg);
      setHandovers([]);
      setWorkItems([]);
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

  const docs = useMemo(() => {
    if (query.trim() && searchResults.length > 0) {
      return searchResults.map((r, i) => ({
        key: `${r.type}-${r.id}-${i}`,
        title: r.title,
        subtitle: r.description || r.type,
        icon: "search-outline" as const,
      }));
    }
    const handoverDocs = handovers.slice(0, 5).map((h) => ({
      key: `handover-${h.id}`,
      title: h.title,
      subtitle: `${h.status} · ${h.department || "General"}`,
      icon: "document-text-outline" as const,
    }));
    const activityDocs = activity.slice(0, 5).map((a, i) => ({
      key: `activity-${i}`,
      title: a.title,
      subtitle: a.time ? `${a.type} · ${a.time}` : a.type,
      icon: "pulse-outline" as const,
    }));
    return [...handoverDocs, ...activityDocs].slice(0, 8);
  }, [activity, handovers, query, searchResults]);

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader
        title="Knowledge"
        rightActions={<AppButton label="Search" size="sm" onPress={() => navigation.navigate("InternalSearch")} />}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#38E8FF" />}
      >
        <GlassCard style={styles.card}>
          <AppText variant="bodySm" tone="secondary">
            Knowledge base synced with handovers and workspace activity.
          </AppText>
          <View style={styles.statsRow}>
            <MiniStat label="Articles" value={loading ? "..." : String(handovers.length)} />
            <MiniStat label="Work items" value={loading ? "..." : String(workItems.length)} />
            <MiniStat label="Updates" value={loading ? "..." : String(activity.length)} />
          </View>
          <View style={{ height: 12 }} />
          <AppInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search in knowledge and handovers"
            iconLeft="search-outline"
            onSubmitEditing={() => {
              const q = query.trim();
              if (!q) {
                setSearchResults([]);
                return;
              }
              void (async () => {
                const list = await unifiedSearch(q).catch(() => [] as SearchResultItem[]);
                setSearchResults(Array.isArray(list) ? list : []);
              })();
            }}
          />
        </GlassCard>

        <View style={styles.listWrap}>
          {loading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#38E8FF" />
            </View>
          ) : error ? (
            <GlassCard style={styles.card}>
              <AppText variant="caption" style={{ color: "#ff6f6f" }}>
                {error}
              </AppText>
              <View style={{ height: 10 }} />
              <AppButton label="Retry" onPress={() => { setLoading(true); void load(); }} />
            </GlassCard>
          ) : docs.length === 0 ? (
            <GlassCard style={styles.card}>
              <AppText variant="caption" tone="muted">
                No knowledge entries available yet.
              </AppText>
            </GlassCard>
          ) : (
            docs.map((doc) => (
              <ListRow
                key={doc.key}
                title={doc.title}
                subtitle={doc.subtitle}
                iconLeft={doc.icon}
                onPress={() => navigation.navigate("Handover")}
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
  miniStat: {
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

