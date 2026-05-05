/**
 * CompanyEditServicesScreen
 * ─────────────────────────
 * Drag-to-pick services for the quick-access grid.
 * Stored via AsyncStorage — no backend required.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";

const STORAGE_KEY = "company_quick_services_v1";
const MAX_SLOTS = 8;

// ─── Palette ──────────────────────────────────────────────────
const P: Record<string, { bg: string; text: string }> = {
  teal:    { bg: "rgba(20,184,166,.15)",  text: "#14b8a6" },
  blue:    { bg: "rgba(59,130,246,.15)",  text: "#3b82f6" },
  violet:  { bg: "rgba(124,58,237,.15)",  text: "#7c3aed" },
  sky:     { bg: "rgba(14,165,233,.15)",  text: "#0ea5e9" },
  emerald: { bg: "rgba(16,185,129,.15)",  text: "#10b981" },
  rose:    { bg: "rgba(244,63,94,.15)",   text: "#f43f5e" },
  amber:   { bg: "rgba(245,158,11,.15)",  text: "#f59e0b" },
  fuchsia: { bg: "rgba(217,70,239,.15)",  text: "#d946ef" },
  indigo:  { bg: "rgba(99,102,241,.15)",  text: "#6366f1" },
  orange:  { bg: "rgba(249,115,22,.15)",  text: "#f97316" },
  lime:    { bg: "rgba(132,204,22,.15)",  text: "#84cc16" },
  cyan:    { bg: "rgba(6,182,212,.15)",   text: "#06b2d4" },
};

interface Service {
  key: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  label: string;
  desc: string;
  category: string;
  palette: keyof typeof P;
}

const ALL_SERVICES: Service[] = [
  // العمل
  { key: "tasks",      icon: "checkmark-circle", label: "المهام",           desc: "تتبع مهام الفريق",          category: "العمل والإنتاجية",   palette: "blue"    },
  { key: "projects",   icon: "folder",           label: "المشاريع",         desc: "إدارة المشاريع",            category: "العمل والإنتاجية",   palette: "teal"    },
  { key: "handover",   icon: "swap-horizontal",  label: "التسليم",          desc: "تسليم واستلام المهام",      category: "العمل والإنتاجية",   palette: "amber"   },
  { key: "files",      icon: "folder-open",      label: "الملفات",          desc: "مستنداتك ومرفقاتك",        category: "العمل والإنتاجية",   palette: "violet"  },
  { key: "approvals",  icon: "document-text",    label: "الموافقات",        desc: "طلبات تحتاج موافقتك",      category: "العمل والإنتاجية",   palette: "sky"     },
  // التواصل
  { key: "meetings",   icon: "videocam",         label: "اجتماعات",         desc: "جدول الاجتماعات",          category: "التواصل",             palette: "emerald" },
  { key: "chat",       icon: "chatbubbles",      label: "الدردشة",          desc: "محادثات الفريق",            category: "التواصل",             palette: "sky"     },
  { key: "team",       icon: "people",           label: "الفريق",           desc: "أعضاء وهيكل الشركة",       category: "التواصل",             palette: "violet"  },
  // الإدارة
  { key: "crm",        icon: "trending-up",      label: "العملاء CRM",      desc: "إدارة علاقات العملاء",     category: "الإدارة",             palette: "rose"    },
  { key: "accounting", icon: "calculator",       label: "المحاسبة",         desc: "المعاملات المالية",         category: "الإدارة",             palette: "amber"   },
  { key: "deals",      icon: "pricetag",         label: "الصفقات",          desc: "تتبع الصفقات التجارية",    category: "الإدارة",             palette: "orange"  },
  { key: "roles",      icon: "key",              label: "الأدوار",          desc: "صلاحيات الفريق",           category: "الإدارة",             palette: "emerald" },
  { key: "analytics",  icon: "bar-chart",        label: "التحليلات",        desc: "إحصائيات وتقارير ذكية",    category: "الإدارة",             palette: "indigo"  },
  // التوظيف
  { key: "jobs",       icon: "briefcase",        label: "الوظائف",          desc: "الوظائف المتاحة",          category: "التوظيف",             palette: "indigo"  },
  { key: "hiring",     icon: "person-add",       label: "التوظيف",          desc: "طلبات التوظيف",            category: "التوظيف",             palette: "blue"    },
  { key: "workid",     icon: "id-card",          label: "الهوية المهنية",   desc: "بطاقة العمل الرقمية",      category: "التوظيف",             palette: "cyan"    },
  { key: "hierarchy",  icon: "git-network",      label: "الهيكل التنظيمي",  desc: "مخطط الشركة",              category: "التوظيف",             palette: "sky"     },
  // الذكاء الاصطناعي
  { key: "ai",         icon: "sparkles",         label: "المساعد AI",       desc: "ذكاء اصطناعي متكامل",      category: "الذكاء الاصطناعي",   palette: "fuchsia" },
  { key: "search",     icon: "search",           label: "البحث الداخلي",    desc: "ابحث في كل شيء",           category: "الذكاء الاصطناعي",   palette: "teal"    },
  { key: "aihub",      icon: "hardware-chip",    label: "مركز AI",          desc: "إعدادات وأدوات AI",        category: "الذكاء الاصطناعي",   palette: "violet"  },
  // النمو
  { key: "ads",        icon: "megaphone",        label: "الإعلانات",        desc: "إعلانات مساحة العمل",      category: "النمو والتسويق",     palette: "orange"  },
  { key: "subs",       icon: "card",             label: "الاشتراكات",       desc: "خطط وفواتير الاشتراك",     category: "النمو والتسويق",     palette: "lime"    },
  { key: "knowledge",  icon: "library",          label: "قاعدة المعرفة",    desc: "وثائق ومراجع الشركة",      category: "النمو والتسويق",     palette: "rose"    },
  { key: "profile",    icon: "business",         label: "ملف الشركة",       desc: "معلومات وإعدادات الشركة",  category: "النمو والتسويق",     palette: "amber"   },
];

const CATEGORY_ORDER = [
  "العمل والإنتاجية",
  "التواصل",
  "الإدارة",
  "التوظيف",
  "الذكاء الاصطناعي",
  "النمو والتسويق",
];

const DEFAULT_KEYS = ["meetings", "tasks", "team", "chat", "ai", "projects"];

export default function CompanyEditServicesScreen() {
  const nav = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const [selected, setSelected] = useState<string[]>(DEFAULT_KEYS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) { try { setSelected(JSON.parse(raw)); } catch {} }
    });
  }, []);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_SLOTS) return prev;
      return [...prev, key];
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    setSaving(false);
    nav.goBack();
  }, [selected, nav]);

  const reset = useCallback(async () => {
    setSelected(DEFAULT_KEYS);
  }, []);

  const byCategory: Record<string, Service[]> = {};
  CATEGORY_ORDER.forEach((cat) => (byCategory[cat] = []));
  ALL_SERVICES.forEach((s) => {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  });

  const selectedServices = selected
    .map((k) => ALL_SERVICES.find((s) => s.key === k))
    .filter((s): s is Service => !!s);

  const remaining = MAX_SLOTS - selected.length;

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0d0f12" }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20,
        }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}
            style={{ width: 38, height: 38, borderRadius: 12,
              backgroundColor: "#1a1d22", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-back" size={20} color="#f0f2f5" />
          </Pressable>
          <View style={{ flex: 1, marginHorizontal: 14 }}>
            <AppText style={{ color: "#f0f2f5", fontSize: 20, fontWeight: "900", letterSpacing: -0.5 }}>
              تخصيص الخدمات
            </AppText>
            <AppText style={{ color: "#5a6270", fontSize: 12, marginTop: 2 }}>
              اختر حتى {MAX_SLOTS} خدمات للوصول السريع
            </AppText>
          </View>
          <Pressable onPress={reset}>
            <AppText style={{ color: "#5a6270", fontSize: 12, fontWeight: "700" }}>إعادة ضبط</AppText>
          </Pressable>
        </View>

        {/* ── Slots Bar ── */}
        <View style={{
          marginHorizontal: 16, marginBottom: 24,
          backgroundColor: "#111418", borderRadius: 16,
          borderWidth: 1, borderColor: "#1e2027",
          padding: 14,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <AppText style={{ color: "#f0f2f5", fontSize: 13, fontWeight: "700" }}>
              الخدمات النشطة
            </AppText>
            <AppText style={{ color: remaining === 0 ? c.accentCyan : "#5a6270", fontSize: 12, fontWeight: "700" }}>
              {selected.length} / {MAX_SLOTS}
            </AppText>
          </View>
          {/* Progress dots */}
          <View style={{ flexDirection: "row", gap: 6 }}>
            {Array.from({ length: MAX_SLOTS }).map((_, i) => {
              const svc = selectedServices[i];
              const pal = svc ? P[svc.palette] : null;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1, height: 6, borderRadius: 10,
                    backgroundColor: pal ? pal.text + "cc" : "#1e2027",
                  }}
                />
              );
            })}
          </View>
          {remaining > 0 && (
            <AppText style={{ color: "#5a6270", fontSize: 11, marginTop: 8 }}>
              {remaining} {remaining === 1 ? "خانة فارغة" : "خانات فارغة"} — يمكنك إضافة المزيد
            </AppText>
          )}
        </View>

        {/* ── Selected chips ── */}
        {selectedServices.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {selectedServices.map((s) => {
                const pal = P[s.palette];
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => toggle(s.key)}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 7,
                      backgroundColor: pal.bg,
                      borderRadius: 20, paddingRight: 12, paddingLeft: 6,
                      paddingVertical: 6,
                      borderWidth: 1, borderColor: pal.text + "44",
                    }}
                  >
                    <View style={{
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: pal.text + "22",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Ionicons name={s.icon} size={12} color={pal.text} />
                    </View>
                    <AppText style={{ color: pal.text, fontSize: 11, fontWeight: "700" }}>
                      {s.label}
                    </AppText>
                    <Ionicons name="close" size={12} color={pal.text} style={{ marginRight: -2 }} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Divider ── */}
        <View style={{ marginHorizontal: 16, height: 1, backgroundColor: "#1a1d22", marginBottom: 20 }} />

        {/* ── All Services by Category ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <AppText style={{ color: "#f0f2f5", fontSize: 14, fontWeight: "800", marginBottom: 16 }}>
            جميع الخدمات
          </AppText>

          {CATEGORY_ORDER.map((cat) => {
            const items = byCategory[cat] ?? [];
            if (items.length === 0) return null;
            return (
              <View key={cat} style={{ marginBottom: 24 }}>
                <AppText style={{
                  color: "#5a6270", fontSize: 11, fontWeight: "700",
                  marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase",
                }}>
                  {cat}
                </AppText>

                <View style={{
                  backgroundColor: "#111418", borderRadius: 16,
                  borderWidth: 1, borderColor: "#1e2027",
                  overflow: "hidden",
                }}>
                  {items.map((s, idx) => {
                    const pal = P[s.palette];
                    const isSelected = selected.includes(s.key);
                    const canAdd = !isSelected && selected.length < MAX_SLOTS;
                    const isLast = idx === items.length - 1;

                    return (
                      <Pressable
                        key={s.key}
                        onPress={() => { if (isSelected || canAdd) toggle(s.key); }}
                        style={({ pressed }) => ({
                          flexDirection: "row", alignItems: "center", gap: 12,
                          padding: 14,
                          borderBottomWidth: isLast ? 0 : 1,
                          borderBottomColor: "#1a1d22",
                          opacity: (!isSelected && !canAdd) ? 0.35 : pressed ? 0.7 : 1,
                          backgroundColor: isSelected ? pal.bg : "transparent",
                        })}
                      >
                        {/* Icon */}
                        <View style={{
                          width: 40, height: 40, borderRadius: 12,
                          backgroundColor: isSelected ? pal.text + "22" : "#1a1d22",
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Ionicons name={s.icon} size={18} color={isSelected ? pal.text : "#5a6270"} />
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <AppText style={{
                            color: isSelected ? "#f0f2f5" : "#c0c7d0",
                            fontSize: 13, fontWeight: "700", marginBottom: 2,
                          }}>
                            {s.label}
                          </AppText>
                          <AppText style={{ color: "#5a6270", fontSize: 11, fontWeight: "500" }}>
                            {s.desc}
                          </AppText>
                        </View>

                        {/* Toggle */}
                        <Switch
                          value={isSelected}
                          onValueChange={() => { if (isSelected || canAdd) toggle(s.key); }}
                          trackColor={{ false: "#2a2d35", true: pal.text + "55" }}
                          thumbColor={isSelected ? pal.text : "#5a6270"}
                          ios_backgroundColor="#2a2d35"
                          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Tip ── */}
        <View style={{
          marginHorizontal: 16, marginBottom: 8,
          padding: 14, borderRadius: 14,
          backgroundColor: "#111418",
          borderWidth: 1, borderColor: "#1e2027",
          flexDirection: "row", alignItems: "flex-start", gap: 10,
        }}>
          <Ionicons name="bulb-outline" size={16} color={c.accentCyan} style={{ marginTop: 1 }} />
          <AppText style={{ color: "#5a6270", fontSize: 11, flex: 1, lineHeight: 17 }}>
            الخدمات المختارة ستظهر في قسم "الوصول السريع" بصفحة الخدمات. يمكنك إضافة حتى {MAX_SLOTS} خدمات.
          </AppText>
        </View>
      </ScrollView>

      {/* ── Sticky Save ── */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: 16, paddingBottom: 30,
        backgroundColor: "#0d0f12",
        borderTopWidth: 1, borderTopColor: "#1a1d22",
        flexDirection: "row", gap: 12,
      }}>
        <Pressable
          onPress={() => nav.goBack()}
          style={{
            flex: 1, paddingVertical: 15, borderRadius: 16,
            alignItems: "center", backgroundColor: "#1a1d22",
            borderWidth: 1, borderColor: "#2a2d35",
          }}
        >
          <AppText style={{ color: "#5a6270", fontSize: 14, fontWeight: "700" }}>إلغاء</AppText>
        </Pressable>
        <Pressable
          onPress={() => void save()}
          disabled={saving || selected.length === 0}
          style={{
            flex: 2, paddingVertical: 15, borderRadius: 16,
            alignItems: "center",
            backgroundColor: (saving || selected.length === 0) ? "#1a1d22" : c.accentCyan,
            shadowColor: c.accentCyan,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
          }}
        >
          <AppText style={{
            color: (saving || selected.length === 0) ? "#5a6270" : "#0d0f12",
            fontSize: 14, fontWeight: "900",
          }}>
            {saving ? "جارٍ الحفظ..." : `حفظ (${selected.length} خدمة)`}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
