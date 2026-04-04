import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import AppInput from "../../../shared/ui/AppInput";
import { CompanyEmptyState } from "../components/CompanyBlocks";
import { useCompany } from "../../../state/company/CompanyContext";
import { getCompanyMembers, getStreamCredentials, streamUserIdForAppUser, type CompanyMemberRow } from "../../../api";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { radius } from "../../../theme/radius";
import { openMeetingProvider } from "../../meetings/openMeetingLinks";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";
import AppButton from "../../../shared/ui/AppButton";
import { useCompanyDailyRoom } from "../../../lib/useCompanyDailyRoom";

const TEAM_LABELS = ["فريق التطوير", "فريق التصميم", "الموارد البشرية", "العمليات", "الإدارة"];

type TeamBucket = { id: string; name: string; count: number; memberIds: Set<number> };

function statusForUser(userId: number): "online" | "away" | "offline" {
  const m = userId % 3;
  if (m === 0) return "online";
  if (m === 1) return "away";
  return "offline";
}

function statusColor(s: "online" | "away" | "offline", colors: { success: string; warning: string; textMuted: string }) {
  if (s === "online") return colors.success;
  if (s === "away") return colors.warning;
  return colors.textMuted;
}

export default function TeamScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    content: { paddingBottom: 110 },
    searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
    sectionLabel: { paddingHorizontal: 16, marginBottom: 10 },
    teamsScroll: { paddingHorizontal: 16, marginBottom: 18 },
    teamChip: {
      width: 148,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      marginEnd: 10,
      alignItems: "center" as const,
    },
    teamChipActive: {
      borderColor: c.white,
      backgroundColor: "rgba(255,255,255,0.10)",
    },
    membersHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    memberCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 14,
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "rgba(76,111,255,0.2)",
      borderWidth: 1,
      borderColor: "rgba(76,111,255,0.35)",
    },
    avatarWrap: { position: "relative" as const },
    dot: {
      position: "absolute" as const,
      bottom: 2,
      end: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.cardElevated,
    },
    actionBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    actionsRow: { flexDirection: "row" as const, gap: 8 },
    centerBlock: { flex: 1, gap: 4 },
    loadingWrap: { paddingVertical: 40, alignItems: "center" as const },
  }));

  const { company } = useCompany();
  const { openCompanyDaily, dailyLoading } = useCompanyDailyRoom();
  const [items, setItems] = useState<CompanyMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getCompanyMembers();
      setItems(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "تعذّر تحميل الأعضاء";
      setError(message);
      setItems([]);
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

  const teams = useMemo((): TeamBucket[] => {
    const map = new Map<string, CompanyMemberRow[]>();
    for (const m of items) {
      const key = m.department_id != null ? `d-${m.department_id}` : "general";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    const buckets: TeamBucket[] = [];
    let idx = 0;
    for (const [key, members] of map.entries()) {
      const name =
        key === "general"
          ? "الفريق العام"
          : TEAM_LABELS[idx % TEAM_LABELS.length] || `قسم ${key.replace("d-", "")}`;
      idx += 1;
      buckets.push({
        id: key,
        name,
        count: members.length,
        memberIds: new Set(members.map((x) => x.user_id)),
      });
    }
    return buckets.sort((a, b) => b.count - a.count);
  }, [items]);

  const filteredMembers = useMemo(() => {
    let list = items;
    if (selectedTeamId !== "all") {
      const t = teams.find((x) => x.id === selectedTeamId);
      if (t) list = items.filter((m) => t.memberIds.has(m.user_id));
    }
    const s = query.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (m) =>
        `${m.job_title || ""} ${m.role} ${m.user_id} ${m.i_code}`.toLowerCase().includes(s)
    );
  }, [items, teams, selectedTeamId, query]);

  const onCall = useCallback(
    async (member: CompanyMemberRow) => {
      const phone = member.phone?.trim();
      if (phone) {
        const compact = phone.replace(/\s/g, "");
        const url = `tel:${compact}`;
        try {
          if (await Linking.canOpenURL(url)) {
            await Linking.openURL(url);
            return;
          }
        } catch {
          /* يكمّل لمسار Stream */
        }
      }
      try {
        await getStreamCredentials();
        const calleeId = streamUserIdForAppUser(member.user_id);
        Alert.alert(
          "اتصال عبر التطبيق (Stream)",
          `الخادم يوفّر GetStream. معرّف الطرف الآخر ليس رقم جوال بل:\n\n${calleeId}\n\nاربط SDK المكالمات (مثل @stream-io/video-react-native-sdk) بهذا المعرّف مع نفس الـ API key والـ token الذي يعيده /stream/credentials.`,
          [
            { text: "حسناً", style: "default" },
            { text: "Daily", onPress: () => void openCompanyDaily() },
            { text: "Meet", onPress: () => void openMeetingProvider("meet") },
            { text: "المحادثات", onPress: () => navigation.navigate("Chat") },
          ]
        );
      } catch {
        Alert.alert(
          "اتصال",
          "لا يوجد رقم هاتف للعضو وStream غير مفعّل أو غير متاح لحسابك. جرّب غرفة Daily أو Meet أو المحادثات.",
          [
            { text: "إلغاء", style: "cancel" },
            { text: "Daily", onPress: () => void openCompanyDaily() },
            { text: "اجتماع Meet", onPress: () => void openMeetingProvider("meet") },
            { text: "المحادثات", onPress: () => navigation.navigate("Chat") },
          ]
        );
      }
    },
    [navigation, openCompanyDaily]
  );

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <CompanyWorkModeTopBar />
      <AppHeader title="الفرق" leftButton="none" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchWrap}>
          <AppInput value={query} onChangeText={setQuery} placeholder="بحث عن موظف أو فريق…" iconLeft="search-outline" />
        </View>

        {company ? (
          <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
            <AppButton
              label={dailyLoading ? "جاري فتح Daily…" : "غرفة Daily — فيديو وشات للفريق"}
              tone="primary"
              size="sm"
              onPress={() => void openCompanyDaily()}
              disabled={dailyLoading}
            />
          </View>
        ) : null}

        <AppText variant="micro" tone="muted" weight="bold" style={styles.sectionLabel}>
          الفرق
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamsScroll}>
          {(
            [
              {
                id: "all",
                name: "الكل",
                count: items.length,
                memberIds: new Set(items.map((i) => i.user_id)),
              } as TeamBucket,
              ...teams,
            ] as TeamBucket[]
          ).map((team) => {
            const active = selectedTeamId === team.id;
            return (
              <Pressable
                key={team.id}
                onPress={() => setSelectedTeamId(team.id)}
                style={({ pressed }) => [styles.teamChip, active && styles.teamChipActive, pressed && { opacity: 0.92 }]}
              >
                <Ionicons name="people-outline" size={22} color={colors.textPrimary} />
                <AppText variant="bodySm" weight="bold" style={{ marginTop: 8, textAlign: "center" }} numberOfLines={2}>
                  {team.name}
                </AppText>
                <AppText variant="micro" tone="muted" style={{ marginTop: 4 }}>
                  {team.count} عضو
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.membersHeader}>
          <AppText variant="micro" tone="muted" weight="bold">
            أعضاء الفريق
          </AppText>
          <AppText variant="micro" tone="muted">
            {company?.name || ""}
          </AppText>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.accentCyan} />
          </View>
        ) : error ? (
          <View style={{ paddingHorizontal: 16 }}>
            <CompanyEmptyState
              icon="alert-circle-outline"
              title="تعذّر التحميل"
              subtitle={error}
              actionLabel="إعادة المحاولة"
              onAction={() => {
                setLoading(true);
                void load();
              }}
            />
          </View>
        ) : filteredMembers.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <CompanyEmptyState
              icon="people-outline"
              title="لا يوجد أعضاء"
              subtitle="اضبط البحث أو اختر فريقاً آخر."
            />
          </View>
        ) : (
          filteredMembers.map((item) => {
            const st = statusForUser(item.user_id);
            const showShield = item.role === "owner" || item.role === "admin" || item.role === "manager";
            return (
              <View key={item.id} style={styles.memberCard}>
                <View style={styles.actionsRow}>
                  <Pressable style={styles.actionBtn} onPress={() => void onCall(item)} accessibilityLabel="اتصال">
                    <Ionicons name="call-outline" size={18} color={colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate("Chat")}
                    accessibilityLabel="مراسلة"
                  >
                    <Ionicons name="mail-outline" size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>
                <View style={styles.centerBlock}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <AppText variant="bodySm" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {item.job_title || item.role}
                    </AppText>
                    {showShield ? <Ionicons name="shield-checkmark" size={16} color={colors.accentBlue} /> : null}
                  </View>
                  <AppText variant="caption" tone="muted" numberOfLines={2}>
                    {item.role}
                    {item.department_id != null ? ` · قسم ${item.department_id}` : ""}
                  </AppText>
                </View>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    <AppText variant="bodySm" weight="bold" style={{ color: colors.accentBlue }}>
                      {(item.i_code || "?").slice(0, 2).toUpperCase()}
                    </AppText>
                  </View>
                  <View style={[styles.dot, { backgroundColor: statusColor(st, colors) }]} />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
