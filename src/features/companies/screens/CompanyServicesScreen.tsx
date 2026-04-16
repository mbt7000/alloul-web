/**
 * CompanyServicesScreen
 * ─────────────────────
 * Clean categorized services page.
 * Only existing routes — no new features.
 */

import React, { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import CompanyBottomBar from "../components/CompanyBottomBar";
import { useAppTheme } from "../../../theme/ThemeContext";

interface ServiceItem {
  key: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  label: string;
  route: string;
  color: string;
}

interface Category {
  title: string;
  items: ServiceItem[];
}

const FEATURED: ServiceItem[] = [
  { key: "meet",    icon: "videocam",         label: "اجتماعات",   route: "Meetings",    color: "#10b981" },
  { key: "tasks",   icon: "checkmark-circle", label: "المهام",     route: "Tasks",       color: "#3b82f6" },
  { key: "team",    icon: "people",           label: "الفريق",     route: "Team",        color: "#8b5cf6" },
  { key: "chat",    icon: "chatbubbles",      label: "الدردشة",    route: "Chat",        color: "#0ea5e9" },
];

const CATEGORIES: Category[] = [
  {
    title: "العمل والإنتاجية",
    items: [
      { key: "projects",  icon: "folder",          label: "المشاريع", route: "Projects",  color: "#06b6d4" },
      { key: "tasks",     icon: "list",            label: "المهام",   route: "Tasks",     color: "#3b82f6" },
      { key: "handover",  icon: "swap-horizontal", label: "التسليم",  route: "Handover",  color: "#f59e0b" },
      { key: "files",     icon: "folder-open",     label: "الملفات",  route: "CompanyFiles", color: "#a855f7" },
    ],
  },
  {
    title: "التواصل والتعاون",
    items: [
      { key: "meet",      icon: "videocam",        label: "اجتماعات", route: "Meetings", color: "#10b981" },
      { key: "chat",      icon: "chatbubbles",     label: "الدردشة",  route: "Chat",     color: "#0ea5e9" },
      { key: "team",      icon: "people",          label: "الفريق",   route: "Team",     color: "#8b5cf6" },
    ],
  },
  {
    title: "الإدارة والتحليل",
    items: [
      { key: "crm",       icon: "trending-up",     label: "العملاء",  route: "CRM",        color: "#ec4899" },
      { key: "reports",   icon: "bar-chart",       label: "التقارير", route: "Reports",    color: "#f59e0b" },
      { key: "knowledge", icon: "book",            label: "المعرفة",  route: "Knowledge",  color: "#8b5cf6" },
      { key: "roles",     icon: "key",             label: "الأدوار",  route: "Roles",      color: "#10b981" },
      { key: "jobs",      icon: "briefcase",       label: "الوظائف",  route: "Jobs",        color: "#6366f1" },
      { key: "hiring",    icon: "person-add",      label: "التوظيف",  route: "HiringBoard", color: "#3b82f6" },
      { key: "approvals", icon: "file-tray",       label: "الموافقات",route: "Inbox",      color: "#06b6d4" },
    ],
  },
  {
    title: "الذكاء والأتمتة",
    items: [
      { key: "ai",        icon: "sparkles",        label: "المساعد AI", route: "AiAssistant", color: "#a855f7" },
      { key: "search",    icon: "search",          label: "البحث",      route: "InternalSearch", color: "#06b6d4" },
    ],
  },
];

export default function CompanyServicesScreen() {
  const nav = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const ServiceCard = ({ item, large }: { item: ServiceItem; large?: boolean }) => (
    <Pressable
      onPress={() => nav.navigate(item.route)}
      style={{
        flex: 1,
        backgroundColor: "#151515",
        borderRadius: 18,
        borderWidth: 1, borderColor: "#222",
        padding: large ? 18 : 14,
        minHeight: large ? 128 : 102,
        justifyContent: "space-between",
      }}
    >
      <View style={{
        width: large ? 46 : 38, height: large ? 46 : 38, borderRadius: 12,
        backgroundColor: `${item.color}22`,
        alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name={item.icon} size={large ? 22 : 18} color={item.color} />
      </View>
      <AppText style={{
        color: "#fff",
        fontSize: large ? 14 : 13,
        fontWeight: "700",
        marginTop: 10,
      }}>
        {item.label}
      </AppText>
    </Pressable>
  );

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 22 }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <AppText style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginRight: 12 }}>
            الخدمات
          </AppText>
        </View>

        {/* ── Featured (top section) ── */}
        <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 12 }}>
          الأكثر استخداماً
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 26 }}>
          {FEATURED.map((item) => (
            <View key={item.key} style={{ width: "47%" }}>
              <ServiceCard item={item} large />
            </View>
          ))}
        </View>

        {/* ── Categorized services ── */}
        {CATEGORIES.map((cat) => {
          const isExpanded = expanded[cat.title] ?? false;
          const visible = isExpanded ? cat.items : cat.items.slice(0, 4);

          return (
            <View key={cat.title} style={{ marginBottom: 22 }}>
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}>
                <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                  {cat.title}
                </AppText>
                <AppText style={{ color: "#666", fontSize: 11 }}>
                  {cat.items.length} خدمات
                </AppText>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {visible.map((item) => (
                  <View key={item.key} style={{ width: "47%" }}>
                    <ServiceCard item={item} />
                  </View>
                ))}
              </View>

              {cat.items.length > 4 && (
                <Pressable
                  onPress={() => setExpanded((p) => ({ ...p, [cat.title]: !isExpanded }))}
                  style={{
                    marginTop: 10,
                    paddingVertical: 10,
                    alignItems: "center",
                    borderRadius: 12,
                    backgroundColor: "#151515",
                    borderWidth: 1,
                    borderColor: "#222",
                  }}
                >
                  <AppText style={{ color: c.accentCyan, fontSize: 12, fontWeight: "600" }}>
                    {isExpanded ? "عرض أقل" : `عرض المزيد (${cat.items.length - 4})`}
                  </AppText>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
      <CompanyBottomBar />
    </Screen>
  );
}
