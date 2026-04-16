import React, { useCallback, useEffect, useState } from "react";
import {
  View, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/ThemeContext";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import CompanyWorkModeTopBar from "../../companies/components/CompanyWorkModeTopBar";
import { useCompany } from "../../../state/company/CompanyContext";
import { useCompanyDailyRoom } from "../../../lib/useCompanyDailyRoom";
import { useCallContext } from "../../../context/CallContext";
import {
  getCompanyMembers, type CompanyMemberRow,
  getMeetings, type MeetingRow,
} from "../../../api";
import { getUserPresence } from "../../../api/calls.api";
import { openMeetingProvider } from "../openMeetingLinks";

// ─── Presence colors ─────────────────────────────────────────────────────────

const PRESENCE: Record<string, { color: string; label: string }> = {
  online:  { color: "#10b981", label: "متاح" },
  away:    { color: "#f59e0b", label: "بعيد" },
  busy:    { color: "#ef4444", label: "مشغول" },
  offline: { color: "#6b7280", label: "غير متصل" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().slice(0, 10); }

function formatTime(t?: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    owner: "مالك", admin: "مشرف", manager: "مدير",
    employee: "موظف", member: "عضو",
  };
  return map[role] ?? role;
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

function MemberCard({
  member, presence, onVideoCall, onAudioCall, onMessage,
  colors,
}: {
  member: CompanyMemberRow;
  presence: string;
  onVideoCall: () => void;
  onAudioCall: () => void;
  onMessage: () => void;
  colors: any;
}) {
  const p = PRESENCE[presence] ?? PRESENCE.offline;
  const initials = (member.user_name || "U").slice(0, 2).toUpperCase();
  const roleBadge = ROLE_BADGE[member.role] ?? ROLE_BADGE.member;

  return (
    <View style={{
      backgroundColor: colors.bgCard,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    }}>
      {/* Avatar + presence dot */}
      <View style={{ position: "relative" }}>
        <View style={{
          width: 48, height: 48, borderRadius: 15,
          backgroundColor: colors.accentBlue + "22",
          alignItems: "center", justifyContent: "center",
          borderWidth: 1.5, borderColor: colors.accentBlue + "44",
        }}>
          <AppText style={{ color: colors.accentBlue, fontSize: 16, fontWeight: "800" }}>{initials}</AppText>
        </View>
        <View style={{
          position: "absolute", bottom: -1, right: -1,
          width: 13, height: 13, borderRadius: 6.5,
          backgroundColor: p.color,
          borderWidth: 2, borderColor: colors.bgCard,
        }} />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText variant="bodySm" weight="bold" numberOfLines={1}>{member.user_name || "مستخدم"}</AppText>
          <View style={{
            backgroundColor: roleBadge.bg, paddingHorizontal: 6, paddingVertical: 1.5,
            borderRadius: 6,
          }}>
            <AppText style={{ fontSize: 9, color: roleBadge.color, fontWeight: "700" }}>{roleBadge.label}</AppText>
          </View>
        </View>
        <AppText variant="micro" tone="muted" numberOfLines={1}>
          {member.job_title || roleLabel(member.role)}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.color }} />
          <AppText style={{ fontSize: 11, color: p.color }}>{p.label}</AppText>
        </View>
      </View>

      {/* Quick action buttons: message, audio, video */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        <TouchableOpacity
          onPress={onMessage}
          style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: "#a855f718",
            borderWidth: 1, borderColor: "#a855f744",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="chatbubble-outline" size={14} color="#a855f7" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAudioCall}
          style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: colors.accentBlue + "18",
            borderWidth: 1, borderColor: colors.accentBlue + "44",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="call-outline" size={14} color={colors.accentBlue} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onVideoCall}
          style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: "#10b98118",
            borderWidth: 1, borderColor: "#10b98144",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="videocam-outline" size={14} color="#10b981" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Role badges ────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  owner:    { label: "مالك", color: "#f59e0b", bg: "#f59e0b18" },
  admin:    { label: "مشرف", color: "#ef4444", bg: "#ef444418" },
  manager:  { label: "مدير", color: "#8b5cf6", bg: "#8b5cf618" },
  employee: { label: "موظف", color: "#3b82f6", bg: "#3b82f618" },
  member:   { label: "عضو", color: "#6b7280", bg: "#6b728018" },
};

