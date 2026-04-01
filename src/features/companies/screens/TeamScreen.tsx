import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import GlassCard from "../../../shared/components/GlassCard";
import ListRow from "../../../shared/ui/ListRow";
import {
  CompanyEmptyState,
  CompanyHeroCard,
  CompanySectionLabel,
  CompanyStatTile,
} from "../components/CompanyBlocks";
import { useCompany } from "../../../state/company/CompanyContext";
import { getCompanyMembers, type CompanyMemberRow } from "../../../api";
import { colors } from "../../../theme/colors";

export default function TeamScreen() {
  const navigation = useNavigation<any>();
  const { company } = useCompany();
  const [items, setItems] = useState<CompanyMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const departments = useMemo(
    () => new Set(items.map((item) => item.department_id).filter((value) => value != null)).size,
    [items]
  );
  const managers = useMemo(() => items.filter((item) => item.manager_id != null).length, [items]);

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader
        title="الأعضاء"
        rightActions={<AppButton label="الملفات" size="sm" onPress={() => navigation.navigate("CompanyFiles")} />}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        <CompanyHeroCard
          eyebrow="وحدة الأعضاء"
          title={company?.name || "أعضاء الشركة"}
          subtitle="تظهر الأدوار والهيكل الإداري داخل دليل منظم حتى يبقى التعاون في واجهة الشركات تشغيلياً لا اجتماعياً."
          chips={[
            { label: `${items.length} أعضاء`, icon: "people-outline", tone: "teal" },
            { label: `${departments} أقسام`, icon: "git-network-outline", tone: "blue" },
          ]}
          actions={
            <>
              <AppButton label="افتح الملف" onPress={() => navigation.navigate("Company")} />
              <AppButton label="افتح التسليم" tone="glass" onPress={() => navigation.navigate("Handover")} />
            </>
          }
        />

        <View style={styles.statRow}>
          <CompanyStatTile label="الأعضاء" value={loading ? "..." : String(items.length)} icon="people-outline" tone="teal" />
          <CompanyStatTile label="الأقسام" value={loading ? "..." : String(departments)} icon="git-network-outline" tone="blue" />
        </View>
        <View style={styles.statRow}>
          <CompanyStatTile label="المديرون" value={loading ? "..." : String(managers)} icon="person-circle-outline" tone="cyan" />
          <CompanyStatTile label="الأدوار" value={loading ? "..." : String(new Set(items.map((item) => item.role)).size)} icon="shield-outline" tone="amber" />
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="الدليل" meta={loading ? "جارٍ التحميل" : String(items.length)} />
          {loading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accentCyan} />
            </View>
          ) : error ? (
            <CompanyEmptyState
              icon="alert-circle-outline"
              title="تعذّر تحميل الأعضاء"
              subtitle={error}
              actionLabel="إعادة المحاولة"
              onAction={() => {
                setLoading(true);
                void load();
              }}
            />
          ) : items.length === 0 ? (
            <CompanyEmptyState
              icon="people-outline"
              title="لا يوجد أعضاء بعد"
              subtitle="عند انضمام المستخدمين إلى الشركة سيظهرون هنا مع الدور والمسمى وسياق الصلاحيات."
            />
          ) : (
            <View style={styles.listWrap}>
              {items.map((item) => (
                <GlassCard key={item.id} style={styles.card}>
                  <View style={styles.cardHead}>
                    <View style={styles.avatar}>
                      <AppText variant="bodySm" weight="bold" style={{ color: colors.accentBlue }}>
                        {(item.i_code || "?").slice(0, 2).toUpperCase()}
                      </AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodySm" weight="bold">
                        {item.job_title || item.role}
                      </AppText>
                      <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                        المستخدم {item.user_id} · الرمز {item.i_code}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.metaWrap}>
                    <ListRow
                      title={item.role}
                      subtitle={item.department_id ? `القسم ${item.department_id}` : "لا يوجد قسم محدد"}
                      iconLeft="briefcase-outline"
                      style={styles.innerRow}
                      right={<View />}
                    />
                    <ListRow
                      title={item.manager_id ? `المدير ${item.manager_id}` : "لا يوجد مدير محدد"}
                      subtitle="الهيكل الإداري"
                      iconLeft="git-branch-outline"
                      style={styles.innerRow}
                      right={<View />}
                    />
                  </View>
                </GlassCard>
              ))}
            </View>
          )}
        </View>
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
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  listWrap: {
    gap: 10,
  },
  card: {
    padding: 14,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(76,111,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(76,111,255,0.26)",
  },
  metaWrap: {
    gap: 8,
    marginTop: 12,
  },
  innerRow: {
    backgroundColor: colors.bgSurface,
  },
});
