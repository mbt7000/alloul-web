import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../../state/auth/AuthContext";
import { getPosts, likePost, unlikePost, type ApiPost } from "../../../api";
import { formatApiError } from "../../../shared/utils/apiErrors";
import InlineErrorRetry from "../../../shared/ui/InlineErrorRetry";
import { colors } from "../../../theme/colors";
import GlassCard from "../../../shared/components/GlassCard";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import UnifiedSearchField from "../../../shared/components/UnifiedSearchField";
import { addRecentSearch } from "../../../storage/recentSearches";
import MediaPostRow from "../components/MediaPostRow";

type MediaFeedTab = "forYou" | "trending" | "video";

const MEDIA_TABS: Array<{ key: MediaFeedTab; label: string; subtitle: string }> = [
  { key: "forYou", label: "لك", subtitle: "أحدث ما يحدث الآن" },
  { key: "trending", label: "الترند", subtitle: "الأكثر تفاعلاً في شبكتك" },
  { key: "video", label: "الفيديو", subtitle: "المنشورات المرئية أولاً" },
];

function FeedTabChip({
  label,
  subtitle,
  active,
  onPress,
}: {
  label: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tabChip, active && styles.tabChipActive]}>
      <AppText variant="bodySm" weight="bold" tone={active ? "primary" : "secondary"}>
        {label}
      </AppText>
      <AppText variant="micro" tone={active ? "cyan" : "muted"} numberOfLines={1}>
        {subtitle}
      </AppText>
    </Pressable>
  );
}

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<MediaFeedTab>("forYou");
  const [searchDraft, setSearchDraft] = useState("");
  const [feedError, setFeedError] = useState<string | null>(null);

  const fetchPosts = useCallback(
    async () => {
      setFeedError(null);
      try {
        const p = await getPosts(30, 0);
        setPosts(Array.isArray(p) ? p : []);
      } catch (e) {
        setFeedError(formatApiError(e));
        setPosts([]);
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    setFeedError(null);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId: number) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 } : p
    ));
    try {
      if (post.liked_by_me) await unlikePost(postId);
      else await likePost(postId);
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, liked_by_me: post.liked_by_me, likes_count: post.likes_count } : p
      ));
    }
  };

  const visiblePosts = useMemo(() => {
    if (tab === "video") {
      return posts.filter((post) => Boolean(post.image_url));
    }
    if (tab === "trending") {
      return [...posts].sort(
        (a, b) =>
          b.likes_count +
          b.comments_count * 2 +
          (b.reposts_count || 0) * 3 -
          (a.likes_count + a.comments_count * 2 + (a.reposts_count || 0) * 3)
      );
    }
    return posts;
  }, [posts, tab]);

  const tabMeta = useMemo(() => MEDIA_TABS.find((item) => item.key === tab) ?? MEDIA_TABS[0], [tab]);

  const emptyStateCopy =
    tab === "video"
      ? "أضف منشوراً بصرياً ليظهر هنا."
      : tab === "trending"
        ? "لا توجد منشورات متداولة بعد."
        : "ابدأ النبض الإعلامي بأول منشور.";

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MediaPostRow post={item} onLike={handleLike} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentCyan} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.topbar}>
              <View style={styles.titleBlock}>
                <View style={styles.kickerRow}>
                  <View style={styles.liveDot} />
                  <AppText variant="micro" weight="bold" tone="cyan">
                    ميديا الآن
                  </AppText>
                </View>
                <AppText variant="h1" weight="bold">
                  موجز اجتماعي سريع
                </AppText>
                <AppText variant="bodySm" tone="secondary" style={styles.topbarSubtitle}>
                  {tabMeta.subtitle}
                </AppText>
              </View>
              <View style={styles.topbarActions}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => {
                    const q = searchDraft.trim();
                    navigation.navigate("Search", {
                      ...(q ? { q } : {}),
                      source: "feed",
                    });
                  }}
                >
                  <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
                </Pressable>
                <Pressable style={[styles.iconBtn, styles.iconBtnPrimary]} onPress={() => navigation.navigate("CreatePost")}>
                  <Ionicons name="add" size={20} color={colors.white} />
                </Pressable>
              </View>
            </View>

            <GlassCard strength="strong" style={styles.composer}>
              <View style={styles.composerRow}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.headerAvatar} />
                ) : (
                  <View style={styles.headerAvatarFallback}>
                    <AppText variant="micro" weight="bold" style={{ color: colors.white }}>
                      {(user?.name || "U").slice(0, 2).toUpperCase()}
                    </AppText>
                  </View>
                )}
                <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate("CreatePost")}>
                  <AppText variant="bodySm" tone="muted">
                    شارك رأياً أو صورة أو لحظة جديدة...
                  </AppText>
                </Pressable>
                <View style={styles.composerBadge}>
                  <Ionicons name="sparkles-outline" size={14} color={colors.accentCyan} />
                  <AppText variant="micro" tone="cyan" weight="bold">
                    عام
                  </AppText>
                </View>
              </View>
            </GlassCard>

            <View style={styles.searchWrap}>
              <UnifiedSearchField
                value={searchDraft}
                onChangeText={setSearchDraft}
                dense
                onSubmitSearch={() => {
                  const q = searchDraft.trim();
                  void (async () => {
                    if (q) await addRecentSearch(q);
                    navigation.navigate("Search", {
                      ...(q ? { q } : {}),
                      source: "feed",
                    });
                  })();
                }}
              />
            </View>

            <View style={styles.tabsRow}>
              {MEDIA_TABS.map((item) => (
                <FeedTabChip
                  key={item.key}
                  label={item.label}
                  subtitle={item.subtitle}
                  active={tab === item.key}
                  onPress={() => {
                    setTab(item.key);
                  }}
                />
              ))}
            </View>

            <View style={styles.feedMetaRow}>
              <AppText variant="micro" tone="muted" weight="bold">
                {visiblePosts.length} منشور
              </AppText>
              <AppText variant="micro" tone="muted">
                {tab === "trending" ? "مرتبة حسب التفاعل" : tab === "video" ? "منشورات بصريّة" : "تدفّق سريع ومتجدد"}
              </AppText>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accentCyan} />
            </View>
          ) : feedError ? (
            <InlineErrorRetry message={feedError} onRetry={() => void fetchPosts()} />
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Ionicons name="newspaper-outline" size={44} color={colors.textMuted} style={{ alignSelf: "center" }} />
              <AppText variant="body" tone="secondary" style={{ textAlign: "center", marginTop: 12 }}>
                لا يوجد محتوى بعد.
              </AppText>
              <AppText variant="caption" tone="muted" style={{ textAlign: "center", marginTop: 6 }}>
                {emptyStateCopy}
              </AppText>
            </GlassCard>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingTop: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 110 },
  topbar: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingVertical: 8 },
  titleBlock: { flex: 1, paddingRight: 12 },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.accentCyan,
  },
  topbarSubtitle: { marginTop: 6, maxWidth: 260 },
  topbarActions: { flexDirection: "row", gap: 8, alignItems: "center" },
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
  iconBtnPrimary: { backgroundColor: colors.accentBlue, borderColor: "rgba(255,255,255,0.12)" },
  composer: { padding: 14, marginTop: 12 },
  composerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  composerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(56,232,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.22)",
  },
  headerAvatar: { width: 34, height: 34, borderRadius: 12 },
  headerAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  searchWrap: { marginTop: 12 },
  tabsRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  tabChip: {
    flex: 1,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  tabChipActive: {
    backgroundColor: "rgba(56,232,255,0.10)",
    borderColor: "rgba(56,232,255,0.35)",
  },
  feedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingBottom: 8,
  },
  emptyCard: { padding: 18, marginTop: 8 },
});
