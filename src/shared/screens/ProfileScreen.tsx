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
  Alert,
  TouchableOpacity,
  Clipboard,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import GlassCard from "../components/GlassCard";
import { useAuth } from "../../state/auth/AuthContext";
import { useCompany } from "../../state/company/CompanyContext";
import { useHomeMode } from "../../state/mode/HomeModeContext";
import { ROOT_SHELL_ROUTES } from "../../config/routes";
import { FEATURES } from "../../config/features";
import {
  getUserProfile, followUser, unfollowUser, blockUser, type UserProfile,
  startConversation,
} from "../../api";
import { updateMe } from "../../api/auth.api";
import { useCallContext } from "../../context/CallContext";
import UserPresenceIndicator from "../../components/common/UserPresenceIndicator";
// Note: startConversation is from messages.api, others from companies.api
import { formatApiError } from "../utils/apiErrors";
import Screen from "../layout/Screen";
import AppText from "../ui/AppText";
import ListRow from "../ui/ListRow";
import InlineErrorRetry from "../ui/InlineErrorRetry";

const { width: SCREEN_W } = Dimensions.get("window");

type CompanySection = "overview" | "activity" | "media" | "experience" | "connections";
type MediaProfileTab = "posts" | "media";

// ─── Other user public profile ────────────────────────────────────────────────

