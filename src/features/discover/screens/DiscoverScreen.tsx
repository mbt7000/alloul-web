import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  Pressable,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../../../shared/ui/AppText";
import UnifiedSearchField from "../../../shared/components/UnifiedSearchField";
import GlassCard from "../../../shared/components/GlassCard";
import InlineErrorRetry from "../../../shared/ui/InlineErrorRetry";
import { useAppTheme } from "../../../theme/ThemeContext";
import { unifiedSearch, type SearchResultItem } from "../../../api";
import { addRecentSearch, getRecentSearches } from "../../../storage/recentSearches";

const TAB_BAR_PAD = 108;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const paramQ = typeof route.params?.q === "string" ? route.params.q : "";

  const [query, setQuery] = useState(paramQ);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setQuery(typeof route.params?.q === "string" ? route.params.q : "");
  }, [route.params?.q]);

  useEffect(() => {
    void (async () => setRecent(await getRecentSearches()))();
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const list = await unifiedSearch(trimmed);
      setResults(Array.isArray(list) ? list : []);
      await addRecentSearch(trimmed);
      setRecent(await getRecentSearches());
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Error";
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length > 0) void runSearch(query);
      else {
        setResults([]);
        setError(null);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const emptyQuery = query.trim().length === 0;

  const { colors, toggleMode } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        head: { paddingHorizontal: 16, paddingBottom: 8 },
        headRow: { flexDirection: "row", alignItems: "center", gap: 10 },
        globeBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.accentBlue,
          alignItems: "center",
          justifyContent: "center",
        },
        roundGhost: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.bgCard,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
        },
        searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
        empty: { flex: 1, alignItems: "center", paddingTop: 32 },
        emptyIcon: { marginTop: 20 },
        center: { flex: 1, alignItems: "center", justifyContent: "center" },
        recentRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        card: { padding: 14 },
        resultTop: { flexDirection: "row", gap: 12 },
        avatar: { width: 48, height: 48, borderRadius: 14 },
        avatarPh: {
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: "rgba(56,232,255,0.12)",
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.mediaCanvas }]}>
      <View style={styles.head}>
        <AppText variant="caption" weight="bold" tone="muted" style={{ textAlign: "center", marginBottom: 8 }}>
          ALLOUL&Q
        </AppText>
        <View style={styles.headRow}>
          <Pressable style={styles.globeBtn} hitSlop={8}>
            <Ionicons name="globe" size={18} color={colors.white} />
          </Pressable>
          <AppText variant="micro" weight="bold" tone="secondary" style={{ flex: 1, textAlign: "center" }}>
            نقطة التواصل
          </AppText>
          <Pressable style={styles.roundGhost} hitSlop={8}>
            <Ionicons name="globe-outline" size={18} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.roundGhost} hitSlop={8} onPress={toggleMode}>
            <Ionicons name="sunny-outline" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <UnifiedSearchField
          value={query}
          onChangeText={setQuery}
          dense
          placeholder="البحث عن أشخاص، مواضيع، أو كلمات..."
          onSubmitSearch={() => void runSearch(query)}
        />
      </View>

      {error && !emptyQuery ? (
        <View style={{ paddingHorizontal: 16 }}>
          <InlineErrorRetry message={error} onRetry={() => void runSearch(query)} retryLabel="إعادة" />
        </View>
      ) : null}

      {emptyQuery ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} style={{ opacity: 0.35 }} />
          </View>
          <AppText variant="title" weight="bold" style={{ marginTop: 20, textAlign: "center" }}>
            ابدأ البحث
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 10, textAlign: "center", paddingHorizontal: 32 }}>
            ابحث عن أي شيء في عالم ALLOUL ONE
          </AppText>
          {recent.length > 0 ? (
            <View style={{ marginTop: 28, alignSelf: "stretch", paddingHorizontal: 16 }}>
              <AppText variant="micro" tone="muted" weight="bold" style={{ marginBottom: 8 }}>
                الأخيرة
              </AppText>
              {recent.slice(0, 6).map((r) => (
                <Pressable key={r} style={styles.recentRow} onPress={() => setQuery(r)}>
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                  <AppText variant="bodySm" style={{ flex: 1, textAlign: "right" }}>
                    {r}
                  </AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item.type}-${item.id}-${i}`}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_PAD, gap: 10 }}
          ListEmptyComponent={
            <AppText variant="caption" tone="muted" style={{ textAlign: "center", marginTop: 24 }}>
              لا نتائج
            </AppText>
          }
          renderItem={({ item }) => (
            <GlassCard style={styles.card}>
              <View style={styles.resultTop}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPh}>
                    <AppText variant="bodySm" weight="bold" style={{ color: colors.accentCyan }}>
                      {item.title.slice(0, 1).toUpperCase()}
                    </AppText>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <AppText variant="micro" weight="bold" tone="cyan" style={{ marginBottom: 4 }}>
                    {item.type}
                  </AppText>
                  <AppText variant="bodySm" weight="bold">
                    {item.title}
                  </AppText>
                  {item.description ? (
                    <AppText variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 4 }}>
                      {item.description}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </GlassCard>
          )}
        />
      )}
    </View>
  );
}
