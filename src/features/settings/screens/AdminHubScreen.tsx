import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { getAdminStats, type AdminStats } from "../../../api";
import { useAppTheme } from "../../../theme/ThemeContext";

const KPI_CONFIG = [
  {
    key: "total_users",
    label: "إجمالي المستخدمين",
    icon: "people" as const,
    color: "#38e8ff",
    bg: "rgba(56,232,255,0.1)",
  },
  {
    key: "verified_users",
    label: "المستخدمون المفعّلون",
    icon: "shield-checkmark" as const,
    color: "#34d399",
    bg: "rgba(52,211,153,0.1)",
  },
  {
    key: "total_companies",
    label: "الشركات المسجّلة",
    icon: "business" as const,
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.1)",
  },
];

const QUICK_ACTIONS = [
  { label: "إدارة المستخدمين", icon: "person-circle-outline" as const, color: "#38e8ff" },
  { label: "الشركات النشطة",   icon: "business-outline"      as const, color: "#a78bfa" },
  { label: "سجل النشاط",       icon: "list-outline"          as const, color: "#f59e0b" },
  { label: "الإعدادات",        icon: "settings-outline"      as const, color: "#6b7280" },
];

export default function AdminHubScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const s = await getAdminStats();
      setStats(s);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed";
      setError(msg);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [fadeAnim]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const verificationRate =
    stats && stats.total_users > 0
      ? Math.round((stats.verified_users / stats.total_users) * 100)
      : 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>لوحة الإدارة</Text>
          <Text style={s.headerSub}>Admin Console</Text>
        </View>
        <TouchableOpacity
          style={s.refreshBtn}
          onPress={() => void load()}
          disabled={loading}
          hitSlop={12}
        >
          <Ionicons name="refresh" size={20} color="#38e8ff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color="#38e8ff" size="large" />
            <Text style={s.loadingText}>جاري تحميل البيانات…</Text>
          </View>
        ) : error ? (
          <View style={s.errorCard}>
            <View style={s.errorIconCircle}>
              <Ionicons name="warning-outline" size={28} color="#fb7185" />
            </View>
            <Text style={s.errorTitle}>تعذّر تحميل البيانات</Text>
            <Text style={s.errorMsg}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => void load()}>
              <Text style={s.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        ) : stats ? (
          <Animated.View style={{ opacity: fadeAnim, gap: 20 }}>

            {/* ── KPI Cards ── */}
            <View style={s.kpiGrid}>
              {KPI_CONFIG.map((cfg) => {
                const value = stats[cfg.key as keyof AdminStats] as number;
                return (
                  <View key={cfg.key} style={[s.kpiCard, { borderColor: `${cfg.color}22` }]}>
                    <View style={[s.kpiIconCircle, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                    </View>
                    <Text style={[s.kpiValue, { color: cfg.color }]}>{value.toLocaleString()}</Text>
                    <Text style={s.kpiLabel}>{cfg.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* ── Verification Rate ── */}
            <View style={s.rateCard}>
              <View style={s.rateHeader}>
                <View style={s.rateIconCircle}>
                  <Ionicons name="checkmark-circle" size={18} color="#34d399" />
                </View>
                <Text style={s.rateTitle}>معدل التفعيل</Text>
                <Text style={s.ratePercent}>{verificationRate}%</Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${verificationRate}%`, backgroundColor: "#34d399" }]} />
              </View>
              <Text style={s.rateHint}>
                {stats.verified_users} من أصل {stats.total_users} مستخدم مفعّل بريدهم الإلكتروني
              </Text>
            </View>

            {/* ── Platform Health ── */}
            <View style={s.healthCard}>
              <Text style={s.sectionTitle}>حالة المنصة</Text>
              <View style={s.healthRow}>
                <HealthItem
                  label="API"
                  status="نشط"
                  color="#34d399"
                  icon="server-outline"
                />
                <HealthItem
                  label="قاعدة البيانات"
                  status="نشط"
                  color="#34d399"
                  icon="cube-outline"
                />
                <HealthItem
                  label="الإشعارات"
                  status="نشط"
                  color="#34d399"
                  icon="notifications-outline"
                />
              </View>
            </View>

            {/* ── Quick Actions ── */}
            <View style={s.actionsSection}>
              <Text style={s.sectionTitle}>إجراءات سريعة</Text>
              <View style={s.actionsGrid}>
                {QUICK_ACTIONS.map((action) => (
                  <TouchableOpacity key={action.label} style={s.actionBtn} activeOpacity={0.7}>
                    <View style={[s.actionIconCircle, { backgroundColor: `${action.color}15` }]}>
                      <Ionicons name={action.icon} size={20} color={action.color} />
                    </View>
                    <Text style={s.actionLabel}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function HealthItem({ label, status, color, icon }: {
  label: string; status: string; color: string; icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={s.healthItem}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={s.healthLabel}>{label}</Text>
      <View style={[s.healthBadge, { backgroundColor: `${color}18` }]}>
        <View style={[s.healthDot, { backgroundColor: color }]} />
        <Text style={[s.healthStatus, { color }]}>{status}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080808" },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#151515",
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#555", fontSize: 11, marginTop: 1 },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(56,232,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { padding: 20, paddingBottom: 60 },
  // Loading
  loadingBox: { alignItems: "center", paddingTop: 80, gap: 16 },
  loadingText: { color: "#555", fontSize: 13 },
  // Error
  errorCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(251,113,133,0.2)",
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(251,113,133,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  errorTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  errorMsg: { color: "#666", fontSize: 13, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    backgroundColor: "#38e8ff",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: { color: "#000", fontWeight: "800", fontSize: 14 },
  // KPI Grid
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: "#111",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: "flex-start",
  },
  kpiIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  kpiLabel: {
    color: "#666",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  // Verification Rate
  rateCard: {
    backgroundColor: "#111",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.15)",
    padding: 18,
    gap: 10,
  },
  rateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rateIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(52,211,153,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  rateTitle: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "700" },
  ratePercent: { color: "#34d399", fontSize: 20, fontWeight: "800" },
  progressTrack: {
    height: 6,
    backgroundColor: "#1a1a1a",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  rateHint: { color: "#555", fontSize: 11, lineHeight: 16 },
  // Health
  healthCard: {
    backgroundColor: "#111",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 18,
    gap: 14,
  },
  healthRow: { flexDirection: "row", gap: 10 },
  healthItem: {
    flex: 1,
    backgroundColor: "#0e0e0e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  healthLabel: { color: "#777", fontSize: 10, fontWeight: "600" },
  healthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  healthDot: { width: 5, height: 5, borderRadius: 3 },
  healthStatus: { fontSize: 10, fontWeight: "700" },
  // Section title
  sectionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  // Quick actions
  actionsSection: { gap: 12 },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
