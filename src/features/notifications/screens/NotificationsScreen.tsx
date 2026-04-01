import React, { useCallback } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/colors";
import { radius } from "../../../theme/radius";
import AppText from "../../../shared/ui/AppText";
import InlineErrorRetry from "../../../shared/ui/InlineErrorRetry";
import { useNotifications } from "../../../state/notifications/NotificationsContext";
import type { NotificationItem } from "../../../api";

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

function badgeForType(type: string): { icon: keyof typeof Ionicons.glyphMap; bg: string } {
  const t = type.toLowerCase();
  if (t.includes("like") || t.includes("heart")) return { icon: "heart", bg: colors.accentRose };
  if (t.includes("follow")) return { icon: "person-add", bg: colors.accentBlue };
  if (t.includes("comment") || t.includes("mention") || t.includes("message")) return { icon: "chatbubble", bg: colors.success };
  if (t.includes("repost") || t.includes("share")) return { icon: "repeat", bg: "#9B59B6" };
  return { icon: "notifications", bg: colors.textMuted };
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    notifications: items,
    loading,
    refreshing,
    error,
    refresh,
    markNotificationRead,
    markAllNotificationsReadAndSync,
    clearError,
  } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      void refresh({ mode: "focus" });
    }, [refresh])
  );

  const onPressItem = async (id: number) => {
    await markNotificationRead(id);
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
          <Pressable style={styles.roundGhost} hitSlop={8} onPress={() => Alert.alert("المظهر", "تبديل الوضع الفاتح قريباً.")}>
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
            <NotificationListRow item={item} onPress={() => void onPressItem(item.id)} />
          )}
        />
      )}
    </View>
  );
}

function NotificationListRow({ item, onPress }: { item: NotificationItem; onPress: () => void }) {
  const badge = badgeForType(item.type);
  const actor = item.actor_name || item.title;
  const action = item.body || item.type;
  const t = timeShort(item.created_at);

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <View style={[styles.row, !item.read && styles.rowUnread]}>
        <AppText variant="micro" tone="muted" style={styles.timeCol}>
          {t}
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

const styles = StyleSheet.create({
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
});