function OtherUserProfile({ userId }: { userId: number }) {
  const navigation = useNavigation<any>();
  const { user: me } = useAuth();
  const { colors: c } = useAppTheme();
  const { startCall } = useCallContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await getUserProfile(userId);
      setProfile(p);
      setFollowing(p.is_following);
    } catch {}
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const handleFollow = async () => {
    if (!profile) return;
    setActionLoading(true);
    const was = following;
    setFollowing(!was);
    try {
      if (was) await unfollowUser(userId);
      else await followUser(userId);
      setProfile((p) => p ? { ...p, followers_count: was ? p.followers_count - 1 : p.followers_count + 1 } : p);
    } catch {
      setFollowing(was);
    }
    setActionLoading(false);
  };

  const handleDM = async () => {
    setActionLoading(true);
    try {
      const conv = await startConversation(userId);
      navigation.navigate("Conversation", { conversation: conv });
    } catch (e: any) {
      Alert.alert("خطأ", e?.detail || e?.message || "تعذّر فتح المحادثة");
    }
    setActionLoading(false);
  };

  const handleBlock = () => {
    Alert.alert(
      "حظر المستخدم",
      `هل تريد حظر @${profile?.username}؟ لن تتمكن من رؤية منشوراته أو مراسلته.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حظر",
          style: "destructive",
          onPress: async () => {
            await blockUser(userId).catch(() => {});
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (loading || !profile) {
    return (
      <Screen style={{ backgroundColor: c.mediaCanvas }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <AppText variant="bodySm" weight="bold">الملف الشخصي</AppText>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentCyan} />
        </View>
      </Screen>
    );
  }

  const initials = (profile.name || profile.username || "U").slice(0, 2).toUpperCase();

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold" numberOfLines={1}>{profile.name || profile.username}</AppText>
          <AppText variant="micro" tone="muted">@{profile.username}</AppText>
        </View>
        <TouchableOpacity onPress={handleBlock} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="ellipsis-horizontal" size={22} color={c.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Cover + Avatar */}
        <View style={{ height: 120, backgroundColor: `${c.accentBlue}33` }} />
        <View style={{ alignItems: "center", marginTop: -54, paddingHorizontal: 16 }}>
          <View style={{ position: "relative" }}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={{ width: 108, height: 108, borderRadius: 32, borderWidth: 4, borderColor: c.mediaCanvas }} />
            ) : (
              <View style={{ width: 108, height: 108, borderRadius: 32, borderWidth: 4, borderColor: c.mediaCanvas, backgroundColor: c.accentBlue, alignItems: "center", justifyContent: "center" }}>
                <AppText variant="h1" weight="bold" style={{ color: "#fff" }}>{initials}</AppText>
              </View>
            )}
            <UserPresenceIndicator userId={profile.id} size={16} borderColor={c.mediaCanvas} />
          </View>

          <AppText variant="h2" weight="bold" style={{ marginTop: 12, textAlign: "center" }}>
            {profile.name || profile.username}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            @{profile.username}
          </AppText>

          {profile.bio ? (
            <AppText variant="bodySm" tone="secondary" style={{ marginTop: 8, textAlign: "center", paddingHorizontal: 20, lineHeight: 22 }}>
              {profile.bio}
            </AppText>
          ) : null}

          {/* Stats */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 32, marginTop: 16 }}>
            <View style={{ alignItems: "center" }}>
              <AppText variant="title" weight="bold">{profile.posts_count}</AppText>
              <AppText variant="micro" tone="muted" weight="bold">منشور</AppText>
            </View>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => navigation.navigate("FollowList" as any, { userId: profile.id, tab: "followers" })}
            >
              <AppText variant="title" weight="bold">{profile.followers_count}</AppText>
              <AppText variant="micro" tone="muted" weight="bold">متابع</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => navigation.navigate("FollowList" as any, { userId: profile.id, tab: "following" })}
            >
              <AppText variant="title" weight="bold">{profile.following_count}</AppText>
              <AppText variant="micro" tone="muted" weight="bold">يتابع</AppText>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={handleFollow}
              disabled={actionLoading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: following ? "transparent" : c.accentBlue,
                borderWidth: 1.5,
                borderColor: following ? c.border : c.accentBlue,
                alignItems: "center",
              }}
            >
              <AppText style={{ color: following ? c.textPrimary : "#fff", fontWeight: "700", fontSize: 15 }}>
                {following ? "إلغاء المتابعة" : "متابعة"}
              </AppText>
            </TouchableOpacity>
            {/* Message */}
            <TouchableOpacity
              onPress={handleDM}
              disabled={actionLoading}
              style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, backgroundColor: c.bgCard, borderWidth: 1.5, borderColor: c.border, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="chatbubble-outline" size={18} color={c.textPrimary} />
            </TouchableOpacity>
            {/* Calls are only available in the Company section — removed from media profiles */}
          </View>
        </View>

      </ScrollView>
    </Screen>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const route = useRoute<any>();
  const { user: me } = useAuth();
  const viewUserId: number | undefined = route.params?.userId;

  // If viewing another user's profile, render OtherUserProfile
  if (viewUserId && viewUserId !== me?.id) {
    return <OtherUserProfile userId={viewUserId} />;
  }

  return <OwnProfile />;
}

function OwnProfile() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, refresh } = useAuth();
  const { company, isMember, loading: companyLoading } = useCompany();
  const { mode: homeMode, setMode: setHomeMode, canUseCompanyMode, getLastRoute } = useHomeMode();
  const [showCompanyOnProfile, setShowCompanyOnProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState("");
  const [section, setSection] = useState<CompanySection>("overview");
  const [mediaTab, setMediaTab] = useState<MediaProfileTab>("posts");

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );


  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const initials = (user?.name || user?.username || "?").slice(0, 2).toUpperCase();
  const displayName = user?.name || user?.username || "Guest";
  const headline = user?.bio ? user.bio.split("\n")[0].slice(0, 80) : "Member · Alloul One";
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

  const { colors } = useAppTheme();
  const currentHomeMode: string = homeMode;
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
            {/* ── Cover photo ── */}
            <View style={{ height: 160, position: "relative", backgroundColor: `${colors.accentBlue}55` }}>
              {user?.cover_url ? (
                <Image source={{ uri: user.cover_url }} style={{ ...StyleSheet.absoluteFillObject, resizeMode: "cover" }} />
              ) : (
                <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(56,232,255,0.08)" }} />
              )}
              {/* top-left: ALLOUL&Q logo badge = world switcher */}
              {canUseCompanyMode && (
                <Pressable
                  onPress={() => {
                    setHomeMode("company");
                    const rootNav = navigation.getParent?.() as any;
                    rootNav?.navigate(ROOT_SHELL_ROUTES.company, {
                      screen: getLastRoute("company") ?? "CompanyWorkspace",
                    });
                  }}
                  hitSlop={8}
                  style={{
                    position: "absolute", top: 12, left: 12,
                    flexDirection: "row", alignItems: "center", gap: 8,
                    paddingHorizontal: 10, paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: "rgba(5,8,16,0.72)",
                    borderWidth: 1,
                    borderColor: "rgba(46,139,255,0.4)",
                  }}
                >
                  {/* Mini ALLOUL&Q mark */}
                  <View style={{
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: "#0F1626",
                    alignItems: "center", justifyContent: "center",
                    borderWidth: 1, borderColor: "rgba(46,139,255,0.5)",
                  }}>
                    <Image
                      source={require("../../../assets/logo/alloul-icon-only.png")}
                      style={{ width: 16, height: 16 }}
                      resizeMode="contain"
                    />
                  </View>
                  <AppText style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                    التبديل للأعمال
                  </AppText>
                  <Ionicons name="chevron-back" size={12} color="rgba(255,255,255,0.7)" />
                </Pressable>
              )}

              {/* top-right action buttons */}
              <View style={{ position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 8 }}>
                <Pressable
                  style={styles.roundIcon}
                  onPress={() => {
                    setCoverUrlDraft(user?.cover_url ?? "");
                    setShowCoverModal(true);
                  }}
                >
                  <Ionicons name="image-outline" size={18} color={colors.white} />
                </Pressable>
                <Pressable style={styles.roundIcon} onPress={() => navigation.navigate("Settings")}>
                  <Ionicons name="settings-outline" size={18} color={colors.white} />
                </Pressable>
              </View>
            </View>

            {/* ── Avatar overlapping cover ── */}
            <View style={{ paddingHorizontal: 16, marginTop: -52 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
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
                {/* Edit button top-right of identity block */}
                <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
                  <Pressable
                    style={styles.editProfileBtn}
                    onPress={() => navigation.navigate("EditProfile")}
                  >
                    <AppText variant="micro" weight="bold" style={{ color: colors.black }}>
                      تعديل الملف
                    </AppText>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* ── Name / handle / bio ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
              <AppText variant="h2" weight="bold">
                {user ? displayName : t("profile.signInHint")}
              </AppText>
              {user ? (
                <>
                  <View style={[styles.handleRow, { justifyContent: "flex-start" }]}>
                    <AppText variant="caption" tone="muted">@{user.username}</AppText>
                    {user.verified ? <Ionicons name="checkmark-circle" size={16} color={colors.accentCyan} /> : null}
                    <View style={styles.mediaInfoPill}>
                      <Ionicons name="sparkles-outline" size={11} color={colors.textSecondary} />
                      <AppText variant="micro" tone="secondary" weight="bold">{joinedLabel}</AppText>
                    </View>
                  </View>
                  {user.bio ? (
                    <AppText variant="bodySm" tone="secondary" style={{ marginTop: 8, lineHeight: 22 }}>
                      {user.bio}
                    </AppText>
                  ) : null}
                </>
              ) : null}
            </View>

            {/* ── Stats row ── */}
            {user ? (
              <View style={{ flexDirection: "row", gap: 24, paddingHorizontal: 16, marginTop: 14 }}>
                <Pressable style={{ alignItems: "center" }}>
                  <AppText variant="title" weight="bold">{(user.posts_count ?? 0).toLocaleString()}</AppText>
                  <AppText variant="micro" tone="muted" weight="bold">منشور</AppText>
                </Pressable>
                <Pressable
                  style={{ alignItems: "center" }}
                  onPress={() => navigation.navigate("FollowList" as any, { userId: user.id, tab: "followers" })}
                >
                  <AppText variant="title" weight="bold">{(user.followers_count ?? 0).toLocaleString()}</AppText>
                  <AppText variant="micro" tone="muted" weight="bold">متابع</AppText>
                </Pressable>
                <Pressable
                  style={{ alignItems: "center" }}
                  onPress={() => navigation.navigate("FollowList" as any, { userId: user.id, tab: "following" })}
                >
                  <AppText variant="title" weight="bold">{(user.following_count ?? 0).toLocaleString()}</AppText>
                  <AppText variant="micro" tone="muted" weight="bold">يتابع</AppText>
                </Pressable>
              </View>
            ) : null}

            {/* ── My Company section ── */}
            {user && company && !companyLoading ? (
              <View style={{ marginHorizontal: 16, marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="business-outline" size={16} color={colors.accentTeal} />
                    <AppText variant="bodySm" weight="bold" tone="secondary">شركتي</AppText>
                  </View>
                  <Switch
                    value={showCompanyOnProfile}
                    onValueChange={setShowCompanyOnProfile}
                    trackColor={{ false: colors.border, true: colors.accentCyan + "66" }}
                    thumbColor={showCompanyOnProfile ? colors.accentCyan : colors.textMuted}
                  />
                </View>
                {showCompanyOnProfile ? (
                  <AppText variant="caption" tone="secondary" style={{ marginTop: 6 }} numberOfLines={1}>
                    {company.name}
                  </AppText>
                ) : (
                  <AppText variant="micro" tone="muted" style={{ marginTop: 6 }}>مخفية عن الملف</AppText>
                )}
              </View>
            ) : null}

            <View style={styles.identityBlock} />

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


                  </View>
                ) : null}
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
                      <TouchableOpacity
                        onPress={() => {
                          Clipboard.setString(user.i_code!);
                          Alert.alert("تم النسخ", `كودك: ${user.i_code}`);
                        }}
                        style={styles.iCode}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons name="id-card-outline" size={14} color={colors.accentBlue} />
                          <AppText variant="caption" weight="bold" style={{ color: colors.accentBlue }}>
                            #{user.i_code}
                          </AppText>
                          <Ionicons name="copy-outline" size={12} color={colors.accentBlue} />
                        </View>
                        <AppText variant="micro" tone="muted" style={{ marginTop: 2 }}>
                          كودك الشخصي — اضغط للنسخ
                        </AppText>
                      </TouchableOpacity>
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

      {/* ── Cover photo URL modal (cross-platform) ── */}
      <Modal visible={showCoverModal} transparent animationType="fade" onRequestClose={() => { setCoverUrlDraft(""); setShowCoverModal(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }} onPress={() => { setCoverUrlDraft(""); setShowCoverModal(false); }}>
            <Pressable
              style={{ width: "88%", backgroundColor: colors.bgCard, borderRadius: 20, padding: 20, gap: 14 }}
              onPress={(e) => e.stopPropagation()}
            >
              <AppText variant="bodySm" weight="bold">صورة الغلاف</AppText>
              <AppText variant="micro" tone="muted">أدخل رابط صورة الغلاف (URL)</AppText>
              <TextInput
                value={coverUrlDraft}
                onChangeText={setCoverUrlDraft}
                placeholder="https://example.com/cover.jpg"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 12,
                  color: colors.textPrimary,
                  fontSize: 13,
                  backgroundColor: colors.bgCard,
                }}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
                  onPress={() => setShowCoverModal(false)}
                >
                  <AppText variant="bodySm" weight="bold" tone="muted">إلغاء</AppText>
                </Pressable>
                <Pressable
                  style={{ flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.accentBlue, alignItems: "center" }}
                  onPress={async () => {
                    setShowCoverModal(false);
                    const url = coverUrlDraft.trim();
                    try {
                      await updateMe({ cover_url: url || null });
                      await refresh();
                    } catch {
                      Alert.alert("خطأ", "فشل تحديث صورة الغلاف");
                    }
                  }}
                >
                  <AppText variant="bodySm" weight="bold" style={{ color: colors.white }}>حفظ</AppText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