// ─── Org Chart Tree ─────────────────────────────────────────────────────────

function OrgChartTree({ members, presenceMap, colors }: {
  members: CompanyMemberRow[];
  presenceMap: Record<number, string>;
  colors: any;
}) {
  // Build hierarchy: owner → admins → managers → employees → members
  const roleOrder = ["owner", "admin", "manager", "employee", "member"];
  const grouped = roleOrder.reduce<Record<string, CompanyMemberRow[]>>((acc, role) => {
    acc[role] = members.filter(m => m.role === role);
    return acc;
  }, {});

  return (
    <View style={{ gap: 4 }}>
      {roleOrder.map((role) => {
        const group = grouped[role];
        if (!group?.length) return null;
        const badge = ROLE_BADGE[role] ?? ROLE_BADGE.member;
        return (
          <View key={role}>
            {/* Role header */}
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              paddingVertical: 8, paddingHorizontal: 4,
            }}>
              <View style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: badge.color }} />
              <AppText style={{ color: badge.color, fontSize: 13, fontWeight: "700" }}>{badge.label}</AppText>
              <View style={{
                backgroundColor: badge.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
              }}>
                <AppText style={{ color: badge.color, fontSize: 11, fontWeight: "600" }}>{group.length}</AppText>
              </View>
            </View>
            {/* Members under this role */}
            <View style={{ paddingRight: 12, borderRightWidth: 2, borderRightColor: badge.color + "33", marginRight: 6 }}>
              {group.map((m) => {
                const p = PRESENCE[presenceMap[m.user_id] ?? "offline"] ?? PRESENCE.offline;
                const initials = (m.user_name || "U").slice(0, 2).toUpperCase();
                return (
                  <View key={m.id} style={{
                    flexDirection: "row", alignItems: "center", gap: 10,
                    paddingVertical: 8, paddingHorizontal: 8,
                    marginBottom: 4, borderRadius: 12,
                    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
                  }}>
                    <View style={{ position: "relative" }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 12,
                        backgroundColor: badge.color + "22",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <AppText style={{ color: badge.color, fontSize: 13, fontWeight: "800" }}>{initials}</AppText>
                      </View>
                      <View style={{
                        position: "absolute", bottom: -1, right: -1,
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: p.color, borderWidth: 1.5, borderColor: colors.bgCard,
                      }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodySm" weight="bold" numberOfLines={1}>{m.user_name || "مستخدم"}</AppText>
                      <AppText variant="micro" tone="muted" numberOfLines={1}>{m.job_title || ""}</AppText>
                    </View>
                    <AppText style={{ fontSize: 10, color: p.color }}>{p.label}</AppText>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── MeetingCard ──────────────────────────────────────────────────────────────

function TodayMeetingCard({ meeting, colors, onJoin }: { meeting: MeetingRow; colors: any; onJoin: () => void }) {
  const isOngoing = meeting.status === "in_progress";
  const accent = isOngoing ? "#f59e0b" : "#4c6fff";

  return (
    <TouchableOpacity
      onPress={onJoin}
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.bgCard,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: isOngoing ? "#f59e0b44" : colors.border,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{
        width: 46, height: 46, borderRadius: 14,
        backgroundColor: accent + "22",
        borderWidth: 1, borderColor: accent + "44",
        alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name={isOngoing ? "radio-button-on" : "calendar"} size={20} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodySm" weight="bold" numberOfLines={1}>{meeting.title}</AppText>
        <AppText variant="micro" tone="muted">
          {formatTime(meeting.meeting_time)}{meeting.duration_minutes ? ` · ${meeting.duration_minutes}د` : ""}
        </AppText>
      </View>
      <View style={{
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: accent,
      }}>
        <AppText style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
          {isOngoing ? "جارٍ" : "انضم"}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MeetingsInfoScreen() {
  const navigation = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const { company } = useCompany();
  const { openCompanyDaily, dailyLoading } = useCompanyDailyRoom();
  const { startCall } = useCallContext();

  const [members, setMembers] = useState<CompanyMemberRow[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<number, string>>({});
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");

  const load = useCallback(async () => {
    try {
      const [mems, mtgs] = await Promise.all([
        getCompanyMembers().catch(() => [] as CompanyMemberRow[]),
        getMeetings(true).catch(() => [] as MeetingRow[]),
      ]);
      setMembers(Array.isArray(mems) ? mems : []);
      setMeetings(Array.isArray(mtgs) ? mtgs.filter((m) => m.meeting_date === todayISO() || m.status === "in_progress") : []);

      // Fetch presence for all members in parallel
      const presenceEntries = await Promise.allSettled(
        (Array.isArray(mems) ? mems : []).map(async (m) => {
          try {
            const r = await getUserPresence(m.user_id);
            return [m.user_id, r.presence_status] as [number, string];
          } catch {
            return [m.user_id, "offline"] as [number, string];
          }
        }),
      );
      const pMap: Record<number, string> = {};
      presenceEntries.forEach((r) => {
        if (r.status === "fulfilled") {
          pMap[r.value[0]] = r.value[1];
        }
      });
      setPresenceMap(pMap);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void load();
  }, [load]));

  const filteredMembers = members.filter((m) =>
    !memberSearch.trim() ||
    (m.user_name || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.job_title || "").toLowerCase().includes(memberSearch.toLowerCase()),
  );

  // Sort: online first, then away, then busy, then offline
  const ORDER = { online: 0, away: 1, busy: 2, offline: 3 };
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const pa = ORDER[presenceMap[a.user_id] as keyof typeof ORDER ?? "offline"] ?? 3;
    const pb = ORDER[presenceMap[b.user_id] as keyof typeof ORDER ?? "offline"] ?? 3;
    return pa - pb;
  });

  const onlineCount = members.filter((m) => presenceMap[m.user_id] === "online").length;

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />

      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: c.border, gap: 12,
      }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold">الاجتماعات والفريق</AppText>
          <AppText variant="micro" tone="muted">
            {onlineCount} متصل الآن · {members.length} عضو
          </AppText>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("CallHistory")}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentBlue + "18", borderWidth: 1, borderColor: c.accentBlue + "44", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="call-outline" size={18} color={c.accentBlue} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("Meetings")}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#4c6fff18", borderWidth: 1, borderColor: "#4c6fff44", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="calendar-outline" size={18} color="#4c6fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.accentCyan} onRefresh={() => { setRefreshing(true); void load(); }} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Company Video Room ─────────────────────────────── */}
        <View style={{ padding: 16, paddingBottom: 0 }}>
          <TouchableOpacity
            onPress={() => void openCompanyDaily()}
            disabled={dailyLoading}
            activeOpacity={0.85}
            style={{
              borderRadius: 20,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: c.accentCyan + "66",
              backgroundColor: c.bgCard,
              padding: 18,
            }}
          >
            {/* Gradient-like background */}
            <View style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: c.accentCyan,
              opacity: 0.06,
              borderRadius: 18,
            }} />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{
                width: 52, height: 52, borderRadius: 16,
                backgroundColor: c.accentCyan + "22",
                borderWidth: 1.5, borderColor: c.accentCyan + "55",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="videocam" size={24} color={c.accentCyan} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySm" weight="bold">غرفة {company?.name || "الشركة"}</AppText>
                <AppText variant="micro" tone="muted">فيديو + شات + مشاركة الشاشة</AppText>
              </View>
              <View style={{
                paddingHorizontal: 16, paddingVertical: 9,
                borderRadius: 20,
                backgroundColor: dailyLoading ? c.border : c.accentCyan,
              }}>
                {dailyLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <AppText style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>ادخل</AppText>
                }
              </View>
            </View>

            {/* Quick provider buttons */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              {[
                { key: "meet",  label: "Meet",  color: "#ea4335", icon: "logo-google" as const },
                { key: "zoom",  label: "Zoom",  color: "#2d8cff", icon: "mic-outline" as const },
                { key: "teams", label: "Teams", color: "#5558af", icon: "people-outline" as const },
              ].map((p) => (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => void openMeetingProvider(p.key as any)}
                  style={{
                    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 5, paddingVertical: 9, borderRadius: 14,
                    borderWidth: 1, borderColor: p.color + "44",
                    backgroundColor: p.color + "12",
                  }}
                >
                  <Ionicons name={p.icon} size={13} color={p.color} />
                  <AppText style={{ color: p.color, fontSize: 12, fontWeight: "700" }}>{p.label}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Today's Meetings ──────────────────────────────── */}
        {meetings.length > 0 ? (
          <View style={{ padding: 16, paddingBottom: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <AppText variant="bodySm" weight="bold">اجتماعات اليوم</AppText>
              <TouchableOpacity onPress={() => navigation.navigate("Meetings")}>
                <AppText variant="micro" style={{ color: c.accentBlue }}>الكل</AppText>
              </TouchableOpacity>
            </View>
            {meetings.map((m) => (
              <TodayMeetingCard
                key={m.id}
                meeting={m}
                colors={c}
                onJoin={() => {
                  const loc = m.location ?? "daily";
                  if (loc === "daily" || !loc) void openCompanyDaily();
                  else void openMeetingProvider(loc);
                }}
              />
            ))}
          </View>
        ) : null}

        {/* ── AI Quick Actions ──────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate("AiAssistant")}
              style={{
                flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
                padding: 14, borderRadius: 16,
                backgroundColor: "#7c3aed18",
                borderWidth: 1, borderColor: "#7c3aed44",
              }}
            >
              <Ionicons name="sparkles-outline" size={18} color="#7c3aed" />
              <View>
                <AppText style={{ color: "#7c3aed", fontWeight: "700", fontSize: 13 }}>مساعد الذكاء</AppText>
                <AppText variant="micro" tone="muted">ملخص وتحليل</AppText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Chat")}
              style={{
                flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
                padding: 14, borderRadius: 16,
                backgroundColor: "#06b6d418",
                borderWidth: 1, borderColor: "#06b6d444",
              }}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#06b6d4" />
              <View>
                <AppText style={{ color: "#06b6d4", fontWeight: "700", fontSize: 13 }}>قنوات الشات</AppText>
                <AppText variant="micro" tone="muted">محادثات الفريق</AppText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Team Members ─────────────────────────────────── */}
        <View style={{ padding: 16, paddingBottom: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <AppText variant="bodySm" weight="bold">أعضاء الفريق</AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10b981" }} />
                <AppText variant="micro" tone="muted">{onlineCount} متصل</AppText>
              </View>
              {/* Toggle: list / org tree */}
              <View style={{ flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: c.border, overflow: "hidden" }}>
                <TouchableOpacity
                  onPress={() => setViewMode("list")}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: viewMode === "list" ? c.accentBlue + "22" : "transparent" }}
                >
                  <Ionicons name="list" size={14} color={viewMode === "list" ? c.accentBlue : c.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setViewMode("tree")}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: viewMode === "tree" ? c.accentBlue + "22" : "transparent" }}
                >
                  <Ionicons name="git-network-outline" size={14} color={viewMode === "tree" ? c.accentBlue : c.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Search */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: c.cardStrong, borderRadius: 12,
            borderWidth: 1, borderColor: c.border,
            paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
          }}>
            <Ionicons name="search-outline" size={16} color={c.textMuted} />
            <TextInput
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="ابحث عن عضو..."
              placeholderTextColor={c.textMuted}
              style={{ flex: 1, color: c.textPrimary, fontSize: 14 }}
            />
          </View>

          {loading ? (
            <ActivityIndicator color={c.accentCyan} style={{ marginVertical: 30 }} />
          ) : sortedMembers.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Ionicons name="people-outline" size={40} color={c.textMuted} />
              <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>لا يوجد أعضاء</AppText>
            </View>
          ) : viewMode === "tree" ? (
            <OrgChartTree members={sortedMembers} presenceMap={presenceMap} colors={c} />
          ) : (
            sortedMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                presence={presenceMap[member.user_id] ?? "offline"}
                colors={c}
                onMessage={async () => {
                  navigation.navigate("Chat");
                }}
                onAudioCall={() => void startCall(
                  member.user_id,
                  member.user_name || "مستخدم",
                  undefined,
                  "audio",
                )}
                onVideoCall={() => void startCall(
                  member.user_id,
                  member.user_name || "مستخدم",
                  undefined,
                  "video",
                )}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
