/**
 * PricingScreen — ALLOUL&Q
 * Glassy dark UI matching the logo (blue → green gradient).
 * Uses the canonical /companies/* Stripe endpoints.
 */
import React, { useCallback, useState } from "react";
import {
  View, ScrollView, Pressable, ActivityIndicator, Alert, ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { BRAND } from "../../../brand";
import { subscribe, PLANS, type PlanTier } from "../../../api/billing.api";

type ActivePlanKey = "starter" | "pro" | "business";
const PLAN_KEYS: ActivePlanKey[] = ["starter", "pro", "business"];

export default function PricingScreen() {
  const nav = useNavigation<any>();
  const [loading, setLoading] = useState<PlanTier | null>(null);

  const handleSelect = useCallback(async (tier: ActivePlanKey) => {
    setLoading(tier);
    try {
      const res = await subscribe(tier);
      await WebBrowser.openBrowserAsync(res.checkout_url);
    } catch (e: any) {
      Alert.alert("الاشتراك", e?.message || "تعذّر بدء عملية الاشتراك");
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <Screen edges={["top"]} style={{ backgroundColor: BRAND.colors.darkBg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Glow orbs in background */}
        <View pointerEvents="none" style={{
          position: "absolute", top: 60, left: 40,
          width: 200, height: 200, borderRadius: 100,
          backgroundColor: BRAND.colors.primary + "14",
        }} />
        <View pointerEvents="none" style={{
          position: "absolute", top: 240, right: 30,
          width: 260, height: 260, borderRadius: 130,
          backgroundColor: BRAND.colors.secondary + "10",
        }} />

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, marginRight: 12 }}>
            <AppText style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>
              اختر خطتك
            </AppText>
            <AppText style={{ color: BRAND.colors.textMuted, fontSize: 12, marginTop: 2 }}>
              ALLOUL&Q · 14 يوم تجربة مجانية
            </AppText>
          </View>
        </View>

        {/* Brand accent strip */}
        <View style={{
          height: 4, borderRadius: 2, marginBottom: 24,
          backgroundColor: BRAND.colors.primary,
        }}>
          <View style={{
            position: "absolute", top: 0, right: 0, bottom: 0,
            width: "35%", borderRadius: 2,
            backgroundColor: BRAND.colors.secondary,
          }} />
        </View>

        {/* Plan cards */}
        {PLAN_KEYS.map((key) => {
          const plan = PLANS[key];
          const isPro = key === "pro";
          const isLoading = loading === key;
          return (
            <View
              key={key}
              style={{
                marginBottom: 16,
                borderRadius: 22,
                overflow: "hidden",
                borderWidth: isPro ? 1.5 : 1,
                borderColor: isPro ? plan.accentColor : BRAND.colors.darkBorder,
                backgroundColor: BRAND.colors.darkCard,
              }}
            >
              {/* Top accent strip */}
              <View style={{ height: 3, backgroundColor: plan.accentColor }} />

              {isPro && (
                <View style={{
                  position: "absolute", top: 12, left: 16,
                  backgroundColor: plan.accentColor,
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
                }}>
                  <AppText style={{ color: "#041018", fontSize: 9, fontWeight: "900", letterSpacing: 0.3 }}>
                    الأكثر شعبية
                  </AppText>
                </View>
              )}

              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: isPro ? 14 : 0 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: plan.accentColor + "22",
                    borderWidth: 1, borderColor: plan.accentColor + "44",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons
                      name={
                        key === "starter" ? "rocket-outline" :
                        key === "pro" ? "diamond-outline" : "briefcase-outline"
                      }
                      size={18}
                      color={plan.accentColor}
                    />
                  </View>
                  <AppText style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
                    {plan.nameAr}
                  </AppText>
                </View>

                <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 6 }}>
                  <AppText style={{ color: "#fff", fontSize: 36, fontWeight: "900" }}>
                    ${plan.monthlyPriceUsd}
                  </AppText>
                  <AppText style={{ color: BRAND.colors.textMuted, fontSize: 13, marginRight: 6 }}>
                    / شهر
                  </AppText>
                </View>

                <View style={{
                  alignSelf: "flex-start",
                  backgroundColor: BRAND.colors.secondary + "18",
                  borderWidth: 1, borderColor: BRAND.colors.secondary + "38",
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                  marginBottom: 16,
                }}>
                  <AppText style={{ color: BRAND.colors.secondary, fontSize: 10, fontWeight: "700" }}>
                    ⚡ {plan.trialDays} يوم تجربة مجانية
                  </AppText>
                </View>

                <View style={{ gap: 10, marginBottom: 18 }}>
                  {plan.features.map((f) => (
                    <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{
                        width: 18, height: 18, borderRadius: 9,
                        backgroundColor: plan.accentColor + "22",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Ionicons name="checkmark" size={11} color={plan.accentColor} />
                      </View>
                      <AppText style={{ color: BRAND.colors.textSecondary, fontSize: 13 }}>{f}</AppText>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={() => void handleSelect(key)}
                  disabled={isLoading}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: isPro ? plan.accentColor : "rgba(255,255,255,0.08)",
                    borderWidth: isPro ? 0 : 1,
                    borderColor: plan.accentColor + "44",
                    alignItems: "center",
                    opacity: isLoading ? 0.6 : pressed ? 0.85 : 1,
                    shadowColor: plan.accentColor,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isPro ? 0.35 : 0,
                    shadowRadius: 14,
                  })}
                >
                  {isLoading ? (
                    <ActivityIndicator color={isPro ? "#041018" : "#fff"} />
                  ) : (
                    <AppText style={{
                      color: isPro ? "#041018" : "#fff",
                      fontSize: 14,
                      fontWeight: "800",
                    }}>
                      اختر {plan.nameAr}
                    </AppText>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Enterprise card */}
        <Pressable
          onPress={() => Alert.alert("Enterprise", "للفرق الكبيرة (34+ موظف) — تواصل مع المبيعات:\n\nsales@alloul.app")}
          style={{
            marginTop: 4,
            padding: 20,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: BRAND.colors.accent + "44",
            backgroundColor: BRAND.colors.accent + "08",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Ionicons name="business-outline" size={20} color={BRAND.colors.accent} />
            <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Enterprise</AppText>
          </View>
          <AppText style={{ color: BRAND.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            للفرق الكبيرة (100+ موظف) · تخصيصات كاملة · اتفاقية SLA · دعم مخصص · White-label
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
            <AppText style={{ color: BRAND.colors.accent, fontSize: 12, fontWeight: "700" }}>
              تواصل مع المبيعات
            </AppText>
            <Ionicons name="chevron-back" size={14} color={BRAND.colors.accent} />
          </View>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
