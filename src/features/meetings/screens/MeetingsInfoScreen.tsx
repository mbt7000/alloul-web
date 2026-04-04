import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  type ViewStyle,
  Alert,
  Linking,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import GlassCard from "../../../shared/components/GlassCard";
import ListRow from "../../../shared/ui/ListRow";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import {
  getDashboardActivity,
  getHandoverWorkItems,
  getProjects,
  type DashboardActivityItem,
  type HandoverWorkItem,
  type ProjectRow,
} from "../../../api";
import { openMeetingProvider } from "../openMeetingLinks";
import { radius } from "../../../theme/radius";
import CompanyWorkModeTopBar from "../../companies/components/CompanyWorkModeTopBar";
import { useCompanyDailyRoom } from "../../../lib/useCompanyDailyRoom";

type AgendaRow = {
  key: string;
  title: string;
  subtitle: string;
  icon: "videocam-outline" | "swap-horizontal-outline" | "pulse-outline";
  kind: "activity" | "handover";
};

type DemoMeeting = {
  id: string;
  title: string;
  time: string;
  mode: "online" | "inperson";
  accent: "blue" | "green";
  extra: string;
  participants: number;
};

const DEMO_TODAY: DemoMeeting[] = [
  {
    id: "m1",
    title: "مراجعة أداء الربع الأول",
    time: "10:00 ص",
    mode: "online",
    accent: "blue",
    extra: "عبر الإنترنت",
    participants: 5,
  },
  {
    id: "m2",
    title: "اجتماع الفريق التقني",
    time: "02:30 م",
    mode: "inperson",
    accent: "green",
    extra: "في المكتب",
    participants: 8,
  },
];

function weekDaysFromToday(): { label: string; dayNum: number; key: string }[] {
  const out: { label: string; dayNum: number; key: string }[] = [];
  const labels = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const base = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({
      label: labels[d.getDay()],
      dayNum: d.getDate(),
      key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
    });
  }
  return out;
}

