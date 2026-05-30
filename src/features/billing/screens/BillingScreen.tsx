/**
 * BillingScreen — current subscription management
 * Uses /companies/subscription-status + /companies/cancel-subscription
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { BRAND } from "../../../brand";
import {
  getSubscriptionStatus, cancelSubscription, PLANS,
  type SubscriptionStatus,
} from "../../../api/billing.api";

export default function BillingScreen() {
  const nav = useNavigation<any>();
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getSubscriptionStatus();
      setSub(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCancel = () => {
    Alert.alert(
      "إلغاء الاشتراك",
      "سيستمر وصولك حتى نهاية الفترة الحالية. هل تريد المتابعة؟",
      [
        { text: "تراجع", style: "cancel" },
        {
          text: "إلغاء الاشتراك",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSubscription();
              await load();
              Alert.alert("تم", "تم جدولة الإلغاء في نهاية الفترة الحالية");
            } catch (e: any) {
              Alert.alert("خطأ", e?.message || "فشل الإلغاء");
            }
          },
        },
      ],
    );
  };

  const planKey = sub?.plan_id as string | null | undefined;
  const plan = planKey && (planKey === "starter" || planKey === "pro" || planKey === "business")
    ? PLANS[planKey]
    : null;
  const isAdminComp = planKey === "admin";
  const noSub = !planKey;

  return (
    <Screen edges={["top"]} style={{ backgroundColor: BRAND.colors.darkBg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 22 }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <AppText style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginRight: 12 }}>
            الفوترة والاشتراك
          </AppText>
        </View>

        {loading ? (
          <ActivityIndicator color={BRAND.colors.primary} style={{ marginTop: 40 }} />
        ) : isAdminComp ? (
          <View style={{
            backgroundColor: BRAND.colors.darkCard,
            borderRadius: 20,
            borderWidth: 1.5, borderColor: BRAND.colors.accent + "44",
            padding: 24, alignItems: "center",
          }}>
            <Ionicons name="shield-checkmark" size={48} color={BRAND.colors.accent} />
            <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 12 }}>
              حساب Admin
            </AppText>
            <AppText style={{ color: BRAND.colors.textMuted, fontSize: 12, marginTop: 6 }}>
              وصول كامل — لا يحتاج اشتراك
            </AppText>
          </View>
        ) : noSub ? (
          <View style={{
            backgroundColor: BRAND.colors.darkCard,
            borderRadius: 20,
            borderWidth: 1, borderColor: BRAND.colors.darkBorder,
            padding: 32, alignItems: "center",
          }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: BRAND.colors.primary + "22",
              borderWidth: 1, borderColor: BRAND.colors.primary + "44",
              alignItems: "center", justifyContent: "center",
              marginBottom: 14,
            }}>
              <Ionicons name="gift-outline" size={32} color={BRAND.colors.primary} />
            </View>
            <AppText style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>
              لا يوجد اشتراك فعّال
            </AppText>
            <AppText style={{ color: BRAND.colors.textMuted, fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 18 }}>
              ابدأ تجربتك المجانية — 14 يوم بدون دفع
            </AppText>
            <Pressable
              onPress={() => nav.navigate("Pricing")}
              style={{
                marginTop: 22,
                backgroundColor: BRAND.colors.primary,
                paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16,
                shadowColor: BRAND.colors.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
              }}
            >
              <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>
                عرض الخطط
              </AppText>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Current plan card */}
            <View style={{
              backgroundColor: BRAND.colors.darkCard,
              borderRadius: 22, overflow: "hidden",
              borderWidth: 1.5,
              borderColor: (plan?.accentColor ?? BRAND.colors.primary) + "66",
              marginBottom: 18,
            }}>
              <View style={{ height: 4, backgroundColor: plan?.accentColor ?? BRAND.colors.primary }} />
              <View style={{ padding: 20 }}>
                <AppText style={{ color: BRAND.colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  الخطة الحالية
                </AppText>
                <AppText style={{ color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 6 }}>
                  {plan?.nameAr ?? sub?.plan_id?.toUpperCase()}
                </AppText>
                {plan && (
                  <AppText style={{ color: BRAND.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                    ${plan.monthlyPriceUsd} / شهر · حتى {plan.employeeLimit} موظف
                  </AppText>
                )}

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }}>
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor:
                      sub?.status === "active" ? BRAND.colors.secondary :
                      sub?.status === "trialing" ? BRAND.colors.warning :
                      BRAND.colors.error,
                  }} />
                  <AppText style={{ color: "#ddd", fontSize: 12, fontWeight: "600" }}>
                    {sub?.status === "active" ? "فعّال" :
                     sub?.status === "trialing" ? "فترة تجربة" :
                     sub?.status === "past_due" ? "متأخر الدفع" :
                     sub?.status === "canceled" ? "ملغى" : sub?.status}
                  </AppText>
                </View>

                {sub?.current_period_end && (
                  <AppText style={{ color: BRAND.colors.textMuted, fontSize: 11, marginTop: 10 }}>
                    {sub.cancel_at_period_end ? "ينتهي في" : "التجديد التالي"}:{" "}
                    {new Date(sub.current_period_end).toLocaleDateString("ar")}
                  </AppText>
                )}
                {sub?.trial_end && sub?.status === "trialing" && (
                  <AppText style={{ color: BRAND.colors.warning, fontSize: 11, marginTop: 2, fontWeight: "600" }}>
                    ⏰ التجربة تنتهي في {new Date(sub.trial_end).toLocaleDateString("ar")}
                  </AppText>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={{ gap: 10 }}>
              <ActionRow
                icon="trending-up"
                label="ترقية الخطة"
                color={BRAND.colors.primary}
                onPress={() => nav.navigate("Pricing")}
              />
              {!sub?.cancel_at_period_end && (
                <ActionRow
                  icon="close-circle-outline"
                  label="إلغاء الاشتراك"
                  color={BRAND.colors.error}
                  danger
                  onPress={handleCancel}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function ActionRow({ icon, label, color, danger, onPress }: {
  icon: any; label: string; color: string; danger?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: BRAND.colors.darkCard,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: danger ? BRAND.colors.error + "22" : BRAND.colors.darkBorder,
        padding: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: color + "18",
        borderWidth: 1, borderColor: color + "30",
        alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <AppText style={{
        color: danger ? BRAND.colors.error : "#fff",
        fontSize: 14, fontWeight: "600", flex: 1,
      }}>
        {label}
      </AppText>
      {!danger && <Ionicons name="chevron-back" size={16} color={BRAND.colors.textMuted} />}
    </Pressable>
  );
}
