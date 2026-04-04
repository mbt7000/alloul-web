import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  useWindowDimensions,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { useCompany } from "../../../state/company/CompanyContext";
import {
  getAgentHistory,
  getCompanyMembers,
  getCompanyStats,
  getDashboardActivity,
  getDashboardStats,
  getDeals,
  getHandoverWorkItems,
  getHandovers,
  getProjects,
  type AgentMessageRow,
  type CompanyMemberRow,
  type CompanyStats,
  type DashboardActivityItem,
  type DashboardStats,
  type DealRow,
  type HandoverRow,
  type HandoverWorkItem,
  type ProjectRow,
} from "../../../api";
import CompanySidebar, { type CompanySectionKey } from "../components/CompanySidebar";
import CompanyFloatingDock from "../components/CompanyFloatingDock";
import { openMeetingProvider } from "../../meetings/openMeetingLinks";
import StatPairRow from "../../../shared/components/StatPairRow";
import ThinProgressBar from "../../../shared/components/ThinProgressBar";
import PillBadge from "../../../shared/components/PillBadge";

type HeaderStat = { label: string; value: string };
type WorkspaceData = {
  members: CompanyMemberRow[];
  projects: ProjectRow[];
  handovers: HandoverRow[];
  handoverItems: HandoverWorkItem[];
  deals: DealRow[];
  activity: DashboardActivityItem[];
  agentHistory: AgentMessageRow[];
};

const DONE_PROJECT_STATUSES = new Set(["done", "completed", "closed", "archived", "resolved", "won", "accepted"]);

function isDoneProjectStatus(status?: string | null): boolean {
  return DONE_PROJECT_STATUSES.has((status ?? "").trim().toLowerCase());
}

function countUniqueTeams(members: CompanyMemberRow[]): number {
  const seen = new Set<string>();
  members.forEach((m) => {
    if (m.department_id != null) {
      seen.add(String(m.department_id));
    }
  });
  return seen.size;
}

