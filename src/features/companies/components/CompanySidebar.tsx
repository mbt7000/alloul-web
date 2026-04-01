import React from "react";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../theme/colors";
import AppText from "../../../shared/ui/AppText";

export type CompanySectionKey =
  | "dashboard"
  | "teams"
  | "projects"
  | "tasks"
  | "meetings"
  | "handover"
  | "chat"
  | "knowledge"
  | "crm"
  | "reports"
  | "settings";

export type SidebarItem = {
  key: CompanySectionKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const COMPANY_SIDEBAR_ITEMS: SidebarItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "grid-outline" },
  { key: "teams", label: "Teams", icon: "people-outline" },
  { key: "projects", label: "Projects", icon: "folder-outline" },
  { key: "tasks", label: "Tasks", icon: "checkbox-outline" },
  { key: "meetings", label: "Meetings", icon: "videocam-outline" },
  { key: "handover", label: "Handover", icon: "swap-horizontal-outline" },
  { key: "chat", label: "Chat", icon: "chatbubble-ellipses-outline" },
  { key: "knowledge", label: "Knowledge", icon: "book-outline" },
  { key: "crm", label: "CRM", icon: "trending-up-outline" },
  { key: "reports", label: "Reports", icon: "bar-chart-outline" },
  { key: "settings", label: "Settings", icon: "settings-outline" },
];

export default function CompanySidebar({
  activeKey,
  onSelect,
}: {
  activeKey: CompanySectionKey;
  onSelect: (key: CompanySectionKey) => void;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <View style={styles.wrap}>
      {COMPANY_SIDEBAR_ITEMS.map((it) => {
        const active = it.key === activeKey;
        return (
          <Pressable
            key={it.key}
            onPress={() => onSelect(it.key)}
            style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.itemPressed]}
          >
            <Ionicons name={it.icon} size={18} color={active ? colors.accentCyan : colors.textMuted} />
            <AppText
              variant={compact ? "micro" : "caption"}
              weight="bold"
              tone={active ? "primary" : "muted"}
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {it.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  itemActive: {
    borderColor: "rgba(56,232,255,0.35)",
    backgroundColor: "rgba(56,232,255,0.10)",
  },
  itemPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});

