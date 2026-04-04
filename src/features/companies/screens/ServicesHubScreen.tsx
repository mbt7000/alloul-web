import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppButton from "../../../shared/ui/AppButton";
import AppInput from "../../../shared/ui/AppInput";
import AppText from "../../../shared/ui/AppText";
import ServiceListCard from "../../../shared/components/ServiceListCard";
import { CompanyEmptyState, CompanySectionLabel } from "../components/CompanyBlocks";
import { useCompany } from "../../../state/company/CompanyContext";
import {
  getCompanyStats,
  getDashboardActivity,
  getDashboardStats,
  type CompanyStats,
  type DashboardActivityItem,
  type DashboardStats,
} from "../../../api";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { radius } from "../../../theme/radius";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";
import { useCompanyDailyRoom } from "../../../lib/useCompanyDailyRoom";

type HubModule = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

/** مسارات ثانوية — ترتيب واحد: عمل → إدارة */
const WORK_MODULES: HubModule[] = [
  { key: "handover", title: "التسليم", subtitle: "استمرارية العمل والمهام", icon: "shield-checkmark-outline", route: "Handover" },
  { key: "files", title: "الملفات", subtitle: "مستندات ومشاركة آمنة", icon: "folder-open-outline", route: "CompanyFiles" },
  { key: "inbox", title: "الموافقات", subtitle: "طلبات تحتاج قرارك", icon: "file-tray-outline", route: "Inbox" },
];

const ADMIN_MODULES: HubModule[] = [
  { key: "list", title: "الشركات", subtitle: "قائمة الشركات المرتبطة", icon: "business-outline", route: "Companies" },
  { key: "profile", title: "ملف الشركة", subtitle: "هوية وبيانات", icon: "grid-outline", route: "Company" },
  { key: "feed", title: "الخلاصة", subtitle: "إعلانات وتحديثات", icon: "newspaper-outline", route: "CompanyFeed" },
];

function filterModules(list: HubModule[], q: string): HubModule[] {
  const s = q.trim().toLowerCase();
  if (!s) return list;
  return list.filter((m) => `${m.title} ${m.subtitle}`.toLowerCase().includes(s));
}

type QuickItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  accent?: boolean;
  onPress?: () => void;
  loading?: boolean;
};

