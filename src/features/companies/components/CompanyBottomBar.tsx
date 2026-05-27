import React from "react";
import { View, Pressable, StyleSheet, Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useNavigationState } from "@react-navigation/native";

const ITEMS = [
  { key: "CompanyWorkspace", icon: "home"       as const, iconOutline: "home-outline"       as const, label: "الرئيسية" },
  { key: "Chat",             icon: "chatbubble" as const, iconOutline: "chatbubble-outline" as const, label: "الدردشة"  },
  { key: "Meetings",         icon: "videocam"   as const, iconOutline: "videocam-outline"   as const, label: "الاجتماعات" },
  { key: "Apps",             icon: "grid"       as const, iconOutline: "grid-outline"       as const, label: "الخدمات"  },
  { key: "Profile",          icon: "menu"       as const, iconOutline: "menu-outline"       as const, label: "القائمة"  },
];

export default function CompanyBottomBar() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const routeName = useNavigationState((state) => {
    const r = state?.routes?.[state.index];
    return r?.name ?? "";
  });

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {ITEMS.map((item) => {
          const active = routeName === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => nav.navigate(item.key)}
              style={styles.item}
              hitSlop={6}
            >
              <Ionicons
                name={active ? item.icon : item.iconOutline}
                size={22}
                color={active ? "#0ea5e9" : "#666"}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </Text>
              {active && <View style={styles.dot} />}
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
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 64,
    borderRadius: 22,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#252525",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 6,
  },
  label: {
    fontSize: 9,
    color: "#555",
    fontWeight: "600",
  },
  labelActive: {
    color: "#0ea5e9",
  },
  dot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0ea5e9",
  },
});
