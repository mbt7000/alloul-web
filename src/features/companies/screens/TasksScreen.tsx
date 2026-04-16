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
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useCompany } from "../../../state/company/CompanyContext";
import {
  getAllCompanyTasks,
  getProjects,
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
  type TaskRow,
  type ProjectRow,
} from "../../../api";
import AISummaryModal from "../../../shared/components/AISummaryModal";
import { summarizeTasks } from "../../../api/ai.api";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";
import AIComposeSheet from "../../../shared/components/AIComposeSheet";

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIORITY = {
  high:   { label: "عالي",    color: "#ef4444", bg: "#ef444418" },
  medium: { label: "متوسط",   color: "#f59e0b", bg: "#f59e0b18" },
  low:    { label: "منخفض",   color: "#6b7280", bg: "#6b728018" },
} as const;

const STATUS = {
  todo:        { label: "للتنفيذ", color: "#6b7280", bg: "#6b728018", icon: "radio-button-off-outline" as const },
  in_progress: { label: "جاري",    color: "#4c6fff", bg: "#4c6fff18", icon: "ellipse" as const },
  done:        { label: "مكتمل",   color: "#2dd36f", bg: "#2dd36f18", icon: "checkmark-circle" as const },
};

const FILTERS = [
  { key: "all",         label: "الكل" },
  { key: "todo",        label: "للتنفيذ" },
  { key: "in_progress", label: "جاري" },
  { key: "done",        label: "مكتمل" },
  { key: "high",        label: "أولوية عالية" },
];