function formatDateLabel(raw?: string | null): string {
  if (!raw) return "No date";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "No date";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function projectProgress(project: ProjectRow): number {
  if (project.tasks_count && project.tasks_count > 0) {
    const completed = project.completed_count ?? 0;
    return Math.max(0, Math.min(100, Math.round((completed / project.tasks_count) * 100)));
  }
  if (isDoneProjectStatus(project.status)) return 100;
  return 45;
}

function handoverStateFromStatus(status: string): "review" | "action" | "done" {
  const normalized = status.trim().toLowerCase();
  if (normalized === "accepted" || normalized === "closed" || normalized === "submitted") return "done";
  if (normalized === "in_progress" || normalized === "open") return "review";
  return "action";
}

type TaskBuckets = {
  dueToday: { id: string; title: string }[];
  inProgress: { id: string; title: string }[];
  blocked: { id: string; title: string }[];
  overdue: { id: string; title: string }[];
};

function buildTaskBuckets(data: WorkspaceData, dash: DashboardStats | null): TaskBuckets {
  const activeProjects = data.projects.filter((p) => !isDoneProjectStatus(p.status));
  const riskCount = Math.max(dash?.critical_risks ?? 0, 0);
  const dueToday = activeProjects.slice(0, 3).map((p) => ({ id: `p-${p.id}`, title: `Project follow-up · ${p.name}` }));
  const inProgress = data.handoverItems
    .filter((h) => h.status === "open" || h.status === "in_progress")
    .slice(0, 4)
    .map((h) => ({ id: `h-${h.id}`, title: h.title }));
  const blocked = activeProjects.slice(0, riskCount || 1).map((p) => ({ id: `b-${p.id}`, title: `Risk review · ${p.name}` }));
  const overdue = data.handovers
    .filter((h) => !isDoneProjectStatus(h.status))
    .slice(0, 3)
    .map((h) => ({ id: `o-${h.id}`, title: h.title }));

  return {
    dueToday,
    inProgress,
    blocked,
    overdue,
  };
}

function sectionFrameSubtitle(key: CompanySectionKey): string {
  const map: Record<CompanySectionKey, string> = {
    dashboard: "Executive snapshot · KPIs and pulse",
    teams: "Org structure · people and access",
    projects: "Workstreams · delivery and risk",
    tasks: "Execution · priorities and blockers",
    meetings: "Calendar · agendas and outcomes",
    handover: "Continuity · audit-ready transfers",
    chat: "Threads · company and DMs",
    knowledge: "Docs · playbooks and policies",
    crm: "Pipeline · clients and deals",
    reports: "Insights · performance and reviews",
    settings: "Workspace · security and preferences",
  };
  return map[key];
}

function headerStatsForSection(
  key: CompanySectionKey,
  ctx: { stats: CompanyStats | null; dash: DashboardStats | null; loading: boolean; data: WorkspaceData }
): HeaderStat[] {
  const { stats, dash, loading, data } = ctx;
  const ell = loading ? "…" : "—";
  const n = (v: number | undefined | null) => (loading ? "…" : v == null ? ell : String(v));
  const activeProjects = data.projects.filter((p) => !isDoneProjectStatus(p.status)).length;
  const doneProjects = data.projects.filter((p) => isDoneProjectStatus(p.status)).length;
  const teamCount = countUniqueTeams(data.members);
  const dealsOpen = data.deals.filter((d) => !isDoneProjectStatus(d.stage)).length;
  const dealsWon = data.deals.filter((d) => isDoneProjectStatus(d.stage)).length;
  const handoverReview = data.handoverItems.filter((i) => i.status === "open" || i.status === "in_progress").length;
  const handoverDone = data.handoverItems.filter((i) => i.status === "submitted" || i.status === "accepted" || i.status === "closed").length;

  switch (key) {
    case "dashboard":
      return [
        { label: "Open tasks", value: n(dash?.pending_tasks) },
        { label: "Handovers", value: n(dash?.total_handovers) },
        { label: "Team", value: n(stats?.total_members) },
        { label: "Projects", value: n(data.projects.length) },
      ];
    case "teams":
      return [
        { label: "Employees", value: n(stats?.total_members) },
        { label: "Teams", value: n(teamCount) },
        { label: "Joiners", value: ell },
        { label: "Invites", value: ell },
      ];
    case "projects":
      return [
        { label: "Active", value: n(activeProjects) },
        { label: "At risk", value: n(dash?.critical_risks) },
        { label: "Done", value: n(doneProjects) },
        { label: "Due week", value: n(Math.min(activeProjects, 7)) },
      ];
    case "tasks":
      const tasks = buildTaskBuckets(data, dash);
      return [
        { label: "Today", value: n(tasks.dueToday.length) },
        { label: "Active", value: n(tasks.inProgress.length) },
        { label: "Blocked", value: n(tasks.blocked.length) },
        { label: "Overdue", value: n(tasks.overdue.length) },
      ];
    case "handover":
      return [
        { label: "Review", value: n(handoverReview) },
        { label: "Done", value: n(handoverDone) },
        { label: "Action", value: n(data.handoverItems.length - handoverReview - handoverDone) },
        { label: "Archive", value: n(data.handovers.length) },
      ];
    case "meetings":
      return [
        { label: "Today", value: n(Math.min(data.activity.length, 3)) },
        { label: "Week", value: n(Math.min(data.activity.length + data.handoverItems.length, 9)) },
        { label: "Recordings", value: n(Math.min(data.agentHistory.length, 12)) },
        { label: "Follow-ups", value: n(Math.min(data.projects.length, 7)) },
      ];
    case "chat":
      return [
        { label: "Unread", value: n(data.activity.length) },
        { label: "Mentions", value: n(data.agentHistory.length) },
        { label: "Channels", value: ell },
        { label: "DMs", value: ell },
      ];
    case "knowledge":
      return [
        { label: "Articles", value: n(data.handovers.length) },
        { label: "Drafts", value: n(data.handoverItems.length) },
        { label: "Updated", value: data.activity.length > 0 ? "live" : ell },
        { label: "Views", value: ell },
      ];
    case "crm":
      return [
        { label: "Clients", value: n(data.deals.length) },
        { label: "Follow-ups", value: n(Math.min(data.deals.length, 5)) },
        { label: "Deals", value: n(dealsOpen) },
        { label: "Closed", value: n(dealsWon) },
      ];
    case "reports":
      return [
        { label: "Weekly", value: n(Math.min(data.activity.length, 7)) },
        { label: "Score", value: n(dash?.knowledge_health_score) === "—" ? ell : `${n(dash?.knowledge_health_score)}%` },
        { label: "Insights", value: n(data.activity.length) },
        { label: "Reviews", value: n(data.projects.length) },
      ];
    default:
      return [
        { label: "Members", value: n(stats?.total_members) },
        { label: "Roles", value: "6" },
        { label: "Apps", value: "11" },
        { label: "Alerts", value: "2" },
      ];
  }
}

function sectionTitle(key: CompanySectionKey): string {
  if (key === "dashboard") return "Dashboard";
  if (key === "teams") return "Teams";
  if (key === "projects") return "Projects";
  if (key === "tasks") return "Tasks";
  if (key === "meetings") return "Meetings";
  if (key === "handover") return "Handover";
  if (key === "chat") return "Chat";
  if (key === "knowledge") return "Knowledge";
  if (key === "crm") return "CRM";
  if (key === "reports") return "Reports";
  return "Settings";
}

export default function CompanyWorkspaceShellScreen() {
  const navigation = useNavigation<any>();
  const { colors, mode, toggleMode } = useAppTheme();
  const styles = useWorkspaceShellStyles();
  const { width } = useWindowDimensions();
  const wide = width >= 768;

  const { company, isMember, isActive, loading: companyLoading } = useCompany();
  const [activeKey, setActiveKey] = useState<CompanySectionKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [dash, setDash] = useState<DashboardStats | null>(null);
  const [members, setMembers] = useState<CompanyMemberRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [handovers, setHandovers] = useState<HandoverRow[]>([]);
  const [handoverItems, setHandoverItems] = useState<HandoverWorkItem[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [agentHistory, setAgentHistory] = useState<AgentMessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const slide = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const contentAnim = useRef(new Animated.Value(1)).current;
  const contentY = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, m, p, h, hi, dl, a, ah] = await Promise.all([
        getCompanyStats().catch(() => null),
        getDashboardStats().catch(() => null),
        getCompanyMembers().catch(() => [] as CompanyMemberRow[]),
        getProjects().catch(() => [] as ProjectRow[]),
        getHandovers().catch(() => [] as HandoverRow[]),
        getHandoverWorkItems().catch(() => [] as HandoverWorkItem[]),
        getDeals().catch(() => [] as DealRow[]),
        getDashboardActivity(10).catch(() => [] as DashboardActivityItem[]),
        getAgentHistory("company").catch(() => [] as AgentMessageRow[]),
      ]);
      setStats(s);
      setDash(d);
      setMembers(Array.isArray(m) ? m : []);
      setProjects(Array.isArray(p) ? p : []);
      setHandovers(Array.isArray(h) ? h : []);
      setHandoverItems(Array.isArray(hi) ? hi : []);
      setDeals(Array.isArray(dl) ? dl : []);
      setActivity(Array.isArray(a) ? a : []);
      setAgentHistory(Array.isArray(ah) ? ah : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    contentAnim.setValue(0);
    contentY.setValue(6);
    Animated.parallel([
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentY, {
        toValue: 0,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeKey, contentAnim, contentY]);

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.timing(slide, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(slide, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSidebarOpen(false);
    });
  };

  const sidebarWidth = Math.min(320, Math.max(280, Math.floor(width * 0.78)));

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-sidebarWidth, 0],
  });

  const roleLabel = useMemo(() => {
    if (!isMember) return "Guest";
    if (!isActive) return "Inactive";
    return "Member";
  }, [isMember, isActive]);

  const currentTitle = sectionTitle(activeKey);
  const frameSubtitle = sectionFrameSubtitle(activeKey);
  const workspaceData = useMemo(
    () => ({
      members,
      projects,
      handovers,
      handoverItems,
      deals,
      activity,
      agentHistory,
    }),
    [activity, agentHistory, deals, handoverItems, handovers, members, projects]
  );
  const headerStats = useMemo(
    () => headerStatsForSection(activeKey, { stats, dash, loading, data: workspaceData }),
    [activeKey, stats, dash, loading, workspaceData]
  );

  const onSelect = (key: CompanySectionKey) => {
    setActiveKey(key);
    if (!wide) closeSidebar();
  };

  const goPublic = () => navigation.goBack();

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <View style={styles.root}>
        <View style={styles.topbar}>
          <View style={styles.topbarLeft}>
            <View style={styles.greenDocBtn}>
              <Ionicons name="document-text" size={18} color={colors.white} />
            </View>
            <AppText variant="micro" weight="bold" tone="secondary" numberOfLines={1} style={{ maxWidth: 130 }}>
              نمط الأعمال
            </AppText>
          </View>
          <Pressable style={styles.iconBtn} onPress={wide ? undefined : openSidebar}>
            <Ionicons name={wide ? "business-outline" : "menu-outline"} size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <AppText variant="caption" weight="bold" tone="muted" numberOfLines={1}>
              {company?.name || "ALLOUL&Q"}
            </AppText>
          </View>
          <Pressable style={styles.switchBtn} onPress={goPublic}>
            <Ionicons name="return-down-back-outline" size={18} color={colors.accentCyan} />
            <AppText variant="micro" tone="cyan" weight="bold">
              ميديا
            </AppText>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => toggleMode()} accessibilityLabel="تبديل المظهر">
            <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {wide ? (
            <View style={[styles.sidebarFixed, { width: 320 }]}>
              <CompanyIdentityCard companyName={company?.name} iCode={company?.i_code} role={roleLabel} loading={companyLoading} />
              <View style={{ height: 12 }} />
              <CompanySidebar activeKey={activeKey} onSelect={onSelect} />
            </View>
          ) : null}

          <View style={styles.content}>
            <CompanyIdentityCard companyName={company?.name} iCode={company?.i_code} role={roleLabel} loading={companyLoading} compact />

            <GlassCard style={styles.frame}>
              <View style={styles.frameHeader}>
                <View style={{ flex: 1 }}>
                  <AppText variant="title" weight="bold">
                    {currentTitle}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 4 }} numberOfLines={2}>
                    {frameSubtitle}
                  </AppText>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.statsRowScroll}
                  style={styles.statsRowWrap}
                >
                  {headerStats.map((s) => (
                    <MiniStat key={s.label} label={s.label} value={s.value} />
                  ))}
                </ScrollView>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ opacity: contentAnim, transform: [{ translateY: contentY }] }}>
                  <SectionContent
                    activeKey={activeKey}
                    onSelect={onSelect}
                    nav={navigation}
                    stats={stats}
                    dash={dash}
                    loading={loading}
                    data={workspaceData}
                  />
                </Animated.View>
              </ScrollView>
            </GlassCard>
          </View>
        </View>

        {/* Mobile side-sheet sidebar */}
        {!wide && sidebarOpen ? (
          <Pressable style={styles.overlay} onPress={closeSidebar}>
            <Animated.View style={[styles.sidebarSheet, { width: sidebarWidth, transform: [{ translateX }] }]}>
              <CompanyIdentityCard companyName={company?.name} iCode={company?.i_code} role={roleLabel} loading={companyLoading} />
              <View style={{ height: 12 }} />
              <CompanySidebar activeKey={activeKey} onSelect={(k) => onSelect(k)} />
              <View style={{ height: 12 }} />
              <AppButton label="Back to Public" tone="glass" onPress={goPublic} />
            </Animated.View>
          </Pressable>
        ) : null}

        <CompanyFloatingDock activeSection={activeKey} onSelectSection={onSelect} navigation={navigation} />
      </View>
    </Screen>
  );
}

