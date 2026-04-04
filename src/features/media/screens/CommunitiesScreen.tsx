import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import GlassCard from "../../../shared/components/GlassCard";
import { getCommunities, type CommunityRow } from "../../../api";

export default function CommunitiesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    iconBtn: { width: 40, height: 40, alignItems: "center" as const, justifyContent: "center" as const },
    title: { color: c.textPrimary, fontSize: 18, fontWeight: "800" },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    list: { padding: 16, paddingBottom: 100 },
    card: { padding: 14, marginBottom: 10 },
    row: { flexDirection: "row" as const, gap: 12 },
    avatar: { width: 52, height: 52, borderRadius: 14 },
    avatarPh: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: "rgba(76,111,255,0.2)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarTxt: { color: c.accentBlue, fontSize: 20, fontWeight: "800" },
    name: { color: c.textPrimary, fontSize: 17, fontWeight: "800" },
    desc: { color: c.textMuted, fontSize: 13, marginTop: 4 },
    meta: { color: c.accentTeal, fontSize: 12, marginTop: 6 },
    empty: { color: c.textMuted, textAlign: "center" as const, marginTop: 48 },
  }));
  const [items, setItems] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getCommunities(40, 0);
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.iconBtn}>
          <Ionicons name="menu-outline" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("communities.title")}</Text>
        <View style={styles.iconBtn} />
      </View>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />
          }
          ListEmptyComponent={<Text style={styles.empty}>{t("communities.empty")}</Text>}
          renderItem={({ item }) => (
            <GlassCard style={styles.card}>
              <View style={styles.row}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPh}>
                    <Text style={styles.avatarTxt}>{item.name.slice(0, 1)}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.desc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={styles.meta}>
                    {t("communities.members", { count: item.members_count ?? 0 })}
                  </Text>
                </View>
              </View>
            </GlassCard>
          )}
        />
      )}
    </View>
  );
}
