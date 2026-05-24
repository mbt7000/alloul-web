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
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FEATURES } from "../../../config/features";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useCompany } from "../../../state/company/CompanyContext";
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  markMeetingDone,
  getProjects,
  type MeetingRow,
  type ProjectRow,
} from "../../../api";
import CompanyWorkModeTopBar from "../../companies/components/CompanyWorkModeTopBar";
import AISummaryModal from "../../../shared/components/AISummaryModal";
import { summarizeMeeting } from "../../../api/ai.api";
import { openMeetingProvider } from "../openMeetingLinks";
import { useCompanyDailyRoom } from "../../../lib/useCompanyDailyRoom";

const STATUS_CFG = {
  scheduled:   { label: "مجدول",  color: "#4c6fff", bg: "#4c6fff18", icon: "calendar-outline" as const },
  in_progress: { label: "جارٍ",   color: "#f59e0b", bg: "#f59e0b18", icon: "radio-button-on" as const },
  done:        { label: "منتهى",  color: "#2dd36f", bg: "#2dd36f18", icon: "checkmark-circle" as const },
  cancelled:   { label: "ملغي",   color: "#ef4444", bg: "#ef444418", icon: "close-circle-outline" as const },
};

const LOCATION_OPTIONS = [
  { key: "daily",  label: "Daily",    icon: "videocam-outline" as const,  color: "#4c6fff" },
  { key: "meet",   label: "Meet",     icon: "logo-google" as const,       color: "#ea4335" },
  { key: "zoom",   label: "Zoom",     icon: "mic-outline" as const,       color: "#2d8cff" },
  { key: "teams",  label: "Teams",    icon: "people-outline" as const,    color: "#5558af" },
  { key: "office", label: "المكتب",   icon: "business-outline" as const,  color: "#00c9b1" },
  { key: "other",  label: "أخرى",     icon: "location-outline" as const,  color: "#6b7280" },
];

