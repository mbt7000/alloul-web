/**
 * Work ID Screen
 * ==============
 * Shows the current user's employee Work ID (EMP-YYYY-NNNN-XXXX)
 * with copy and share actions.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Clipboard,
  Alert,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/ThemeContext";
import { getMyEmployeeProfile, type MyEmployeeProfile } from "../../../api";

const ROLE_LABELS: Record<string, string> = {
  owner: "المؤسس",
  admin: "مشرف",
  manager: "مدير",
  employee: "موظف",
  member: "عضو",
};

export default function WorkIdScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useAppTheme();

  const [profile, setProfile] = useState<MyEmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getMyEmployeeProfile()
      .then(setProfile)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!profile) return;
    Clipboard.setString(profile.work_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!profile) return;
    await Share.share({
      message: `هويتي المهنية في ${profile.company_name}:\nWork ID: ${profile.work_id}`,
    });
  };

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.textPrimary },
    body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    card: {
      width: "100%",
      borderRadius: 20,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 28,
      alignItems: "center",
      gap: 20,
    },
    companyBadge: {
      backgroundColor: colors.accent + "18",
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 5,
    },
    companyBadgeText: { fontSize: 13, fontWeight: "600", color: colors.accent },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accent + "18",
      alignItems: "center",
      justifyContent: "center",
    },
    workIdLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600", letterSpacing: 1 },
    workIdText: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: 2,
      fontVariant: ["tabular-nums"],
    },
    roleRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    roleBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.accent + "22",
    },
    roleBadgeText: { fontSize: 13, color: colors.accent, fontWeight: "600" },
    jobTitle: { fontSize: 13, color: colors.textMuted },
    divider: { height: 1, width: "100%", backgroundColor: colors.border },
    actionsRow: { flexDirection: "row", gap: 12, width: "100%" },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    actionBtnPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
    actionBtnText: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
    actionBtnTextPrimary: { color: "#fff" },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 18,
      marginTop: 16,
      paddingHorizontal: 16,
    },
    err: { color: colors.danger, textAlign: "center", fontSize: 14 },
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>هويتي المهنية</Text>
      </View>

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color={colors.accent} size="large" />
        ) : error ? (
          <Text style={styles.err}>{error}</Text>
        ) : profile ? (
          <>
            <View style={styles.card}>
              {/* Company badge */}
              <View style={styles.companyBadge}>
                <Text style={styles.companyBadgeText}>{profile.company_name}</Text>
              </View>

              {/* Icon */}
              <View style={styles.iconCircle}>
                <Ionicons name="id-card-outline" size={34} color={colors.accent} />
              </View>

              {/* Work ID */}
              <Text style={styles.workIdLabel}>WORK ID</Text>
              <Text style={styles.workIdText}>{profile.work_id}</Text>

              {/* Role + job title */}
              <View style={styles.roleRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </Text>
                </View>
                {profile.job_title ? (
                  <Text style={styles.jobTitle}>{profile.job_title}</Text>
                ) : null}
              </View>

              <View style={styles.divider} />

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, copied && styles.actionBtnPrimary]}
                  onPress={handleCopy}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy-outline"}
                    size={18}
                    color={copied ? "#fff" : colors.textPrimary}
                  />
                  <Text style={[styles.actionBtnText, copied && styles.actionBtnTextPrimary]}>
                    {copied ? "تم النسخ!" : "نسخ"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-outline" size={18} color="#fff" />
                  <Text style={styles.actionBtnTextPrimary}>مشاركة</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.hint}>
              شارك هذا الرمز مع مدراء الشركات حتى يتمكنوا من إضافتك مباشرةً إلى فريقهم
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
