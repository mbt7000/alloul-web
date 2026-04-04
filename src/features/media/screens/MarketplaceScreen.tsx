import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import GlassCard from "../../../shared/components/GlassCard";
import { getMarketplaceCompanies, type MarketplaceCompanyRow } from "../../../api";

export default function MarketplaceScreen() {
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
    searchRow: {
      flexDirection: "row" as const,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      overflow: "hidden",
    },
    input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, color: c.textPrimary, fontSize: 15 },
    go: { backgroundColor: c.accent, paddingHorizontal: 16, justifyContent: "center" as const },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    list: { padding: 16, paddingBottom: 100 },
    card: { padding: 14, marginBottom: 10 },
    name: { color: c.textPrimary, fontSize: 17, fontWeight: "800" },
    meta: { color: c.accentTeal, fontSize: 13, marginTop: 6 },
    loc: { color: c.textMuted, fontSize: 12, marginTop: 4 },
    desc: { color: c.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 20 },
    empty: { color: c.textMuted, textAlign: "center" as const, marginTop: 48 },
  }));
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MarketplaceCompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getMarketplaceCompanies(q.trim() || undefined);
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const search = () => {
    setLoading(true);
    void load();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.iconBtn}>
          <Ionicons name="menu-outline" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("marketplace.title")}</Text>
        <View style={styles.iconBtn} />
      </View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder={t("marketplace.searchPh")}
          placeholderTextColor={colors.textMuted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.go} onPress={search}>
          <Ionicons name="search" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => `${it.id}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />
          }
          ListEmptyComponent={<Text style={styles.empty}>{t("marketplace.empty")}</Text>}
          renderItem={({ item }) => (
            <GlassCard style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              {item.industry ? <Text style={styles.meta}>{item.industry}</Text> : null}
              {item.location ? <Text style={styles.loc}>{item.location}</Text> : null}
              {item.description ? (
                <Text style={styles.desc} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}
            </GlassCard>
          )}
        />
      )}
    </View>
  );
}
