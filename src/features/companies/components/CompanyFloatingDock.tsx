import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../../../shared/ui/AppText";
import { colors } from "../../../theme/colors";
import { radius } from "../../../theme/radius";
import type { CompanySectionKey } from "./CompanySidebar";

type DockKey = "home" | "mail" | "apps" | "chat" | "more";

const ITEMS: {
  dock: DockKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  matchSection: CompanySectionKey | null;
  navigate?: string;
}[] = [
  { dock: "more", label: "المزيد", icon: "ellipsis-horizontal", iconActive: "ellipsis-horizontal", matchSection: "settings" },
  { dock: "chat", label: "المحادثات", icon: "chatbubble-outline", iconActive: "chatbubble", matchSection: "chat", navigate: "Chat" },
  { dock: "apps", label: "الخدمات", icon: "apps-outline", iconActive: "apps", matchSection: null, navigate: "Apps" },
  { dock: "mail", label: "المراسلات", icon: "mail-outline", iconActive: "mail", matchSection: null, navigate: "Inbox" },
  { dock: "home", label: "الرئيسية", icon: "grid-outline", iconActive: "grid", matchSection: "dashboard" },
];

type Props = {
  activeSection: CompanySectionKey;
  onSelectSection: (key: CompanySectionKey) => void;
  navigation: { navigate: (name: string) => void };
};

export default function CompanyFloatingDock({ activeSection, onSelectSection, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  const isActive = (item: (typeof ITEMS)[0]) => {
    if (item.matchSection != null) return activeSection === item.matchSection;
    return false;
  };

  return (
    <View style={[styles.wrap, { paddingBottom: bottom }]}>
      <View style={styles.pill}>
        {ITEMS.map((item) => {
          const focused = isActive(item);
          const onPress = () => {
            if (item.navigate) {
              navigation.navigate(item.navigate);
              return;
            }
            if (item.matchSection) onSelectSection(item.matchSection);
          };
          const iconColor = focused ? colors.black : colors.textSecondary;
          return (
            <Pressable key={item.dock} style={styles.item} onPress={onPress}>
              <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
                <Ionicons name={focused ? item.iconActive : item.icon} size={focused ? 22 : 20} color={iconColor} />
              </View>
              {focused ? (
                <AppText variant="micro" weight="bold" style={styles.label}>
                  {item.label}
                </AppText>
              ) : (
                <View style={{ height: 13 }} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  pill: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: colors.floatingBarBg,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.floatingBarBorder,
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 8,
    marginHorizontal: 14,
    maxWidth: 440,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  item: { flex: 1, alignItems: "center", minWidth: 50 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxActive: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.floatingActiveFill,
    borderWidth: 1,
    borderColor: colors.floatingActiveBorder,
  },
  label: { marginTop: 4, fontSize: 9, color: colors.textPrimary, textAlign: "center" },
});
