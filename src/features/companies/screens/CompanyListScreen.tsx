import React, { useState } from "react";
import {
  ScrollView, View, I18nManager, Modal, TextInput,
  Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Clipboard,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import ListRow from "../../../shared/ui/ListRow";
import { CompanyEmptyState, CompanyHeroCard, CompanySectionLabel } from "../components/CompanyBlocks";
import { useCompany } from "../../../state/company/CompanyContext";
import { useAuth } from "../../../state/auth/AuthContext";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { createCompany, joinByInviteCode } from "../../../api";

type ModalType = "create" | "join" | null;

export default function CompanyListScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { company, refresh } = useCompany();
  const { signOut, user } = useAuth();
  const isRTL = I18nManager.isRTL;

  const [modal, setModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Create company fields
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");

  // Join company field
  const [inviteCode, setInviteCode] = useState("");

  const styles = useThemedStyles(() => ({
    content: { padding: 16, paddingBottom: 110 },
    modalOverlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 20, fontWeight: "800", color: colors.textPrimary,
      marginBottom: 20, textAlign: "center",
    },
    input: {
      backgroundColor: colors.bgCard,
      borderRadius: 12, padding: 14,
      color: colors.textPrimary, fontSize: 15,
      marginBottom: 12,
      borderWidth: 1, borderColor: colors.border,
    },
    btn: {
      borderRadius: 14, padding: 16,
      alignItems: "center", marginTop: 6,
    },
    logoutRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      marginTop: 32, justifyContent: "center", opacity: 0.6,
    },
    codeCard: {
      backgroundColor: colors.surface,
      borderRadius: 16, padding: 16, marginTop: 20,
      borderWidth: 1, borderColor: colors.border,
    },
    codeRow: {
      flexDirection: "row", alignItems: "center",
      justifyContent: "space-between", marginTop: 8,
    },
    codeText: {
      fontSize: 22, fontWeight: "800", color: colors.accentTeal,
      letterSpacing: 3,
    },
  }));

  const handleCreateCompany = async () => {
    if (!companyName.trim()) {
      Alert.alert("خطأ", "أدخل اسم الشركة");
      return;
    }
    setLoading(true);
    try {
      await createCompany({ name: companyName.trim(), company_type: companyType.trim() || undefined });
      await refresh();
      setModal(null);
      setCompanyName("");
      setCompanyType("");
    } catch (e: unknown) {
      const err = e as { detail?: string; message?: string };
      Alert.alert("خطأ", err?.detail || err?.message || "فشل إنشاء الشركة");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompany = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("خطأ", "أدخل كود الدعوة");
      return;
    }
    setLoading(true);
    try {
      await joinByInviteCode(inviteCode.trim());
      await refresh();
      setModal(null);
      setInviteCode("");
    } catch (e: unknown) {
      const err = e as { detail?: string; message?: string };
      Alert.alert("خطأ", err?.detail || err?.message || "كود الدعوة غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!user?.i_code) return;
    Clipboard.setString(user.i_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل تريد الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="الشركات" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CompanyHeroCard
          eyebrow="مساحة الشركات"
          title={company?.name || "شركاتك"}
          subtitle="تصفّح شركتك المرتبطة وانتقل إلى ملفها التشغيلي."
          chips={[
            {
              label: company ? "شركة مرتبطة" : "لا توجد شركة",
              icon: "business-outline",
              tone: company ? "teal" : "muted",
            },
          ]}
        />

        {company ? (
          <View style={{ marginTop: 18 }}>
            <CompanySectionLabel label="شركتك" />
            <ListRow
              title={company.name}
              subtitle={company.i_code ? `رمز الشركة ${company.i_code} · مساحة تشغيلية` : "مساحة تشغيلية"}
              iconLeft="shield-checkmark-outline"
              onPress={() => navigation.navigate("Company")}
              right={<Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={18} color={colors.accentTeal} />}
            />
          </View>
        ) : (
          <View style={{ marginTop: 18 }}>
            <CompanyEmptyState
              icon="business-outline"
              title="لا توجد شركة مرتبطة"
              subtitle="أنشئ شركة جديدة أو انضم بكود دعوة للبدء."
            />

            {/* Action buttons */}
            <View style={{ marginTop: 20, gap: 12 }}>
              <Pressable
                onPress={() => setModal("create")}
                style={({ pressed }) => [
                  styles.btn,
                  { backgroundColor: colors.accentTeal, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <AppText style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                  إنشاء شركة جديدة
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => setModal("join")}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: "transparent",
                    borderWidth: 1.5,
                    borderColor: colors.accentTeal,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <AppText style={{ color: colors.accentTeal, fontWeight: "700", fontSize: 16 }}>
                  انضم بكود دعوة
                </AppText>
              </Pressable>
            </View>

            {/* Personal code card */}
            {user?.i_code && (
              <View style={styles.codeCard}>
                <AppText style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700" }}>
                  رمزك الشخصي — شاركه مع الشركات لتضيفك
                </AppText>
                <View style={styles.codeRow}>
                  <AppText style={styles.codeText}>{user.i_code}</AppText>
                  <Pressable
                    onPress={handleCopyCode}
                    style={({ pressed }) => ({
                      flexDirection: "row", alignItems: "center", gap: 6,
                      backgroundColor: codeCopied ? colors.accentTeal : colors.bgCard,
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Ionicons
                      name={codeCopied ? "checkmark" : "copy-outline"}
                      size={16}
                      color={codeCopied ? "#fff" : colors.textSecondary}
                    />
                    <AppText style={{ color: codeCopied ? "#fff" : colors.textSecondary, fontSize: 13, fontWeight: "600" }}>
                      {codeCopied ? "تم!" : "نسخ"}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Logout */}
            <Pressable onPress={handleLogout} style={styles.logoutRow}>
              <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
              <AppText style={{ color: colors.textSecondary, fontSize: 14 }}>تسجيل الخروج</AppText>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Create Company Modal */}
      <Modal visible={modal === "create"} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setModal(null)}>
            <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
              <AppText style={styles.modalTitle}>إنشاء شركة جديدة</AppText>

              <TextInput
                style={styles.input}
                placeholder="اسم الشركة *"
                placeholderTextColor={colors.textSecondary}
                value={companyName}
                onChangeText={setCompanyName}
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                placeholder="نوع الشركة (اختياري)"
                placeholderTextColor={colors.textSecondary}
                value={companyType}
                onChangeText={setCompanyType}
                textAlign="right"
              />

              <Pressable
                onPress={handleCreateCompany}
                disabled={loading}
                style={({ pressed }) => [
                  styles.btn,
                  { backgroundColor: colors.accentTeal, opacity: pressed || loading ? 0.7 : 1 },
                ]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <AppText style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>إنشاء</AppText>
                }
              </Pressable>

              <Pressable onPress={() => setModal(null)} style={[styles.btn, { marginTop: 4 }]}>
                <AppText style={{ color: colors.textSecondary, fontSize: 15 }}>إلغاء</AppText>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Join Company Modal */}
      <Modal visible={modal === "join"} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setModal(null)}>
            <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
              <AppText style={styles.modalTitle}>انضم بكود دعوة</AppText>

              <TextInput
                style={styles.input}
                placeholder="أدخل كود الدعوة"
                placeholderTextColor={colors.textSecondary}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="none"
                textAlign="right"
              />

              <Pressable
                onPress={handleJoinCompany}
                disabled={loading}
                style={({ pressed }) => [
                  styles.btn,
                  { backgroundColor: colors.accentTeal, opacity: pressed || loading ? 0.7 : 1 },
                ]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <AppText style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>انضم</AppText>
                }
              </Pressable>

              <Pressable onPress={() => setModal(null)} style={[styles.btn, { marginTop: 4 }]}>
                <AppText style={{ color: colors.textSecondary, fontSize: 15 }}>إلغاء</AppText>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
