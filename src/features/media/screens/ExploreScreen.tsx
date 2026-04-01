import React from "react";
import { View, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { colors } from "../../../theme/colors";
import { radius } from "../../../theme/radius";

/** TODO(api): replace with GET /trending/topics when backend supports it */
const TRENDING = [
  { tag: "#AlloulOne", count: "12.4K منشور" },
  { tag: "#المملكة_العربية_السعودية", count: "80.2K منشور" },
  { tag: "#رؤية_2030", count: "45.1K منشور" },
];

const TAB_BAR_PAD = 108;

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const goSearch = () => navigation.navigate("Search", { source: "feed" });

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.mediaCanvas }]}>
      <AppText variant="caption" weight="bold" tone="muted" style={styles.brandTop}>
        ALLOUL&Q
      </AppText>

      <View style={styles.topBar}>
        <Pressable style={styles.globeBtn} hitSlop={8}>
          <Ionicons name="globe" size={20} color={colors.white} />
        </Pressable>
        <Pressable style={styles.stripPill} onPress={goSearch} hitSlop={6}>
          <AppText variant="bodySm" tone="muted" numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>
            استكشف المحتوى...
          </AppText>
        </Pressable>
        <Pressable style={styles.roundGhost} hitSlop={8}>
          <Ionicons name="globe-outline" size={20} color={colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.roundGhost} hitSlop={8} onPress={() => Alert.alert("المظهر", "تبديل الوضع الفاتح قريباً.")}>
          <Ionicons name="sunny-outline" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <Pressable style={{ flex: 1 }} onPress={goSearch}>
          <AppText variant="bodySm" tone="muted" style={{ textAlign: "right" }}>
            استكشف المحتوى...
          </AppText>
        </Pressable>
      </View>

      <View style={styles.sectionHead}>
        <Ionicons name="trending-up" size={18} color={colors.accentCyan} />
        <AppText variant="micro" weight="bold" tone="secondary">
          المواضيع الرائجة
        </AppText>
      </View>

      <FlatList
        data={TRENDING}
        keyExtractor={(item) => item.tag}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: TAB_BAR_PAD }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListFooterComponent={<View style={{ height: 24 }} />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.topicRow}
            onPress={() => navigation.navigate("Search", { q: item.tag.replace(/^#/, ""), source: "feed" })}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="bodySm" weight="bold">
                {item.tag.startsWith("#") ? item.tag : `#${item.tag}`}
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                {item.count}
              </AppText>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandTop: { textAlign: "center", paddingTop: 4, marginBottom: 2 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  globeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  stripPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.floatingBarBorder,
    minHeight: 46,
  },
  roundGhost: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  topicRow: { paddingVertical: 14 },
});
