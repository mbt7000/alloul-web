import React, { useCallback, useState } from "react";
import {
  View, ScrollView, Pressable, ActivityIndicator, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/ThemeContext";
import AppText from "../../../shared/ui/AppText";
import Screen from "../../../shared/layout/Screen";
import { getDeals, type DealRow } from "../../../api";

const STAGE_META: Record<string, { label: string; color: string; icon: string }> = {
  lead:        { label: "عميل محتمل",  color: "#6b7280", icon: "radio-button-on-outline" },
  proposal:    { label: "عرض مقدم",    color: "#3b82f6", icon: "document-text-outline" },
  negotiation: { label: "تفاوض",       color: "#8b5cf6", icon: "git-compare-outline" },
  won:         { label: "مكتملة",      color: "#10b981", icon: "checkmark-circle-outline" },
  lost:        { label: "خسرنا",       color: "#ef4444", icon: "close-circle-outline" },
};

function formatValue(v: number | null | undefined): string {
  if (!v) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}م`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}ك`;
  return String(v);
}

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const [items, setItems] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getDeals();
      setItems(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "خطأ في التحميل");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void load();
  }, [load]));

  // Summary stats
  const won = items.filter(d => d.stage === "won").length;
  const totalValue = items.reduce((s, d) => s + (d.value || 0), 0);
  const pipeline = items.filter(d => !["won","lost"].includes(d.stage ?? ""));

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={c.accentCyan}
            onRefresh={() => { setRefreshing(true); void load(); }}
          />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, marginRight: 12 }}>
            <AppText style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>الصفقات</AppText>
            <AppText style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
              {items.length} صفقة · {pipeline.length} في الأنبوب
            </AppText>
          </View>
          <Pressable
            style={{ backgroundColor: c.accentCyan + "22", borderWidth: 1, borderColor: c.accentCyan + "55", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}
            onPress={() => {}}
          >
            <AppText style={{ color: c.accentCyan, fontSize: 12, fontWeight: "700" }}>+ صفقة</AppText>
          </Pressable>
        </View>

        {/* Stats bar */}
        {!loading && items.length > 0 && (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 22 }}>
            {[
              { label: "مكتملة", value: String(won), color: "#10b981" },
              { label: "الأنبوب", value: String(pipeline.length), color: "#3b82f6" },
              { label: "إجمالي القيمة", value: formatValue(totalValue), color: "#8b5cf6" },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, backgroundColor: "#151515", borderRadius: 14, borderWidth: 1, borderColor: "#222", padding: 12, alignItems: "center" }}>
                <AppText style={{ color: s.color, fontSize: 18, fontWeight: "800" }}>{s.value}</AppText>
                <AppText style={{ color: "#666", fontSize: 10, marginTop: 3 }}>{s.label}</AppText>
              </View>
            ))}
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={c.accentCyan} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={{ alignItems: "center", padding: 40, gap: 12 }}>
            <Ionicons name="warning-outline" size={40} color="#ef4444" />
            <AppText style={{ color: "#ef4444", textAlign: "center" }}>{error}</AppText>
            <Pressable
              style={{ backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
              onPress={() => { setLoading(true); void load(); }}
            >
              <AppText style={{ color: "#fff", fontWeight: "700" }}>إعادة المحاولة</AppText>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={{ alignItems: "center", padding: 60 }}>
            <Ionicons name="briefcase-outline" size={56} color="#333" />
            <AppText style={{ color: "#666", marginTop: 12 }}>لا توجد صفقات بعد</AppText>
          </View>
        ) : (
          items.map((item) => {
            const stage = item.stage ?? "lead";
            const meta = STAGE_META[stage] ?? { label: stage, color: "#6b7280", icon: "ellipse-outline" };
            const prob = item.probability ?? 0;
            return (
              <View key={String(item.id)} style={{ backgroundColor: "#151515", borderRadius: 18, borderWidth: 1, borderColor: "#222", padding: 16, marginBottom: 12 }}>
                {/* Top row */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <AppText style={{ color: "#fff", fontSize: 15, fontWeight: "800" }} numberOfLines={1}>
                      {item.company}
                    </AppText>
                    {item.contact ? (
                      <AppText style={{ color: "#888", fontSize: 12, marginTop: 3 }} numberOfLines={1}>
                        {item.contact}
                      </AppText>
                    ) : null}
                  </View>
                  {/* Stage badge */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: meta.color + "20", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: meta.color + "44" }}>
                    <Ionicons name={meta.icon as any} size={12} color={meta.color} />
                    <AppText style={{ color: meta.color, fontSize: 11, fontWeight: "700" }}>{meta.label}</AppText>
                  </View>
                </View>

                {/* Probability bar */}
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                    <AppText style={{ color: "#666", fontSize: 11 }}>احتمالية الإغلاق</AppText>
                    <AppText style={{ color: meta.color, fontSize: 11, fontWeight: "700" }}>{prob}%</AppText>
                  </View>
                  <View style={{ height: 5, backgroundColor: "#222", borderRadius: 3, overflow: "hidden" }}>
                    <View style={{ height: "100%", width: `${prob}%` as any, backgroundColor: meta.color, borderRadius: 3 }} />
                  </View>
                </View>

                {/* Value + actions */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="cash-outline" size={14} color="#888" />
                    <AppText style={{ color: "#ccc", fontSize: 14, fontWeight: "700" }}>
                      {formatValue(item.value)} ر.س
                    </AppText>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333" }}
                      onPress={() => navigation.navigate("ApprovalDetail", { id: item.id, title: item.company })}
                    >
                      <AppText style={{ color: "#aaa", fontSize: 12, fontWeight: "600" }}>تفاصيل</AppText>
                    </Pressable>
                    {stage !== "won" && stage !== "lost" && (
                      <Pressable
                        style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: "#10b981" + "22", borderWidth: 1, borderColor: "#10b981" + "55" }}
                        onPress={() => {}}
                      >
                        <AppText style={{ color: "#10b981", fontSize: 12, fontWeight: "700" }}>تقدّم</AppText>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
