import React, { useMemo } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import AppText from "../shared/ui/AppText";
import { useAppTheme } from "../theme/ThemeContext";
import { radius } from "../theme/radius";
import { MEDIA_TAB_ROUTES } from "../config/routes";

const TAB_ORDER: {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  route: string;
}[] = [
  { key: "profile", label: "حسابي", icon: "person-outline", iconActive: "person", route: MEDIA_TAB_ROUTES.profile },
  { key: "inbox", label: "التنبيهات", icon: "notifications-outline", iconActive: "notifications", route: MEDIA_TAB_ROUTES.inbox },
  { key: "search", label: "بحث", icon: "search-outline", iconActive: "search", route: MEDIA_TAB_ROUTES.search },
  { key: "explore", label: "استكشف", icon: "compass-outline", iconActive: "compass", route: MEDIA_TAB_ROUTES.explore },
  { key: "home", label: "الرئيسية", icon: "home-outline", iconActive: "home", route: MEDIA_TAB_ROUTES.home },
];

export default function FloatingMediaTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  const { colors, mode } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
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
          marginHorizontal: 16,
          maxWidth: 420,
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
        item: {
          flex: 1,
          alignItems: "center",
          justifyContent: "flex-end",
          minWidth: 48,
          paddingBottom: 2,
        },
        iconWrap: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
        },
        iconWrapActive: {
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: colors.floatingActiveFill,
          borderWidth: 1,
          borderColor: colors.floatingActiveBorder,
        },
        labelActive: {
          marginTop: 4,
          color: colors.textPrimary,
          fontSize: 10,
        },
        badge: {
          position: "absolute",
          top: 2,
          right: 2,
          minWidth: 17,
          height: 17,
          borderRadius: 9,
          backgroundColor: colors.danger,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 4,
          borderWidth: 2,
          borderColor: colors.mediaCanvas,
        },
        badgeText: { color: colors.white, fontSize: 9 },
      }),
    [colors]
  );

  const activeIconColor = mode === "light" ? colors.white : colors.black;

  return (
    <View style={[styles.outer, { paddingBottom: bottomPad }]}>
      <View style={styles.pill}>
        {TAB_ORDER.map((tab) => {
          const routeIndex = state.routes.findIndex((r) => r.name === tab.route);
          if (routeIndex < 0) return null;
          const route = state.routes[routeIndex];
          const isFocused = state.index === routeIndex;
          const options = descriptors[route.key]?.options;
          const badge = options?.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(tab.route);
            }
          };

          const iconColor = isFocused ? activeIconColor : colors.textSecondary;

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.item}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <Ionicons name={isFocused ? tab.iconActive : tab.icon} size={isFocused ? 22 : 20} color={iconColor} />
                {typeof badge === "number" && badge > 0 ? (
                  <View style={styles.badge}>
                    <AppText variant="micro" weight="bold" style={styles.badgeText}>
                      {badge > 99 ? "99+" : String(badge)}
                    </AppText>
                  </View>
                ) : null}
              </View>
              {isFocused ? (
                <AppText variant="micro" weight="bold" style={styles.labelActive}>
                  {tab.label}
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
