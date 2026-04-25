import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/ThemeContext";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { apiFetch, getSubscriptionStatus } from "../../../api";

// ─── Plan definitions ─────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  nameAr: string;
  price: string;
  period: string;
  employees: string;
  color: string;
  features: string[];
  limits: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    nameAr: "المبتدئ",
    price: "$24",
    period: "/شهر",
    employees: "5 أعضاء",
    color: "#60A5FA",
    features: [
      "إدارة الفريق (5 أعضاء)",
      "3 مشاريع + 30 مهمة",
      "الاجتماعات (10 اجتماعات)",
      "تسليم المهام (Handover)",
      "تجربة 14 يوم مجاناً",
    ],
    limits: ["بدون CRM", "بدون مساعد ذكي"],
  },
  {
    id: "pro",
    name: "Pro",
    nameAr: "الاحترافي",
    price: "$59",
    period: "/شهر",
    employees: "21 عضواً",
    color: "#A78BFA",
    features: [
      "كل ميزات المبتدئ",
      "21 عضو في الفريق",
      "مشاريع ومهام غير محدودة",
      "CRM والصفقات",
      "المساعد الذكي (AI)",
      "اجتماعات غير محدودة",
      "تجربة 14 يوم مجاناً",
    ],
    limits: [],
    popular: true,
  },
  {
    id: "pro_plus",
    name: "Pro Plus",
    nameAr: "الاحترافي المتقدم",
    price: "$289",
    period: "/شهر",
    employees: "33 عضواً",
    color: "#FB923C",
    features: [
      "كل ميزات الاحترافي",
      "33 عضو في الفريق",
      "تحليلات متقدمة",
      "أولوية في الدعم الفني",
      "AI مُحسَّن وأسرع",
      "قاعدة المعرفة المتقدمة",
      "تجربة 14 يوم مجاناً",
    ],
    limits: [],
  },
];

