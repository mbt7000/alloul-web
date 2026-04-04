import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import GlassCard from "../../../shared/components/GlassCard";
import { getAgentHistory, type AgentMessageRow } from "../../../api";
import AppInput from "../../../shared/ui/AppInput";
import AppButton from "../../../shared/ui/AppButton";

export default function AiAssistantScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row" as const,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    backBtn: { width: 40, height: 40, alignItems: "center" as const, justifyContent: "center" as const },
    title: { color: c.textPrimary, fontSize: 20, fontWeight: "800" },
    center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, padding: 24 },
    err: { color: c.danger, textAlign: "center" as const },
    retry: {
      marginTop: 12,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    retryTxt: { color: c.accentBlue, fontWeight: "700" },
    list: { padding: 16, paddingBottom: 100, gap: 10 },
    bubble: { padding: 14, marginBottom: 8 },
    userBubble: { borderLeftWidth: 3, borderLeftColor: c.accentBlue },
    assistantBubble: { borderLeftWidth: 3, borderLeftColor: c.accentTeal },
    role: { color: c.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" as const, marginBottom: 6 },
    content: { color: c.textPrimary, fontSize: 14, lineHeight: 22 },
    empty: { color: c.textMuted, textAlign: "center" as const, marginTop: 40 },
    configCard: { padding: 12, gap: 8 },
    configTitle: { color: c.textPrimary, fontSize: 13, fontWeight: "800" },
    configBody: { color: c.textMuted, fontSize: 12, lineHeight: 18 },
    savedProviders: { color: c.accentTeal, fontSize: 11, marginTop: 4, fontWeight: "700" },
  }));
  const [items, setItems] = useState<AgentMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState("OpenAI");
  const [apiKey, setApiKey] = useState("");
  const [savedProviders, setSavedProviders] = useState<string[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getAgentHistory();
      setItems(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Err";
      setError(msg);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("aiAssistant.title")}</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.err}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryTxt}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 12 }}>
              <GlassCard style={styles.configCard}>
                <Text style={styles.configTitle}>Platform AI (General)</Text>
                <Text style={styles.configBody}>Used for recommendations, summaries, and smarter discovery across ALLOUL.</Text>
              </GlassCard>
              <GlassCard style={styles.configCard}>
                <Text style={styles.configTitle}>Company Private AI</Text>
                <Text style={styles.configBody}>Owner can connect provider API keys. Company data remains isolated per workspace.</Text>
                <AppInput value={provider} onChangeText={setProvider} placeholder="Provider name (e.g. Anthropic)" />
                <AppInput value={apiKey} onChangeText={setApiKey} placeholder="Company API key" autoCapitalize="none" />
                <AppButton
                  label="Save provider key (local demo)"
                  tone="glass"
                  disabled={!provider.trim() || !apiKey.trim()}
                  onPress={() => {
                    setSavedProviders((prev) => Array.from(new Set([provider.trim(), ...prev])));
                    setApiKey("");
                  }}
                />
                {savedProviders.length > 0 ? (
                  <Text style={styles.savedProviders}>Connected: {savedProviders.join(", ")}</Text>
                ) : null}
              </GlassCard>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>{t("aiAssistant.empty")}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <GlassCard style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={styles.role}>{item.role}</Text>
              <Text style={styles.content}>{item.content}</Text>
            </GlassCard>
          )}
        />
      )}
    </View>
  );
}
