/**
 * WebSidebar
 * ──────────
 * Web-only left sidebar navigation — replaces the mobile bottom bar on web.
 * Shown at Platform.OS === "web" only.
 */
import React from "react";
import { View, Pressable, StyleSheet, Image, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { useAuth } from "../../../state/auth/AuthContext";
import { useCompany } from "../../../state/company/CompanyContext";

if (Platform.OS !== "web") {
  // Do not render on native — callers should also guard with Platform.OS
}

const NAV_ITEMS = [
  { key: "CompanyWorkspace", icon: "home-outline"        as const, iconActive: "home"         as const, label: "الرئيسية" },
  { key: "Apps",             icon: "grid-outline"        as const, iconActive: "grid"         as const, label: "الخدمات" },
  { key: "Chat",             icon: "chatbubble-outline"  as const, iconActive: "chatbubble"   as const, label: "الدردشة" },
  { key: "Meetings",         icon: "calendar-outline"    as const, iconActive: "calendar"     as const, label: "الاجتماعات" },
  { key: "Tasks",            icon: "list-outline"        as const, iconActive: "list"         as const, label: "المهام" },
  { key: "Projects",         icon: "folder-outline"      as const, iconActive: "folder"       as const, label: "المشاريع" },
  { key: "Handover",         icon: "swap-horizontal-outline" as const, iconActive: "swap-horizontal" as const, label: "التسليم" },
  { key: "CRM",              icon: "trending-up-outline" as const, iconActive: "trending-up"  as const, label: "الصفقات" },
  { key: "TeamHierarchy",    icon: "people-outline"      as const, iconActive: "people"       as const, label: "الفريق" },
  { key: "Reports",          icon: "bar-chart-outline"   as const, iconActive: "bar-chart"    as const, label: "التقارير" },
];

const BOTTOM_ITEMS = [
  { key: "Notifications",    icon: "notifications-outline" as const, iconActive: "notifications" as const, label: "الإشعارات" },
  { key: "Settings",         icon: "settings-outline"      as const, iconActive: "settings"      as const, label: "الإعدادات" },
  { key: "Profile",          icon: "person-outline"        as const, iconActive: "person"         as const, label: "الملف" },
];

export default function WebSidebar() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { company } = useCompany();
  const routeName = useNavigationState((state) => {
    const r = state?.routes?.[state.index];
    return r?.name ?? "";
  });

  const initials = (user?.name || user?.username || "U").slice(0, 2).toUpperCase();

  return (
    <View style={s.sidebar}>
      {/* Logo */}
      <View style={s.logoWrap}>
        <Image
          source={require("../../../../assets/logo/alloul-logo-dark.png")}
          style={s.logo}
          resizeMode="contain"
        />
      </View>

      {/* Company badge */}
      {company && (
        <View style={s.companyBadge}>
          <View style={s.companyDot} />
          <AppText style={s.companyName} numberOfLines={1}>{company.name}</AppText>
        </View>
      )}

      {/* Main nav */}
      <View style={s.navSection}>
        {NAV_ITEMS.map((item) => {
          const active = routeName === item.key;
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [s.navItem, active && s.navItemActive, pressed && !active && s.navItemHover]}
              onPress={() => nav.navigate(item.key)}
            >
              <Ionicons
                name={active ? item.iconActive : item.icon}
                size={18}
                color={active ? "#38e8ff" : "#666"}
              />
              <AppText style={[s.navLabel, active && s.navLabelActive]}>
                {item.label}
              </AppText>
              {active && <View style={s.activeBar} />}
            </Pressable>
          );
        })}
      </View>

      <View style={s.spacer} />

      {/* Bottom items */}
      <View style={s.bottomSection}>
        {BOTTOM_ITEMS.map((item) => {
          const active = routeName === item.key;
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [s.navItem, active && s.navItemActive, pressed && !active && s.navItemHover]}
              onPress={() => nav.navigate(item.key)}
            >
              <Ionicons
                name={active ? item.iconActive : item.icon}
                size={18}
                color={active ? "#38e8ff" : "#555"}
              />
              <AppText style={[s.navLabel, active && s.navLabelActive]}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* User avatar */}
      <View style={s.userRow}>
        <View style={s.avatar}>
          <AppText style={s.avatarText}>{initials}</AppText>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText style={s.userName} numberOfLines={1}>
            {user?.name || user?.username || "مستخدم"}
          </AppText>
          <AppText style={s.userEmail} numberOfLines={1}>
            {user?.email || ""}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sidebar: {
    width: 220,
    height: "100%",
    backgroundColor: "#0a0a0a",
    borderRightWidth: 1,
    borderRightColor: "#161616",
    paddingVertical: 20,
    paddingHorizontal: 12,
    flexDirection: "column",
  },
  logoWrap: {
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  logo: {
    width: 110,
    height: 36,
  },
  companyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(56,232,255,0.07)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 16,
  },
  companyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#38e8ff",
  },
  companyName: {
    color: "#38e8ff",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  navSection: {
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    position: "relative",
  },
  navItemActive: {
    backgroundColor: "rgba(56,232,255,0.07)",
  },
  navItemHover: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  activeBar: {
    position: "absolute",
    right: 0,
    top: "20%",
    bottom: "20%",
    width: 3,
    borderRadius: 2,
    backgroundColor: "#38e8ff",
  },
  navLabel: {
    color: "#666",
    fontSize: 13,
    fontWeight: "600",
  },
  navLabelActive: {
    color: "#fff",
    fontWeight: "700",
  },
  spacer: { flex: 1 },
  bottomSection: {
    gap: 2,
    marginBottom: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#161616",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(56,232,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#38e8ff",
    fontSize: 12,
    fontWeight: "800",
  },
  userName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  userEmail: {
    color: "#555",
    fontSize: 10,
  },
});