function SectionContent({
  activeKey,
  onSelect,
  nav,
  stats,
  dash,
  loading,
  data,
}: {
  activeKey: CompanySectionKey;
  onSelect: (key: CompanySectionKey) => void;
  nav: any;
  stats: CompanyStats | null;
  dash: DashboardStats | null;
  loading: boolean;
  data: WorkspaceData;
}) {
  if (activeKey === "dashboard") {
    return <DashboardSection onSelect={onSelect} stats={stats} dash={dash} loading={loading} nav={nav} data={data} />;
  }
  if (activeKey === "teams") {
    return <TeamsSection onSelect={onSelect} stats={stats} loading={loading} data={data} nav={nav} />;
  }
  if (activeKey === "projects") {
    return <ProjectsSection onSelect={onSelect} dash={dash} loading={loading} data={data} nav={nav} />;
  }
  if (activeKey === "handover") {
    return <HandoverSection onSelect={onSelect} dash={dash} loading={loading} data={data} nav={nav} />;
  }
  if (activeKey === "tasks") {
    return <TasksSection onSelect={onSelect} data={data} dash={dash} nav={nav} />;
  }
  if (activeKey === "meetings") {
    const meetingRows = data.activity.slice(0, 4).map((row, i) => ({
      title: row.title || `ملاحظة ${i + 1}`,
      meta: row.time ? `${row.type} · ${row.time}` : row.type,
      icon: "videocam-outline" as keyof typeof Ionicons.glyphMap,
      onPress: () => nav.navigate("Projects"),
    }));
    return (
      <MeetingsLikeSection
        onPrimary={() => void openMeetingProvider("meet")}
        title="الاجتماعات"
        subtitle="بدء جلسة مرئية أو متابعة النشاط والمشاريع."
        primary="بدء Meet"
        actions={[
          { label: "Google Meet", icon: "videocam-outline", onPress: () => void openMeetingProvider("meet") },
          { label: "Zoom", icon: "mic-outline", onPress: () => void openMeetingProvider("zoom") },
          { label: "Teams", icon: "people-outline", onPress: () => void openMeetingProvider("teams") },
          { label: "المهام", icon: "checkbox-outline", onPress: () => onSelect("tasks") },
        ]}
        listTitle="قريباً وأحدث"
        rows={meetingRows}
      />
    );
  }
  if (activeKey === "chat") {
    const chatRows = data.agentHistory.slice(0, 4).map((msg, i) => ({
      title: msg.content.length > 50 ? `${msg.content.slice(0, 50)}…` : msg.content || `Message ${i + 1}`,
      meta: msg.created_at ? `${msg.role} · ${formatDateLabel(msg.created_at)}` : msg.role,
      icon: (msg.role === "assistant" ? "sparkles-outline" : "chatbubble-outline") as keyof typeof Ionicons.glyphMap,
    }));
    return (
      <MeetingsLikeSection
        nav={nav}
        onPrimary={() => nav.navigate("Chat")}
        title="Chat"
        subtitle="Channels, threads, and DMs—merged with Inbox when needed."
        primary="New message"
        actions={[
          { label: "Inbox", icon: "mail-outline", onPress: () => nav.navigate("Inbox") },
          { label: "Channels", icon: "chatbubbles-outline", onPress: () => nav.navigate("Chat") },
          { label: "Mentions", icon: "at-outline", onPress: () => nav.navigate("Chat") },
          { label: "Teams", icon: "people-outline", onPress: () => onSelect("teams") },
        ]}
        listTitle="Recent threads"
        rows={chatRows}
        listEmpty={{ title: "No unread threads", subtitle: "Pin key channels to keep work visible.", cta: "Browse channels", onCta: () => {} }}
      />
    );
  }
  if (activeKey === "knowledge") {
    const knowledgeRows = data.handovers.slice(0, 4).map((h) => ({
      title: h.title,
      meta: `${h.status} · ${formatDateLabel(h.created_at)}`,
      icon: "document-text-outline" as keyof typeof Ionicons.glyphMap,
    }));
    return (
      <MeetingsLikeSection
        onPrimary={() => nav.navigate("Knowledge")}
        title="Knowledge"
        subtitle="Policies, playbooks, and onboarding docs in one place."
        primary="New doc"
        actions={[
          { label: "New doc", icon: "document-text-outline", onPress: () => nav.navigate("Knowledge") },
          { label: "Search", icon: "search-outline", onPress: () => nav.navigate("InternalSearch") },
          { label: "Handover", icon: "swap-horizontal-outline", onPress: () => onSelect("handover") },
          { label: "Reports", icon: "bar-chart-outline", onPress: () => onSelect("reports") },
        ]}
        listTitle="Recently updated"
        rows={knowledgeRows}
      />
    );
  }
  if (activeKey === "crm") {
    const crmRows = data.deals.slice(0, 4).map((d) => ({
      title: d.company,
      meta: `${d.stage} · $${Math.round(d.value).toLocaleString()}`,
      icon: "briefcase-outline" as keyof typeof Ionicons.glyphMap,
    }));
    return (
      <MeetingsLikeSection
        onPrimary={() => nav.navigate("CRM")}
        title="CRM"
        subtitle="Clients, deals, and follow-ups aligned with company work."
        primary="Add client"
        actions={[
          { label: "Add client", icon: "person-add-outline", onPress: () => nav.navigate("CRM") },
          { label: "New deal", icon: "trending-up-outline", onPress: () => nav.navigate("CRM") },
          { label: "Follow-ups", icon: "alarm-outline", onPress: () => nav.navigate("CRM") },
          { label: "Reports", icon: "bar-chart-outline", onPress: () => onSelect("reports") },
        ]}
        listTitle="Pipeline spotlight"
        rows={crmRows}
      />
    );
  }
  if (activeKey === "reports") {
    const reportRows = data.activity.slice(0, 4).map((a) => ({
      title: a.title,
      meta: a.time ? `${a.type} · ${a.time}` : a.type,
      icon: "pulse-outline" as keyof typeof Ionicons.glyphMap,
    }));
    return (
      <MeetingsLikeSection
        onPrimary={() => nav.navigate("Reports")}
        title="Reports"
        subtitle="Weekly packs, KPIs, and department insights."
        primary="Generate report"
        actions={[
          { label: "Generate", icon: "cloud-download-outline", onPress: () => nav.navigate("Reports") },
          { label: "Weekly pack", icon: "calendar-outline", onPress: () => nav.navigate("Reports") },
          { label: "CRM", icon: "trending-up-outline", onPress: () => onSelect("crm") },
          { label: "Projects", icon: "folder-outline", onPress: () => onSelect("projects") },
        ]}
        listTitle="This week"
        rows={reportRows}
      />
    );
  }
  return (
    <MeetingsLikeSection
      nav={nav}
      onPrimary={() => nav.navigate("Settings")}
      title="Settings"
      subtitle="Roles, security, integrations, and workspace preferences."
      primary="Workspace settings"
      actions={[
        { label: "Members", icon: "people-outline", onPress: () => onSelect("teams") },
        { label: "Roles", icon: "key-outline", onPress: () => nav.navigate("Roles") },
        { label: "Notifications", icon: "notifications-outline", onPress: () => nav.navigate("Notifications") },
        { label: "Public", icon: "globe-outline", onPress: () => nav.goBack() },
      ]}
      listTitle="Shortcuts"
      rows={[
        { title: "Billing & plan", meta: "Admin", icon: "card-outline" },
        { title: "Audit log", meta: "Security", icon: "lock-closed-outline" },
      ]}
    />
  );
}

