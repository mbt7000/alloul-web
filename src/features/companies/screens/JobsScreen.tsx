import React, { useCallback, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useCompany } from "../../../state/company/CompanyContext";
import { apiFetch } from "../../../api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobPost {
  id: number;
  company_id: number;
  company_name?: string;
  company_industry?: string;
  title: string;
  industry?: string;
  job_type: string;
  location?: string;
  description?: string;
  requirements?: string;
  salary_range?: string;
  required_skills?: string[];
  min_experience?: number;
  applications_count: number;
  is_active: boolean;
  created_at?: string;
  applied_by_me: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const JOB_TYPE_CFG: Record<string, { label: string; color: string }> = {
  full_time:  { label: "دوام كامل",  color: "#10b981" },
  part_time:  { label: "دوام جزئي",  color: "#f59e0b" },
  contract:   { label: "عقد مؤقت",   color: "#6366f1" },
  freelance:  { label: "عمل حر",     color: "#ec4899" },
  internship: { label: "تدريب",       color: "#14b8a6" },
};

function jobTypeCfg(t: string) {
  return JOB_TYPE_CFG[t] ?? { label: t, color: "#6b7280" };
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "اليوم";
  if (d === 1) return "أمس";
  if (d < 7) return `منذ ${d} أيام`;
  if (d < 30) return `منذ ${Math.floor(d / 7)} أسابيع`;
  return `منذ ${Math.floor(d / 30)} شهر`;
}

// ─── Create Job Modal ─────────────────────────────────────────────────────────

function CreateJobModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (job: JobPost) => void;
}) {
  const { colors: c } = useAppTheme();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("full_time");
  const [salaryRange, setSalaryRange] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [minExp, setMinExp] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(""); setLocation(""); setJobType("full_time"); setSalaryRange("");
    setDescription(""); setRequirements(""); setSkillsInput(""); setMinExp("");
  };

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert("خطأ", "عنوان الوظيفة مطلوب"); return; }
    setSaving(true);
    try {
      const skills = skillsInput.split(",").map((s) => s.trim()).filter(Boolean);
      const job = await apiFetch<JobPost>("/jobs/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          job_type: jobType,
          location: location.trim() || undefined,
          salary_range: salaryRange.trim() || undefined,
          description: description.trim() || undefined,
          requirements: requirements.trim() || undefined,
          required_skills: skills.length ? skills : undefined,
          min_experience: minExp ? parseInt(minExp, 10) : undefined,
        }),
      });
      onCreated(job);
      reset();
      onClose();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر نشر الوظيفة");
    }
    setSaving(false);
  };

  const inputStyle = {
    backgroundColor: c.cardStrong,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: c.textPrimary,
    fontSize: 14,
    marginBottom: 10,
  } as const;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
        <View style={{ backgroundColor: c.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "94%", paddingBottom: 40 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", padding: 18, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Ionicons name="briefcase-outline" size={22} color={c.accentCyan} style={{ marginRight: 10 }} />
            <AppText variant="bodySm" weight="bold" style={{ flex: 1 }}>نشر وظيفة جديدة</AppText>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18 }}>
            <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>عنوان الوظيفة *</AppText>
            <TextInput
              style={inputStyle}
              placeholder="مثال: مطوّر React Native"
              placeholderTextColor={c.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>نوع الوظيفة</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {Object.entries(JOB_TYPE_CFG).map(([key, cfg]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setJobType(key)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      borderWidth: 1,
                      borderColor: jobType === key ? cfg.color : c.border,
                      backgroundColor: jobType === key ? cfg.color + "22" : "transparent",
                    }}
                  >
                    <AppText style={{ color: jobType === key ? cfg.color : c.textMuted, fontSize: 13, fontWeight: "700" }}>
                      {cfg.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>الموقع</AppText>
            <TextInput
              style={inputStyle}
              placeholder="مثال: الرياض، عن بُعد"
              placeholderTextColor={c.textMuted}
              value={location}
              onChangeText={setLocation}
            />

            <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>الراتب (اختياري)</AppText>
            <TextInput
              style={inputStyle}
              placeholder="مثال: 5,000 - 10,000 ريال"
              placeholderTextColor={c.textMuted}
              value={salaryRange}
              onChangeText={setSalaryRange}
            />

            <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>سنوات الخبرة المطلوبة</AppText>
            <TextInput
              style={inputStyle}
              placeholder="0"
              placeholderTextColor={c.textMuted}
              value={minExp}
              onChangeText={setMinExp}
              keyboardType="numeric"
            />

            <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>المهارات المطلوبة (مفصولة بفاصلة)</AppText>
            <TextInput
              style={inputStyle}
              placeholder="React, TypeScript, Node.js"
              placeholderTextColor={c.textMuted}
              value={skillsInput}
              onChangeText={setSkillsInput}
            />

            <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>وصف الوظيفة</AppText>
            <TextInput
              style={[inputStyle, { height: 90, textAlignVertical: "top" }]}
              placeholder="أضف وصفاً للمهام والمسؤوليات..."
              placeholderTextColor={c.textMuted}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>المتطلبات</AppText>
            <TextInput
              style={[inputStyle, { height: 80, textAlignVertical: "top" }]}
              placeholder="المؤهلات والشروط المطلوبة..."
              placeholderTextColor={c.textMuted}
              multiline
              value={requirements}
              onChangeText={setRequirements}
            />

            <AppButton
              label={saving ? "جارٍ النشر..." : "نشر الوظيفة"}
              onPress={handleCreate}
              disabled={saving || !title.trim()}
              style={{ marginTop: 8 }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────

function ApplyModal({
  job,
  onClose,
  onApplied,
}: {
  job: JobPost | null;
  onClose: () => void;
  onApplied: (jobId: number) => void;
}) {
  const { colors: c } = useAppTheme();
  const [coverLetter, setCoverLetter] = useState("");
  const [sending, setSending] = useState(false);

  const handleApply = async () => {
    if (!job) return;
    setSending(true);
    try {
      await apiFetch(`/jobs/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_letter: coverLetter.trim() || undefined }),
      });
      onApplied(job.id);
      setCoverLetter("");
      onClose();
      Alert.alert("تم التقديم", "تم إرسال طلبك بنجاح!");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر إرسال الطلب");
    }
    setSending(false);
  };

  if (!job) return null;

  return (
    <Modal visible={!!job} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
        <View style={{ backgroundColor: c.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 50 }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 18, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodySm" weight="bold">{job.title}</AppText>
              <AppText variant="micro" tone="muted">{job.company_name}</AppText>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 18 }}>
            <AppText variant="caption" weight="bold" style={{ marginBottom: 8 }}>رسالة تعريفية (اختياري)</AppText>
            <TextInput
              style={{
                backgroundColor: c.cardStrong,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 14,
                padding: 14,
                color: c.textPrimary,
                fontSize: 14,
                height: 120,
                textAlignVertical: "top",
                marginBottom: 16,
              }}
              placeholder="أخبرنا لماذا أنت مناسب لهذه الوظيفة..."
              placeholderTextColor={c.textMuted}
              multiline
              value={coverLetter}
              onChangeText={setCoverLetter}
            />
            <AppButton
              label={sending ? "جارٍ الإرسال..." : "تقديم الطلب"}
              onPress={handleApply}
              disabled={sending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  isManager,
  onApply,
  onViewApplications,
  onDelete,
}: {
  job: JobPost;
  isManager: boolean;
  onApply: (job: JobPost) => void;
  onViewApplications: (job: JobPost) => void;
  onDelete: (job: JobPost) => void;
}) {
  const { colors: c } = useAppTheme();
  const typeCfg = jobTypeCfg(job.job_type);

  return (
    <View style={{
      backgroundColor: c.bgCard,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 12,
    }}>
      {/* Title row */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: c.accentBlue + "20", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.accentBlue + "35" }}>
          <Ionicons name="briefcase-outline" size={20} color={c.accentBlue} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold" numberOfLines={2}>{job.title}</AppText>
          {job.company_name ? (
            <AppText variant="micro" tone="muted" style={{ marginTop: 2 }}>{job.company_name}</AppText>
          ) : null}
        </View>
        {job.applied_by_me && (
          <View style={{ backgroundColor: "#10b98122", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#10b98133" }}>
            <AppText style={{ color: "#10b981", fontSize: 10, fontWeight: "700" }}>مُقدَّم</AppText>
          </View>
        )}
      </View>

      {/* Meta pills */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <View style={{ backgroundColor: typeCfg.color + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: typeCfg.color + "33" }}>
          <AppText style={{ color: typeCfg.color, fontSize: 11, fontWeight: "700" }}>{typeCfg.label}</AppText>
        </View>
        {job.location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.cardStrong, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Ionicons name="location-outline" size={11} color={c.textMuted} />
            <AppText style={{ color: c.textMuted, fontSize: 11 }}>{job.location}</AppText>
          </View>
        ) : null}
        {job.salary_range ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f59e0b18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Ionicons name="cash-outline" size={11} color="#f59e0b" />
            <AppText style={{ color: "#f59e0b", fontSize: 11 }}>{job.salary_range}</AppText>
          </View>
        ) : null}
        {job.min_experience !== undefined && job.min_experience !== null ? (
          <View style={{ backgroundColor: c.cardStrong, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <AppText style={{ color: c.textMuted, fontSize: 11 }}>
              {job.min_experience === 0 ? "حديث التخرج" : `${job.min_experience}+ سنة`}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Skills */}
      {(job.required_skills || []).length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          {job.required_skills!.slice(0, 4).map((s) => (
            <View key={s} style={{ backgroundColor: c.accentBlue + "15", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <AppText style={{ color: c.accentBlue, fontSize: 11 }}>{s}</AppText>
            </View>
          ))}
          {job.required_skills!.length > 4 && (
            <AppText style={{ color: c.textMuted, fontSize: 11, alignSelf: "center" }}>
              +{job.required_skills!.length - 4}
            </AppText>
          )}
        </View>
      ) : null}

      {/* Description preview */}
      {job.description ? (
        <AppText variant="micro" tone="muted" numberOfLines={2} style={{ marginBottom: 10, lineHeight: 17 }}>
          {job.description}
        </AppText>
      ) : null}

      {/* Footer row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="people-outline" size={13} color={c.textMuted} />
            <AppText style={{ color: c.textMuted, fontSize: 12 }}>{job.applications_count} متقدم</AppText>
          </View>
          <AppText style={{ color: c.textMuted, fontSize: 12 }}>{timeAgo(job.created_at)}</AppText>
        </View>

        {/* Action buttons */}
        {isManager ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => onViewApplications(job)}
              style={{ backgroundColor: c.accentCyan + "18", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: c.accentCyan + "33" }}
            >
              <AppText style={{ color: c.accentCyan, fontSize: 12, fontWeight: "700" }}>الطلبات</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(job)}
              style={{ backgroundColor: "#ef444418", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "#ef444433" }}
            >
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => !job.applied_by_me && onApply(job)}
            disabled={job.applied_by_me}
            style={{
              backgroundColor: job.applied_by_me ? c.cardStrong : c.accentBlue + "22",
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
              borderWidth: 1,
              borderColor: job.applied_by_me ? c.border : c.accentBlue + "44",
            }}
          >
            <AppText style={{ color: job.applied_by_me ? c.textMuted : c.accentBlue, fontSize: 13, fontWeight: "700" }}>
              {job.applied_by_me ? "مُقدَّم" : "تقديم"}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function JobsScreen() {
  const navigation = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const { isManager } = useCompany();

  const [tab, setTab] = useState<"all" | "mine">("all");
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [myJobs, setMyJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [applyJob, setApplyJob] = useState<JobPost | null>(null);

  const loadJobs = useCallback(async (q?: string) => {
    try {
      const endpoint = q ? `/jobs/?search=${encodeURIComponent(q)}` : "/jobs/";
      const data = await apiFetch<JobPost[]>(endpoint);
      setJobs(Array.isArray(data) ? data : []);
    } catch { setJobs([]); }
  }, []);

  const loadMyJobs = useCallback(async () => {
    if (!isManager) return;
    try {
      const data = await apiFetch<JobPost[]>("/jobs/my-company");
      setMyJobs(Array.isArray(data) ? data : []);
    } catch { setMyJobs([]); }
  }, [isManager]);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadJobs(), loadMyJobs()]);
    setLoading(false);
    setRefreshing(false);
  }, [loadJobs, loadMyJobs]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleSearch = () => void loadJobs(search);

  const handleDelete = (job: JobPost) => {
    Alert.alert("حذف الوظيفة", `هل تريد حذف "${job.title}"؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/jobs/${job.id}`, { method: "DELETE" });
            setMyJobs((p) => p.filter((j) => j.id !== job.id));
            setJobs((p) => p.filter((j) => j.id !== job.id));
          } catch (e: any) {
            Alert.alert("خطأ", e?.message || "تعذّر الحذف");
          }
        },
      },
    ]);
  };

  const handleApplied = (jobId: number) => {
    setJobs((p) => p.map((j) => j.id === jobId ? { ...j, applied_by_me: true, applications_count: j.applications_count + 1 } : j));
  };

  const displayJobs = tab === "mine" ? myJobs : jobs;
  const emptyLabel = tab === "mine" ? "لم تنشر أي وظائف بعد" : "لا توجد وظائف متاحة";

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold">الوظائف</AppText>
          <AppText variant="micro" tone="muted">
            {tab === "all" ? `${jobs.length} وظيفة متاحة` : `${myJobs.length} وظيفة منشورة`}
          </AppText>
        </View>
        {isManager && (
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={{ backgroundColor: c.accentCyan + "18", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: c.accentCyan + "33" }}
          >
            <Ionicons name="add" size={20} color={c.accentCyan} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      {isManager && (
        <View style={{ flexDirection: "row", padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
          {[
            { key: "all" as const, label: "جميع الوظائف" },
            { key: "mine" as const, label: "وظائفي" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
                backgroundColor: tab === t.key ? c.accentCyan + "18" : c.cardStrong,
                borderWidth: 1,
                borderColor: tab === t.key ? c.accentCyan + "44" : c.border,
              }}
            >
              <AppText style={{ color: tab === t.key ? c.accentCyan : c.textMuted, fontSize: 13, fontWeight: "700" }}>
                {t.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search (all tab only) */}
      {tab === "all" && (
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: c.cardStrong, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 12, gap: 8 }}>
            <Ionicons name="search-outline" size={16} color={c.textMuted} />
            <TextInput
              style={{ flex: 1, color: c.textPrimary, fontSize: 14, paddingVertical: 10 }}
              placeholder="ابحث عن وظيفة..."
              placeholderTextColor={c.textMuted}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => { setSearch(""); void loadJobs(); }}>
                <Ionicons name="close-circle" size={16} color={c.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            style={{ backgroundColor: c.accentBlue + "20", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.accentBlue + "35" }}
          >
            <Ionicons name="search" size={18} color={c.accentBlue} />
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={displayJobs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={c.accentCyan} />}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
              <Ionicons name="briefcase-outline" size={52} color={c.textMuted} />
              <AppText variant="bodySm" tone="muted">{emptyLabel}</AppText>
              {isManager && tab === "mine" && (
                <TouchableOpacity
                  onPress={() => setShowCreate(true)}
                  style={{ marginTop: 8, backgroundColor: c.accentCyan + "18", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: c.accentCyan + "33" }}
                >
                  <AppText style={{ color: c.accentCyan, fontWeight: "700" }}>+ نشر وظيفة</AppText>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <JobCard
              job={item}
              isManager={tab === "mine"}
              onApply={(j) => setApplyJob(j)}
              onViewApplications={(j) => navigation.navigate("JobApplications", { jobId: j.id, jobTitle: j.title })}
              onDelete={handleDelete}
            />
          )}
        />
      )}

      {/* Modals */}
      <CreateJobModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(job) => {
          setMyJobs((p) => [job, ...p]);
          setJobs((p) => [job, ...p]);
          setTab("mine");
        }}
      />
      <ApplyModal
        job={applyJob}
        onClose={() => setApplyJob(null)}
        onApplied={handleApplied}
      />
    </Screen>
  );
}