export default function ServicesHubScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { company } = useCompany();
  const { colors } = useAppTheme();
  const tileGap = 10;
  const tileW = Math.max(148, (width - 32 - tileGap) / 2);

  const styles = useThemedStyles((c) => ({
    content: {
      padding: 16,
      paddingBottom: 110,
    },
    intro: {
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      padding: 14,
      marginBottom: 16,
    },
    quickRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: tileGap,
      marginTop: 8,
    },
    quickTile: {
      width: tileW,
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      paddingVertical: 16,
      paddingHorizontal: 12,
      alignItems: "center" as const,
      minHeight: 118,
      justifyContent: "center" as const,
    },
    quickTileAccent: {
      borderColor: "rgba(56,232,255,0.45)",
      backgroundColor: "rgba(56,232,255,0.08)",
    },
    quickIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.06)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 10,
    },
    quickIconWrapAccent: {
      backgroundColor: "rgba(56,232,255,0.15)",
    },
    listCards: { marginTop: 6 },
    loadingWrap: {
      paddingVertical: 20,
      alignItems: "center" as const,
    },
    activityCard: {
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardElevated,
      padding: 12,
      marginBottom: 8,
    },
    hint: {
      marginTop: 10,
      padding: 12,
      borderRadius: radius.lg,
      backgroundColor: "rgba(255,255,255,0.04)",
      borderWidth: 1,
      borderColor: c.border,
    },
  }));

  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [dash, setDash] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const { openCompanyDaily, dailyLoading } = useCompanyDailyRoom();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void (async () => {
        try {
          const [companyStats, dashboardStats, dashboardActivity] = await Promise.all([
            getCompanyStats().catch(() => null),
            getDashboardStats().catch(() => null),
            getDashboardActivity(6).catch(() => [] as DashboardActivityItem[]),
          ]);
          if (!active) return;
          setStats(companyStats);
          setDash(dashboardStats);
          setActivity(Array.isArray(dashboardActivity) ? dashboardActivity : []);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const quickItems: QuickItem[] = useMemo(
    () => [
      {
        key: "daily",
        title: "غرفة Daily",
        subtitle: "فيديو + شات الفريق",
        icon: "videocam-outline",
        accent: true,
        onPress: () => void openCompanyDaily(),
        loading: dailyLoading,
      },
      { key: "chat", title: "المحادثات", subtitle: "رسائل داخلية", icon: "chatbubbles-outline", route: "Chat" },
      { key: "teams", title: "الفرق", subtitle: "الأعضاء والأدوار", icon: "people-outline", route: "Teams" },
      { key: "meetings", title: "الاجتماعات", subtitle: "جداول وروابط", icon: "calendar-outline", route: "Meetings" },
    ],
    [dailyLoading, openCompanyDaily]
  );

  const work = useMemo(() => filterModules(WORK_MODULES, query), [query]);
  const admin = useMemo(() => filterModules(ADMIN_MODULES, query), [query]);
  const quickFiltered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return quickItems;
    return quickItems.filter((q) => `${q.title} ${q.subtitle}`.toLowerCase().includes(s));
  }, [quickItems, query]);

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title="الخدمات"
        leftButton="none"
        rightActions={
          company ? <AppButton label="المساحة" size="sm" onPress={() => navigation.navigate("CompanyWorkspace")} /> : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <AppText variant="title" weight="bold" numberOfLines={2}>
            {company?.name || "Alloul&Q"}
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 6 }} numberOfLines={3}>
            ابدأ من «غرفة Daily» للتواصل الصوتي/المرئي والشات داخل الجلسة، ثم استخدم بقية الاختصارات بالترتيب.
          </AppText>
        </View>

        {!company ? (
          <CompanyEmptyState
            icon="business-outline"
            title="لا توجد شركة متاحة"
            subtitle="اربط شركة أو انضم إلى مساحة للوصول إلى الخدمات."
            actionLabel="الشركات"
            onAction={() => navigation.navigate("Companies")}
          />
        ) : (
          <>
            <AppInput value={query} onChangeText={setQuery} placeholder="ابحث في الخدمات…" iconLeft="search-outline" />

            <View style={{ marginTop: 18 }}>
              <CompanySectionLabel label="١ — التواصل السريع" meta={String(quickFiltered.length)} />
              <View style={styles.quickRow}>
                {quickFiltered.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      if (item.onPress) item.onPress();
                      else if (item.route) navigation.navigate(item.route);
                    }}
                    disabled={item.loading}
                    style={({ pressed }) => [
                      styles.quickTile,
                      item.accent && styles.quickTileAccent,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <View style={[styles.quickIconWrap, item.accent && styles.quickIconWrapAccent]}>
                      {item.loading ? (
                        <ActivityIndicator color={colors.accentCyan} />
                      ) : (
                        <Ionicons name={item.icon} size={26} color={item.accent ? colors.accentCyan : colors.textPrimary} />
                      )}
                    </View>
                    <AppText variant="bodySm" weight="bold" style={{ textAlign: "center" }} numberOfLines={2}>
                      {item.title}
                    </AppText>
                    <AppText variant="micro" tone="muted" style={{ textAlign: "center", marginTop: 4 }} numberOfLines={2}>
                      {item.subtitle}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.hint}>
                <AppText variant="micro" tone="muted" style={{ textAlign: "right", lineHeight: 18 }}>
                  غرفة Daily مخصّصة لشركتك على الخادم؛ كل عضو ينضم بنفس الرابط بعد تسجيل الدخول. المحادثات النصية داخل الجلسة تظهر في واجهة Daily.
                </AppText>
              </View>
            </View>

            <View style={{ marginTop: 22 }}>
              <CompanySectionLabel label="٢ — العمل والموافقات" meta={String(work.length)} />
              <View style={styles.listCards}>
                {work.map((m) => (
                  <ServiceListCard
                    key={m.key}
                    title={m.title}
                    subtitle={m.subtitle}
                    icon={m.icon}
                    onPress={() => navigation.navigate(m.route)}
                  />
                ))}
              </View>
            </View>

            <View style={{ marginTop: 22 }}>
              <CompanySectionLabel label="٣ — إدارة المساحة" meta={String(admin.length)} />
              <View style={styles.listCards}>
                {admin.map((m) => (
                  <ServiceListCard
                    key={m.key}
                    title={m.title}
                    subtitle={m.subtitle}
                    icon={m.icon}
                    onPress={() => navigation.navigate(m.route)}
                  />
                ))}
              </View>
            </View>

            <View style={{ marginTop: 22 }}>
              <CompanySectionLabel
                label="نشاط حديث"
                meta={loading ? "…" : `${stats?.total_members ?? 0} عضو · ${dash?.pending_tasks ?? 0} مهام`}
              />
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={colors.accentCyan} />
                </View>
              ) : activity.length === 0 ? (
                <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>
                  لا يوجد نشاط مسجّل مؤخراً.
                </AppText>
              ) : (
                activity.slice(0, 4).map((item, index) => (
                  <View key={`${item.type}-${index}`} style={styles.activityCard}>
                    <AppText variant="bodySm" weight="bold" numberOfLines={2}>
                      {item.title}
                    </AppText>
                    <AppText variant="micro" tone="muted" style={{ marginTop: 6 }}>
                      {item.time ? `${item.type} · ${item.time}` : item.type}
                    </AppText>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
