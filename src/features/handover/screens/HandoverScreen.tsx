import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import GlassCard from "../../../shared/components/GlassCard";
import {
  CompanyChip,
  CompanyEmptyState,
  CompanyHeroCard,
  CompanySectionLabel,
  CompanyStatTile,
} from "../../companies/components/CompanyBlocks";
import { useCompany } from "../../../state/company/CompanyContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import CompanyWorkModeTopBar from "../../companies/components/CompanyWorkModeTopBar";
import {
  getHandoverWorkItems,
  updateHandoverWorkItemStatus,
  type HandoverLifecycleStatus,
  type HandoverWorkItem,
} from "../../../api";

export default function HandoverScreen() {
  const navigation = useNavigation<any>();
  const { company } = useCompany();
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
    loadingWrap: {
      paddingVertical: 24,
      alignItems: "center" as const,
    },
    listWrap: {
      gap: 10,
    },
    card: {
      padding: 14,
    },
    cardHead: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 10,
    },
    actionRow: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 8,
      marginTop: 12,
    },
    statusButton: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(56,232,255,0.30)",
      backgroundColor: "rgba(56,232,255,0.10)",
    },
  }));
  const [items, setItems] = useState<HandoverWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getHandoverWorkItems();
      setItems(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "تعذّر تحميل التسليمات";
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

  const counts = useMemo(
    () => ({
      open: items.filter((item) => item.status === "open").length,
      progress: items.filter((item) => item.status === "in_progress").length,
      review: items.filter((item) => item.status === "submitted").length,
      closed: items.filter((item) => item.status === "closed" || item.status === "accepted").length,
    }),
    [items]
  );

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title="التسليم"
        leftButton="none"
        rightActions={<AppButton label="الملفات" size="sm" onPress={() => navigation.navigate("CompanyFiles")} />}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        <CompanyHeroCard
          eyebrow="وحدة الاستمرارية"
          title={company?.name || "تسليم الشركة"}
          subtitle="تتبّع انتقال الملكية مع سياق المهمة والملاحظة والملف والمكلّف. يعطي هذا التخطيط الأولوية للاستمرارية والمراجعة بدلاً من نمط الخلاصة الاجتماعية."
          chips={[
            { label: `${items.length} عناصر عمل`, icon: "swap-horizontal-outline", tone: "amber" },
            { label: "جاهز للمراجعة", icon: "shield-checkmark-outline", tone: "teal" },
          ]}
          actions={
            <>
              <AppButton label="الأعضاء" onPress={() => navigation.navigate("Teams")} />
              <AppButton label="خلاصة الشركة" tone="glass" onPress={() => navigation.navigate("CompanyFeed")} />
            </>
          }
        />

        <View style={styles.statRow}>
          <CompanyStatTile label="مفتوح" value={loading ? "..." : String(counts.open)} icon="time-outline" tone="cyan" />
          <CompanyStatTile label="قيد التنفيذ" value={loading ? "..." : String(counts.progress)} icon="play-outline" tone="blue" />
        </View>
        <View style={styles.statRow}>
          <CompanyStatTile label="مُرسل" value={loading ? "..." : String(counts.review)} icon="checkmark-done-outline" tone="amber" />
          <CompanyStatTile label="مغلق" value={loading ? "..." : String(counts.closed)} icon="archive-outline" tone="teal" />
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="عناصر العمل" meta={loading ? "جارٍ التحميل" : String(items.length)} />
          {loading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accentCyan} />
            </View>
          ) : error ? (
            <CompanyEmptyState
              icon="alert-circle-outline"
              title="تعذّر تحميل التسليمات"
              subtitle={error}
              actionLabel="إعادة المحاولة"
              onAction={() => {
                setLoading(true);
                void load();
              }}
            />
          ) : items.length === 0 ? (
            <CompanyEmptyState
              icon="swap-horizontal-outline"
              title="لا توجد تسليمات بعد"
              subtitle="أنشئ أول عملية تسليم لتجميع المهام والملاحظات والملفات وحالة المكلّف في مكان واحد."
            />
          ) : (
            <View style={styles.listWrap}>
              {items.map((item) => (
                <GlassCard key={item.id} style={styles.card}>
                  <View style={styles.cardHead}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodySm" weight="bold">
                        {item.title}
                      </AppText>
                      <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                        #{item.serial_no} · {item.owner_name} ← {item.current_assignee_name}
                      </AppText>
                    </View>
                    <StatusChip status={item.status} />
                  </View>

                  <AppText variant="caption" tone="secondary" style={{ marginTop: 10, lineHeight: 20 }}>
                    {item.latest_update || "لا توجد تحديثات بعد."}
                  </AppText>

                  <View style={styles.actionRow}>
                    {nextStatuses(item.status).map((status) => (
                      <Pressable
                        key={status}
                        onPress={() => {
                          void (async () => {
                            await updateHandoverWorkItemStatus(item.id, status);
                            await load();
                          })();
                        }}
                        style={({ pressed }) => [styles.statusButton, pressed && { opacity: 0.9 }]}
                      >
                        <AppText variant="micro" weight="bold" style={{ color: colors.accentCyan }}>
                          {status}
                        </AppText>
                      </Pressable>
                    ))}
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

function StatusChip({ status }: { status: HandoverLifecycleStatus }) {
  const tone =
    status === "accepted" || status === "closed"
      ? "teal"
      : status === "submitted"
        ? "blue"
        : status === "in_progress"
          ? "cyan"
          : "amber";
  const label =
    status === "open"
      ? "مفتوح"
      : status === "in_progress"
        ? "قيد التنفيذ"
        : status === "submitted"
          ? "مُرسل"
          : status === "accepted"
            ? "مقبول"
            : "مغلق";
  return <CompanyChip label={label} icon="swap-horizontal-outline" tone={tone} />;
}

function nextStatuses(status: HandoverLifecycleStatus): HandoverLifecycleStatus[] {
  if (status === "open") return ["in_progress", "submitted"];
  if (status === "in_progress") return ["submitted"];
  if (status === "submitted") return ["accepted", "in_progress"];
  if (status === "accepted") return ["closed"];
  return [];
}
