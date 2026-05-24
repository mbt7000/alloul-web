/**
 * CompanyServicesScreen
 * ─────────────────────
 * World-class services hub — categorized, colour-coded, fast navigation.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import CompanyBottomBar from "../components/CompanyBottomBar";
import { useAppTheme } from "../../../theme/ThemeContext";

const STORAGE_KEY = "company_quick_services_v1";
const { width } = Dimensions.get("window");
const CARD_W = (width - 32 - 12) / 2;

// ─── Palette — rich, distinct, not neon ───────────────────────
const P = {
  teal:   { bg: "rgba(20,184,166,.15)", text: "#14b8a6" },
  blue:   { bg: "rgba(59,130,246,.15)", text: "#3b82f6" },
  violet: { bg: "rgba(124,58,237,.15)", text: "#7c3aed" },
  sky:    { bg: "rgba(14,165,233,.15)", text: "#0ea5e9" },
  emerald:{ bg: "rgba(16,185,129,.15)", text: "#10b981" },
  rose:   { bg: "rgba(244,63,94,.15)",  text: "#f43f5e" },
  amber:  { bg: "rgba(245,158,11,.15)", text: "#f59e0b" },
  fuchsia:{ bg: "rgba(217,70,239,.15)", text: "#d946ef" },
  indigo: { bg: "rgba(99,102,241,.15)", text: "#6366f1" },
  orange: { bg: "rgba(249,115,22,.15)", text: "#f97316" },
  lime:   { bg: "rgba(132,204,22,.15)", text: "#84cc16" },
  cyan:   { bg: "rgba(6,182,212,.15)",  text: "#06b2d4" },
};

interface ServiceItem {
  key: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  label: string;
  desc: string;
  route: string;
  palette: keyof typeof P;
}

interface Category {
  title: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  items: ServiceItem[];
}

// ─── All services ─────────────────────────────────────────────
const ALL_SERVICES: ServiceItem[] = [
  // العمل
  { key: "tasks",     icon: "checkmark-circle", label: "المهام",      desc: "تتبع مهام الفريق",        route: "Tasks",          palette: "blue"    },
  { key: "projects",  icon: "folder",           label: "المشاريع",    desc: "إدارة المشاريع",          route: "Projects",       palette: "teal"    },
  { key: "handover",  icon: "swap-horizontal",  label: "التسليم",     desc: "تسليم واستلام المهام",    route: "Handover",       palette: "amber"   },
  { key: "files",     icon: "folder-open",      label: "الملفات",     desc: "مستنداتك ومرفقاتك",      route: "CompanyFiles",   palette: "violet"  },
  { key: "approvals", icon: "document-text",    label: "الموافقات",   desc: "طلبات تحتاج رد",         route: "Inbox",          palette: "sky"     },
  // التواصل
  { key: "meetings",      icon: "videocam",         label: "اجتماعات",       desc: "جدول الاجتماعات",          route: "Meetings",       palette: "emerald" },
  { key: "smart-meetings",icon: "mic",              label: "اجتماع ذكي",     desc: "تفريغ تلقائي + بنود AI",   route: "SmartMeeting",   palette: "cyan"    },
  { key: "calls",         icon: "call",             label: "سجل المكالمات",  desc: "تاريخ المكالمات",           route: "CallHistory",    palette: "teal"    },
  { key: "whatsapp",      icon: "logo-whatsapp",    label: "واتساب",         desc: "صندوق رسائل WhatsApp",     route: "WhatsAppInbox",  palette: "emerald" },
  { key: "chat",          icon: "chatbubbles",      label: "الدردشة",        desc: "محادثات الفريق",            route: "Chat",           palette: "sky"     },
  { key: "team",          icon: "people",           label: "الفريق",         desc: "أعضاء وهيكل الشركة",       route: "Team",           palette: "violet"  },
  // الإدارة
  { key: "crm",       icon: "trending-up",      label: "العملاء CRM", desc: "إدارة علاقات العملاء",   route: "CRM",            palette: "rose"    },
  { key: "accounting",icon: "calculator",       label: "المحاسبة",    desc: "المعاملات المالية",       route: "Accounting",     palette: "amber"   },
  { key: "invoices",  icon: "receipt",          label: "الفواتير",    desc: "إنشاء وإرسال الفواتير",  route: "Invoices",       palette: "lime"    },
  { key: "deals",     icon: "pricetag",         label: "الصفقات",     desc: "تتبع الصفقات التجارية",  route: "Deals",          palette: "orange"  },
  { key: "roles",     icon: "key",              label: "الأدوار",     desc: "صلاحيات الفريق",         route: "Roles",          palette: "emerald" },
  // التوظيف
  { key: "jobs",      icon: "briefcase",        label: "الوظائف",     desc: "الوظائف المتاحة",        route: "Jobs",           palette: "indigo"  },
  { key: "hiring",    icon: "person-add",       label: "التوظيف",     desc: "طلبات التوظيف",          route: "Recruitment",    palette: "blue"    },
  { key: "workid",    icon: "id-card",          label: "الهوية المهنية",desc: "بطاقة العمل الرقمية",  route: "WorkId",         palette: "cyan"    },
  // الذكاء
  { key: "ai",        icon: "sparkles",         label: "المساعد AI",  desc: "ذكاء اصطناعي متكامل",   route: "AiAssistant",    palette: "fuchsia" },
  { key: "search",    icon: "search",           label: "البحث الداخلي",desc: "ابحث في كل شيء",        route: "InternalSearch", palette: "teal"    },
  { key: "aihub",     icon: "hardware-chip",    label: "مركز AI",     desc: "إعدادات وأدوات AI",      route: "CompanyAIHub",   palette: "violet"  },
  // جديدة مقترحة
  { key: "analytics", icon: "bar-chart",        label: "التحليلات",   desc: "إحصائيات وتقارير ذكية", route: "Reports",        palette: "indigo"  },
  { key: "ads",       icon: "megaphone",        label: "الإعلانات",   desc: "إعلانات مساحة العمل",   route: "WorkspaceAds",   palette: "orange"  },
  { key: "subs",      icon: "card",             label: "الاشتراكات",  desc: "خطط وفواتير الاشتراك",  route: "Subscription",   palette: "lime"    },
  { key: "hierarchy", icon: "git-network",      label: "الهيكل التنظيمي",desc: "مخطط الشركة",        route: "CompanyTeamHierarchy", palette: "sky" },
  { key: "knowledge", icon: "library",          label: "قاعدة المعرفة",desc: "وثائق ومراجع الشركة",  route: "Knowledge",      palette: "rose"    },
  { key: "profile",   icon: "business",         label: "ملف الشركة",  desc: "معلومات وإعدادات الشركة",route: "CompanyProfileMenu", palette: "amber" },
];

const CATEGORIES: Category[] = [
  { title: "العمل والإنتاجية",    icon: "flash",        items: ALL_SERVICES.filter(s => ["tasks","projects","handover","files","approvals"].includes(s.key)) },
  { title: "التواصل والتعاون",    icon: "chatbubbles",  items: ALL_SERVICES.filter(s => ["meetings","smart-meetings","calls","whatsapp","chat","team"].includes(s.key)) },
  { title: "الإدارة والأعمال",    icon: "briefcase",    items: ALL_SERVICES.filter(s => ["crm","accounting","invoices","deals","roles"].includes(s.key)) },
  { title: "التوظيف والموارد",    icon: "people-circle",items: ALL_SERVICES.filter(s => ["jobs","hiring","workid","hierarchy"].includes(s.key)) },
  { title: "الذكاء الاصطناعي",   icon: "sparkles",     items: ALL_SERVICES.filter(s => ["ai","search","aihub","analytics"].includes(s.key)) },
  { title: "النمو والتسويق",      icon: "trending-up",  items: ALL_SERVICES.filter(s => ["ads","subs","knowledge","profile"].includes(s.key)) },
];

const DEFAULT_KEYS = ["meetings","tasks","team","chat","ai","projects"];

export default function CompanyServicesScreen() {
  const nav = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const [pinned, setPinned] = useState<string[]>(DEFAULT_KEYS);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) { try { setPinned(JSON.parse(raw)); } catch {} }
    });
  }, []);

  const ServiceCard = useCallback(
    ({ item, large }: { item: ServiceItem; large?: boolean }) => {
      const pal = P[item.palette];
      const isPinned = pinned.includes(item.key);
      return (
        <Pressable
          onPress={() => nav.navigate(item.route as never)}
          style={({ pressed }) => ({
            width: large ? CARD_W : CARD_W,
            backgroundColor: "#111418",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: isPinned ? pal.text + "55" : "#1e2027",
            padding: large ? 20 : 16,
            minHeight: large ? 136 : 110,
            justifyContent: "space-between",
            opacity: pressed ? 0.8 : 1,
            shadowColor: isPinned ? pal.text : "transparent",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isPinned ? 0.2 : 0,
            shadowRadius: 12,
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <View style={{
              width: large ? 48 : 40, height: large ? 48 : 40,
              borderRadius: 13,
              backgroundColor: pal.bg,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name={item.icon} size={large ? 22 : 19} color={pal.text} />
            </View>
            {isPinned && (
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: pal.bg,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="star" size={10} color={pal.text} />
              </View>
            )}
          </View>
          <View>
            <AppText style={{ color: "#f0f2f5", fontSize: large ? 14 : 13, fontWeight: "800", marginBottom: 3 }}>
              {item.label}
            </AppText>
            <AppText style={{ color: "#5a6270", fontSize: 11, fontWeight: "500", lineHeight: 15 }}>
              {item.desc}
            </AppText>
          </View>
        </Pressable>
      );
    },
    [pinned, nav]
  );

  const pinnedServices = pinned
    .map(k => ALL_SERVICES.find(s => s.key === k))
    .filter((s): s is ServiceItem => !!s);

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
            <AppText style={{ color: "#f0f2f5", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }}>
              الخدمات
            </AppText>
            <AppText style={{ color: "#5a6270", fontSize: 12, marginTop: 2 }}>
              {ALL_SERVICES.length} خدمة متاحة
            </AppText>
          </View>
          <Pressable
            onPress={() => nav.navigate("EditServices" as never)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              paddingHorizontal: 14, paddingVertical: 9,
              backgroundColor: "#1a1d22",
              borderRadius: 12, borderWidth: 1, borderColor: "#2a2d35",
            }}
          >
            <Ionicons name="options" size={15} color={c.accentCyan} />
            <AppText style={{ color: c.accentCyan, fontSize: 12, fontWeight: "700" }}>تخصيص</AppText>
          </Pressable>
        </View>

        {/* ── Pinned / Quick Access ── */}
        {pinnedServices.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <Ionicons name="star" size={13} color={c.accentCyan} style={{ marginLeft: 6 }} />
              <AppText style={{ color: "#f0f2f5", fontSize: 13, fontWeight: "800" }}>
                الوصول السريع
              </AppText>
              <AppText style={{ color: "#5a6270", fontSize: 11, marginRight: "auto", marginLeft: 8 }}>
                {pinnedServices.length} خدمات
              </AppText>
              <Pressable onPress={() => nav.navigate("EditServices" as never)}>
                <AppText style={{ color: c.accentCyan, fontSize: 11, fontWeight: "700" }}>تعديل</AppText>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {pinnedServices.map((item) => (
                <ServiceCard key={item.key} item={item} large />
              ))}
            </View>
          </View>
        )}

        {/* ── Divider ── */}
        <View style={{ marginHorizontal: 16, height: 1, backgroundColor: "#1a1d22", marginBottom: 24 }} />

        {/* ── Categories ── */}
        {CATEGORIES.map((cat) => (
          <View key={cat.title} style={{ marginBottom: 28, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <View style={{
                width: 28, height: 28, borderRadius: 8,
                backgroundColor: "#1a1d22",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name={cat.icon} size={14} color="#5a6270" />
              </View>
              <AppText style={{ color: "#f0f2f5", fontSize: 13, fontWeight: "800" }}>
                {cat.title}
              </AppText>
              <View style={{
                marginRight: "auto",
                backgroundColor: "#1a1d22",
                borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
              }}>
                <AppText style={{ color: "#5a6270", fontSize: 10, fontWeight: "700" }}>
                  {cat.items.length}
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {cat.items.map((item) => (
                <ServiceCard key={item.key} item={item} />
              ))}
            </View>
          </View>
        ))}

        {/* ── Footer note ── */}
        <View style={{
          marginHorizontal: 16, marginTop: 8,
          padding: 14, borderRadius: 14,
          backgroundColor: "#111418",
          borderWidth: 1, borderColor: "#1e2027",
          flexDirection: "row", alignItems: "center", gap: 10,
        }}>
          <Ionicons name="information-circle" size={18} color={c.accentCyan} />
          <AppText style={{ color: "#5a6270", fontSize: 11, flex: 1, lineHeight: 17 }}>
            اضغط "تخصيص" لاختيار خدماتك المفضلة وترتيبها في الوصول السريع
          </AppText>
        </View>
      </ScrollView>

      <CompanyBottomBar />
    </Screen>
  );
}