function DashboardSection({
  onSelect,
  stats,
  dash,
  loading,
  nav,
  data,
}: {
  onSelect: (key: CompanySectionKey) => void;
  stats: CompanyStats | null;
  dash: DashboardStats | null;
  loading: boolean;
  nav: any;
  data: WorkspaceData;
}) {
  const { colors } = useAppTheme();
  const styles = useWorkspaceShellStyles();

  const tasks = loading ? "…" : String(dash?.pending_tasks ?? "—");
  const ho = loading ? "…" : String(dash?.total_handovers ?? "—");
  const activeProjects = data.projects.filter((p) => !isDoneProjectStatus(p.status)).length;
  // TODO(api): map from dashboard/work-hours endpoint when available
  const hoursDisplay = loading ? "…" : "1,420";
  const handoverPreview = data.handoverItems.slice(0, 2);
  const p1 = handoverPreview[0];
  const p2 = handoverPreview[1];
  const handoverProgress = (status: string) => {
    const x = status.trim().toLowerCase();
    if (x === "accepted" || x === "closed" || x === "submitted") return 100;
    if (x === "in_progress") return 65;
    return 40;
  };
  const prog1 = p1 ? handoverProgress(p1.status) : 40;
  const prog2 = p2 ? handoverProgress(p2.status) : 80;

  return (
    <View style={{ gap: 14 }}>
      <GlassCard style={[styles.sectionCard, { borderColor: "rgba(76,111,255,0.25)" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <View style={styles.insightStar}>
            <Ionicons name="sparkles" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="micro" weight="bold" style={{ color: colors.accentBlue }}>
              ALLOUL&Q INSIGHT
            </AppText>
            <AppText variant="bodySm" weight="bold" style={{ marginTop: 6 }}>
              تحليل الأداء اليومي الذكي
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 8, lineHeight: 20 }}>
              بناءً على نشاط الفريق، راقب المهام المفتوحة ({tasks}) والتسليم ({ho}). انتقل للتفاصيل من الأسفل.
            </AppText>
          </View>
        </View>
      </GlassCard>

      <StatPairRow
        left={{
          label: "ساعات العمل",
          value: hoursDisplay,
          icon: "time-outline",
          trendLabel: "5%+",
          trendTone: "blue",
        }}
        right={{
          label: "المشاريع النشطة",
          value: loading ? "…" : String(activeProjects || 24),
          icon: "briefcase-outline",
          trendLabel: "12%+",
          trendTone: "green",
        }}
      />

      <View>
        <AppText variant="micro" tone="muted" weight="bold" style={{ marginBottom: 10, paddingHorizontal: 4 }}>
          إجراءات سريعة
        </AppText>
        <View style={styles.quickGrid}>
          <QuickAction label="فريق" icon="people-outline" onPress={() => onSelect("teams")} />
          <QuickAction label="تقارير" icon="document-text-outline" onPress={() => onSelect("reports")} />
          <QuickAction label="مهام" icon="ribbon-outline" onPress={() => onSelect("tasks")} />
          <QuickAction label="ALLOUL&Q" icon="sparkles-outline" onPress={() => onSelect("knowledge")} />
        </View>
      </View>

      <GlassCard style={styles.sectionCard}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
          <View style={{ flex: 1, alignItems: "flex-end", gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AppText variant="bodySm" weight="bold">
                استمرارية العمل (HANDOVER)
              </AppText>
              <Ionicons name="shield-checkmark" size={20} color={colors.accentBlue} />
            </View>
          </View>
        </View>
        {p1 ? (
          <View style={{ gap: 10, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <PillBadge
                label={p1.status === "accepted" || p1.status === "closed" ? "مكتمل" : "نشط"}
                tone={p1.status === "accepted" || p1.status === "closed" ? "green" : "blue"}
              />
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <AppText variant="bodySm" weight="bold" numberOfLines={2}>
                  {p1.title}
                </AppText>
                <AppText variant="micro" tone="muted" style={{ marginTop: 4 }}>
                  المسؤول: {p1.owner_name || p1.current_assignee_name || "—"}
                </AppText>
                <View style={{ marginTop: 8 }}>
                  <ThinProgressBar progress={prog1} />
                </View>
              </View>
            </View>
          </View>
        ) : null}
        {p2 ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <PillBadge label={p2.status === "accepted" || p2.status === "closed" ? "مكتمل" : "نشط"} tone="green" />
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <AppText variant="bodySm" weight="bold" numberOfLines={2}>
                  {p2.title}
                </AppText>
                <AppText variant="micro" tone="muted" style={{ marginTop: 4 }}>
                  المسؤول: {p2.owner_name || p2.current_assignee_name || "—"}
                </AppText>
                <View style={{ marginTop: 8 }}>
                  <ThinProgressBar progress={prog2} />
                </View>
              </View>
            </View>
          </View>
        ) : null}
        {!p1 && !p2 ? (
          <Pressable onPress={() => onSelect("handover")}>
            <AppText variant="caption" tone="muted">
              لا عناصر تسليم بعد — <AppText variant="caption" tone="cyan">افتح التسليم</AppText>
            </AppText>
          </Pressable>
        ) : null}
        <View style={{ height: 10 }} />
        <AppButton label="عرض العمليات" onPress={() => onSelect("handover")} tone="primary" />
      </GlassCard>

      <GlassCard style={styles.sectionCard}>
        <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
          النشاط
        </AppText>
        <View style={{ height: 10 }} />
        {data.activity.length > 0 ? (
          <View style={{ gap: 8 }}>
            {data.activity.slice(0, 4).map((item, i) => (
              <ListRowItem
                key={`${item.type}-${i}`}
                title={item.title}
                meta={item.time ? `${item.type} · ${item.time}` : item.type}
                icon="pulse-outline"
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="لا نشاط بعد"
            subtitle="عند استخدام المهام والمشاريع سيظهر الخط الزمني هنا."
            actionLabel="الفريق"
            onAction={() => onSelect("teams")}
          />
        )}
      </GlassCard>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }}>
        <AppText variant="micro" weight="bold" style={{ flex: 1 }}>
          استمرارية العمل (HANDOVER)
        </AppText>
        <Ionicons name="shield-checkmark" size={18} color={colors.accentBlue} />
      </View>
    </View>
  );
}

function TeamsSection({
  onSelect,
  stats,
  loading,
  data,
  nav,
}: {
  onSelect: (key: CompanySectionKey) => void;
  stats: CompanyStats | null;
  loading: boolean;
  data: WorkspaceData;
  nav: any;
}) {
  const styles = useWorkspaceShellStyles();

  const emp = loading ? "…" : String(stats?.total_members ?? "—");
  const teamCount = countUniqueTeams(data.members);
  return (
    <View style={{ gap: 12 }}>
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionTopRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="title" weight="bold">
              Teams
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
              Org units, roles, and invites—RBAC-ready.
            </AppText>
          </View>
          <AppButton label="Invite employee" tone="primary" onPress={() => nav.navigate("Teams")} />
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.quickGrid}>
          <QuickAction label="New team" icon="add-circle-outline" onPress={() => nav.navigate("Teams")} />
          <QuickAction label="Directory" icon="list-outline" onPress={() => nav.navigate("Teams")} />
          <QuickAction label="Projects" icon="folder-outline" onPress={() => nav.navigate("Projects")} />
          <QuickAction label="Chat" icon="chatbubble-ellipses-outline" onPress={() => nav.navigate("Chat")} />
        </View>
      </GlassCard>

      <View style={styles.summaryRow}>
        <SummaryCard title="Employees" value={emp} icon="people-outline" />
        <SummaryCard title="Teams" value={loading ? "…" : String(teamCount || 0)} icon="git-network-outline" />
      </View>
      <View style={styles.summaryRow}>
        <SummaryCard title="New joiners" value="—" icon="person-add-outline" />
        <SummaryCard title="Pending invites" value="—" icon="mail-unread-outline" />
      </View>

      <GlassCard style={styles.sectionCard}>
        <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
          Members
        </AppText>
        <View style={{ height: 10 }} />
        <View style={{ gap: 10 }}>
          {data.members.length > 0 ? (
            data.members.slice(0, 6).map((m) => (
              <TeamCardRow
                key={m.id}
                name={m.role || "Member"}
                members={1}
                sublabel={`User #${m.user_id} · ${m.i_code}`}
                onPress={() => nav.navigate("Teams")}
              />
            ))
          ) : (
            <AppText variant="caption" tone="muted">
              No members found yet.
            </AppText>
          )}
        </View>
      </GlassCard>
    </View>
  );
}

function ProjectsSection({
  onSelect,
  dash,
  loading,
  data,
  nav,
}: {
  onSelect: (key: CompanySectionKey) => void;
  dash: DashboardStats | null;
  loading: boolean;
  data: WorkspaceData;
  nav: any;
}) {
  const styles = useWorkspaceShellStyles();

  const risk = loading ? "…" : String(dash?.critical_risks ?? "0");
  const activeProjects = data.projects.filter((p) => !isDoneProjectStatus(p.status)).length;
  const completedProjects = data.projects.filter((p) => isDoneProjectStatus(p.status)).length;
  const dueWeek = Math.min(activeProjects, 7);
  return (
    <View style={{ gap: 12 }}>
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionTopRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="title" weight="bold">
              Projects
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
              Delivery health, risk, and due dates in one glance.
            </AppText>
          </View>
          <AppButton label="Create project" tone="primary" onPress={() => nav.navigate("Projects")} />
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.quickGrid}>
          <QuickAction label="Board view" icon="grid-outline" onPress={() => nav.navigate("Projects")} />
          <QuickAction label="Tasks" icon="checkbox-outline" onPress={() => nav.navigate("Tasks")} />
          <QuickAction label="Meetings" icon="videocam-outline" onPress={() => nav.navigate("Meetings")} />
          <QuickAction label="Handover" icon="swap-horizontal-outline" onPress={() => nav.navigate("Handover")} />
        </View>
      </GlassCard>

      <View style={styles.summaryRow}>
        <SummaryCard title="Active" value={loading ? "…" : String(activeProjects)} icon="folder-open-outline" />
        <SummaryCard title="At risk" value={risk} icon="alert-circle-outline" />
      </View>
      <View style={styles.summaryRow}>
        <SummaryCard title="Completed" value={loading ? "…" : String(completedProjects)} icon="checkmark-done-outline" />
        <SummaryCard title="Due this week" value={loading ? "…" : String(dueWeek)} icon="calendar-outline" />
      </View>

      <GlassCard style={styles.sectionCard}>
        <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
          Active projects
        </AppText>
        <View style={{ height: 10 }} />
        <View style={{ gap: 10 }}>
          {data.projects.length > 0 ? (
            data.projects.slice(0, 6).map((p) => (
              <ProjectCardRow
                key={p.id}
                name={p.name}
                progress={projectProgress(p)}
                due={formatDateLabel(p.created_at)}
                risk={!isDoneProjectStatus(p.status) && risk !== "0"}
                onPress={() => nav.navigate("Projects")}
              />
            ))
          ) : (
            <AppText variant="caption" tone="muted">
              No projects found yet.
            </AppText>
          )}
        </View>
      </GlassCard>
    </View>
  );
}

function TasksSection({
  onSelect,
  data,
  dash,
  nav,
}: {
  onSelect: (key: CompanySectionKey) => void;
  data: WorkspaceData;
  dash: DashboardStats | null;
  nav: any;
}) {
  const { colors } = useAppTheme();
  const styles = useWorkspaceShellStyles();

  const taskBuckets = buildTaskBuckets(data, dash);
  return (
    <View style={{ gap: 12 }}>
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionTopRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="title" weight="bold">
              Tasks
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
              Grouped execution—today, in progress, blocked, overdue.
            </AppText>
          </View>
          <AppButton label="Create task" tone="primary" onPress={() => nav.navigate("Tasks")} />
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.quickGrid}>
          <QuickAction label="Filter" icon="funnel-outline" onPress={() => nav.navigate("Tasks")} />
          <QuickAction label="Projects" icon="folder-outline" onPress={() => nav.navigate("Projects")} />
          <QuickAction label="Handover" icon="swap-horizontal-outline" onPress={() => nav.navigate("Handover")} />
          <QuickAction label="Reports" icon="bar-chart-outline" onPress={() => nav.navigate("Reports")} />
        </View>
      </GlassCard>

      <View style={styles.kanbanRow}>
        <TaskColumn title="Due today" tone={colors.accentCyan} tasks={taskBuckets.dueToday} onPress={() => nav.navigate("Tasks")} />
        <TaskColumn title="In progress" tone={colors.accentBlue} tasks={taskBuckets.inProgress} onPress={() => nav.navigate("Tasks")} />
      </View>
      <View style={styles.kanbanRow}>
        <TaskColumn title="Blocked" tone={colors.accentEmber} tasks={taskBuckets.blocked} onPress={() => nav.navigate("Tasks")} />
        <TaskColumn title="Overdue" tone={colors.accentRose} tasks={taskBuckets.overdue} onPress={() => nav.navigate("Tasks")} />
      </View>
    </View>
  );
}

function HandoverSection({
  onSelect,
  dash,
  loading,
  data,
  nav,
}: {
  onSelect: (key: CompanySectionKey) => void;
  dash: DashboardStats | null;
  loading: boolean;
  data: WorkspaceData;
  nav: any;
}) {
  const styles = useWorkspaceShellStyles();

  const totalApi = loading ? "…" : dash?.total_handovers == null ? "—" : String(dash.total_handovers);
  const reviewCount = data.handoverItems.filter((i) => i.status === "open" || i.status === "in_progress").length;
  const doneCount = data.handoverItems.filter((i) => i.status === "submitted" || i.status === "accepted" || i.status === "closed").length;
  const actionCount = Math.max(data.handoverItems.length - reviewCount - doneCount, 0);
  return (
    <View style={{ gap: 12 }}>
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionTopRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="title" weight="bold">
              Handover
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
              Audit-ready transfers when roles and ownership change.
            </AppText>
          </View>
          <AppButton label="New handover" tone="primary" onPress={() => nav.navigate("Handover")} />
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.quickGrid}>
          <QuickAction label="Templates" icon="document-attach-outline" onPress={() => nav.navigate("Handover")} />
          <QuickAction label="Projects" icon="folder-outline" onPress={() => nav.navigate("Projects")} />
          <QuickAction label="Knowledge" icon="book-outline" onPress={() => nav.navigate("Knowledge")} />
          <QuickAction label="Chat" icon="chatbubble-ellipses-outline" onPress={() => nav.navigate("Chat")} />
        </View>
      </GlassCard>

      <View style={styles.summaryRow}>
        <SummaryCard title="Pending review" value={loading ? "…" : String(reviewCount)} icon="eye-outline" />
        <SummaryCard title="Completed" value={loading ? "…" : String(doneCount)} icon="checkmark-circle-outline" />
      </View>
      <View style={styles.summaryRow}>
        <SummaryCard title="Needs action" value={loading ? "…" : String(actionCount)} icon="flash-outline" />
        <SummaryCard title="Archived" value={loading ? "…" : String(data.handovers.length)} icon="archive-outline" />
      </View>

      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionTopRow}>
          <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
            Recent handovers
          </AppText>
          <AppText variant="micro" tone="muted" weight="bold">
            API total {totalApi}
          </AppText>
        </View>
        <View style={{ height: 10 }} />
        <View style={{ gap: 10 }}>
          {data.handoverItems.length > 0 ? (
            data.handoverItems.slice(0, 6).map((h) => (
              <HandoverCardRow
                key={h.id}
                title={h.title}
                from={h.owner_name}
                to={h.current_assignee_name}
                date={formatDateLabel(h.latest_update)}
                state={handoverStateFromStatus(h.status)}
                onPress={() => nav.navigate("Handover")}
              />
            ))
          ) : data.handovers.length > 0 ? (
            data.handovers.slice(0, 6).map((h) => (
              <HandoverCardRow
                key={h.id}
                title={h.title}
                from={h.from_person || "N/A"}
                to={h.to_person || "N/A"}
                date={formatDateLabel(h.created_at)}
                state={handoverStateFromStatus(h.status)}
                onPress={() => nav.navigate("Handover")}
              />
            ))
          ) : (
            <AppText variant="caption" tone="muted">
              No handover records found.
            </AppText>
          )}
        </View>
      </GlassCard>
    </View>
  );
}