function stOf(s: string) {
  return STATUS_CFG[s as keyof typeof STATUS_CFG] ?? STATUS_CFG.scheduled;
}
function locOf(key?: string | null) {
  return LOCATION_OPTIONS.find((l) => l.key === key) ?? LOCATION_OPTIONS[5];
}
function formatDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  const today = new Date().toISOString().slice(0, 10);
  const tom = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (d === today) return "اليوم";
  if (d === tom) return "غداً";
  return dt.toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function MeetingsScreen() {
  const { colors } = useAppTheme();
  const { company } = useCompany();
  const navigation = useNavigation<any>();

  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "scheduled" | "done">("all");

  const [showCreate, setShowCreate] = useState(false);
  const [smartSummaryMeetingId, setSmartSummaryMeetingId] = useState<number | null>(null);
  const [smartSummaryMeetingTitle, setSmartSummaryMeetingTitle] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(todayISO());
  const [newTime, setNewTime] = useState("10:00");
  const [newDuration, setNewDuration] = useState("30");
  const [newLocation, setNewLocation] = useState("daily");
  const [newProjectId, setNewProjectId] = useState<number | null>(null);
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const { openCompanyDaily } = useCompanyDailyRoom();

  const [doneTarget, setDoneTarget] = useState<MeetingRow | null>(null);
  const [doneNotes, setDoneNotes] = useState("");
  const [doneActions, setDoneActions] = useState("");

  const load = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([
        getMeetings(),
        getProjects(company?.id).catch(() => [] as ProjectRow[]),
      ]);
      setMeetings(Array.isArray(m) ? m : []);
      setProjects(Array.isArray(p) ? p : []);
    } catch { setMeetings([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [company?.id]);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const m = await createMeeting({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        meeting_date: newDate,
        meeting_time: newTime || undefined,
        duration_minutes: parseInt(newDuration) || 30,
        location: newLocation,
        project_id: newProjectId ?? undefined,
      });
      setMeetings((p) => [m, ...p]);
      setShowCreate(false);
      setNewTitle(""); setNewDesc(""); setNewDate(todayISO());
      setNewTime("10:00"); setNewDuration("30"); setNewLocation("daily"); setNewProjectId(null);
    } catch (e: any) { Alert.alert("خطأ", e?.message || "تعذّر الإنشاء"); }
    finally { setCreating(false); }
  };

  const handleMarkDone = async () => {
    if (!doneTarget) return;
    try {
      const updated = await markMeetingDone(doneTarget.id, doneNotes || undefined, doneActions || undefined);
      setMeetings((p) => p.map((m) => (m.id === updated.id ? updated : m)));
      setDoneTarget(null); setDoneNotes(""); setDoneActions("");
      if (updated.project_id) Alert.alert("✓ تم", "تم إنشاء مهمة متابعة تلقائياً في المشروع");
    } catch (e: any) { Alert.alert("خطأ", e?.message || "تعذّر التحديث"); }
  };

  const handleCancel = (m: MeetingRow) => {
    Alert.alert("إلغاء الاجتماع", `هل تريد إلغاء "${m.title}"؟`, [
      { text: "لا", style: "cancel" },
      {
        text: "نعم", style: "destructive",
        onPress: async () => {
          try {
            const updated = await updateMeeting(m.id, { status: "cancelled" });
            setMeetings((p) => p.map((x) => (x.id === updated.id ? updated : x)));
          } catch { /* ignore */ }
        },
      },
    ]);
  };

  const display = filter === "all" ? meetings
    : filter === "scheduled" ? meetings.filter((m) => m.status === "scheduled" || m.status === "in_progress")
    : meetings.filter((m) => m.status === "done");

  const upcoming = meetings.filter((m) => m.status === "scheduled" && m.meeting_date >= todayISO()).length;
  const doneCount = meetings.filter((m) => m.status === "done").length;

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title="الاجتماعات"
        leftButton="none"
        rightActions={
          <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
            <Ionicons name="add" size={20} color="#4c6fff" />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: "#4c6fff40", backgroundColor: "#4c6fff18" }]}>
            <AppText variant="h3" weight="bold" style={{ color: "#4c6fff" }}>{upcoming}</AppText>
            <AppText variant="micro" style={{ color: "#4c6fff", opacity: 0.85 }}>قادمة</AppText>
          </View>
          <View style={[styles.statCard, { borderColor: "#2dd36f40", backgroundColor: "#2dd36f18" }]}>
            <AppText variant="h3" weight="bold" style={{ color: "#2dd36f" }}>{doneCount}</AppText>
            <AppText variant="micro" style={{ color: "#2dd36f", opacity: 0.85 }}>منتهية</AppText>
          </View>
          <View style={[styles.statCard, { borderColor: "#f59e0b40", backgroundColor: "#f59e0b18" }]}>
            <AppText variant="h3" weight="bold" style={{ color: "#f59e0b" }}>{meetings.length}</AppText>
            <AppText variant="micro" style={{ color: "#f59e0b", opacity: 0.85 }}>الكل</AppText>
          </View>
        </View>

        <View style={styles.quickRow}>
          {LOCATION_OPTIONS.slice(0, 4).map((l) => (
            <Pressable key={l.key}
              style={[styles.quickBtn, { borderColor: l.color + "50", backgroundColor: l.color + "12" }]}
              onPress={() => void openMeetingProvider(l.key as any)}>
              <Ionicons name={l.icon} size={15} color={l.color} />
              <AppText variant="micro" weight="bold" style={{ color: l.color }}>{l.label}</AppText>
            </Pressable>
          ))}
        </View>

        {FEATURES.SMART_MEETINGS && (
          <Pressable
            onPress={() => navigation.navigate("SmartMeeting")}
            style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              padding: 14, borderRadius: 14,
              backgroundColor: "#4c6fff18", borderWidth: 1, borderColor: "#4c6fff40",
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: "#4c6fff22", alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="videocam" size={18} color="#4c6fff" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="bold" style={{ color: "#4c6fff" }}>
                اجتماع ذكي
              </AppText>
              <AppText variant="micro" style={{ color: "#4c6fff", opacity: 0.7 }}>
                LiveKit · تفريغ تلقائي · بنود عمل بالـ AI
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#4c6fff" />
          </Pressable>
        )}

        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["all", "scheduled", "done"] as const).map((k) => {
            const labels: Record<string, string> = { all: "الكل", scheduled: "القادمة", done: "المنتهية" };
            return (
              <Pressable key={k} onPress={() => setFilter(k)}
                style={[styles.chip, filter === k && { borderColor: "#4c6fff", backgroundColor: "#4c6fff18" }]}>
                <AppText variant="micro" weight="bold" style={{ color: filter === k ? "#4c6fff" : colors.textMuted }}>
                  {labels[k]}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 40 }} />
        ) : display.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.cardElevated }]}>
            <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
            <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>لا توجد اجتماعات</AppText>
            <AppButton label="+ جدول اجتماع" tone="primary" size="sm" style={{ marginTop: 12 }} onPress={() => setShowCreate(true)} />
          </View>
        ) : (
          display.map((m) => (
            <MeetingCard key={m.id} meeting={m} colors={colors} projects={projects}
              onJoin={() => {
                const loc = m.location ?? "daily";
                if (loc === "daily") void openCompanyDaily();
                else void openMeetingProvider(loc as any);
              }}
              onDone={() => { setDoneTarget(m); setDoneNotes(m.notes ?? ""); setDoneActions(m.action_items ?? ""); }}
              onCancel={() => handleCancel(m)}
              onSummarize={() => { setSmartSummaryMeetingId(m.id); setSmartSummaryMeetingTitle(m.title); }}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCreate(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.bgCard }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <AppText variant="h3" weight="bold" style={{ marginBottom: 16 }}>اجتماع جديد</AppText>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
              placeholder="عنوان الاجتماع *" placeholderTextColor={colors.textMuted}
              value={newTitle} onChangeText={setNewTitle} autoFocus />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <TextInput style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
                placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
                value={newDate} onChangeText={setNewDate} />
              <TextInput style={[styles.input, { width: 80, borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
                placeholder="HH:MM" placeholderTextColor={colors.textMuted}
                value={newTime} onChangeText={setNewTime} />
              <TextInput style={[styles.input, { width: 70, borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
                placeholder="30د" placeholderTextColor={colors.textMuted}
                value={newDuration} onChangeText={setNewDuration} keyboardType="numeric" />
            </View>
            <AppText variant="caption" tone="muted" style={{ marginTop: 14, marginBottom: 8 }}>المنصة</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {LOCATION_OPTIONS.map((l) => {
                const active = newLocation === l.key;
                return (
                  <Pressable key={l.key} onPress={() => setNewLocation(l.key)}
                    style={[styles.locBtn, { borderColor: active ? l.color : colors.border, backgroundColor: active ? l.color + "18" : "transparent" }]}>
                    <Ionicons name={l.icon} size={13} color={active ? l.color : colors.textMuted} />
                    <AppText variant="micro" weight="bold" style={{ color: active ? l.color : colors.textMuted }}>{l.label}</AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
            {projects.length > 0 && (
              <>
                <AppText variant="caption" tone="muted" style={{ marginTop: 14, marginBottom: 8 }}>ربط بمشروع</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <Pressable onPress={() => setNewProjectId(null)}
                    style={[styles.locBtn, { borderColor: !newProjectId ? "#00c9b1" : colors.border, backgroundColor: !newProjectId ? "#00c9b118" : "transparent" }]}>
                    <AppText variant="micro" weight="bold" style={{ color: !newProjectId ? "#00c9b1" : colors.textMuted }}>بدون</AppText>
                  </Pressable>
                  {projects.map((p) => (
                    <Pressable key={p.id} onPress={() => setNewProjectId(p.id)}
                      style={[styles.locBtn, { borderColor: newProjectId === p.id ? "#00c9b1" : colors.border, backgroundColor: newProjectId === p.id ? "#00c9b118" : "transparent" }]}>
                      <AppText variant="micro" weight="bold" numberOfLines={1} style={{ color: newProjectId === p.id ? "#00c9b1" : colors.textMuted }}>{p.name}</AppText>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            <TextInput style={[styles.inputArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg, marginTop: 10 }]}
              placeholder="أجندة أو وصف (اختياري)" placeholderTextColor={colors.textMuted}
              value={newDesc} onChangeText={setNewDesc} multiline />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <AppButton label="إلغاء" tone="glass" style={{ flex: 1 }} onPress={() => setShowCreate(false)} />
              <AppButton label={creating ? "جاري…" : "جدول الاجتماع"} tone="primary" style={{ flex: 1 }}
                onPress={handleCreate} disabled={creating || !newTitle.trim()} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!doneTarget} transparent animationType="slide" onRequestClose={() => setDoneTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setDoneTarget(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.bgCard }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <AppText variant="h3" weight="bold">إنهاء الاجتماع</AppText>
            {doneTarget?.project_id ? (
              <AppText variant="caption" style={{ color: "#2dd36f", marginTop: 4, marginBottom: 16 }}>
                ✓ سيتم إنشاء مهمة متابعة تلقائياً
              </AppText>
            ) : <View style={{ height: 16 }} />}
            <TextInput style={[styles.inputArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
              placeholder="ملاحظات الاجتماع..." placeholderTextColor={colors.textMuted}
              value={doneNotes} onChangeText={setDoneNotes} multiline />
            <TextInput style={[styles.inputArea, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg, marginTop: 10 }]}
              placeholder="بنود العمل (action items)..." placeholderTextColor={colors.textMuted}
              value={doneActions} onChangeText={setDoneActions} multiline />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <AppButton label="إلغاء" tone="glass" style={{ flex: 1 }} onPress={() => setDoneTarget(null)} />
              <AppButton label="إنهاء وحفظ" tone="primary" style={{ flex: 1 }} onPress={handleMarkDone} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <AISummaryModal
        visible={smartSummaryMeetingId !== null}
        onClose={() => setSmartSummaryMeetingId(null)}
        title={`ملخص الاجتماع: ${smartSummaryMeetingTitle}`}
        subtitle="Agenda · Decisions · Action items · Next steps"
        accentColor="#00D4FF"
        fetcher={() => summarizeMeeting(smartSummaryMeetingId!)}
      />
    </Screen>
  );
}

function MeetingCard({
  meeting, colors, projects, onJoin, onDone, onCancel, onSummarize,
}: {
  meeting: MeetingRow; colors: any; projects: ProjectRow[];
  onJoin: () => void; onDone: () => void; onCancel: () => void;
  onSummarize: () => void;
}) {
  const st = stOf(meeting.status);
  const loc = locOf(meeting.location);
  const linkedProject = projects.find((p) => p.id === meeting.project_id);
  const isDone = meeting.status === "done" || meeting.status === "cancelled";

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardElevated }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: st.bg, borderColor: st.color + "50" }]}>
          <View style={[styles.badgeDot, { backgroundColor: st.color }]} />
          <AppText variant="micro" weight="bold" style={{ color: st.color }}>{st.label}</AppText>
        </View>
        <View style={[styles.badge, { backgroundColor: loc.color + "12", borderColor: loc.color + "40" }]}>
          <Ionicons name={loc.icon} size={11} color={loc.color} />
          <AppText variant="micro" weight="bold" style={{ color: loc.color }}>{loc.label}</AppText>
        </View>
        <AppText variant="micro" tone="muted" style={{ marginLeft: "auto" }}>{meeting.duration_minutes}د</AppText>
      </View>
      <AppText variant="body" weight="bold" style={{ marginTop: 10, textAlign: "right" }}>{meeting.title}</AppText>
      <View style={[styles.metaRow, { marginTop: 6 }]}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <AppText variant="micro" tone="muted">{formatDate(meeting.meeting_date)}</AppText>
        </View>
        {meeting.meeting_time ? (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <AppText variant="micro" tone="muted">{meeting.meeting_time}</AppText>
          </View>
        ) : null}
        {linkedProject ? (
          <View style={styles.metaItem}>
            <Ionicons name="folder-outline" size={13} color="#00c9b1" />
            <AppText variant="micro" style={{ color: "#00c9b1" }} numberOfLines={1}>{linkedProject.name}</AppText>
          </View>
        ) : null}
      </View>
      {meeting.notes ? (
        <View style={[styles.notesBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <AppText variant="micro" tone="muted" numberOfLines={2}>{meeting.notes}</AppText>
        </View>
      ) : null}
      {meeting.action_items ? (
        <View style={[styles.notesBox, { backgroundColor: "#2dd36f08", borderColor: "#2dd36f30", marginTop: 6 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 }}>
            <Ionicons name="checkmark-circle-outline" size={12} color="#2dd36f" />
            <AppText variant="micro" weight="bold" style={{ color: "#2dd36f" }}>بنود العمل</AppText>
          </View>
          <AppText variant="micro" tone="muted" numberOfLines={2}>{meeting.action_items}</AppText>
        </View>
      ) : null}
      {!isDone ? (
        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, { borderColor: loc.color + "60", backgroundColor: loc.color + "12" }]} onPress={onJoin}>
            <Ionicons name="enter-outline" size={15} color={loc.color} />
            <AppText variant="micro" weight="bold" style={{ color: loc.color }}>انضم</AppText>
          </Pressable>
          <Pressable style={[styles.actionBtn, { borderColor: "#2dd36f60", backgroundColor: "#2dd36f12" }]} onPress={onDone}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#2dd36f" />
            <AppText variant="micro" weight="bold" style={{ color: "#2dd36f" }}>إنهاء</AppText>
          </Pressable>
          <Pressable style={[styles.actionBtn, { borderColor: "#ef444450", backgroundColor: "#ef444410", flex: 0, paddingHorizontal: 14 }]} onPress={onCancel}>
            <Ionicons name="close" size={15} color="#ef4444" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, { borderColor: "#00D4FF60", backgroundColor: "#00D4FF14", flex: 1 }]} onPress={onSummarize}>
            <Ionicons name="flash" size={14} color="#00D4FF" />
            <AppText variant="micro" weight="bold" style={{ color: "#00D4FF" }}>ملخص ذكي</AppText>
          </Pressable>
          <View style={[styles.actionBtn, { borderColor: st.color + "40", backgroundColor: st.bg, flex: 1, opacity: 0.6 }]}>
            <Ionicons name={st.icon} size={13} color={st.color} />
            <AppText variant="micro" style={{ color: st.color }}>{st.label}</AppText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 14, alignItems: "center", gap: 4 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)" },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#4c6fff18", borderWidth: 1, borderColor: "#4c6fff", alignItems: "center", justifyContent: "center" },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", marginTop: 16 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  metaRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  notesBox: { marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15 },
  inputArea: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, height: 85, textAlignVertical: "top" },
  locBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
});