export default function MeetingsInfoScreen() {
  const navigation = useNavigation<any>();
  const { colors, mode } = useAppTheme();
  const { openCompanyDaily, dailyLoading } = useCompanyDailyRoom();
  const weekDays = useMemo(() => weekDaysFromToday(), []);
  const [dayIndex, setDayIndex] = useState(0);

  const styles = useThemedStyles((c) => ({
    scroll: { padding: 16, paddingBottom: 110, gap: 12 },
    card: { padding: 16 },
    daysRow: { flexDirection: "row" as const, gap: 8, marginBottom: 4 },
    dayPill: {
      minWidth: 56,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      alignItems: "center" as const,
    },
    dayPillActive: {
      backgroundColor: mode === "dark" ? c.white : c.black,
      borderColor: mode === "dark" ? c.white : c.black,
    },
    meetCard: {
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      padding: 16,
      marginBottom: 12,
      overflow: "hidden" as const,
    },
    accentBar: {
      position: "absolute" as const,
      top: 0,
      bottom: 0,
      width: 4,
      end: 0,
      borderTopRightRadius: radius.xxl,
      borderBottomRightRadius: radius.xxl,
    },
    meetMeta: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 8, flexWrap: "wrap" as const },
    avatars: { flexDirection: "row" as const, alignItems: "center" as const, marginTop: 12 },
    avatarDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(76,111,255,0.35)",
      borderWidth: 2,
      borderColor: c.cardElevated,
      marginStart: -8,
    },
    joinBtn: { marginTop: 14 },
    summaryRow: {
      flexDirection: "row" as const,
      gap: 8,
      marginTop: 12,
    },
    miniStat: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: c.bgCard,
    },
    actionsRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 8,
      marginTop: 12,
    },
    listWrap: { gap: 10 },
    loadingWrap: { paddingVertical: 24, alignItems: "center" as const },
    sectionLabel: { marginTop: 8, marginBottom: 4 },
    upcomingRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      padding: 14,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      marginBottom: 8,
    },
    upcomingBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.md,
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor: c.border,
    },
  }));

  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [handoverItems, setHandoverItems] = useState<HandoverWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, p, h] = await Promise.all([
        getDashboardActivity(12).catch(() => [] as DashboardActivityItem[]),
        getProjects().catch(() => [] as ProjectRow[]),
        getHandoverWorkItems().catch(() => [] as HandoverWorkItem[]),
      ]);
      setActivity(Array.isArray(a) ? a : []);
      setProjects(Array.isArray(p) ? p : []);
      setHandoverItems(Array.isArray(h) ? h : []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "تعذّر تحميل بيانات الاجتماعات";
      setError(msg);
      setActivity([]);
      setProjects([]);
      setHandoverItems([]);
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

  const agendaRows = useMemo((): AgendaRow[] => {
    if (activity.length > 0) {
      return activity.slice(0, 6).map((item, idx) => ({
        key: `${item.type}-${idx}`,
        title: item.title || `نشاط ${idx + 1}`,
        subtitle: item.time ? `${item.type} · ${item.time}` : item.type,
        icon: "pulse-outline",
        kind: "activity",
      }));
    }
    return handoverItems.slice(0, 6).map((item) => ({
      key: item.id,
      title: item.title,
      subtitle: `${item.owner_name} · ${item.current_assignee_name}`,
      icon: "swap-horizontal-outline",
      kind: "handover",
    }));
  }, [activity, handoverItems]);

  const todayCount = Math.min(agendaRows.length, 4);
  const weekCount = Math.min(agendaRows.length + projects.length, 12);

  const onAgendaPress = useCallback(
    (row: AgendaRow) => {
      if (row.kind === "handover") navigation.navigate("Handover");
      else navigation.navigate("Projects");
    },
    [navigation]
  );

  const accentColor = (a: DemoMeeting["accent"]) => (a === "blue" ? colors.accentBlue : colors.accentNeonGreen);

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title="الاجتماعات"
        leftButton="none"
        rightActions={<AppButton label="المشاريع" size="sm" onPress={() => navigation.navigate("Projects")} />}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
          {weekDays.map((d, i) => {
            const active = i === dayIndex;
            return (
              <Pressable
                key={d.key}
                onPress={() => setDayIndex(i)}
                style={({ pressed }) => [styles.dayPill, active && styles.dayPillActive, pressed && { opacity: 0.9 }]}
              >
                <AppText variant="micro" weight="bold" style={{ color: active ? (mode === "dark" ? colors.black : colors.white) : colors.textMuted }}>
                  {d.label}
                </AppText>
                <AppText
                  variant="title"
                  weight="bold"
                  style={{
                    marginTop: 4,
                    color: active ? (mode === "dark" ? colors.black : colors.white) : colors.textPrimary,
                  }}
                >
                  {d.dayNum}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        <AppText variant="micro" tone="muted" weight="bold" style={styles.sectionLabel}>
          اجتماعات اليوم
        </AppText>
        {DEMO_TODAY.map((m) => (
          <View key={m.id} style={styles.meetCard}>
            <View style={[styles.accentBar, { backgroundColor: accentColor(m.accent) }]} />
            <AppText variant="bodySm" weight="bold" numberOfLines={2} style={{ paddingEnd: 8 }}>
              {m.title}
            </AppText>
            <View style={styles.meetMeta}>
              <Ionicons name={m.mode === "online" ? "videocam-outline" : "location-outline"} size={16} color={colors.textMuted} />
              <AppText variant="caption" tone="muted">
                {m.time} · {m.extra}
              </AppText>
            </View>
            <View style={styles.avatars}>
              {[0, 1, 2].map((j) => (
                <View key={j} style={[styles.avatarDot, { marginStart: j === 0 ? 0 : -8 }]} />
              ))}
              <AppText variant="micro" tone="muted" style={{ marginStart: 10 }}>
                +{Math.max(0, m.participants - 3)}
              </AppText>
            </View>
            {m.mode === "online" ? (
              <AppButton
                label="انضم الآن"
                tone="primary"
                style={styles.joinBtn}
                onPress={() => void openMeetingProvider("meet")}
              />
            ) : (
              <AppButton
                label="عرض الموقع"
                tone="primary"
                style={styles.joinBtn}
                onPress={() => {
                  void Linking.openURL("https://maps.google.com").catch(() =>
                    Alert.alert("الموقع", "تعذّر فتح الخرائط على هذا الجهاز.")
                  );
                }}
              />
            )}
          </View>
        ))}

        <AppText variant="micro" tone="muted" weight="bold" style={styles.sectionLabel}>
          قريباً
        </AppText>
        <View style={styles.upcomingRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodySm" weight="bold" numberOfLines={2}>
              تخطيط مشروع آلول ون
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
              11:00 ص · 12 مشاركين
            </AppText>
          </View>
          <View style={styles.upcomingBadge}>
            <AppText variant="micro" weight="bold" tone="secondary">
              غداً
            </AppText>
          </View>
        </View>

        <GlassCard style={styles.card}>
          <AppText variant="bodySm" weight="bold">
            ابدأ اتصالاً مرئياً
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
            غرفة Daily مربوطة بشركتك على الخادم (فيديو + شات). باقي الأزرار تفتح روابط خارجية.
          </AppText>
          <View style={styles.actionsRow}>
            <AppButton
              label={dailyLoading ? "Daily…" : "Daily (الشركة)"}
              tone="primary"
              size="sm"
              onPress={() => void openCompanyDaily()}
              disabled={dailyLoading}
            />
            <AppButton label="Meet" tone="glass" size="sm" onPress={() => void openMeetingProvider("meet")} />
            <AppButton label="Zoom" tone="glass" size="sm" onPress={() => void openMeetingProvider("zoom")} />
            <AppButton label="Teams" tone="glass" size="sm" onPress={() => void openMeetingProvider("teams")} />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <AppText variant="bodySm" tone="secondary">
            اربط الاجتماعات بالمشاريع والتسليم والنشاط في المساحة.
          </AppText>
          <View style={styles.summaryRow}>
            <MiniStat label="اليوم" value={loading ? "..." : String(todayCount)} style={styles.miniStat} />
            <MiniStat label="الأسبوع" value={loading ? "..." : String(weekCount)} style={styles.miniStat} />
            <MiniStat label="مشاريع" value={loading ? "..." : String(projects.length)} style={styles.miniStat} />
          </View>
          <View style={styles.actionsRow}>
            <AppButton label="التسليم" tone="glass" size="sm" onPress={() => navigation.navigate("Handover")} />
            <AppButton label="الفريق" tone="glass" size="sm" onPress={() => navigation.navigate("Teams")} />
            <AppButton label="المحادثات" tone="glass" size="sm" onPress={() => navigation.navigate("Chat")} />
          </View>
        </GlassCard>

        <AppText variant="micro" tone="muted" weight="bold" style={styles.sectionLabel}>
          جدول مختصر
        </AppText>
        <View style={styles.listWrap}>
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
              <AppButton label="إعادة المحاولة" onPress={() => { setLoading(true); void load(); }} />
            </GlassCard>
          ) : agendaRows.length === 0 ? (
            <GlassCard style={styles.card}>
              <AppText variant="caption" tone="muted">
                لا توجد بنود من الخادم بعد. استخدم «انضم الآن» أو المنصات أعلاه.
              </AppText>
            </GlassCard>
          ) : (
            agendaRows.map((row) => (
              <ListRow
                key={row.key}
                title={row.title}
                subtitle={row.subtitle}
                iconLeft={row.icon}
                onPress={() => onAgendaPress(row)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function MiniStat({ label, value, style }: { label: string; value: string; style: ViewStyle }) {
  return (
    <View style={style}>
      <AppText variant="micro" tone="muted" weight="bold">
        {label}
      </AppText>
      <AppText variant="bodySm" weight="bold" style={{ marginTop: 4 }}>
        {value}
      </AppText>
    </View>
  );
}