type QuickAct = { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void };

function MeetingsLikeSection({
  nav,
  title,
  subtitle,
  primary,
  onPrimary,
  actions,
  listTitle,
  rows,
  listEmpty,
}: {
  nav?: any;
  title: string;
  subtitle: string;
  primary: string;
  onPrimary?: () => void;
  actions: QuickAct[];
  listTitle?: string;
  rows?: { title: string; meta: string; icon: keyof typeof Ionicons.glyphMap; onPress?: () => void }[];
  listEmpty?: { title: string; subtitle: string; cta: string; onCta: () => void };
}) {
  const styles = useWorkspaceShellStyles();

  return (
    <View style={{ gap: 12 }}>
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionTopRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="title" weight="bold">
              {title}
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
              {subtitle}
            </AppText>
          </View>
          <AppButton label={primary} tone="primary" onPress={onPrimary ?? (() => nav?.navigate?.("CompanyWorkspace"))} />
        </View>
        <View style={{ height: 12 }} />
        <View style={styles.quickGrid}>
          {actions.map((a) => (
            <QuickAction key={a.label} label={a.label} icon={a.icon} onPress={a.onPress} />
          ))}
        </View>
      </GlassCard>

      {listTitle ? (
        <GlassCard style={styles.sectionCard}>
          <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
            {listTitle}
          </AppText>
          <View style={{ height: 10 }} />
          {rows && rows.length > 0 ? (
            <View style={{ gap: 8 }}>
              {rows.map((r, i) => (
                <ListRowItem key={`${r.title}-${i}`} title={r.title} meta={r.meta} icon={r.icon} onPress={r.onPress} />
              ))}
            </View>
          ) : listEmpty ? (
            <EmptyState
              title={listEmpty.title}
              subtitle={listEmpty.subtitle}
              actionLabel={listEmpty.cta}
              onAction={listEmpty.onCta}
            />
          ) : null}
        </GlassCard>
      ) : null}
    </View>
  );
}