function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h}س`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TasksScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectId: number | undefined = route.params?.projectId;
  const projectName: string | undefined = route.params?.projectName;
  const { colors } = useAppTheme();
  const { company } = useCompany();

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<number | null>(projectId ?? null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [newDue, setNewDue] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAICompose, setShowAICompose] = useState(false);
  const [showSmartSummary, setShowSmartSummary] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  // ─── Load ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      if (projectId) {
        const list = await getProjectTasks(projectId);
        setTasks(Array.isArray(list) ? list : []);
      } else {
        const [all, projs] = await Promise.all([
          getAllCompanyTasks(company?.id),
          getProjects(company?.id).catch(() => [] as ProjectRow[]),
        ]);
        setTasks(Array.isArray(all) ? all : []);
        setProjects(Array.isArray(projs) ? projs : []);
      }
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [company?.id, projectId]);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  // ─── Actions ─────────────────────────────────────────────────────────────

  const cycleStatus = async (task: TaskRow) => {
    const next: Record<string, string> = { todo: "in_progress", in_progress: "done", done: "todo" };
    try {
      const updated = await updateTask(task.project_id, task.id, { status: next[task.status] ?? "todo" });
      setTasks((p) => p.map((t) => (t.id === updated.id ? updated : t)));
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const pid = selectedProject ?? projects[0]?.id ?? projectId;
    if (!pid) { Alert.alert("تنبيه", "اختر مشروعاً أولاً"); return; }
    setCreating(true);
    try {
      const task = await createTask(pid, { title: newTitle.trim(), description: newDesc.trim() || undefined, priority: newPriority, due_date: newDue.trim() || undefined });
      setTasks((p) => [task, ...p]);
      setShowCreate(false); setNewTitle(""); setNewDesc(""); setNewDue(""); setNewPriority("medium");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر الإنشاء");
    } finally { setCreating(false); }
  };

  const handleDelete = (task: TaskRow) => {
    Alert.alert("حذف المهمة", `هل تريد حذف "${task.title}"؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف", style: "destructive",
        onPress: async () => {
          try {
            await deleteTask(task.project_id, task.id);
            setTasks((p) => p.filter((t) => t.id !== task.id));
          } catch (e: any) { Alert.alert("خطأ", e?.message || "تعذّر الحذف"); }
        },
      },
    ]);
  };

  // ─── Filter ──────────────────────────────────────────────────────────────

  let display = tasks;
  if (selectedProject && !projectId) display = display.filter((t) => t.project_id === selectedProject);
  if (filter === "high") display = display.filter((t) => t.priority === "high" && t.status !== "done");
  else if (filter !== "all") display = display.filter((t) => t.status === filter);

  const counts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title={projectName ?? "المهام"}
        leftButton={projectId ? "back" : "none"}
        rightActions={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => setShowSmartSummary(true)} style={[styles.addBtn, { backgroundColor: "rgba(0,212,255,0.18)", borderWidth: 1, borderColor: "#00D4FF" }]}>
              <Ionicons name="flash" size={16} color="#00D4FF" />
            </Pressable>
            <Pressable onPress={() => setShowAICompose(true)} style={[styles.addBtn, { backgroundColor: `${colors.accentCyan}22` }]}>
              <Ionicons name="sparkles-outline" size={18} color={colors.accentCyan} />
            </Pressable>
            {/* View toggle */}
            <Pressable
              onPress={() => setViewMode((v) => v === "list" ? "kanban" : "list")}
              style={[styles.addBtn, viewMode === "kanban" && { backgroundColor: "#4c6fff22", borderWidth: 1, borderColor: "#4c6fff" }]}
            >
              <Ionicons name={viewMode === "list" ? "grid-outline" : "list-outline"} size={18} color="#4c6fff" />
            </Pressable>
            <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
              <Ionicons name="add" size={20} color="#4c6fff" />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary Stats ── */}
        <View style={styles.statsRow}>
          {(["todo", "in_progress", "done"] as const).map((s) => {
            const cfg = STATUS[s];
            return (
              <Pressable key={s} style={[styles.statCard, { borderColor: cfg.color + "40", backgroundColor: cfg.bg }]} onPress={() => setFilter(s)}>
                <AppText variant="h3" weight="bold" style={{ color: cfg.color }}>{counts[s]}</AppText>
                <AppText variant="micro" style={{ color: cfg.color, opacity: 0.85 }}>{cfg.label}</AppText>
              </Pressable>
            );
          })}
        </View>

        {/* ── Filter Chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable key={f.key} onPress={() => setFilter(f.key)}
                style={[styles.chip, active && { borderColor: "#4c6fff", backgroundColor: "#4c6fff18" }]}>
                <AppText variant="micro" weight="bold" style={{ color: active ? "#4c6fff" : colors.textMuted }}>
                  {f.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Project Picker ── */}
        {!projectId && projects.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pressable onPress={() => setSelectedProject(null)}
              style={[styles.projectChip, selectedProject === null && styles.projectChipActive]}>
              <AppText variant="micro" weight="bold" style={{ color: selectedProject === null ? colors.accentCyan : colors.textMuted }}>
                كل المشاريع
              </AppText>
            </Pressable>
            {projects.map((p) => (
              <Pressable key={p.id} onPress={() => setSelectedProject(p.id)}
                style={[styles.projectChip, selectedProject === p.id && styles.projectChipActive]}>
                <AppText variant="micro" weight="bold" numberOfLines={1}
                  style={{ color: selectedProject === p.id ? colors.accentCyan : colors.textMuted }}>
                  {p.name}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* ── Task List / Kanban ── */}
        {loading && !refreshing ? (
          <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 40 }} />
        ) : viewMode === "kanban" ? (
          <KanbanBoard
            tasks={tasks.filter((t) => !selectedProject || t.project_id === selectedProject)}
            onCycleStatus={(t) => void cycleStatus(t)}
            onDelete={handleDelete}
            colors={colors}
          />
        ) : display.length === 0 ? (
          <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.cardElevated }]}>
            <Ionicons name="checkbox-outline" size={36} color={colors.textMuted} />
            <AppText variant="body" tone="muted" style={{ marginTop: 8 }}>لا توجد مهام</AppText>
            <AppButton label="+ إنشاء مهمة" tone="primary" size="sm" style={{ marginTop: 12 }} onPress={() => setShowCreate(true)} />
          </View>
        ) : (
          display.map((task) => <TaskCard key={task.id} task={task} expanded={expandedId === task.id}
            onExpand={() => setExpandedId((p) => (p === task.id ? null : task.id))}
            onCycleStatus={() => void cycleStatus(task)}
            onDelete={() => handleDelete(task)}
            colors={colors} />)
        )}
      </ScrollView>

      {/* ── Create Modal ── */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCreate(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.bgCard }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <AppText variant="h3" weight="bold" style={{ marginBottom: 4 }}>مهمة جديدة</AppText>

            {!projectId && projects.length > 0 && (
              <>
                <AppText variant="caption" tone="muted" style={{ marginTop: 8, marginBottom: 6 }}>المشروع</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 4 }}>
                  {projects.map((p) => (
                    <Pressable key={p.id} onPress={() => setSelectedProject(p.id)}
                      style={[styles.projectChip, selectedProject === p.id && styles.projectChipActive]}>
                      <AppText variant="micro" weight="bold" style={{ color: selectedProject === p.id ? colors.accentCyan : colors.textMuted }}>
                        {p.name}
                      </AppText>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg }]}
              placeholder="عنوان المهمة *"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg, height: 72, textAlignVertical: "top", marginTop: 8 }]}
              placeholder="وصف المهمة (اختياري)"
              placeholderTextColor={colors.textMuted}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
            />

            <AppText variant="caption" tone="muted" style={{ marginTop: 12, marginBottom: 8 }}>الأولوية</AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["high", "medium", "low"] as const).map((p) => {
                const cfg = PRIORITY[p];
                const active = newPriority === p;
                return (
                  <Pressable key={p} onPress={() => setNewPriority(p)}
                    style={[styles.priBtn, { borderColor: active ? cfg.color : colors.border, backgroundColor: active ? cfg.bg : "transparent" }]}>
                    <AppText variant="caption" weight="bold" style={{ color: active ? cfg.color : colors.textMuted }}>{cfg.label}</AppText>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bg, marginTop: 12 }]}
              placeholder="تاريخ الاستحقاق (YYYY-MM-DD)"
              placeholderTextColor={colors.textMuted}
              value={newDue}
              onChangeText={setNewDue}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <AppButton label="إلغاء" tone="glass" style={{ flex: 1 }} onPress={() => setShowCreate(false)} />
              <AppButton label={creating ? "جاري…" : "إنشاء المهمة"} tone="primary" style={{ flex: 1 }}
                onPress={handleCreate} disabled={creating || !newTitle.trim()} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── AI Compose Sheet ── */}
      <AIComposeSheet
        visible={showAICompose}
        mode="task"
        projectId={selectedProject ?? projectId}
        onClose={() => setShowAICompose(false)}
        onSaved={() => { setShowAICompose(false); setLoading(true); void load(); }}
      />

      <AISummaryModal
        visible={showSmartSummary}
        onClose={() => setShowSmartSummary(false)}
        title="ملخص المهام الذكي"
        subtitle="أولويات اليوم · Blockers · Delegation"
        accentColor="#00D4FF"
        fetcher={() => summarizeTasks({
          project_id: selectedProject ?? projectId ?? undefined,
          status_filter: filter === "all" ? undefined : (filter as "todo" | "in_progress" | "done"),
        })}
      />
    </Screen>
  );
}

