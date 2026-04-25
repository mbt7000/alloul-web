import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Clipboard,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useCompany } from "../../../state/company/CompanyContext";
import {
  getCompanyMembers,
  getMyRole,
  sendInvitation,
  getInviteLink,
  removeMember,
  updateMemberRole,
  validateWorkId,
  addMemberByWorkId,
  type CompanyMemberRow,
  type MyRoleResponse,
  type WorkIdPreview,
} from "../../../api";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";

// ─── Config ──────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<string, { label: string; color: string; icon: string }> = {
  owner:    { label: "المؤسس",   color: "#f5a623", icon: "star" },
  admin:    { label: "مشرف",     color: "#4c6fff", icon: "shield-checkmark" },
  manager:  { label: "مدير",     color: "#00c9b1", icon: "briefcase" },
  employee: { label: "موظف",     color: "#a78bfa", icon: "person" },
  member:   { label: "عضو",      color: "#6b7280", icon: "person-outline" },
};

const ROLES_SELECTABLE = ["admin", "manager", "employee", "member"] as const;

function avatarColor(id: number) {
  const palette = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#db2777"];
  return palette[id % palette.length];
}

function initials(member: CompanyMemberRow): string {
  if (member.user_name) return member.user_name.slice(0, 2).toUpperCase();
  return (member.i_code || "??").slice(0, 2).toUpperCase();
}

