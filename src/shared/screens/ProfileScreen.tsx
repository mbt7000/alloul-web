import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  Image,
  RefreshControl,
  Pressable,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  StyleSheet,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeContext";
import GlassCard from "../components/GlassCard";
import { useAuth } from "../../state/auth/AuthContext";
import { useCompany } from "../../state/company/CompanyContext";
import { updateMe } from "../../api/auth.api";
import Screen from "../layout/Screen";
import AppText from "../ui/AppText";
import ListRow from "../ui/ListRow";

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, refresh } = useAuth();
  const { company, isMember, myRole } = useCompany();
  const { colors } = useAppTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState("");

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  const initials = (user?.name || user?.username || "?").slice(0, 2).toUpperCase();
  const displayName = user?.name || user?.username || "مستخدم";

  const ROLE_LABELS: Record<string, string> = {
    owner: "مالك الشركة",
    admin: "مدير",
    manager: "مشرف",
    member: "عضو",
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.accentCyan} />}
      >
        {/* ── Cover ── */}
        <View style={{ height: 150, position: "relative", backgroundColor: `${colors.accentBlue}44` }}>
          {user?.cover_url ? (
            <Image source={{ uri: user.cover_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(76,111,255,0.18)" }} />
          )}
          <View style={{ position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => { setCoverUrlDraft(user?.cover_url ?? ""); setShowCoverModal(true); }}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}
            >
              <Ionicons name="image-outline" size={17} color={colors.white} />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}
            >
              <Ionicons name="settings-outline" size={17} color={colors.white} />
            </Pressable>
          </View>
        </View>

        {/* ── Avatar + identity ── */}
        <View style={{ paddingHorizontal: 16, marginTop: -52 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View style={{ borderRadius: 28, padding: 4, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={{ width: 96, height: 96, borderRadius: 24 }} />
              ) : (
                <View style={{ width: 96, height: 96, borderRadius: 24, backgroundColor: colors.accentBlue, alignItems: "center", justifyContent: "center" }}>
                  <AppText variant="h1" weight="bold" style={{ color: colors.white }}>{initials}</AppText>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("EditProfile")}
              style={{ marginBottom: 4, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.white }}
            >
              <AppText variant="micro" weight="bold" style={{ color: colors.black }}>تعديل الملف</AppText>
            </TouchableOpacity>
          </View>

          <AppText variant="h2" weight="bold" style={{ marginTop: 12 }}>{displayName}</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>@{user?.username}</AppText>
          {user?.bio ? (
            <AppText variant="bodySm" tone="secondary" style={{ marginTop: 8, lineHeight: 22 }}>{user.bio}</AppText>
          ) : null}

          {/* Work ID Badge */}
          {user?.i_code ? (
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(user.i_code!);
                Alert.alert("تم النسخ", `كود العمل: ${user.i_code}`);
              }}
              activeOpacity={0.7}
              style={{ marginTop: 12, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: "rgba(76,111,255,0.12)", borderWidth: 1, borderColor: "rgba(76,111,255,0.25)" }}
            >
              <Ionicons name="id-card-outline" size={14} color={colors.accentBlue} />
              <AppText variant="caption" weight="bold" style={{ color: colors.accentBlue }}>#{user.i_code}</AppText>
              <Ionicons name="copy-outline" size={12} color={colors.accentBlue} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── Company affiliation ── */}
        {isMember && company ? (
          <View style={{ marginHorizontal: 16, marginTop: 20 }}>
            <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>الشركة</AppText>
            <TouchableOpacity
              onPress={() => navigation.navigate("CompanyWorkspace")}
              style={{ backgroundColor: colors.bgCard, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(16,185,129,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(16,185,129,0.25)" }}>
                <Ionicons name="business-outline" size={22} color={colors.accentEmerald} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySm" weight="bold" numberOfLines={1}>{company.name}</AppText>
                <AppText variant="micro" tone="muted" style={{ marginTop: 2 }}>
                  {ROLE_LABELS[myRole ?? "member"] ?? myRole}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ marginHorizontal: 16, marginTop: 20, backgroundColor: colors.bgCard, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
            <AppText variant="bodySm" weight="bold" style={{ marginBottom: 4 }}>لم تنضم لشركة بعد</AppText>
            <AppText variant="micro" tone="muted">انضم لشركة لتفعيل مساحة العمل والوصول لكل الخدمات.</AppText>
          </View>
        )}

        {/* ── Contact info ── */}
        {user?.email ? (
          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>معلومات التواصل</AppText>
            <GlassCard style={{ padding: 0, overflow: "hidden" }}>
              {user.email ? (
                <ListRow
                  title={user.email}
                  subtitle="البريد الإلكتروني"
                  iconLeft="mail-outline"
                />
              ) : null}
            </GlassCard>
          </View>
        ) : null}

        {/* ── Quick actions ── */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>الإجراءات السريعة</AppText>
          <GlassCard style={{ padding: 0, overflow: "hidden" }}>
            <ListRow title="تعديل الملف الشخصي" iconLeft="person-outline" onPress={() => navigation.navigate("EditProfile")} />
            <ListRow title="الإعدادات" iconLeft="settings-outline" onPress={() => navigation.navigate("Settings")} />
            {isMember ? (
              <ListRow title="هويتي المهنية (Work ID)" iconLeft="id-card-outline" onPress={() => navigation.navigate("WorkId")} />
            ) : null}
            {isMember ? (
              <ListRow title="لوحة تحكم الشركة" iconLeft="grid-outline" onPress={() => navigation.navigate("CompanyWorkspace")} />
            ) : null}
            {isMember ? (
              <ListRow title="قاعدة المعرفة" iconLeft="book-outline" onPress={() => navigation.navigate("Knowledge")} />
            ) : null}
            {isMember ? (
              <ListRow title="التقارير" iconLeft="bar-chart-outline" onPress={() => navigation.navigate("Reports")} />
            ) : null}
          </GlassCard>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Cover URL Modal ── */}
      <Modal visible={showCoverModal} transparent animationType="fade" onRequestClose={() => setShowCoverModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }} onPress={() => setShowCoverModal(false)}>
            <Pressable
              style={{ width: "88%", backgroundColor: colors.bgCard, borderRadius: 20, padding: 20, gap: 14 }}
              onPress={(e) => e.stopPropagation()}
            >
              <AppText variant="bodySm" weight="bold">صورة الغلاف</AppText>
              <TextInput
                value={coverUrlDraft}
                onChangeText={setCoverUrlDraft}
                placeholder="https://example.com/cover.jpg"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.textPrimary, fontSize: 13, backgroundColor: colors.bgCard }}
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" }} onPress={() => setShowCoverModal(false)}>
                  <AppText variant="bodySm" weight="bold" tone="muted">إلغاء</AppText>
                </Pressable>
                <Pressable
                  style={{ flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.accentBlue, alignItems: "center" }}
                  onPress={async () => {
                    setShowCoverModal(false);
                    try {
                      await updateMe({ cover_url: coverUrlDraft.trim() || null });
                      await refresh();
                    } catch {
                      Alert.alert("خطأ", "فشل تحديث صورة الغلاف");
                    }
                  }}
                >
                  <AppText variant="bodySm" weight="bold" style={{ color: colors.white }}>حفظ</AppText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