function ProjectCardRow({
  name,
  progress,
  due,
  risk,
  onPress,
}: {
  name: string;
  progress: number;
  due: string;
  risk: boolean;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useWorkspaceShellStyles();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
      <GlassCard style={styles.listItemCard}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold" numberOfLines={1}>
            {name}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
            <AppText variant="micro" tone="muted" weight="bold">
              Due {due}
            </AppText>
            {risk ? (
              <View style={styles.riskPill}>
                <AppText variant="micro" weight="bold" style={{ color: colors.accentEmber }}>
                  At risk
                </AppText>
              </View>
            ) : (
              <View style={styles.okPill}>
                <AppText variant="micro" weight="bold" style={{ color: colors.accentTeal }}>
                  On track
                </AppText>
              </View>
            )}
          </View>
        </View>
        <AppText variant="bodySm" weight="bold" style={{ color: colors.accentCyan }}>
          {progress}%
        </AppText>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      </GlassCard>
    </Pressable>
  );
}

function TaskColumn({
  title,
  tone,
  tasks,
  onPress,
}: {
  title: string;
  tone: string;
  tasks: { id: string; title: string }[];
  onPress?: () => void;
}) {
  const styles = useWorkspaceShellStyles();

  return (
    <View style={styles.taskCol}>
      <View style={[styles.taskColHead, { borderColor: `${tone}44` }]}>
        <AppText variant="micro" weight="bold" style={{ color: tone }}>
          {title}
        </AppText>
        <View style={[styles.countDot, { backgroundColor: `${tone}33` }]}>
          <AppText variant="micro" weight="bold" style={{ color: tone }}>
            {tasks.length}
          </AppText>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {tasks.length === 0 ? (
          <AppText variant="caption" tone="muted" style={{ paddingHorizontal: 4 }}>
            Nothing here.
          </AppText>
        ) : (
          tasks.map((t) => (
            <Pressable key={t.id} onPress={onPress} style={({ pressed }) => [styles.taskRow, pressed && { opacity: 0.9 }]}>
              <View style={[styles.taskDot, { backgroundColor: `${tone}55` }]} />
              <AppText variant="caption" weight="bold" style={{ flex: 1 }} numberOfLines={2}>
                {t.title}
              </AppText>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

function HandoverCardRow({
  title,
  from,
  to,
  date,
  state,
  onPress,
}: {
  title: string;
  from: string;
  to: string;
  date: string;
  state: "review" | "action" | "done";
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useWorkspaceShellStyles();

  const pill =
    state === "review"
      ? { label: "Review", bg: "rgba(56,232,255,0.12)", color: colors.accentCyan }
      : state === "action"
        ? { label: "Action", bg: "rgba(255,122,89,0.14)", color: colors.accentEmber }
        : { label: "Done", bg: "rgba(45,226,199,0.12)", color: colors.accentTeal };
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
      <GlassCard style={styles.listItemCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold" numberOfLines={2}>
            {title}
          </AppText>
          <AppText variant="micro" tone="muted" style={{ marginTop: 6 }} numberOfLines={1}>
            {from} → {to} · {date}
          </AppText>
        </View>
        <View style={[styles.statePill, { backgroundColor: pill.bg }]}>
          <AppText variant="micro" weight="bold" style={{ color: pill.color }}>
            {pill.label}
          </AppText>
        </View>
      </View>
      </GlassCard>
    </Pressable>
  );
}

function TeamCardRow({
  name,
  members,
  sublabel,
  onPress,
}: {
  name: string;
  members: number;
  sublabel?: string;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useWorkspaceShellStyles();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
      <GlassCard style={styles.listItemCard}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={styles.teamAvatar}>
          <Ionicons name="people" size={16} color={colors.accentCyan} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold">
            {name}
          </AppText>
          <AppText variant="micro" tone="muted" style={{ marginTop: 4 }}>
            {members} members{sublabel ? ` · ${sublabel}` : ""}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
      </GlassCard>
    </Pressable>
  );
}

function ListRowItem({
  title,
  meta,
  icon,
  onPress,
}: {
  title: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useWorkspaceShellStyles();

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.listRow, pressed && onPress && { opacity: 0.92 }]}>
      <View style={styles.listRowIcon}>
        <Ionicons name={icon} size={18} color={colors.accentCyan} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodySm" weight="bold" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="micro" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
          {meta}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useAppTheme();
  const styles = useWorkspaceShellStyles();

  return (
    <GlassCard style={styles.summaryCard}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <AppText variant="micro" tone="muted" weight="bold">
            {title}
          </AppText>
          <AppText variant="h3" weight="bold" style={{ marginTop: 6 }}>
            {value}
          </AppText>
        </View>
        <View style={styles.summaryIcon}>
          <Ionicons name={icon} size={18} color={colors.accentCyan} />
        </View>
      </View>
    </GlassCard>
  );
}

function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useWorkspaceShellStyles();

  return (
    <View style={{ alignItems: "center", paddingVertical: 8 }}>
      <View style={styles.emptyIcon}>
        <Ionicons name="sparkles-outline" size={18} color={colors.textSecondary} />
      </View>
      <AppText variant="bodySm" weight="bold" style={{ marginTop: 10, textAlign: "center" }}>
        {title}
      </AppText>
      <AppText variant="caption" tone="muted" style={{ marginTop: 6, textAlign: "center" }}>
        {subtitle}
      </AppText>
      <View style={{ height: 12 }} />
      <AppButton label={actionLabel} tone="glass" onPress={onAction} />
    </View>
  );
}

function CompanyIdentityCard({
  companyName,
  iCode,
  role,
  loading,
  compact,
}: {
  companyName?: string;
  iCode?: string;
  role: string;
  loading: boolean;
  compact?: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useWorkspaceShellStyles();

  return (
    <GlassCard strength="strong" style={[styles.companyCard, compact && { marginBottom: 12 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={styles.companyIcon}>
          <Ionicons name="business" size={18} color={colors.accentTeal} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold">
            {loading ? "Loading workspace…" : companyName || "No company"}
          </AppText>
          <AppText variant="micro" tone="muted" weight="bold" style={{ marginTop: 2 }}>
            {iCode ? `i_code ${iCode}` : "Company identity"}
          </AppText>
        </View>
        <View style={styles.rolePill}>
          <AppText variant="micro" weight="bold" style={{ color: colors.accentCyan }}>
            {role}
          </AppText>
        </View>
      </View>
    </GlassCard>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const styles = useWorkspaceShellStyles();

  return (
    <View style={styles.miniStat}>
      <AppText variant="micro" tone="muted" weight="bold" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="bodySm" weight="bold" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useWorkspaceShellStyles();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCell, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={18} color={colors.accentCyan} />
      </View>
      <AppText variant="micro" tone="secondary" weight="bold" style={{ textAlign: "center" }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function useWorkspaceShellStyles() {
  return useThemedStyles((c) => ({
    root: { flex: 1 },
  topbar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    gap: 8,
  },
  topbarLeft: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, maxWidth: "36%" },
  greenDocBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: c.accentNeonGreen,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: c.accentNeonGreen,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  insightStar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: c.accentBlue,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: c.accentBlue,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgCard,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 10,
  },
  switchBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.35)",
    backgroundColor: "rgba(56,232,255,0.10)",
  },
  body: { flex: 1, flexDirection: "row" as const },
  sidebarFixed: {
    padding: 16,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: c.border,
    backgroundColor: c.bgSurface,
  },
  content: { flex: 1, padding: 16 },
  companyCard: { padding: 14 },
  companyIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(45,226,199,0.10)",
    borderWidth: 1,
    borderColor: "rgba(45,226,199,0.18)",
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.25)",
    backgroundColor: "rgba(56,232,255,0.08)",
  },
  frame: { padding: 14, overflow: "hidden" },
  frameHeader: { flexDirection: "row" as const, alignItems: "flex-start" as const, justifyContent: "space-between" as const, gap: 12, marginBottom: 12 },
  statsRowWrap: { maxWidth: "52%" },
  statsRowScroll: { flexDirection: "row" as const, gap: 12, alignItems: "flex-end", paddingLeft: 4 },
  miniStat: { alignItems: "flex-end", minWidth: 56, paddingVertical: 2 },
  sectionCard: { padding: 14 },
  sectionTopRow: { flexDirection: "row" as const, alignItems: "flex-start" as const, justifyContent: "space-between" as const, gap: 12 },
  quickGrid: { flexDirection: "row" as const, flexWrap: "wrap", gap: 10 },
  summaryRow: { flexDirection: "row" as const, gap: 10 },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgCard,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(56,232,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.18)",
    marginLeft: 12,
  },
  kicker: { letterSpacing: 0.8, textTransform: "uppercase" as const },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  quickCell: {
    width: "48%",
    minWidth: "48%",
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgCard,
    alignItems: "center" as const,
    gap: 8,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(56,232,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.18)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-start" as const,
  },
  sidebarSheet: {
    marginTop: 0,
    height: "100%",
    backgroundColor: c.bgSurface,
    borderRightWidth: 1,
    borderRightColor: c.border,
    padding: 16,
  },
  kanbanRow: { flexDirection: "row" as const, gap: 10 },
  taskCol: { flex: 1, minWidth: 0 },
  taskColHead: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 8,
    backgroundColor: c.bgCard,
  },
  countDot: {
    minWidth: 22,
    height: 22,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 6,
  },
  taskRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
  },
  taskDot: { width: 6, height: 6, borderRadius: 3 },
  listItemCard: { padding: 12, borderRadius: 16 },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: c.accentCyan,
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,122,89,0.14)",
  },
  okPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(45,226,199,0.12)",
  },
  statePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(56,232,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.20)",
  },
  listRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  listRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(56,232,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.16)",
  },
  }));
}

