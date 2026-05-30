import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Pressable,
  Alert,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { AppPalette } from "../../../theme/palettes";
import { radius } from "../../../theme/radius";
import AppText from "../../../shared/ui/AppText";
import InlineErrorRetry from "../../../shared/ui/InlineErrorRetry";
import { useNotifications } from "../../../state/notifications/NotificationsContext";
import type { NotificationItem } from "../../../api";
import { useAppTheme } from "../../../theme/ThemeContext";
import { acceptInvitation, rejectInvitation } from "../../../api/companies.api";

const TAB_BAR_PAD = 108;

function timeShort(raw?: string): string {
  if (!raw) return "";
  const mins = Math.floor((Date.now() - new Date(raw).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  return `${Math.floor(hrs / 24)}ي`;
}

function badgeForType(type: string, colors: AppPalette): { icon: keyof typeof Ionicons.glyphMap; bg: string } {
  const t = type.toLowerCase();
  if (t.includes("company_invite") || t.includes("invite")) return { icon: "business", bg: colors.accentCyan };
  if (t.includes("like") || t.includes("heart")) return { icon: "heart", bg: colors.accentRose };
  if (t.includes("follow")) return { icon: "person-add", bg: colors.accentBlue };
  if (t.includes("comment") || t.includes("mention") || t.includes("message")) return { icon: "chatbubble", bg: colors.success };
  if (t.includes("repost") || t.includes("share")) return { icon: "repeat", bg: "#9B59B6" };
  if (t.includes("call")) return { icon: "call", bg: colors.accentRose };
  return { icon: "notifications", bg: colors.textMuted };
}

function isCallNotification(type: string): boolean {
  return type.toLowerCase().startsWith("call_");
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors, toggleMode } = useAppTheme();
  const {
    notifications: allNotifications,
    loading,
    refreshing,
    error,
    refresh,
    markNotificationRead,
    markAllNotificationsReadAndSync,
    clearError,
  } = useNotifications();

  // Call notifications go to CallsPanel only — exclude from main feed
  const items = allNotifications.filter((n) => !isCallNotification(n.type || ""));

  // Track invitation actions: invitationId → "loading" | "done"
  const [invitationActions, setInvitationActions] = useState<Record<number, "loading" | "done">>({});

  const handleInviteAccept = useCallback(async (notifId: number, invitationId: number, companyName: string) => {
    setInvitationActions(prev => ({ ...prev, [invitationId]: "loading" }));
    try {
      await acceptInvitation(invitationId);
      void markNotificationRead(notifId);
      setInvitationActions(prev => ({ ...prev, [invitationId]: "done" }));
      Alert.alert("تم القبول ✓", `انضممت إلى ${companyName} بنجاح`);
    } catch {
      setInvitationActions(prev => {
        const next = { ...prev };
        delete next[invitationId];
        return next;
      });
      Alert.alert("خطأ", "تعذّر قبول الدعوة، حاول مجدداً");
    }
  }, [markNotificationRead]);

  const handleInviteReject = useCallback(async (notifId: number, invitationId: number) => {
    setInvitationActions(prev => ({ ...prev, [invitationId]: "loading" }));
    try {
      await rejectInvitation(invitationId);
      void markNotificationRead(notifId);
      setInvitationActions(prev => ({ ...prev, [invitationId]: "done" }));
    } catch {
      setInvitationActions(prev => {
        const next = { ...prev };
        delete next[invitationId];
        return next;
      });
      Alert.alert("خطأ", "تعذّر رفض الدعوة، حاول مجدداً");
    }
  }, [markNotificationRead]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        head: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
        headRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
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
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        title: { color: colors.textPrimary },
        center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
        list: { padding: 16, gap: 0 },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 14,
          paddingHorizontal: 12,
          borderRadius: radius.lg,
          backgroundColor: colors.cardElevated,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 10,
        },
        rowUnread: { borderColor: "rgba(76,111,255,0.45)" },
        timeCol: { width: 36, textAlign: "left" },
        avatarWrap: { position: "relative" },
        avatar: { width: 48, height: 48, borderRadius: 24 },
        avatarPh: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: "rgba(255,255,255,0.08)",
          alignItems: "center",
          justifyContent: "center",
        },
        badgeDot: {
          position: "absolute",
          bottom: -2,
          right: -2,
          width: 20,
          height: 20,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: colors.mediaCanvas,
        },
        empty: { textAlign: "center", marginTop: 40 },
      }),
    [colors]
  );

  useFocusEffect(
    useCallback(() => {
      void refresh({ mode: "focus" });
    }, [refresh])
  );

  const onPressItem = async (item: NotificationItem) => {
    // Mark as read first (optimistic)
    void markNotificationRead(item.id);

    // Route to detail based on type
    const type = (item.type || "").toLowerCase();
    const refId = item.reference_id;

    if ((type.includes("like") || type.includes("comment") || type.includes("mention") || type.includes("repost") || type.includes("reply") || type.includes("tag")) && refId) {
      // Post-related → open post detail
      navigation.navigate("PostDetail", { postId: refId });
      return;
    }
    if (type.includes("follow") && refId) {
      // Follow → open user profile
      navigation.navigate("UserProfile", { userId: refId });
      return;
    }
    if (type.includes("message") && refId) {
      // DM → open conversation
      navigation.navigate("Conversation", { conversationId: refId });
      return;
    }
    if (type.includes("call")) {
      navigation.navigate("CallsPanel");
      return;
    }
    // Default: just mark as read (no navigation)
  };

  const showInitialLoader = loading && items.length === 0 && !error;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.mediaCanvas }]}>
      <View style={styles.head}>
        <AppText variant="caption" weight="bold" tone="muted" style={{ textAlign: "center" }}>
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

      <View style={styles.header}>
        <AppText variant="h2" weight="bold" style={styles.title}>
          {t("notifications.title")}
        </AppText>
        {items.some((n) => !n.read) ? (
          <TouchableOpacity onPress={() => void markAllNotificationsReadAndSync()} hitSlop={12}>
            <AppText variant="micro" weight="bold" tone="cyan">
              {t("notifications.markAllRead")}
            </AppText>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      {showInitialLoader ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.center}>
          <InlineErrorRetry
            message={error}
            onRetry={() => {
              clearError();
              void refresh({ mode: "pull" });
            }}
            retryLabel={t("common.retry")}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_PAD }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh({ mode: "pull" })}
              tintColor={colors.accentCyan}
            />
          }
          ListHeaderComponent={
            error && items.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                <InlineErrorRetry
                  message={error}
                  onRetry={() => {
                    clearError();
                    void refresh({ mode: "pull" });
                  }}
                  retryLabel={t("common.retry")}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <AppText variant="caption" tone="muted" style={styles.empty}>
              {t("notifications.empty")}
            </AppText>
          }
          renderItem={({ item }) => (
            <NotificationListRow
              item={item}
              colors={colors}
              styles={styles}
              onPress={() => void onPressItem(item)}
              invitationActionState={
                item.reference_id ? invitationActions[Number(item.reference_id)] : undefined
              }
              onInviteAccept={
                item.type?.toLowerCase().includes("company_invite")
                  ? (invId, companyName) => void handleInviteAccept(item.id, invId, companyName)
                  : undefined
              }
              onInviteReject={
                item.type?.toLowerCase().includes("company_invite")
                  ? (invId) => void handleInviteReject(item.id, invId)
                  : undefined
              }
            />
          )}
        />
      )}
    </View>
  );
}