// Can this role manage members?
function canManage(role: string | null) {
  return role === "owner" || role === "admin";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TeamScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { company } = useCompany();
  const c = colors;

  const [members, setMembers] = useState<CompanyMemberRow[]>([]);
  const [myRole, setMyRole] = useState<MyRoleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("all");

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("employee");
  const [inviting, setInviting] = useState(false);

  // Role edit modal
  const [editMember, setEditMember] = useState<CompanyMemberRow | null>(null);
  const [editRole, setEditRole] = useState("employee");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Add by Work ID modal
  const [showWorkIdModal, setShowWorkIdModal] = useState(false);
  const [workIdInput, setWorkIdInput] = useState("");
  const [workIdPreview, setWorkIdPreview] = useState<WorkIdPreview | null>(null);
  const [workIdLookingUp, setWorkIdLookingUp] = useState(false);
  const [workIdAdding, setWorkIdAdding] = useState(false);

  // ─── Load ───────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const [list, role] = await Promise.all([
        getCompanyMembers(),
        getMyRole(),
      ]);
      setMembers(Array.isArray(list) ? list : []);
      setMyRole(role);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleInvite = async () => {
    if (!inviteCode.trim()) return;
    setInviting(true);
    try {
      const res = await sendInvitation(inviteCode.trim(), inviteRole);
      Alert.alert("تم الإرسال", (res as any).message || "تم إرسال الدعوة بنجاح");
      setShowInvite(false);
      setInviteCode("");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر إرسال الدعوة. تحقق من الكود.");
    } finally {
      setInviting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      const res = await getInviteLink();
      Clipboard.setString(res.invite_code);
      Alert.alert(
        "رابط الدعوة",
        `كود الدعوة: ${res.invite_code}\n\nشارك هذا الكود مع من تريد دعوته للانضمام لـ "${res.company_name}".\nصالح لمدة ${res.expires_in_hours} ساعة.`,
        [{ text: "تم النسخ ✓", style: "default" }]
      );
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر جلب رابط الدعوة");
    }
  };

  const handleRemoveMember = (member: CompanyMemberRow) => {
    const name = member.user_name || `عضو #${member.user_id}`;
    Alert.alert(
      "إزالة عضو",
      `هل تريد إزالة "${name}" من الشركة؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إزالة", style: "destructive",
          onPress: async () => {
            try {
              await removeMember(member.id);
              setMembers((p) => p.filter((m) => m.id !== member.id));
            } catch (e: any) {
              Alert.alert("خطأ", e?.message || "تعذّر الإزالة");
            }
          },
        },
      ]
    );
  };

  const openEditRole = (member: CompanyMemberRow) => {
    setEditMember(member);
    setEditRole(member.role);
    setEditJobTitle(member.job_title || "");
  };

  const handleSaveRole = async () => {
    if (!editMember) return;
    setEditSaving(true);
    try {
      const updated = await updateMemberRole(editMember.id, editRole, editJobTitle || undefined);
      setMembers((p) => p.map((m) => (m.id === editMember.id ? { ...m, role: updated.role, job_title: updated.job_title } : m)));
      setEditMember(null);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر التحديث");
    } finally {
      setEditSaving(false);
    }
  };

  const handleWorkIdLookup = async () => {
    const wid = workIdInput.trim().toUpperCase();
    if (!wid) return;
    setWorkIdLookingUp(true);
    setWorkIdPreview(null);
    try {
      const preview = await validateWorkId(wid);
      setWorkIdPreview(preview);
    } catch (e: any) {
      Alert.alert("غير موجود", e?.message || "لم يُعثر على هذا الـ Work ID");
    } finally {
      setWorkIdLookingUp(false);
    }
  };

  const handleAddByWorkId = async () => {
    if (!workIdPreview) return;
    setWorkIdAdding(true);
    try {
      const res = await addMemberByWorkId({ work_id: workIdPreview.work_id, role: "employee" });
      Alert.alert("تمت الإضافة ✓", res.message);
      setShowWorkIdModal(false);
      setWorkIdInput("");
      setWorkIdPreview(null);
      void load();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّرت الإضافة");
    } finally {
      setWorkIdAdding(false);
    }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const isManager = canManage(myRole?.role ?? null);
  const filtered = filterRole === "all" ? members : members.filter((m) => m.role === filterRole);

  const counts = {
    owner: members.filter((m) => m.role === "owner").length,
    admin: members.filter((m) => m.role === "admin").length,
    manager: members.filter((m) => m.role === "manager").length,
    employee: members.filter((m) => m.role === "employee").length,
    member: members.filter((m) => m.role === "member").length,
  };

  const myRoleCfg = ROLE_CFG[myRole?.role ?? ""] ?? null;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="micro" tone="muted" weight="bold">الفريق</AppText>
          <AppText variant="h2" weight="bold">{company?.name ?? "الشركة"}</AppText>
        </View>
        {myRoleCfg ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: myRoleCfg.color + "22", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: myRoleCfg.color + "44" }}>
            <Ionicons name={myRoleCfg.icon as any} size={13} color={myRoleCfg.color} />
            <AppText style={{ color: myRoleCfg.color, fontSize: 12, fontWeight: "700" }}>{myRoleCfg.label}</AppText>
          </View>
        ) : null}
        {isManager ? (
          <Pressable
            onPress={() => setShowInvite(true)}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentCyan + "22", borderWidth: 1, borderColor: c.accentCyan + "55", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="person-add-outline" size={18} color={c.accentCyan} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 110, gap: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={c.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats Row ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: 16 }}>
          {Object.entries(counts).filter(([, v]) => v > 0).map(([role, count]) => {
            const cfg = ROLE_CFG[role] ?? { label: role, color: "#6b7280" };
            return (
              <Pressable
                key={role}
                onPress={() => setFilterRole(filterRole === role ? "all" : role)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1,
                  borderColor: filterRole === role ? cfg.color : c.border,
                  backgroundColor: filterRole === role ? cfg.color + "22" : c.cardElevated,
                  alignItems: "center", gap: 4, minWidth: 70,
                }}
              >
                <AppText style={{ color: cfg.color, fontSize: 20, fontWeight: "800" }}>{count}</AppText>
                <AppText style={{ color: filterRole === role ? cfg.color : c.textMuted, fontSize: 11, fontWeight: "700" }}>{cfg.label}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Invite + Copy Link + Work ID buttons (admin only) ── */}
        {isManager ? (
          <>
            <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 8 }}>
              <Pressable
                onPress={() => setShowInvite(true)}
                style={[styles.actionCardBtn, { borderColor: c.accentCyan + "55", backgroundColor: c.accentCyan + "12" }]}
              >
                <Ionicons name="person-add-outline" size={16} color={c.accentCyan} />
                <AppText style={{ color: c.accentCyan, fontSize: 13, fontWeight: "700" }}>دعوة عضو</AppText>
              </Pressable>
              <Pressable
                onPress={handleCopyInviteLink}
                style={[styles.actionCardBtn, { borderColor: "#a78bfa55", backgroundColor: "#a78bfa12" }]}
              >
                <Ionicons name="link-outline" size={16} color="#a78bfa" />
                <AppText style={{ color: "#a78bfa", fontSize: 13, fontWeight: "700" }}>رابط الدعوة</AppText>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <Pressable
                onPress={() => { setShowWorkIdModal(true); setWorkIdPreview(null); setWorkIdInput(""); }}
                style={[styles.actionCardBtn, { borderColor: "#f59e0b55", backgroundColor: "#f59e0b12" }]}
              >
                <Ionicons name="id-card-outline" size={16} color="#f59e0b" />
                <AppText style={{ color: "#f59e0b", fontSize: 13, fontWeight: "700" }}>إضافة بـ Work ID</AppText>
              </Pressable>
            </View>
          </>
        ) : null}

        {/* ── Quick nav ── */}
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
          {[
            { label: "مشاريع الفريق", screen: "Projects", color: "#4c6fff" },
            { label: "المهام", screen: "Tasks", color: c.accentCyan },
            { label: "الاجتماعات", screen: "Meetings", color: "#f59e0b" },
          ].map((s) => (
            <Pressable
              key={s.screen}
              onPress={() => navigation.navigate(s.screen)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: s.color + "44", backgroundColor: s.color + "12", alignItems: "center" }}
            >
              <AppText style={{ color: s.color, fontSize: 12, fontWeight: "700" }}>{s.label}</AppText>
            </Pressable>
          ))}
        </View>

        {/* ── Members list ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <AppText variant="micro" tone="muted" weight="bold">
              {filterRole === "all" ? `${members.length} عضو` : `${filtered.length} ${ROLE_CFG[filterRole]?.label ?? filterRole}`}
            </AppText>
            {filterRole !== "all" ? (
              <Pressable onPress={() => setFilterRole("all")}>
                <AppText style={{ color: c.accentCyan, fontSize: 12, fontWeight: "700" }}>الكل</AppText>
              </Pressable>
            ) : null}
          </View>

          {loading && !refreshing ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator color={c.accentCyan} />
            </View>
          ) : filtered.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: c.border, backgroundColor: c.cardElevated }]}>
              <Ionicons name="people-outline" size={36} color={c.textMuted} />
              <AppText variant="body" tone="muted" style={{ marginTop: 8, textAlign: "center" }}>
                {members.length === 0 ? "لا يوجد أعضاء بعد" : "لا يوجد أعضاء بهذا الدور"}
              </AppText>
              {isManager && members.length === 0 ? (
                <AppButton label="دعوة أول عضو" tone="primary" size="sm" style={{ marginTop: 12 }} onPress={() => setShowInvite(true)} />
              ) : null}
            </View>
          ) : (
            filtered.map((member) => {
              const cfg = ROLE_CFG[member.role] ?? { label: member.role, color: "#6b7280", icon: "person-outline" };
              const bg = avatarColor(member.user_id);
              const isMe = member.user_id === myRole?.member_id;
              return (
                <Pressable
                  key={member.id}
                  onPress={() => navigation.navigate("PublicProfile", { userId: member.user_id })}
                  style={({ pressed }) => [styles.memberCard, { borderColor: c.border, backgroundColor: pressed ? c.cardElevated + "cc" : c.cardElevated }]}
                >
                  {/* Left: colored accent bar */}
                  <View style={{ width: 4, alignSelf: "stretch", backgroundColor: cfg.color, borderRadius: 4 }} />

                  {/* Avatar */}
                  {member.avatar_url ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      style={{ width: 46, height: 46, borderRadius: 14, borderWidth: 2, borderColor: bg + "66" }}
                    />
                  ) : (
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: bg + "33", borderWidth: 2, borderColor: bg + "66", alignItems: "center", justifyContent: "center" }}>
                      <AppText style={{ color: bg, fontSize: 15, fontWeight: "800" }}>{initials(member)}</AppText>
                    </View>
                  )}

                  {/* Info */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <AppText variant="bodySm" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                        {member.user_name || `عضو #${member.user_id}`}
                      </AppText>
                      {isMe ? (
                        <View style={{ backgroundColor: c.accentCyan + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <AppText style={{ color: c.accentCyan, fontSize: 10, fontWeight: "700" }}>أنت</AppText>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <View style={{ backgroundColor: cfg.color + "22", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
                        <AppText style={{ color: cfg.color, fontSize: 11, fontWeight: "700" }}>{cfg.label}</AppText>
                      </View>
                      {member.job_title ? (
                        <AppText variant="micro" tone="muted" numberOfLines={1}>{member.job_title}</AppText>
                      ) : null}
                    </View>
                    {member.user_email ? (
                      <AppText style={{ color: c.textMuted, fontSize: 11 }} numberOfLines={1}>{member.user_email}</AppText>
                    ) : null}
                  </View>

                  {/* Action buttons */}
                  <View style={{ gap: 6 }}>
                    {/* DM button — always visible (except self) */}
                    {!isMe ? (
                      <Pressable
                        onPress={(e) => { e.stopPropagation(); navigation.navigate("DirectMessage", { userId: member.user_id, userName: member.user_name }); }}
                        style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.accentCyan + "22", alignItems: "center", justifyContent: "center" }}
                      >
                        <Ionicons name="chatbubble-outline" size={16} color={c.accentCyan} />
                      </Pressable>
                    ) : null}
                    {/* Manager-only: edit / remove */}
                    {isManager && !isMe ? (
                      <>
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); openEditRole(member); }}
                          style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.accentBlue + "22", alignItems: "center", justifyContent: "center" }}
                        >
                          <Ionicons name="create-outline" size={16} color={c.accentBlue} />
                        </Pressable>
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); handleRemoveMember(member); }}
                          style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#ef444422", alignItems: "center", justifyContent: "center" }}
                        >
                          <Ionicons name="person-remove-outline" size={16} color="#ef4444" />
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Invite Modal ── */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={() => setShowInvite(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.bgCard }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h3" weight="bold" style={{ marginBottom: 4 }}>دعوة عضو جديد</AppText>
            <AppText variant="caption" tone="muted" style={{ marginBottom: 16 }}>
              أدخل كود المستخدم المكوّن من ٨ إلى ١٢ رقم من ملفه الشخصي
            </AppText>

            <TextInput
              style={[styles.input, { borderColor: c.border, color: c.textPrimary, backgroundColor: c.bg }]}
              placeholder="كود المستخدم (٨-١٢ رقم)"
              placeholderTextColor={c.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              keyboardType="number-pad"
              maxLength={12}
              autoFocus
            />

            <AppText variant="caption" tone="muted" style={{ marginTop: 14, marginBottom: 8 }}>الدور في الشركة</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ROLES_SELECTABLE.map((r) => {
                const cfg = ROLE_CFG[r];
                const active = inviteRole === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setInviteRole(r)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1,
                      borderColor: active ? cfg.color : c.border,
                      backgroundColor: active ? cfg.color + "22" : "transparent",
                    }}
                  >
                    <AppText style={{ color: active ? cfg.color : c.textMuted, fontSize: 13, fontWeight: "700" }}>
                      {cfg.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
              <AppButton label="إلغاء" tone="glass" style={{ flex: 1 }} onPress={() => setShowInvite(false)} />
              <AppButton
                label={inviting ? "جاري الإرسال…" : "إرسال الدعوة"}
                tone="primary"
                style={{ flex: 1 }}
                onPress={handleInvite}
                disabled={inviting || inviteCode.trim().length < 6}
              />
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Role Modal ── */}
      <Modal visible={!!editMember} transparent animationType="slide" onRequestClose={() => setEditMember(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={() => setEditMember(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.bgCard }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h3" weight="bold" style={{ marginBottom: 4 }}>تعديل الصلاحية</AppText>
            <AppText variant="caption" tone="muted" style={{ marginBottom: 16 }}>
              {editMember?.user_name || `عضو #${editMember?.user_id}`}
            </AppText>

            <AppText variant="caption" tone="muted" style={{ marginBottom: 8 }}>الدور</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {ROLES_SELECTABLE.map((r) => {
                const cfg = ROLE_CFG[r];
                const active = editRole === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setEditRole(r)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1,
                      borderColor: active ? cfg.color : c.border,
                      backgroundColor: active ? cfg.color + "22" : "transparent",
                    }}
                  >
                    <AppText style={{ color: active ? cfg.color : c.textMuted, fontSize: 13, fontWeight: "700" }}>
                      {cfg.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              style={[styles.input, { borderColor: c.border, color: c.textPrimary, backgroundColor: c.bg }]}
              placeholder="المسمى الوظيفي (اختياري)"
              placeholderTextColor={c.textMuted}
              value={editJobTitle}
              onChangeText={setEditJobTitle}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <AppButton label="إلغاء" tone="glass" style={{ flex: 1 }} onPress={() => setEditMember(null)} />
              <AppButton
                label={editSaving ? "جاري الحفظ…" : "حفظ التغييرات"}
                tone="primary"
                style={{ flex: 1 }}
                onPress={handleSaveRole}
                disabled={editSaving}
              />
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add by Work ID Modal ── */}
      <Modal visible={showWorkIdModal} transparent animationType="slide" onRequestClose={() => setShowWorkIdModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={() => setShowWorkIdModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.bgCard }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h3" weight="bold" style={{ marginBottom: 4 }}>إضافة موظف بـ Work ID</AppText>
            <AppText variant="caption" tone="muted" style={{ marginBottom: 20 }}>
              اطلب من الموظف مشاركة رمز الـ Work ID الخاص به وأدخله أدناه
            </AppText>

            <TextInput
              style={[styles.input, { borderColor: c.border, color: c.textPrimary, backgroundColor: c.bg, marginBottom: 12 }]}
              placeholder="EMP-2024-XXXX-XXXX"
              placeholderTextColor={c.textMuted}
              value={workIdInput}
              onChangeText={(t) => { setWorkIdInput(t.toUpperCase()); setWorkIdPreview(null); }}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {workIdPreview ? (
              <View style={{ borderRadius: 14, borderWidth: 1, borderColor: "#10b98133", backgroundColor: "#10b98111", padding: 14, marginBottom: 16, gap: 4 }}>
                <AppText style={{ fontSize: 13, color: "#10b981", fontWeight: "700" }}>✓ تم التحقق</AppText>
                <AppText style={{ fontSize: 14, color: c.textPrimary, fontWeight: "600" }}>{workIdPreview.user_name ?? "—"}</AppText>
                <AppText style={{ fontSize: 12, color: c.textMuted }}>{workIdPreview.user_email ?? ""}</AppText>
                {workIdPreview.current_company ? (
                  <AppText style={{ fontSize: 12, color: c.textMuted }}>الشركة الحالية: {workIdPreview.current_company}</AppText>
                ) : null}
              </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10 }}>
              {!workIdPreview ? (
                <>
                  <AppButton label="إلغاء" tone="glass" style={{ flex: 1 }} onPress={() => setShowWorkIdModal(false)} />
                  <AppButton
                    label={workIdLookingUp ? "جاري البحث…" : "بحث"}
                    tone="primary"
                    style={{ flex: 1 }}
                    onPress={handleWorkIdLookup}
                    disabled={workIdLookingUp || !workIdInput.trim()}
                  />
                </>
              ) : (
                <>
                  <AppButton label="تغيير" tone="glass" style={{ flex: 1 }} onPress={() => setWorkIdPreview(null)} />
                  <AppButton
                    label={workIdAdding ? "جاري الإضافة…" : "إضافة للفريق"}
                    tone="primary"
                    style={{ flex: 1 }}
                    onPress={handleAddByWorkId}
                    disabled={workIdAdding}
                  />
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  actionCardBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center", marginBottom: 16,
  },
  input: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15,
  },
});
