import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/ThemeContext";
import AppText from "../../../shared/ui/AppText";
import { apiFetch } from "../../../api";
import { useAuth } from "../../../state/auth/AuthContext";
import { radius } from "../../../theme/radius";

type CallEntry = {
  id: number;
  call_type: "video" | "audio";
  status: "ended" | "missed" | "rejected" | "accepted" | "ringing";
  duration: number | null;
  started_at: string | null;
  is_outgoing: boolean;
  other_user_id: number;
  other_user_name: string;
  other_user_avatar: string | null;
};

function formatDuration(secs: number | null): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}د ${s}ث` : `${s}ث`;
}

function timeAgo(raw: string | null): string {
  if (!raw) return "";
  const mins = Math.floor((Date.now() - new Date(raw).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} س`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ي`;
  return new Date(raw).toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

export default function CallsPanelScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [calls, setCalls] = useState<CallEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await apiFetch("/call/history?limit=100");
      setCalls(Array.isArray(data) ? data : []);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const callBack = useCallback((entry: CallEntry) => {
    navigation.navigate("TeamMeetings", { preselectedUserId: entry.other_user_id });
  }, [navigation]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.mediaCanvas },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.bgCard,
      alignItems: "center", justifyContent: "center",
    },
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
      marginBottom: 8,
    },
    rowMissed: { borderColor: colors.accentRose + "55" },
    avatar: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: colors.bgCard,
      alignItems: "center", justifyContent: "center",
    },
    callbackBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.accentCyan + "22",
      alignItems: "center", justifyContent: "center",
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  }), [colors]);

  const renderItem = ({ item }: { item: CallEntry }) => {
    const isMissed = item.status === "missed" || item.status === "rejected";
    const isOutgoing = item.is_outgoing;
    const dirIcon: keyof typeof Ionicons.glyphMap = isOutgoing
      ? item.call_type === "video" ? "videocam-outline" : "call-outline"
      : item.call_type === "video" ? "videocam" : "call";

    return (
      <View style={[styles.row, isMissed && styles.rowMissed]}>
        <View style={styles.avatar}>
          <AppText variant="body" weight="bold" style={{ color: colors.textPrimary }}>
            {(item.other_user_name || "?").slice(0, 1)}
          </AppText>
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="bodySm" weight="bold" numberOfLines={1}
            style={{ color: isMissed ? colors.accentRose : colors.textPrimary }}>
            {item.other_user_name}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons
              name={dirIcon}
              size={13}
              color={isMissed ? colors.accentRose : colors.textMuted}
            />
            <AppText variant="micro" style={{ color: isMissed ? colors.accentRose : colors.textMuted }}>
              {isMissed
                ? item.status === "rejected" ? "مرفوضة" : "فائتة"
                : item.duration ? formatDuration(item.duration) : item.call_type === "video" ? "فيديو" : "صوتي"}
            </AppText>
            {item.started_at && (
              <AppText variant="micro" tone="muted" style={{ marginStart: 4 }}>
                {timeAgo(item.started_at)}
              </AppText>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.callbackBtn}
          hitSlop={8}
          onPress={() => callBack(item)}
        >
          <Ionicons
            name={item.call_type === "video" ? "videocam" : "call"}
            size={16}
            color={colors.accentCyan}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <AppText variant="h3" weight="bold" style={{ flex: 1 }}>
          سجل المكالمات
        </AppText>
      </View>

      {loading && calls.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.accentCyan}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="call-outline" size={48} color={colors.textMuted} />
              <AppText variant="body" tone="muted" style={{ marginTop: 12, textAlign: "center" }}>
                لا توجد مكالمات بعد
              </AppText>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