type NotificationRowStyles = {
  row: ViewStyle;
  rowUnread: ViewStyle;
  timeCol: TextStyle;
  avatarWrap: ViewStyle;
  avatar: ImageStyle;
  avatarPh: ViewStyle;
  badgeDot: ViewStyle;
};

function NotificationListRow({
  item,
  onPress,
  colors,
  styles,
  invitationActionState,
  onInviteAccept,
  onInviteReject,
}: {
  item: NotificationItem;
  onPress: () => void;
  colors: AppPalette;
  styles: NotificationRowStyles;
  invitationActionState?: "loading" | "done";
  onInviteAccept?: (invitationId: number, companyName: string) => void;
  onInviteReject?: (invitationId: number) => void;
}) {
  const badge = badgeForType(item.type, colors);
  const actor = item.actor_name || item.title;
  const action = item.body || item.type;
  const timeLabel = timeShort(item.created_at);
  const isInvite = item.type?.toLowerCase().includes("company_invite");
  const invitationId = item.reference_id ? Number(item.reference_id) : null;

  // Extract company name from title "دعوة من {name}"
  const companyName = item.title?.replace(/^دعوة من\s*/i, "").trim() || item.title || "الشركة";

  if (isInvite && invitationId) {
    const isDone = invitationActionState === "done";
    const isLoading = invitationActionState === "loading";

    return (
      <View style={[
        styles.row,
        !item.read && styles.rowUnread,
        { flexDirection: "column", alignItems: "stretch", gap: 10 },
        { borderColor: colors.accentCyan + "66", borderWidth: 1.5 },
      ]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={[styles.avatarPh, { backgroundColor: colors.accentCyan + "22" }]}>
            <Ionicons name="business" size={22} color={colors.accentCyan} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText variant="bodySm" weight="bold" numberOfLines={1}>
              {item.title || "دعوة للانضمام"}
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={2}>
              {item.body || "تلقيت دعوة للانضمام إلى شركة"}
            </AppText>
          </View>
          <AppText variant="micro" tone="muted">
            {timeLabel}
          </AppText>
        </View>

        {isDone ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", paddingVertical: 4 }}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <AppText variant="caption" style={{ color: colors.success }}>
              تمت المعالجة
            </AppText>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => onInviteReject?.(invitationId)}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: radius.md,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.accentRose,
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.accentRose} />
              ) : (
                <AppText variant="caption" weight="bold" style={{ color: colors.accentRose }}>
                  رفض
                </AppText>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onInviteAccept?.(invitationId, companyName)}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: radius.md,
                alignItems: "center",
                backgroundColor: colors.accentCyan,
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <AppText variant="caption" weight="bold" style={{ color: colors.white }}>
                  قبول
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <View style={[styles.row, !item.read && styles.rowUnread]}>
        <AppText variant="micro" tone="muted" style={styles.timeCol}>
          {timeLabel}
        </AppText>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="bodySm" weight="bold" numberOfLines={1}>
            {actor}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {action}
          </AppText>
        </View>
        <View style={styles.avatarWrap}>
          {item.actor_avatar ? (
            <Image source={{ uri: item.actor_avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPh}>
              <AppText variant="bodySm" weight="bold">
                {actor.slice(0, 1)}
              </AppText>
            </View>
          )}
          <View style={[styles.badgeDot, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={10} color={colors.white} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