// ─── Kanban Board ────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");
const KANBAN_COL_W = SCREEN_W * 0.72;

function KanbanBoard({
  tasks, onCycleStatus, onDelete, colors,
}: {
  tasks: TaskRow[];
  onCycleStatus: (t: TaskRow) => void;
  onDelete: (t: TaskRow) => void;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  const cols: Array<{ key: "todo" | "in_progress" | "done" }> = [
    { key: "todo" },
    { key: "in_progress" },
    { key: "done" },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
      {cols.map(({ key }) => {
        const cfg = STATUS[key];
        const colTasks = tasks.filter((t) => t.status === key);
        return (
          <View key={key} style={{
            width: KANBAN_COL_W,
            backgroundColor: cfg.bg,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: cfg.color + "44",
            padding: 12,
            minHeight: 200,
          }}>
            {/* Column header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ionicons name={cfg.icon} size={15} color={cfg.color} />
              <AppText style={{ color: cfg.color, fontSize: 13, fontWeight: "700", flex: 1 }}>{cfg.label}</AppText>
              <View style={{ backgroundColor: cfg.color + "22", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <AppText style={{ color: cfg.color, fontSize: 11, fontWeight: "700" }}>{colTasks.length}</AppText>
              </View>
            </View>

            {colTasks.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <AppText style={{ color: cfg.color + "88", fontSize: 12 }}>لا توجد مهام</AppText>
              </View>
            ) : (
              colTasks.map((task) => {
                const pri = PRIORITY[task.priority as keyof typeof PRIORITY] ?? PRIORITY.medium;
                return (
                  <Pressable
                    key={task.id}
                    onPress={() => onCycleStatus(task)}
                    style={{
                      backgroundColor: colors.bgCard,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <AppText style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600", marginBottom: 6 }} numberOfLines={2}>
                      {task.title}
                    </AppText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <View style={{ backgroundColor: pri.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                        <AppText style={{ color: pri.color, fontSize: 10, fontWeight: "700" }}>{pri.label}</AppText>
                      </View>
                      {task.due_date && (
                        <AppText style={{ color: colors.textMuted, fontSize: 10 }}>{task.due_date}</AppText>
                      )}
                    </View>
                    <AppText style={{ color: colors.textMuted, fontSize: 10, marginTop: 6 }}>اضغط لتغيير الحالة</AppText>
                  </Pressable>
                );
              })
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, expanded, onExpand, onCycleStatus, onDelete, colors,
}: {
  task: TaskRow;
  expanded: boolean;
  onExpand: () => void;
  onCycleStatus: () => void;
  onDelete: () => void;
  colors: any;
}) {
  const st = STATUS[task.status as keyof typeof STATUS] ?? STATUS.todo;
  const pr = PRIORITY[task.priority as keyof typeof PRIORITY] ?? PRIORITY.medium;

  return (
    <View style={[styles.taskCard, { borderColor: colors.border, backgroundColor: colors.cardElevated }]}>
      {/* Top row */}
      <View style={styles.taskTop}>
        {/* Status badge */}
        <View style={[styles.badge, { backgroundColor: st.bg, borderColor: st.color + "50" }]}>
          <View style={[styles.badgeDot, { backgroundColor: st.color }]} />
          <AppText variant="micro" weight="bold" style={{ color: st.color }}>{st.label}</AppText>
        </View>
        {/* Priority badge */}
        <View style={[styles.badge, { backgroundColor: pr.bg, borderColor: pr.color + "50" }]}>
          <AppText variant="micro" weight="bold" style={{ color: pr.color }}>{pr.label}</AppText>
        </View>
        <View style={{ flex: 1 }} />
        {task.created_at ? (
          <AppText variant="micro" tone="muted">{relativeTime(task.created_at)}</AppText>
        ) : null}
      </View>

      {/* Title */}
      <AppText variant="body" weight="bold" style={[{ marginTop: 10 }, task.status === "done" && { textDecorationLine: "line-through", color: colors.textMuted }]}>
        {task.title}
      </AppText>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {task.assignee_name ? (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color={colors.textMuted} />
            <AppText variant="micro" tone="muted">{task.assignee_name}</AppText>
          </View>
        ) : null}
        {task.due_date ? (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <AppText variant="micro" tone="muted">{task.due_date}</AppText>
          </View>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionBtn, { borderColor: st.color + "60", backgroundColor: st.bg }]} onPress={onCycleStatus}>
          <Ionicons name={st.icon} size={15} color={st.color} />
          <AppText variant="micro" weight="bold" style={{ color: st.color }}>تحديث الحالة</AppText>
        </Pressable>
        <Pressable style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.04)" }]} onPress={onExpand}>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={15} color={colors.textMuted} />
          <AppText variant="micro" tone="muted">التفاصيل</AppText>
        </Pressable>
        <Pressable style={[styles.actionBtn, { borderColor: "#ef444440", backgroundColor: "#ef444412", flex: 0, paddingHorizontal: 12 }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={15} color="#ef4444" />
        </Pressable>
      </View>

      {/* Expanded details */}
      {expanded && (
        <View style={[styles.expandedBox, { borderTopColor: colors.border }]}>
          {task.description ? (
            <AppText variant="caption" tone="secondary" style={{ marginBottom: 8 }}>{task.description}</AppText>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="albums-outline" size={13} color={colors.textMuted} />
            <AppText variant="micro" tone="muted">مشروع #{task.project_id}</AppText>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, borderRadius: 16, borderWidth: 1,
    paddingVertical: 14, alignItems: "center", gap: 4,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  projectChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  projectChipActive: {
    borderColor: "#00c9b1",
    backgroundColor: "#00c9b118",
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#4c6fff18", borderWidth: 1, borderColor: "#4c6fff",
    alignItems: "center", justifyContent: "center",
  },
  emptyCard: {
    borderRadius: 20, borderWidth: 1,
    padding: 40, alignItems: "center",
    marginTop: 16,
  },
  // Task Card
  taskCard: {
    borderRadius: 20, borderWidth: 1,
    padding: 16,
  },
  taskTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  expandedBox: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  // Modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center", marginBottom: 16,
  },
  input: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginTop: 8,
  },
  priBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1, alignItems: "center",
  },
});
