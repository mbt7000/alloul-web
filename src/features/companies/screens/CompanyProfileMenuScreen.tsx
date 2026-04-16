/**
 * CompanyProfileMenuScreen
 * ────────────────────────
 * Clean dark profile menu — only existing routes.
 * Layout: avatar + name + role → info strip → vertical navigation cards.
 */

import React from "react";
import { View, ScrollView, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import CompanyBottomBar from "../components/CompanyBottomBar";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useAuth } from "../../../state/auth/AuthContext";
import { useCompany } from "../../../state/company/CompanyContext";

interface MenuItem {
  key: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
  color: string;
}

const MENU: MenuItem[] = [
  { key: "team",    icon: "people-outline",    title: "الفريق",           subtitle: "الأعضاء والأدوار",    route: "TeamHierarchy", color: "#8b5cf6" },
  { key: "reports", icon: "bar-chart-outline", title: "التحليلات",          subtitle: "الأداء والرؤى",       route: "Reports",      color: "#10b981" },
  { key: "roles",   icon: "key-outline",       title: "إدارة الأدوار",      subtitle: "الصلاحيات والوصول",  route: "Roles",        color: "#f59e0b" },
  { key: "inbox",   icon: "file-tray-outline", title: "الموافقات",          subtitle: "الطلبات المعلقة",     route: "Inbox",        color: "#ef4444" },
  { key: "company", icon: "business-outline",  title: "ملف الشركة",         subtitle: "الهوية والبيانات",    route: "Company",      color: "#06b6d4" },
  { key: "jobs",    icon: "briefcase-outline",  title: "الوظائف",             subtitle: "نشر وإدارة الوظائف", route: "Jobs",         color: "#6366f1" },
  { key: "hiring",  icon: "person-add-outline",title: "التوظيف",            subtitle: "لوحة التوظيف",        route: "HiringBoard",  color: "#a855f7" },
  { key: "files",   icon: "folder-open-outline",title: "الملفات",           subtitle: "المستندات والوثائق",  route: "CompanyFiles", color: "#3b82f6" },
  { key: "settings",icon: "settings-outline",  title: "الإعدادات",          subtitle: "الحساب والتفضيلات",   route: "Settings",     color: "#6b7280" },
];

export default function CompanyProfileMenuScreen() {
  const nav = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const { user } = useAuth();
  const { company, myRole } = useCompany();

  const initials = (user?.name || user?.username || "U").slice(0, 2).toUpperCase();

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. TOP: Avatar + Name + Role ── */}
        <View style={{ alignItems: "center", marginBottom: 24, marginTop: 8 }}>
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={{ width: 92, height: 92, borderRadius: 46, marginBottom: 14 }}
            />
          ) : (
            <View style={{
              width: 92, height: 92, borderRadius: 46,
              backgroundColor: "#151515",
              borderWidth: 2, borderColor: c.accentCyan,
              alignItems: "center", justifyContent: "center",
              marginBottom: 14,
            }}>
              <AppText style={{ color: c.accentCyan, fontSize: 32, fontWeight: "800" }}>
                {initials}
              </AppText>
            </View>
          )}
          <AppText style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>
            {user?.name || user?.username || "مستخدم"}
          </AppText>
          <AppText style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
            {myRole ? roleLabel(myRole) : "عضو"} · {company?.name || "—"}
          </AppText>
        </View>

        {/* ── 2. INFO STRIP ── */}
        <View style={{
          flexDirection: "row",
          backgroundColor: "#151515",
          borderRadius: 18,
          borderWidth: 1, borderColor: "#222",
          padding: 16,
          marginBottom: 24,
        }}>
          <InfoCell icon="mail-outline" label="البريد" value={user?.email ?? "—"} color="#0ea5e9" />
          <View style={{ width: 1, backgroundColor: "#222", marginHorizontal: 12 }} />
          <InfoCell icon="at-outline" label="المعرّف" value={`@${user?.username ?? ""}`} color="#8b5cf6" />
        </View>

        {/* ── 3. NAVIGATION CARDS (vertical) ── */}
        <View style={{ gap: 10 }}>
          {MENU.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => nav.navigate(item.route)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                backgroundColor: "#151515",
                borderRadius: 18,
                borderWidth: 1, borderColor: "#222",
                padding: 16,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 13,
                backgroundColor: `${item.color}22`,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                  {item.title}
                </AppText>
                <AppText style={{ color: "#888", fontSize: 11, marginTop: 2 }}>
                  {item.subtitle}
                </AppText>
              </View>
              <Ionicons name="chevron-back" size={18} color="#555" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <CompanyBottomBar />
    </Screen>
  );
}

function InfoCell({ icon, label, value, color }: {
  icon: any; label: string; value: string; color: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Ionicons name={icon} size={13} color={color} />
        <AppText style={{ color: "#888", fontSize: 10 }}>{label}</AppText>
      </View>
      <AppText style={{ color: "#fff", fontSize: 12, fontWeight: "600" }} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    owner: "مالك", admin: "مشرف", manager: "مدير",
    employee: "موظف", member: "عضو",
  };
  return map[role] ?? role;
}