const PLAN_RANK: Record<string, number> = { starter: 1, pro: 2, pro_plus: 3, admin: 99 };

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SubscriptionPlansScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const c = colors;

  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [successPlan, setSuccessPlan] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  const refreshPlan = useCallback(() => {
    getSubscriptionStatus()
      .then((s) => { setCurrentPlan(s.plan_id); setSubStatus(s.status); })
      .catch(() => {});
  }, []);

  useEffect(() => { refreshPlan(); }, [refreshPlan]);

  // When user comes back from browser (after Stripe checkout), refresh plan
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        refreshPlan();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [refreshPlan]);

  const handleSubscribe = useCallback(async (planId: string) => {
    setLoading(planId);
    try {
      const company = await apiFetch<{ id: number } | null>("/companies/me").catch(() => null);
      if (!company) {
        await apiFetch("/companies", {
          method: "POST",
          body: JSON.stringify({ name: "شركتي", company_type: "startup", size: "1-10" }),
        });
      }
      const res = await apiFetch<{ checkout_url: string }>("/companies/subscribe", {
        method: "POST",
        body: JSON.stringify({ plan_id: planId }),
      });
      if (res.checkout_url) {
        await Linking.openURL(res.checkout_url);
        // Plan will be refreshed when user returns to app via AppState listener
      }
    } catch (err: unknown) {
      const e = err as { message?: string; detail?: string };
      const msg = e?.detail || e?.message || "حدث خطأ. أعد المحاولة.";
      if (msg.includes("Stripe not configured") || msg.includes("503")) {
        Alert.alert(
          "الاشتراك عبر الموقع",
          "يمكنك الاشتراك مباشرة عبر موقعنا على الإنترنت.",
          [
            { text: "إلغاء", style: "cancel" },
            { text: "فتح الموقع", onPress: () => void Linking.openURL("https://alloul.app/pricing") },
          ]
        );
      } else {
        Alert.alert("خطأ", msg, [
          { text: "حسناً", style: "cancel" },
          { text: "اشترك عبر الموقع", onPress: () => void Linking.openURL("https://alloul.app/pricing") },
        ]);
      }
    }
    setLoading(null);
  }, []);

  const currentRank = PLAN_RANK[currentPlan || ""] || 0;

  function planButtonLabel(plan: Plan): string {
    const rank = PLAN_RANK[plan.id] || 0;
    if (currentPlan === plan.id) return "خطتك الحالية ✓";
    if (rank < currentRank) return "الرجوع لهذه الخطة";
    return "اشترك الآن — 14 يوم مجاناً";
  }

  function planButtonColor(plan: Plan): string {
    if (currentPlan === plan.id) return `${plan.color}44`;
    return plan.color;
  }

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold">خطط الاشتراك</AppText>
          {currentPlan && (
            <AppText variant="micro" tone="muted">
              خطتك الحالية: {currentPlan} {subStatus ? `(${subStatus})` : ""}
            </AppText>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Success banner */}
        {subStatus === "active" || subStatus === "trialing" ? (
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: "#2dd36f18", borderRadius: 14, borderWidth: 1,
            borderColor: "#2dd36f44", padding: 14, marginBottom: 16,
          }}>
            <Ionicons name="checkmark-circle" size={20} color="#2dd36f" />
            <View style={{ flex: 1 }}>
              <AppText style={{ color: "#2dd36f", fontWeight: "700", fontSize: 14 }}>
                الاشتراك نشط ✓
              </AppText>
              <AppText style={{ color: "#2dd36f", fontSize: 12, opacity: 0.8 }}>
                خطة {PLANS.find((p) => p.id === currentPlan)?.nameAr ?? currentPlan}
                {subStatus === "trialing" ? " — تجربة مجانية" : ""}
              </AppText>
            </View>
          </View>
        ) : null}

        {/* Hero */}
        <View style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
          <AppText style={{ fontSize: 32 }}>🚀</AppText>
          <AppText
            variant="title"
            weight="bold"
            style={{ fontSize: 26, textAlign: "center" }}
          >
            ارتقِ بشركتك
          </AppText>
          <AppText
            variant="bodySm"
            tone="muted"
            style={{ textAlign: "center", maxWidth: 280, lineHeight: 22 }}
          >
            أدوات ذكية لإدارة الفريق والمشاريع والمبيعات — كل شيء في مكان واحد
          </AppText>
        </View>

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isUpgrade = (PLAN_RANK[plan.id] || 0) > currentRank;
          return (
            <View
              key={plan.id}
              style={{
                backgroundColor: c.bgCard,
                borderRadius: 20,
                borderWidth: plan.popular ? 2 : 1,
                borderColor: plan.popular ? plan.color : isCurrent ? plan.color : c.border,
                padding: 20,
                marginBottom: 16,
                overflow: "visible",
              }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <View
                  style={{
                    position: "absolute",
                    top: -12,
                    alignSelf: "center",
                    backgroundColor: plan.color,
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <AppText style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                    الأكثر شيوعاً
                  </AppText>
                </View>
              )}

              {/* Current plan badge */}
              {isCurrent && (
                <View
                  style={{
                    position: "absolute",
                    top: -12,
                    right: 16,
                    backgroundColor: `${plan.color}cc`,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}
                >
                  <AppText style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                    خطتك الحالية
                  </AppText>
                </View>
              )}

              {/* Plan header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View>
                  <AppText style={{ fontSize: 20, fontWeight: "800", color: plan.color }}>
                    {plan.nameAr}
                  </AppText>
                  <AppText variant="micro" tone="muted">{plan.name}</AppText>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
                    <AppText style={{ fontSize: 30, fontWeight: "900", color: plan.color }}>
                      {plan.price}
                    </AppText>
                    <AppText variant="micro" tone="muted">{plan.period}</AppText>
                  </View>
                  <View
                    style={{
                      backgroundColor: `${plan.color}22`,
                      borderRadius: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      marginTop: 4,
                    }}
                  >
                    <AppText style={{ fontSize: 11, color: plan.color, fontWeight: "700" }}>
                      {plan.employees}
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: c.border, marginVertical: 16 }} />

              {/* Features */}
              <View style={{ gap: 10 }}>
                {plan.features.map((f) => (
                  <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: `${plan.color}22`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="checkmark" size={13} color={plan.color} />
                    </View>
                    <AppText variant="caption" style={{ flex: 1 }}>{f}</AppText>
                  </View>
                ))}
                {plan.limits.map((l) => (
                  <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 10, opacity: 0.5 }}>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="close" size={13} color={c.textMuted} />
                    </View>
                    <AppText variant="caption" tone="muted" style={{ flex: 1 }}>{l}</AppText>
                  </View>
                ))}
              </View>

              {/* CTA button */}
              <TouchableOpacity
                onPress={() => !isCurrent && handleSubscribe(plan.id)}
                disabled={loading !== null || isCurrent}
                style={{
                  marginTop: 18,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: isCurrent ? `${plan.color}22` : plan.popular ? plan.color : `${plan.color}22`,
                  alignItems: "center",
                  borderWidth: isCurrent ? 0 : 1.5,
                  borderColor: plan.color,
                }}
              >
                {loading === plan.id ? (
                  <ActivityIndicator color={plan.color} />
                ) : (
                  <AppText
                    style={{
                      color: isCurrent ? plan.color : plan.popular ? "#fff" : plan.color,
                      fontWeight: "800",
                      fontSize: 15,
                    }}
                  >
                    {planButtonLabel(plan)}
                  </AppText>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Enterprise */}
        <View
          style={{
            backgroundColor: c.bgCard,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: c.border,
            padding: 20,
            alignItems: "center",
            gap: 10,
          }}
        >
          <AppText style={{ fontSize: 24 }}>🏢</AppText>
          <AppText variant="bodySm" weight="bold">Enterprise</AppText>
          <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>
            أكثر من 200 عضو — حلول مخصصة، SLA، ودعم مخصص
          </AppText>
          <TouchableOpacity
            style={{
              marginTop: 6,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: c.accentCyan,
            }}
          >
            <AppText style={{ color: c.accentCyan, fontWeight: "700", fontSize: 14 }}>
              تواصل معنا
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <AppText
          variant="micro"
          tone="muted"
          style={{ textAlign: "center", marginTop: 20, lineHeight: 18 }}
        >
          جميع الخطط تشمل تجربة مجانية 14 يوم. لا رسوم حتى انتهاء التجربة.
          يمكن إلغاء الاشتراك في أي وقت.
        </AppText>
      </ScrollView>
    </Screen>
  );
}
