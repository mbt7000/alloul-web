import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  RefreshControl,
  Share,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import GlassCard from "../components/GlassCard";
import { useAuth } from "../../state/auth/AuthContext";
import { useCompany } from "../../state/company/CompanyContext";
import { useHomeMode } from "../../state/mode/HomeModeContext";
import { getPosts, likePost, unlikePost, type ApiPost } from "../../api";
import { formatApiError } from "../utils/apiErrors";
import Screen from "../layout/Screen";
import AppText from "../ui/AppText";
import ListRow from "../ui/ListRow";
import InlineErrorRetry from "../ui/InlineErrorRetry";
import MediaPostRow from "../../features/media/components/MediaPostRow";

const { width: SCREEN_W } = Dimensions.get("window");

type CompanySection = "overview" | "activity" | "media" | "experience" | "connections";
type MediaProfileTab = "posts" | "media";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, refresh } = useAuth();
  const { company, isMember, loading: companyLoading } = useCompany();
  const { mode: homeMode } = useHomeMode();
  const [refreshing, setRefreshing] = useState(false);
  const [section, setSection] = useState<CompanySection>("overview");
  const [mediaTab, setMediaTab] = useState<MediaProfileTab>("posts");
  const [profilePosts, setProfilePosts] = useState<ApiPost[]>([]);
  const [profilePostsLoading, setProfilePostsLoading] = useState(false);
  const [profilePostsError, setProfilePostsError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const loadProfilePosts = useCallback(async () => {
    if (!user?.id) {
      setProfilePosts([]);
      setProfilePostsError(null);
      setProfilePostsLoading(false);
      return;
    }

    setProfilePostsLoading(true);
    setProfilePostsError(null);
    try {
      const posts = await getPosts(40, 0);
      const ownPosts = (Array.isArray(posts) ? posts : []).filter((post) => post.user_id === user.id);
      setProfilePosts(ownPosts);
    } catch (e) {
      setProfilePosts([]);
      setProfilePostsError(formatApiError(e));
    } finally {
      setProfilePostsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (homeMode === "public") {
      void loadProfilePosts();
    }
  }, [homeMode, loadProfilePosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      if (homeMode === "public") {
        await loadProfilePosts();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const initials = (user?.name || user?.username || "?").slice(0, 2).toUpperCase();
  const displayName = user?.name || user?.username || "Guest";
  const headline = user?.bio ? user.bio.split("\n")[0].slice(0, 80) : "Member · Alloul One";
  const mediaVisualPosts = useMemo(() => profilePosts.filter((post) => Boolean(post.image_url)), [profilePosts]);
  const joinedLabel = useMemo(() => {
    if (!user?.created_at) return "عضو في مجتمع اللّول";
    return `منضم منذ ${new Date(user.created_at).getFullYear()}`;
  }, [user?.created_at]);

  const onShare = async () => {
    if (!user) return;
    try {
      await Share.share({
        message: `${displayName} on Alloul One — @${user.username}`,
      });
    } catch {
      /* ignore */
    }
  };

  const handleProfileLike = async (postId: number) => {
    const post = profilePosts.find((item) => item.id === postId);
    if (!post) return;

    setProfilePosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? {
              ...item,
              liked_by_me: !item.liked_by_me,
              likes_count: item.liked_by_me ? item.likes_count - 1 : item.likes_count + 1,
            }
          : item
      )
    );

    try {
      if (post.liked_by_me) await unlikePost(postId);
      else await likePost(postId);
    } catch {
      setProfilePosts((prev) => prev.map((item) => (item.id === postId ? post : item)));
    }
  };

  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    centerText: { marginTop: 12, textAlign: "center" },
    centerTextSmall: { marginTop: 4, textAlign: "center" },
    cover: { height: 120, position: "relative" },
    coverGradient: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(76,111,255,0.35)",
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    coverTopRow: {
      flexDirection: "row" as const,
      justifyContent: "flex-end" as const,
      paddingHorizontal: 16,
      paddingTop: 8,
      gap: 10,
    },
    roundIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: "rgba(0,0,0,0.25)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    identityBlock: { alignItems: "center" as const, marginTop: -48, paddingHorizontal: 16 },
    mediaCover: { height: 180, position: "relative" },
    mediaCoverGradient: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(56,232,255,0.12)",
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    mediaCoverTopRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    avatarWrap: {
      borderRadius: 32,
      padding: 4,
      backgroundColor: c.mediaCanvas,
      borderWidth: 1,
      borderColor: c.border,
    },
    avatarWrapMedia: {
      borderRadius: 36,
      padding: 4,
      backgroundColor: c.mediaCanvas,
      borderWidth: 1,
      borderColor: "rgba(56,232,255,0.22)",
    },
    avatar: { width: 96, height: 96, borderRadius: 28 },
    avatarMedia: { width: 108, height: 108, borderRadius: 32 },
    avatarFallback: {
      width: 96,
      height: 96,
      borderRadius: 28,
      backgroundColor: c.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarFallbackMedia: {
      width: 108,
      height: 108,
      borderRadius: 32,
      backgroundColor: c.accentBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    handleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      marginTop: 6,
    },
    mediaHeadline: {
      marginTop: 10,
      textAlign: "center" as const,
      paddingHorizontal: 20,
      lineHeight: 22,
    },
    companyHeadline: {
      marginTop: 10,
      textAlign: "center" as const,
      paddingHorizontal: 20,
    },
    badgeRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, justifyContent: "center" as const, gap: 8, marginTop: 12 },
    modePill: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    modePillPub: {
      borderColor: "rgba(76,111,255,0.35)",
      backgroundColor: "rgba(76,111,255,0.12)",
    },
    mediaInfoPill: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    modePillCo: {
      borderColor: "rgba(45,226,199,0.35)",
      backgroundColor: "rgba(45,226,199,0.10)",
    },
    coPill: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      maxWidth: "90%",
    },
    mediaActionRow: {
      flexDirection: "row" as const,
      paddingHorizontal: 16,
      paddingVertical: 18,
      gap: 8,
    },
    quickActions: {
      flexDirection: "row" as const,
      justifyContent: "space-around" as const,
      paddingHorizontal: 12,
      paddingVertical: 16,
      marginTop: 8,
    },
    qaBtn: {
      alignItems: "center" as const,
      minWidth: 72,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      flex: 1,
      marginHorizontal: 4,
    },
    mediaStatsCard: {
      marginHorizontal: 16,
      marginTop: 4,
    },
    mediaStatsHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 14,
    },
    mediaTabRow: {
      flexDirection: "row" as const,
      gap: 8,
    },
    mediaTabChip: {
      flex: 1,
      minHeight: 62,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 4,
    },
    mediaTabChipActive: {
      borderColor: "rgba(56,232,255,0.35)",
      backgroundColor: "rgba(56,232,255,0.10)",
    },
    segScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
    segChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
    },
    segChipOn: {
      backgroundColor: "rgba(76,111,255,0.16)",
      borderColor: "rgba(76,111,255,0.35)",
    },
    pad: { paddingHorizontal: 16, marginTop: 8 },
    card: { padding: 16, borderRadius: 20 },
    mediaBioCard: { marginBottom: 12 },
    mediaPromptCard: { marginBottom: 12 },
    mediaPromptRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    mediaPromptCopy: {
      flex: 1,
    },
    mediaPromptBtn: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.accentBlue,
    },
    postList: {
      marginTop: 4,
    },
    loadingBlock: {
      paddingVertical: 32,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    mediaGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "space-between" as const,
      gap: 12,
    },
    mediaTile: {
      width: "48%",
      aspectRatio: 0.86,
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: c.bgCard,
    },
    mediaTileImage: {
      ...StyleSheet.absoluteFillObject,
    },
    mediaTileOverlay: {
      flex: 1,
      justifyContent: "flex-end" as const,
      padding: 12,
      backgroundColor: "rgba(7,10,18,0.34)",
      gap: 4,
    },
    emptyStateCard: {
      alignItems: "center" as const,
      marginTop: 4,
    },
    emptyStateBody: {
      textAlign: "center" as const,
      marginTop: 8,
      lineHeight: 20,
    },
    kicker: { letterSpacing: 0.8, textTransform: "uppercase" },
    profileBrandTop: { textAlign: "center" as const, marginTop: 8, letterSpacing: 1 },
    mediaTopDock: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 12,
    },
    globeCircleSm: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accentBlue,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    followRow: { flexDirection: "row" as const, justifyContent: "center" as const, gap: 20, marginTop: 12 },
    editProfileBtn: {
      alignSelf: "center",
      marginTop: 14,
      paddingHorizontal: 28,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: c.white,
    },
    postsSectionHead: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      paddingHorizontal: 16,
      marginTop: 20,
      marginBottom: 4,
    },
    emptyPlusBox: {
      width: 88,
      height: 88,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "rgba(255,255,255,0.04)",
    },
    statsRow: { flexDirection: "row" as const, justifyContent: "space-around" as const, marginTop: 14 },
    stat: { alignItems: "center" },
    bioText: { marginTop: 8, lineHeight: 22 },
    iCode: {
      marginTop: 12,
      alignSelf: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: "rgba(76,111,255,0.15)",
    },
  }));

  function Stat({ n, label }: { n: number; label: string }) {
    return (
      <View style={styles.stat}>
        <AppText variant="title" weight="bold">
          {n}
        </AppText>
        <AppText variant="micro" tone="muted" weight="bold" style={{ marginTop: 4 }}>
          {label}
        </AppText>
      </View>
    );
  }

  function ProfileAction({
    icon,
    label,
    color,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    onPress: () => void;
  }) {
    return (
      <Pressable style={styles.qaBtn} onPress={onPress}>
        <Ionicons name={icon} size={18} color={color} />
        <AppText variant="micro" weight="bold" style={{ marginTop: 6 }}>
          {label}
        </AppText>
      </Pressable>
    );
  }

  function PlaceholderBlock({ title, body }: { title: string; body: string }) {
    return (
      <>
        <AppText variant="bodySm" weight="bold">
          {title}
        </AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>
          {body}
        </AppText>
      </>
    );
  }

  return (
    <Screen edges={["top", "left", "right"]} style={homeMode === "public" ? { backgroundColor: colors.mediaCanvas } : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={homeMode === "public" ? { paddingBottom: 100 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.accentCyan} />}
      >
        {homeMode === "public" ? (
          <View>
            <AppText variant="caption" weight="bold" tone="muted" style={styles.profileBrandTop}>
              ALLOUL&Q
            </AppText>
            <View style={styles.mediaTopDock}>
              <View style={styles.globeCircleSm}>
                <Ionicons name="globe" size={18} color={colors.white} />
              </View>
              <View style={{ flex: 1 }} />
              <Pressable style={styles.roundIcon} onPress={() => navigation.navigate("Settings")}>
                <Ionicons name="sunny-outline" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.identityBlock}>
              <View style={styles.avatarWrapMedia}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatarMedia} />
                ) : (
                  <View style={styles.avatarFallbackMedia}>
                    <AppText variant="h1" weight="bold" style={{ color: colors.white }}>
                      {initials}
                    </AppText>
                  </View>
                )}
              </View>

              <AppText variant="h2" weight="bold" style={styles.centerText}>
                {user ? displayName : t("profile.signInHint")}
              </AppText>

              {user ? (
                <>
                  <View style={styles.handleRow}>
                    <AppText variant="caption" tone="muted">
                      @{user.username}
                    </AppText>
                    {user.verified ? <Ionicons name="checkmark-circle" size={16} color={colors.accentCyan} /> : null}
                  </View>

                  <AppText variant="bodySm" tone="secondary" style={styles.mediaHeadline}>
                    {user.bio || headline}
                  </AppText>

                  <View style={styles.followRow}>
                    <AppText variant="bodySm" weight="bold">
                      {(user.followers_count ?? 0).toLocaleString()} متابع
                    </AppText>
                    <AppText variant="bodySm" weight="bold" tone="muted">
                      {(user.following_count ?? 0).toLocaleString()} يتابع
                    </AppText>
                  </View>

                  <Pressable style={styles.editProfileBtn} onPress={() => navigation.navigate("Settings")}>
                    <AppText variant="bodySm" weight="bold" style={{ color: colors.black }}>
                      تعديل الملف
                    </AppText>
                  </Pressable>

                  <View style={styles.badgeRow}>
                    <View style={[styles.modePill, styles.modePillPub]}>
                      <Ionicons name="radio-outline" size={12} color={colors.accentCyan} />
                      <AppText variant="micro" weight="bold" style={{ color: colors.accentCyan }}>
                        ملف ميديا
                      </AppText>
                    </View>
                    <View style={styles.mediaInfoPill}>
                      <Ionicons name="sparkles-outline" size={12} color={colors.textSecondary} />
                      <AppText variant="micro" tone="secondary" weight="bold">
                        {joinedLabel}
                      </AppText>
                    </View>
                    {company && !companyLoading ? (
                      <View style={styles.mediaInfoPill}>
                        <Ionicons name="business-outline" size={12} color={colors.textSecondary} />
                        <AppText variant="micro" tone="secondary" weight="bold" numberOfLines={1} style={{ maxWidth: SCREEN_W * 0.44 }}>
                          {company.name}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : null}
            </View>

            {user ? (
              <>
                <View style={styles.postsSectionHead}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.textMuted} />
                  <AppText variant="bodySm" weight="bold" tone="secondary">
                    منشوراتي
                  </AppText>
                </View>

                <View style={styles.pad}>
                  <View style={styles.mediaTabRow}>
                    <Pressable
                      onPress={() => setMediaTab("posts")}
                      style={[styles.mediaTabChip, mediaTab === "posts" && styles.mediaTabChipActive]}
                    >
                      <AppText variant="bodySm" weight="bold" tone={mediaTab === "posts" ? "primary" : "secondary"}>
                        المنشورات
                      </AppText>
                      <AppText variant="micro" tone={mediaTab === "posts" ? "cyan" : "muted"}>
                        {profilePosts.length}
                      </AppText>
                    </Pressable>
                    <Pressable
                      onPress={() => setMediaTab("media")}
                      style={[styles.mediaTabChip, mediaTab === "media" && styles.mediaTabChipActive]}
                    >
                      <AppText variant="bodySm" weight="bold" tone={mediaTab === "media" ? "primary" : "secondary"}>
                        الوسائط
                      </AppText>
                      <AppText variant="micro" tone={mediaTab === "media" ? "cyan" : "muted"}>
                        {mediaVisualPosts.length}
                      </AppText>
                    </Pressable>
                  </View>
                </View>

                {mediaTab === "posts" ? (
                  <View style={styles.pad}>
                    {user.bio ? (
                      <GlassCard style={[styles.card, styles.mediaBioCard]}>
                        <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
                          نبذة
                        </AppText>
                        <AppText variant="body" tone="secondary" style={styles.bioText}>
                          {user.bio}
                        </AppText>
                      </GlassCard>
                    ) : null}

                    <GlassCard style={[styles.card, styles.mediaPromptCard]}>
                      <View style={styles.mediaPromptRow}>
                        <View style={styles.mediaPromptCopy}>
                          <AppText variant="bodySm" weight="bold">
                            شارك آخر ما تعمل عليه
                          </AppText>
                          <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
                            نص، صورة، أو تحديث سريع يظهر فوراً في عالم الميديا.
                          </AppText>
                        </View>
                        <Pressable style={styles.mediaPromptBtn} onPress={() => navigation.navigate("CreatePost")}>
                          <Ionicons name="add" size={18} color={colors.white} />
                        </Pressable>
                      </View>
                    </GlassCard>

                    {profilePostsLoading ? (
                      <View style={styles.loadingBlock}>
                        <ActivityIndicator color={colors.accentCyan} />
                      </View>
                    ) : profilePostsError ? (
                      <InlineErrorRetry message={profilePostsError} onRetry={() => void loadProfilePosts()} />
                    ) : profilePosts.length > 0 ? (
                      <View style={styles.postList}>
                        {profilePosts.map((post) => (
                          <MediaPostRow key={post.id} post={post} onLike={handleProfileLike} />
                        ))}
                      </View>
                    ) : (
                      <GlassCard style={[styles.card, styles.emptyStateCard]}>
                        <Pressable style={styles.emptyPlusBox} onPress={() => navigation.navigate("CreatePost")}>
                          <Ionicons name="add" size={40} color={colors.textMuted} />
                        </Pressable>
                        <AppText variant="body" style={{ marginTop: 16, textAlign: "center" }}>
                          لا توجد منشورات بعد
                        </AppText>
                        <AppText variant="caption" tone="muted" style={styles.emptyStateBody}>
                          اضغط + لإنشاء أول منشور.
                        </AppText>
                      </GlassCard>
                    )}
                  </View>
                ) : (
                  <View style={styles.pad}>
                    {mediaVisualPosts.length > 0 ? (
                      <View style={styles.mediaGrid}>
                        {mediaVisualPosts.map((post) => (
                          <Pressable
                            key={post.id}
                            onPress={() => setMediaTab("posts")}
                            style={styles.mediaTile}
                          >
                            {post.image_url ? <Image source={{ uri: post.image_url }} style={styles.mediaTileImage} /> : null}
                            <View style={styles.mediaTileOverlay}>
                              <AppText variant="micro" weight="bold" style={{ color: colors.white }}>
                                @{user.username}
                              </AppText>
                              <AppText variant="caption" numberOfLines={2} style={{ color: colors.white }}>
                                {post.content}
                              </AppText>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <GlassCard style={[styles.card, styles.emptyStateCard]}>
                        <Ionicons name="images-outline" size={28} color={colors.accentBlue} />
                        <AppText variant="body" style={{ marginTop: 10, textAlign: "center" }}>
                          لا توجد وسائط منشورة حتى الآن.
                        </AppText>
                        <AppText variant="caption" tone="muted" style={styles.emptyStateBody}>
                          أضف صورة إلى منشورك القادم ليظهر في هذا التبويب.
                        </AppText>
                      </GlassCard>
                    )}
                  </View>
                )}
              </>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.cover}>
              <View style={styles.coverGradient} />
              <View style={styles.coverTopRow}>
                <Pressable style={styles.roundIcon} onPress={() => navigation.navigate("Settings")}>
                  <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.identityBlock}>
              <View style={styles.avatarWrap}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <AppText variant="h1" weight="bold" style={{ color: colors.white }}>
                      {initials}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText variant="h2" weight="bold" style={styles.centerText}>
                {user ? displayName : t("profile.signInHint")}
              </AppText>
              {user ? (
                <>
                  <AppText variant="caption" tone="muted" style={styles.centerTextSmall}>
                    @{user.username}
                  </AppText>
                  <AppText variant="bodySm" tone="secondary" style={styles.companyHeadline}>
                    {headline}
                  </AppText>
                  <View style={styles.badgeRow}>
                    <View style={[styles.modePill, styles.modePillCo]}>
                      <Ionicons name="business" size={12} color={colors.accentTeal} />
                      <AppText variant="micro" weight="bold" style={{ color: colors.accentTeal }}>
                        Home: Company
                      </AppText>
                    </View>
                    {company && !companyLoading ? (
                      <View style={styles.coPill}>
                        <Ionicons name="business-outline" size={12} color={colors.textSecondary} />
                        <AppText variant="micro" weight="bold" tone="secondary" numberOfLines={1} style={{ maxWidth: SCREEN_W * 0.5 }}>
                          {company.name}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : null}
            </View>

            {user ? (
              <>
                <View style={styles.quickActions}>
                  <ProfileAction
                    icon="create-outline"
                    label="Edit"
                    color={colors.accentCyan}
                    onPress={() => navigation.navigate("Settings")}
                  />
                  <ProfileAction icon="share-outline" label="Share" color={colors.accentBlue} onPress={() => void onShare()} />
                  <ProfileAction icon="business-outline" label="Company" color={colors.accentTeal} onPress={() => navigation.navigate("Company")} />
                  {isMember ? (
                    <ProfileAction
                      icon="grid-outline"
                      label="Workspace"
                      color={colors.accentLime}
                      onPress={() => navigation.getParent()?.navigate("CompanyWorkspace")}
                    />
                  ) : null}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segScroll}>
                  {(
                    [
                      ["overview", "Overview"],
                      ["activity", "Activity"],
                      ["media", "Media"],
                      ["experience", "Experience"],
                      ["connections", "Connections"],
                    ] as const
                  ).map(([key, label]) => (
                    <Pressable key={key} onPress={() => setSection(key)} style={[styles.segChip, section === key && styles.segChipOn]}>
                      <AppText variant="micro" weight="bold" tone={section === key ? "primary" : "muted"}>
                        {label}
                      </AppText>
                    </Pressable>
                  ))}
                </ScrollView>

                {section === "overview" ? (
                  <View style={styles.pad}>
                    <GlassCard style={styles.card}>
                      <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
                        Stats
                      </AppText>
                      <View style={styles.statsRow}>
                        <Stat n={user.posts_count ?? 0} label={t("profile.posts")} />
                        <Stat n={user.followers_count ?? 0} label={t("profile.followers")} />
                        <Stat n={user.following_count ?? 0} label={t("profile.following")} />
                      </View>
                    </GlassCard>
                    {user.bio ? (
                      <GlassCard style={[styles.card, { marginTop: 12 }]}>
                        <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
                          {t("profile.bio")}
                        </AppText>
                        <AppText variant="body" tone="secondary" style={styles.bioText}>
                          {user.bio}
                        </AppText>
                      </GlassCard>
                    ) : null}
                    {user.email ? (
                      <GlassCard style={[styles.card, { marginTop: 12 }]}>
                        <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
                          Contact
                        </AppText>
                        <AppText variant="bodySm" tone="secondary" style={{ marginTop: 8 }}>
                          {user.email}
                        </AppText>
                      </GlassCard>
                    ) : null}
                    {user.i_code ? (
                      <View style={styles.iCode}>
                        <AppText variant="caption" tone="accent" weight="bold">
                          #{user.i_code}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {section === "activity" ? (
                  <View style={styles.pad}>
                    <GlassCard style={styles.card}>
                      <PlaceholderBlock title="Recent activity" body="Posts, reactions, and workspace events will appear here." />
                    </GlassCard>
                  </View>
                ) : null}

                {section === "media" ? (
                  <View style={styles.pad}>
                    <GlassCard style={styles.card}>
                      <PlaceholderBlock title="Media" body="Photos and files you share on the network." />
                    </GlassCard>
                  </View>
                ) : null}

                {section === "experience" ? (
                  <View style={styles.pad}>
                    <GlassCard style={styles.card}>
                      <PlaceholderBlock title="Experience" body="Roles, projects, and credentials — coming soon." />
                    </GlassCard>
                  </View>
                ) : null}

                {section === "connections" ? (
                  <View style={styles.pad}>
                    <GlassCard style={styles.card}>
                      <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
                        Network
                      </AppText>
                      <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
                        Grow your graph from Discover and Feed.
                      </AppText>
                      <View style={{ height: 12 }} />
                      <ListRow
                        title="Open Discover"
                        iconLeft="compass-outline"
                        onPress={() => navigation.navigate("Search")}
                      />
                      <ListRow title="Open Feed" iconLeft="radio-outline" onPress={() => navigation.navigate("Feed")} />
                    </GlassCard>
                  </View>
                ) : null}

                {isMember && company ? (
                  <View style={styles.pad}>
                    <AppText variant="micro" tone="muted" weight="bold" style={[styles.kicker, { marginBottom: 10 }]}>
                      Company access
                    </AppText>
                    <GlassCard style={styles.card}>
                      <ListRow
                        title={company.name}
                        subtitle="Workspace membership"
                        iconLeft="shield-checkmark-outline"
                        onPress={() => navigation.getParent()?.navigate("CompanyWorkspace")}
                      />
                    </GlassCard>
                  </View>
                ) : null}

                <View style={styles.pad}>
                  <AppText variant="micro" tone="muted" weight="bold" style={[styles.kicker, { marginBottom: 10 }]}>
                    More
                  </AppText>
                  <View style={{ gap: 8 }}>
                    <ListRow title={t("profile.openSettings")} iconLeft="options-outline" onPress={() => navigation.navigate("Settings")} />
                    <ListRow title="Knowledge" iconLeft="book-outline" onPress={() => navigation.navigate("Knowledge")} />
                    <ListRow title="Reports" iconLeft="bar-chart-outline" onPress={() => navigation.navigate("Reports")} />
                  </View>
                </View>
              </>
            ) : null}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </Screen>
  );
}
