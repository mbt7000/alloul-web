/**
 * RecruitmentScreen — نظام التوظيف الكامل
 * 5 تبويبات: لوحة · وظائف · متقدمون · مواهب · توظيف مباشر
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  RefreshControl, ScrollView, Share, StyleSheet, TextInput, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import {
  getRecruitmentDashboard, getRecruitmentJobs, createRecruitmentJob,
  getJobApplicants, updateApplicantStage, getTalentPool, getInviteLink,
  sendEmailInvite,
  type RecruitmentDashboard, type RecruitmentJob,
  type JobApplicant, type TalentProfile,
} from "../../../api";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";

type TabKey = "dashboard" | "jobs" | "applicants" | "talent" | "direct";

const JOB_TYPES = [
  { value: "full_time", label: "دوام كامل" },
  { value: "part_time", label: "دوام جزئي" },
  { value: "remote", label: "عن بُعد" },
  { value: "contract", label: "عقد مؤقت" },
];

const STAGES = [
  { value: "applied",    label: "تقدّم",   color: "#6B7280", bg: "#F3F4F6" },
  { value: "screening",  label: "فرز",     color: "#3B82F6", bg: "#EFF6FF" },
  { value: "interview",  label: "مقابلة",  color: "#D97706", bg: "#FFFBEB" },
  { value: "offer",      label: "عرض",     color: "#10B981", bg: "#ECFDF5" },
  { value: "hired",      label: "تعيين",   color: "#059669", bg: "#D1FAE5" },
  { value: "rejected",   label: "مرفوض",   color: "#EF4444", bg: "#FEF2F2" },
];

const stageInfo = (s: string) => STAGES.find(x => x.value === s) ?? STAGES[0];
const jobTypeLabel = (t?: string | null) => JOB_TYPES.find(x => x.value === t)?.label ?? (t ?? "");
const fmtDate = (d?: string | null) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return ""; }
};

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ c }: { c: any }) {
  const [data, setData] = useState<RecruitmentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try { setData(await getRecruitmentDashboard()); }
    catch { Alert.alert("خطأ", "تعذّر تحميل لوحة التوظيف"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={c.accentBlue} />;

  const stats = [
    { label: "وظائف مفتوحة",  value: data?.open_jobs ?? 0,        color: "#3B82F6" },
    { label: "إجمالي المتقدمين", value: data?.total_applicants ?? 0, color: "#8B5CF6" },
    { label: "جديد هذا الأسبوع", value: data?.new_this_week ?? 0,   color: "#F59E0B" },
    { label: "تم التعيين",     value: data?.hired ?? 0,             color: "#10B981" },
    { label: "قيد المراجعة",   value: data?.pending_review ?? 0,    color: "#EF4444" },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {stats.map(s => (
          <View key={s.label} style={[styles.statCard, { borderColor: s.color + "40", backgroundColor: s.color + "14", flex: 1, minWidth: "44%" }]}>
            <AppText style={{ fontSize: 28, fontWeight: "800", color: s.color }}>{s.value}</AppText>
            <AppText style={{ fontSize: 12, color: s.color, opacity: 0.8, marginTop: 2 }}>{s.label}</AppText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Jobs Tab ──────────────────────────────────────────────────────────────────
function JobsTab({ c, onSelectJob }: { c: any; onSelectJob: (job: RecruitmentJob) => void }) {
  const [jobs, setJobs] = useState<RecruitmentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", job_type: "full_time", location: "", description: "", min_experience: "" });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try { setJobs(await getRecruitmentJobs()); }
    catch { setJobs([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title.trim()) { Alert.alert("خطأ", "اسم الوظيفة مطلوب"); return; }
    setCreating(true);
    try {
      await createRecruitmentJob({
        title: form.title.trim(),
        job_type: form.job_type,
        location: form.location.trim() || undefined,
        description: form.description.trim() || undefined,
        min_experience: form.min_experience ? parseInt(form.min_experience) : undefined,
      });
      setShowCreate(false);
      setForm({ title: "", job_type: "full_time", location: "", description: "", min_experience: "" });
      void load();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر إنشاء الوظيفة");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={c.accentBlue} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={jobs}
        keyExtractor={j => String(j.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
            <Ionicons name="briefcase-outline" size={40} color={c.textMuted} />
            <AppText style={{ color: c.textMuted }}>لا توجد وظائف بعد</AppText>
          </View>
        }
        renderItem={({ item: job }) => (
          <Pressable
            onPress={() => onSelectJob(job)}
            style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <AppText style={{ fontSize: 15, fontWeight: "700", color: c.textPrimary, flex: 1 }}>{job.title}</AppText>
              <View style={[styles.badge, { backgroundColor: job.is_active ? "#D1FAE5" : "#F3F4F6" }]}>
                <AppText style={{ fontSize: 11, fontWeight: "700", color: job.is_active ? "#059669" : "#6B7280" }}>
                  {job.is_active ? "مفتوحة" : "مغلقة"}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
              {job.job_type && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="briefcase-outline" size={12} color={c.textMuted} />
                  <AppText style={{ fontSize: 12, color: c.textMuted }}>{jobTypeLabel(job.job_type)}</AppText>
                </View>
              )}
              {job.location && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="location-outline" size={12} color={c.textMuted} />
                  <AppText style={{ fontSize: 12, color: c.textMuted }}>{job.location}</AppText>
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="people-outline" size={12} color={c.accentBlue} />
                <AppText style={{ fontSize: 12, color: c.accentBlue }}>{job.applicants_count} متقدم</AppText>
              </View>
            </View>
            <AppText style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}>{fmtDate(job.created_at)}</AppText>
          </Pressable>
        )}
      />

      {/* FAB */}
      <Pressable onPress={() => setShowCreate(true)} style={[styles.fab, { backgroundColor: c.accentBlue }]}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCreate(false)} />
        <View style={[styles.sheet, { backgroundColor: c.bg }]}>
          <AppText style={{ fontSize: 17, fontWeight: "800", color: c.textPrimary, marginBottom: 16 }}>وظيفة جديدة</AppText>

          <AppText style={dynStyles.label(c)}>المسمى الوظيفي *</AppText>
          <TextInput value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))}
            placeholder="مثال: مطوّر React Native" placeholderTextColor={c.textMuted}
            style={dynStyles.input(c)} />

          <AppText style={dynStyles.label(c)}>نوع الدوام</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {JOB_TYPES.map(t => (
              <Pressable key={t.value} onPress={() => setForm(f => ({ ...f, job_type: t.value }))}
                style={[dynStyles.chip(c), form.job_type === t.value && { backgroundColor: c.accentBlue + "22", borderColor: c.accentBlue }]}>
                <AppText style={{ fontSize: 12, color: form.job_type === t.value ? c.accentBlue : c.textSecondary }}>
                  {t.label}
                </AppText>
              </Pressable>
            ))}
          </View>

          <AppText style={dynStyles.label(c)}>الموقع</AppText>
          <TextInput value={form.location} onChangeText={t => setForm(f => ({ ...f, location: t }))}
            placeholder="الرياض، السعودية" placeholderTextColor={c.textMuted}
            style={dynStyles.input(c)} />

          <AppText style={dynStyles.label(c)}>الحد الأدنى للخبرة (سنوات)</AppText>
          <TextInput value={form.min_experience} onChangeText={t => setForm(f => ({ ...f, min_experience: t }))}
            placeholder="0" keyboardType="numeric" placeholderTextColor={c.textMuted}
            style={dynStyles.input(c)} />

          <Pressable onPress={handleCreate} disabled={creating}
            style={[styles.btnPrimary, { backgroundColor: c.accentBlue, opacity: creating ? 0.6 : 1 }]}>
            {creating ? <ActivityIndicator color="#fff" /> : (
              <AppText style={{ color: "#fff", fontWeight: "700" }}>نشر الوظيفة</AppText>
            )}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

