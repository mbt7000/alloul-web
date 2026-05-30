import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../layout/Screen";
import AppHeader from "../layout/AppHeader";
import AppText from "../ui/AppText";
import AppButton from "../ui/AppButton";
import ListRow from "../ui/ListRow";
import GlassCard from "../components/GlassCard";
import {
  CompanyActionTile,
  CompanyChip,
  CompanyEmptyState,
  CompanyHeroCard,
  CompanySectionLabel,
  CompanyStatTile,
} from "../../features/companies/components/CompanyBlocks";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { useCompany } from "../../state/company/CompanyContext";
import {
  getCompanyMembers,
  getCompanyStats,
  getDashboardActivity,
  type CompanyMemberRow,
  type CompanyStats,
  type DashboardActivityItem,
} from "../../api";

export default function CompanyProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(() => ({
    content: {
      padding: 16,
      paddingBottom: 110,
    },
    statRow: {
      flexDirection: "row" as const,
      gap: 10,
      marginTop: 10,
    },
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 10,
    },
    card: {
      padding: 14,
    },
    profileRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 8,
    },
    loadingWrap: {
      paddingVertical: 24,
      alignItems: "center" as const,
    },
    listWrap: {
      gap: 10,
    },
  }));

  const navigation = useNavigation<any>();
  const { company } = useCompany();
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [members, setMembers] = useState<CompanyMemberRow[]>([]);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void (async () => {
        try {
          const [companyStats, memberRows, activityRows] = await Promise.all([
            getCompanyStats().catch(() => null),
            getCompanyMembers().catch(() => [] as CompanyMemberRow[]),
            getDashboardActivity(4).catch(() => [] as DashboardActivityItem[]),
          ]);
          if (!active) return;
          setStats(companyStats);
          setMembers(Array.isArray(memberRows) ? memberRows : []);
          setActivity(Array.isArray(activityRows) ? activityRows : []);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="ملف الشركة" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CompanyHeroCard
          eyebrow="ملف الشركة"
          title={company?.name || "مساحة الشركة"}
          subtitle="نظرة منظّمة على هوية الشركة وتشغيلها ووحدات التعاون. يعمل هذا الملف كنقطة دخول إلى الخلاصة والملفات والتسليمات وإدارة الأعضاء."
          chips={[
            { label: company?.i_code ? `رمز الشركة ${company.i_code}` : "هوية الشركة", icon: "pricetag-outline", tone: "cyan" },
            { label: stats?.subscription_status || "المساحة نشطة", icon: "sparkles-outline", tone: "teal" },
          ]}
          actions={
            <>
              <AppButton
                label="افتح الخدمات"
                onPress={() => navigation.navigate("Apps")}
              />
              <AppButton label="افتح المساحة" tone="glass" onPress={() => navigation.navigate("CompanyWorkspace")} />
            </>
          }
        />

        <View style={styles.statRow}>
          <CompanyStatTile label="الأعضاء" value={loading ? "..." : String(stats?.total_members ?? members.length)} icon="people-outline" tone="teal" />
          <CompanyStatTile label="الأقسام" value={loading ? "..." : String(stats?.total_departments ?? 0)} icon="git-network-outline" tone="blue" />
        </View>
        <View style={styles.statRow}>
          <CompanyStatTile label="عناصر النشاط" value={loading ? "..." : String(activity.length)} icon="pulse-outline" tone="cyan" />
          <CompanyStatTile label="الخطة" value={stats?.plan_id || "Premium"} icon="diamond-outline" tone="amber" />
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="شاشات الشركة الأساسية" />
          <View style={styles.grid}>
            <CompanyActionTile label="الشركات" subtitle="الدليل والشركة المرتبطة" icon="business-outline" tone="cyan" onPress={() => navigation.navigate("Companies")} />
            <CompanyActionTile label="الملفات" subtitle="المستندات والأصول المشتركة" icon="folder-open-outline" tone="blue" onPress={() => navigation.navigate("CompanyFiles")} />
            <CompanyActionTile label="الأعضاء" subtitle="الأدوار والتعاون" icon="people-outline" tone="teal" onPress={() => navigation.navigate("Teams")} />
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="ملخص الملف" />
          <GlassCard style={styles.card}>
            <View style={styles.profileRow}>
              <CompanyChip label="شركة تشغيلية" icon="business-outline" tone="teal" />
              <CompanyChip label="واجهة عربية أولاً" icon="language-outline" tone="blue" />
            </View>
            <AppText variant="bodySm" tone="secondary" style={{ marginTop: 12, lineHeight: 22 }}>
              استخدم هذا الملف لتوضيح كيان الشركة قبل الانتقال إلى الإعلانات والأعضاء والتسليمات والملفات المشتركة. تحافظ كل وحدة على نفس النظام البصري مع تخطيط تشغيلي أكثر تركيزاً.
            </AppText>
          </GlassCard>
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="آخر الأعضاء" meta={loading ? "جارٍ التحميل" : String(members.length)} />
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accentCyan} />
            </View>
          ) : members.length === 0 ? (
            <CompanyEmptyState
              icon="people-outline"
              title="لم يتم تحميل أعضاء بعد"
              subtitle="ستظهر هنا الأدوار ومعلومات الدليل فور توفر بيانات عضوية الشركة."
            />
          ) : (
            <View style={styles.listWrap}>
              {members.slice(0, 4).map((member) => (
                <ListRow
                  key={member.id}
                  title={member.job_title || member.role}
                  subtitle={`المستخدم ${member.user_id} · الرمز ${member.i_code}`}
                  iconLeft="person-outline"
                  onPress={() => navigation.navigate("Teams")}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="آخر النشاطات" meta={loading ? "جارٍ التحميل" : String(activity.length)} />
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accentCyan} />
            </View>
          ) : activity.length === 0 ? (
            <CompanyEmptyState
              icon="pulse-outline"
              title="لا يوجد نشاط حديث للشركة"
              subtitle="ستظهر أحداث الخلاصة ومساحة العمل عندما يبدأ الفريق بنشر التحديثات."
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
      </ScrollView>
    </Screen>
  );
}

