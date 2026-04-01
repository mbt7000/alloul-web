import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppButton from "../../../shared/ui/AppButton";
import AppInput from "../../../shared/ui/AppInput";
import AppText from "../../../shared/ui/AppText";
import ListRow from "../../../shared/ui/ListRow";
import {
  CompanyEmptyState,
  CompanyHeroCard,
  CompanySectionLabel,
  CompanyStatTile,
} from "../components/CompanyBlocks";
import ServiceListCard from "../../../shared/components/ServiceListCard";
import { useCompany } from "../../../state/company/CompanyContext";
import {
  getCompanyStats,
  getDashboardActivity,
  getDashboardStats,
  getProjects,
  type CompanyStats,
  type DashboardActivityItem,
  type DashboardStats,
} from "../../../api";
import { colors } from "../../../theme/colors";

type CompanyModule = {
  key: string;
  title: string;
  subtitle: string;
  icon: "business-outline" | "newspaper-outline" | "grid-outline" | "swap-horizontal-outline" | "folder-open-outline" | "people-outline";
  tone: "cyan" | "teal" | "blue" | "amber";
  route: string;
};

const REQUIRED_MODULES: CompanyModule[] = [
  { key: "list", title: "الشركات", subtitle: "الدليل والشركة المرتبطة", icon: "business-outline", tone: "cyan", route: "Companies" },
  { key: "profile", title: "الملف", subtitle: "النظرة العامة وهوية الشركة", icon: "grid-outline", tone: "blue", route: "Company" },
  { key: "feed", title: "الخلاصة", subtitle: "الإعلانات والتحديثات", icon: "newspaper-outline", tone: "teal", route: "CompanyFeed" },
  { key: "handover", title: "التسليم", subtitle: "المهام والملاحظات والملفات", icon: "swap-horizontal-outline", tone: "amber", route: "Handover" },
  { key: "files", title: "الملفات", subtitle: "المكتبة المشتركة والأصول", icon: "folder-open-outline", tone: "blue", route: "CompanyFiles" },
  { key: "members", title: "الأعضاء", subtitle: "الأشخاص والأدوار والفرق", icon: "people-outline", tone: "teal", route: "Teams" },
];

export default function ServicesHubScreen() {
  const navigation = useNavigation<any>();
  const { company } = useCompany();
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [dash, setDash] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [projectsCount, setProjectsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void (async () => {
        try {
          const [companyStats, dashboardStats, dashboardActivity, projects] = await Promise.all([
            getCompanyStats().catch(() => null),
            getDashboardStats().catch(() => null),
            getDashboardActivity(5).catch(() => [] as DashboardActivityItem[]),
            getProjects().catch(() => []),
          ]);
          if (!active) return;
          setStats(companyStats);
          setDash(dashboardStats);
          setActivity(Array.isArray(dashboardActivity) ? dashboardActivity : []);
          setProjectsCount(Array.isArray(projects) ? projects.length : 0);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const visibleModules = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return REQUIRED_MODULES;
    return REQUIRED_MODULES.filter((item) =>
      `${item.title} ${item.subtitle}`.toLowerCase().includes(trimmed)
    );
  }, [query]);

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader
        title="الخدمات"
        leftButton="none"
        rightActions={
          company ? <AppButton label="المساحة" size="sm" onPress={() => navigation.navigate("CompanyWorkspace")} /> : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CompanyHeroCard
          eyebrow="مركز خدمات الشركة"
          title={company?.name || "مساحة الشركة"}
          subtitle="واجهة الشركات مبنية حول وحدات تشغيلية واضحة. تظهر الشاشات الأساسية أولاً حتى ينتقل الفريق بين قائمة الشركات والملف والخلاصة والخدمات والتسليم والملفات والأعضاء دون تداخل بصري."
          chips={[
            { label: company ? "شركة مرتبطة" : "لا توجد شركة مرتبطة", icon: "business-outline", tone: company ? "teal" : "amber" },
            { label: "الشاشات الأساسية", icon: "checkmark-done-outline", tone: "cyan" },
          ]}
        />

        {!company ? (
          <View style={{ marginTop: 18 }}>
            <CompanyEmptyState
              icon="business-outline"
              title="لا توجد شركة متاحة"
              subtitle="تحتاج إلى شركة مرتبطة لاستخدام مركز الخدمات الكامل. ارجع إلى الرئيسية أو انضم إلى مساحة شركة أولاً."
              actionLabel="العودة للرئيسية"
              onAction={() => navigation.navigate("Companies")}
            />
          </View>
        ) : (
          <>
            <View style={{ marginTop: 14 }}>
              <AppInput
                value={query}
                onChangeText={setQuery}
                placeholder="ابحث في وحدات الشركة"
                iconLeft="search-outline"
              />
            </View>

            <View style={styles.statRow}>
              <CompanyStatTile label="الأعضاء" value={loading ? "..." : String(stats?.total_members ?? 0)} icon="people-outline" tone="teal" />
              <CompanyStatTile label="التسليمات" value={loading ? "..." : String(dash?.total_handovers ?? 0)} icon="swap-horizontal-outline" tone="amber" />
            </View>
            <View style={styles.statRow}>
              <CompanyStatTile label="المهام المفتوحة" value={loading ? "..." : String(dash?.pending_tasks ?? 0)} icon="checkbox-outline" tone="cyan" />
              <CompanyStatTile label="المشاريع" value={loading ? "..." : String(projectsCount)} icon="folder-open-outline" tone="blue" />
            </View>

            <View style={{ marginTop: 20 }}>
              <CompanySectionLabel label="شاشات الشركة الأساسية" meta={String(visibleModules.length)} />
              <View style={styles.listCards}>
                {visibleModules.map((module) => (
                  <ServiceListCard
                    key={module.key}
                    title={module.title}
                    subtitle={module.subtitle}
                    icon={module.icon}
                    onPress={() => navigation.navigate(module.route)}
                  />
                ))}
              </View>
            </View>

            <View style={{ marginTop: 20 }}>
              <CompanySectionLabel label="آخر نشاطات المساحة" meta={loading ? "جارٍ التحميل" : String(activity.length)} />
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={colors.accentCyan} />
                </View>
              ) : activity.length === 0 ? (
                <CompanyEmptyState
                  icon="pulse-outline"
                  title="لا يوجد نشاط حديث"
                  subtitle="ستظهر هنا تغييرات المشاريع والخلاصة والتسليمات عندما تكون واجهة الشركة نشطة."
                />
              ) : (
                <View style={styles.listWrap}>
                  {activity.map((item, index) => (
                    <ListRow
                      key={`${item.type}-${index}`}
                      title={item.title}
                      subtitle={item.time ? `${item.type} · ${item.time}` : item.type}
                      iconLeft="pulse-outline"
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={{ marginTop: 20 }}>
              <CompanySectionLabel label="مسارات سريعة" />
              <View style={styles.listWrap}>
                <ListRow title="خلاصة الشركة" subtitle="التحديثات والإعلانات الداخلية" iconLeft="newspaper-outline" onPress={() => navigation.navigate("CompanyFeed")} />
                <ListRow title="ملفات الشركة" subtitle="المكتبة المشتركة وملفات التسليم" iconLeft="folder-open-outline" onPress={() => navigation.navigate("CompanyFiles")} />
                <ListRow title="الأعضاء" subtitle="الأشخاص والأدوار والتعاون" iconLeft="people-outline" onPress={() => navigation.navigate("Teams")} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  listCards: { marginTop: 8 },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  listWrap: {
    gap: 10,
  },
});