// ── Applicants Tab ────────────────────────────────────────────────────────────
function ApplicantsTab({ c, selectedJob }: { c: any; selectedJob: RecruitmentJob | null }) {
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stageModal, setStageModal] = useState<{ app: JobApplicant } | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!selectedJob) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    try { setApplicants(await getJobApplicants(selectedJob.id)); }
    catch { setApplicants([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedJob]);

  useEffect(() => { void load(); }, [load]);

  const handleStageChange = async (stage: string) => {
    if (!stageModal) return;
    setUpdating(true);
    try {
      await updateApplicantStage(stageModal.app.id, stage);
      setApplicants(prev => prev.map(a => a.id === stageModal.app.id ? { ...a, stage } : a));
      setStageModal(null);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر تحديث المرحلة");
    } finally {
      setUpdating(false);
    }
  };

  if (!selectedJob) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
      <Ionicons name="people-outline" size={44} color={c.textMuted} />
      <AppText style={{ color: c.textMuted, textAlign: "center" }}>اختر وظيفة من تبويب "الوظائف" أولاً</AppText>
    </View>
  );

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={c.accentBlue} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.jobBanner, { backgroundColor: c.accentBlue + "14", borderColor: c.accentBlue + "30" }]}>
        <Ionicons name="briefcase-outline" size={14} color={c.accentBlue} />
        <AppText style={{ color: c.accentBlue, fontSize: 13, fontWeight: "700", flex: 1 }}>{selectedJob.title}</AppText>
        <AppText style={{ color: c.accentBlue, fontSize: 12 }}>{applicants.length} متقدم</AppText>
      </View>

      <FlatList
        data={applicants}
        keyExtractor={a => String(a.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
            <Ionicons name="person-outline" size={40} color={c.textMuted} />
            <AppText style={{ color: c.textMuted }}>لا يوجد متقدمون بعد</AppText>
          </View>
        }
        renderItem={({ item: app }) => {
          const si = stageInfo(app.stage);
          return (
            <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 14, fontWeight: "700", color: c.textPrimary }}>{app.name || app.username}</AppText>
                  <AppText style={{ fontSize: 12, color: c.textMuted }}>@{app.username} · {fmtDate(app.applied_at)}</AppText>
                </View>
                <Pressable onPress={() => setStageModal({ app })}
                  style={[styles.badge, { backgroundColor: si.bg }]}>
                  <AppText style={{ fontSize: 11, fontWeight: "700", color: si.color }}>{si.label}</AppText>
                  <Ionicons name="chevron-down" size={10} color={si.color} />
                </Pressable>
              </View>
              {app.note && (
                <AppText style={{ fontSize: 12, color: c.textSecondary, marginTop: 6 }}>{app.note}</AppText>
              )}
            </View>
          );
        }}
      />

      {/* Stage Modal */}
      <Modal visible={!!stageModal} animationType="fade" transparent onRequestClose={() => setStageModal(null)}>
        <Pressable style={styles.overlay} onPress={() => setStageModal(null)} />
        <View style={[styles.sheet, { backgroundColor: c.bg }]}>
          <AppText style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary, marginBottom: 16 }}>تغيير المرحلة</AppText>
          {STAGES.map(s => (
            <Pressable key={s.value} onPress={() => !updating && void handleStageChange(s.value)}
              style={[styles.stageRow, { backgroundColor: s.bg, borderColor: s.color + "40" }]}>
              <View style={[styles.stageDot, { backgroundColor: s.color }]} />
              <AppText style={{ color: s.color, fontWeight: "700", fontSize: 14 }}>{s.label}</AppText>
              {stageModal?.app.stage === s.value && (
                <Ionicons name="checkmark-circle" size={18} color={s.color} style={{ marginLeft: "auto" }} />
              )}
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}

// ── Talent Pool Tab ───────────────────────────────────────────────────────────
function TalentTab({ c }: { c: any }) {
  const [profiles, setProfiles] = useState<TalentProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    try { setProfiles(await getTalentPool(q || undefined)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void doSearch(""); }, [doSearch]);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={[styles.searchBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <Ionicons name="search-outline" size={16} color={c.textMuted} />
        <TextInput
          value={search}
          onChangeText={t => { setSearch(t); void doSearch(t); }}
          placeholder="ابحث عن مواهب..."
          placeholderTextColor={c.textMuted}
          style={{ flex: 1, color: c.textPrimary, fontSize: 14, textAlign: "right" }}
        />
      </View>

      {loading ? <ActivityIndicator color={c.accentBlue} /> : (
        <FlatList
          data={profiles}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={{ gap: 10 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
              <Ionicons name="people-circle-outline" size={44} color={c.textMuted} />
              <AppText style={{ color: c.textMuted }}>لا توجد نتائج</AppText>
            </View>
          }
          renderItem={({ item: p }) => (
            <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, flexDirection: "row", gap: 12, alignItems: "center" }]}>
              <View style={[styles.avatar, { backgroundColor: c.accentBlue + "22" }]}>
                <AppText style={{ color: c.accentBlue, fontWeight: "800", fontSize: 16 }}>
                  {(p.name || p.username).charAt(0).toUpperCase()}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 14, fontWeight: "700", color: c.textPrimary }}>{p.name || p.username}</AppText>
                <AppText style={{ fontSize: 12, color: c.textMuted }}>@{p.username}</AppText>
                {p.location && <AppText style={{ fontSize: 11, color: c.textMuted }}>{p.location}</AppText>}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ── Direct Hire Tab ───────────────────────────────────────────────────────────
function DirectHireTab({ c }: { c: any }) {
  const [method, setMethod] = useState<"email" | "icode">("email");
  const [email, setEmail] = useState("");
  const [icode, setIcode] = useState("");
  const [role, setRole] = useState("employee");
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);

  const roles = [
    { value: "employee", label: "موظف" },
    { value: "manager", label: "مدير" },
    { value: "admin", label: "مشرف" },
  ];

  const handleSend = async () => {
    const target = method === "email" ? email.trim() : icode.trim();
    if (!target) { Alert.alert("خطأ", method === "email" ? "أدخل الإيميل" : "أدخل كود الدعوة"); return; }
    setSending(true);
    try {
      await sendEmailInvite(target, role);
      Alert.alert("تم", `تم إرسال دعوة إلى ${target}`);
      setEmail(""); setIcode("");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر الإرسال");
    } finally {
      setSending(false);
    }
  };

  const loadInviteLink = async () => {
    setLoadingLink(true);
    try {
      const data = await getInviteLink();
      const link = `https://alloul.app/join/${data.invite_code}`;
      setInviteLink(link);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر جلب الرابط");
    } finally {
      setLoadingLink(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Method chips */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["email", "icode"] as const).map(m => (
          <Pressable key={m} onPress={() => setMethod(m)}
            style={[dynStyles.chip(c), method === m && { backgroundColor: c.accentBlue + "22", borderColor: c.accentBlue }]}>
            <Ionicons name={m === "email" ? "mail-outline" : "person-outline"} size={14}
              color={method === m ? c.accentBlue : c.textSecondary} />
            <AppText style={{ fontSize: 13, color: method === m ? c.accentBlue : c.textSecondary, fontWeight: "600" }}>
              {m === "email" ? "بريد إلكتروني" : "رمز الدعوة"}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* Input */}
      <TextInput
        value={method === "email" ? email : icode}
        onChangeText={t => method === "email" ? setEmail(t) : setIcode(t)}
        placeholder={method === "email" ? "example@company.com" : "أدخل رمز الدعوة"}
        placeholderTextColor={c.textMuted}
        keyboardType={method === "email" ? "email-address" : "default"}
        autoCapitalize="none"
        style={dynStyles.input(c)}
      />

      {/* Role */}
      <View>
        <AppText style={dynStyles.label(c)}>الدور الوظيفي</AppText>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {roles.map(r => (
            <Pressable key={r.value} onPress={() => setRole(r.value)}
              style={[dynStyles.chip(c), role === r.value && { backgroundColor: c.accentBlue + "22", borderColor: c.accentBlue }]}>
              <AppText style={{ fontSize: 13, color: role === r.value ? c.accentBlue : c.textSecondary, fontWeight: "600" }}>
                {r.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Send */}
      <Pressable onPress={handleSend} disabled={sending}
        style={[styles.btnPrimary, { backgroundColor: c.accentBlue, opacity: sending ? 0.6 : 1 }]}>
        {sending ? <ActivityIndicator color="#fff" /> : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="send-outline" size={16} color="#fff" />
            <AppText style={{ color: "#fff", fontWeight: "700" }}>إرسال الدعوة</AppText>
          </View>
        )}
      </Pressable>

      {/* Divider */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <AppText style={{ color: c.textMuted, fontSize: 12 }}>أو</AppText>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>

      {/* Invite link */}
      <Pressable onPress={loadInviteLink} disabled={loadingLink}
        style={[styles.btnSecondary, { borderColor: c.border, backgroundColor: c.bgCard }]}>
        {loadingLink ? <ActivityIndicator color={c.accentBlue} /> : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="link-outline" size={16} color={c.accentBlue} />
            <AppText style={{ color: c.accentBlue, fontWeight: "700" }}>جلب رابط الدعوة</AppText>
          </View>
        )}
      </Pressable>

      {inviteLink && (
        <Pressable onPress={() => Share.share({ message: inviteLink })}
          style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.accentBlue + "40", flexDirection: "row", alignItems: "center", gap: 10 }]}>
          <Ionicons name="copy-outline" size={16} color={c.accentBlue} />
          <AppText style={{ flex: 1, fontSize: 12, color: c.accentBlue }} numberOfLines={1}>{inviteLink}</AppText>
          <Ionicons name="share-social-outline" size={16} color={c.accentBlue} />
        </Pressable>
      )}
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function RecruitmentScreen() {
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [selectedJob, setSelectedJob] = useState<RecruitmentJob | null>(null);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "dashboard", label: "لوحة",      icon: "stats-chart-outline" },
    { key: "jobs",      label: "وظائف",     icon: "briefcase-outline" },
    { key: "applicants",label: "متقدمون",   icon: "people-outline" },
    { key: "talent",    label: "مواهب",     icon: "search-outline" },
    { key: "direct",    label: "توظيف مباشر", icon: "person-add-outline" },
  ];

  const handleSelectJob = (job: RecruitmentJob) => {
    setSelectedJob(job);
    setTab("applicants");
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <CompanyWorkModeTopBar />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
        </Pressable>
        <AppText style={{ fontSize: 17, fontWeight: "800", color: c.textPrimary, flex: 1, textAlign: "right" }}>
          التوظيف
        </AppText>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 44, borderBottomWidth: 1, borderBottomColor: c.border }}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 4, alignItems: "center" }}
      >
        {tabs.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)}
            style={[styles.tabBtn, tab === t.key && { borderBottomWidth: 2, borderBottomColor: c.accentBlue }]}>
            <Ionicons name={t.icon} size={14} color={tab === t.key ? c.accentBlue : c.textMuted} />
            <AppText style={{ fontSize: 12, fontWeight: "700", color: tab === t.key ? c.accentBlue : c.textMuted }}>
              {t.label}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {tab === "dashboard"  && <DashboardTab c={c} />}
        {tab === "jobs"       && <JobsTab c={c} onSelectJob={handleSelectJob} />}
        {tab === "applicants" && <ApplicantsTab c={c} selectedJob={selectedJob} />}
        {tab === "talent"     && <TalentTab c={c} />}
        {tab === "direct"     && <DirectHireTab c={c} />}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  statCard:   { padding: 16, borderRadius: 14, borderWidth: 1 },
  card:       { padding: 14, borderRadius: 14, borderWidth: 1 },
  badge:      { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  fab:        { position: "absolute", bottom: 20, right: 20, width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", elevation: 4, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  overlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet:      { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, gap: 8 },
  stageRow:   { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, marginBottom: 6, borderWidth: 1 },
  stageDot:   { width: 10, height: 10, borderRadius: 5 },
  jobBanner:  { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, marginHorizontal: 16, marginTop: 10, borderRadius: 10, borderWidth: 1 },
  searchBox:  { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  avatar:     { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  header:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  tabBtn:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 10 },
  btnPrimary: { paddingVertical: 14, borderRadius: 14, alignItems: "center" as const },
  btnSecondary: { paddingVertical: 14, borderRadius: 14, alignItems: "center" as const, borderWidth: 1 },
});

const dynStyles = {
  input:  (c: any) => ({ backgroundColor: c.bgCard, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: c.textPrimary, fontSize: 14, borderWidth: 1, borderColor: c.border, textAlign: "right" as const, marginBottom: 4 }),
  label:  (c: any) => ({ fontSize: 13, color: c.textSecondary, marginBottom: 6, marginTop: 4 }),
  chip:   (c: any) => ({ flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: c.border }),
};
