import React, { useCallback, useMemo, useState } from "react";
import {
  View, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import AppInput from "../../../shared/ui/AppInput";
import AppHeader from "../../../shared/layout/AppHeader";
import { useAppTheme } from "../../../theme/ThemeContext";
import {
  getCompanyCandidates,
  setCompanyCandidateStatus,
  type CompanyCandidateRow,
} from "../../../api";

const STATUS_META: Record<string, { label: string; color: string; icon: string; next?: string }> = {
  pending:     { label: "جديد",        color: "#6b7280", icon: "person-add-outline",   next: "shortlisted" },
  shortlisted: { label: "مختصر",       color: "#3b82f6", icon: "bookmark-outline",     next: "interview" },
  interview:   { label: "مقابلة",      color: "#8b5cf6", icon: "calendar-outline",     next: "accepted" },
  accepted:    { label: "مقبول",       color: "#10b981", icon: "checkmark-circle-outline" },
  rejected:    { label: "مرفوض",       color: "#ef4444", icon: "close-circle-outline" },
};

const STATUSES = ["pending", "shortlisted", "interview", "accepted", "rejected"] as const;

export default function HiringBoardScreen() {
  const { colors: c } = useAppTheme();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CompanyCandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getCompanyCandidates();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.full_name.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q) ||
      r.skills.some(s => s.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const grouped = useMemo(() =>
    STATUSES.map(s => ({ status: s, items: filtered.filter(r => r.status === s) })),
    [filtered]
  );

  const moveCandidate = useCallback(async (candidate: CompanyCandidateRow, toStatus: string) => {
    setMovingId(candidate.id);
    try {
      await setCompanyCandidateStatus(candidate.id, toStatus as CompanyCandidateRow["status"]);
      setRows(prev => prev.map(r => r.id === candidate.id ? { ...r, status: toStatus as any } : r));
    } catch {
      Alert.alert("خطأ", "تعذّر تغيير الحالة");
    } finally {
      setMovingId(null);
    }
  }, []);

  // Stats
  const accepted = rows.filter(r => r.status === "accepted").length;
  const inPipeline = rows.filter(r => !["accepted","rejected"].includes(r.status)).length;

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <AppHeader title="لوحة التوظيف" leftButton="back" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={c.accentCyan}
            onRefresh={() => { setRefreshing(true); void load(); }}
          />
        }
      >
        {/* Stats */}
        {!loading && rows.length > 0 && (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
            {[
              { label: "إجمالي المتقدمين", value: rows.length, color: c.accentCyan },
              { label: "في الأنبوب",       value: inPipeline,   color: "#8b5cf6" },
              { label: "مقبولون",          value: accepted,     color: "#10b981" },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: "#151515", borderRadius: 14, borderWidth: 1, borderColor: "#222", padding: 12, alignItems: "center" }}>
                <AppText style={{ color: s.color, fontSize: 20, fontWeight: "800" }}>{s.value}</AppText>
                <AppText style={{ color: "#666", fontSize: 10, marginTop: 3, textAlign: "center" }}>{s.label}</AppText>
              </View>
            ))}
          </View>
        )}

        {/* Search */}
        <AppInput
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث باسم المتقدم أو المنصب أو المهارة"
          iconLeft="search-outline"
          style={{ marginBottom: 20 }}
        />

        {loading ? (
          <ActivityIndicator color={c.accentCyan} style={{ marginTop: 40 }} />
        ) : rows.length === 0 ? (
          <View style={{ alignItems: "center", padding: 60 }}>
            <Ionicons name="people-outline" size={56} color="#333" />
            <AppText style={{ color: "#666", marginTop: 12 }}>لا يوجد متقدمون بعد</AppText>
          </View>
        ) : (
          grouped.map(col => {
            const meta = STATUS_META[col.status]!;
            if (col.items.length === 0) return null;
            return (
              <View key={col.status} style={{ marginBottom: 24 }}>
                {/* Column header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: meta.color }} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name={meta.icon as any} size={15} color={meta.color} />
                    <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{meta.label}</AppText>
                  </View>
                  <View style={{ backgroundColor: meta.color + "22", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 }}>
                    <AppText style={{ color: meta.color, fontSize: 11, fontWeight: "700" }}>{col.items.length}</AppText>
                  </View>
                </View>

                {/* Candidate cards */}
                {col.items.map(candidate => (
                  <View key={candidate.id} style={{
                    backgroundColor: "#151515",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: meta.color + "33",
                    padding: 14,
                    marginBottom: 10,
                  }}>
                    {/* Name + experience */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                      <View style={{ flex: 1 }}>
                        <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "800" }} numberOfLines={1}>
                          {candidate.full_name}
                        </AppText>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <View style={{ backgroundColor: "#1e1e1e", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <AppText style={{ color: "#aaa", fontSize: 11 }}>{candidate.role}</AppText>
                          </View>
                          <View style={{ backgroundColor: meta.color + "18", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <AppText style={{ color: meta.color, fontSize: 11, fontWeight: "600" }}>
                              {candidate.years_experience} سنوات
                            </AppText>
                          </View>
                        </View>
                      </View>
                      {movingId === candidate.id && (
                        <ActivityIndicator size="small" color={meta.color} />
                      )}
                    </View>

                    {/* Skills */}
                    {candidate.skills.length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        {candidate.skills.slice(0, 4).map(skill => (
                          <View key={skill} style={{ backgroundColor: "#1a1a1a", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: "#2a2a2a" }}>
                            <AppText style={{ color: "#888", fontSize: 10 }}>{skill}</AppText>
                          </View>
                        ))}
                        {candidate.skills.length > 4 && (
                          <View style={{ backgroundColor: "#1a1a1a", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <AppText style={{ color: "#555", fontSize: 10 }}>+{candidate.skills.length - 4}</AppText>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Action buttons */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {/* Move to next stage */}
                      {meta.next && (
                        <Pressable
                          style={{ flex: 1, backgroundColor: STATUS_META[meta.next]!.color + "22", borderWidth: 1, borderColor: STATUS_META[meta.next]!.color + "44", paddingVertical: 8, borderRadius: 10, alignItems: "center" }}
                          onPress={() => void moveCandidate(candidate, meta.next!)}
                          disabled={movingId === candidate.id}
                        >
                          <AppText style={{ color: STATUS_META[meta.next]!.color, fontSize: 12, fontWeight: "700" }}>
                            → {STATUS_META[meta.next]!.label}
                          </AppText>
                        </Pressable>
                      )}
                      {/* Reject */}
                      {col.status !== "rejected" && col.status !== "accepted" && (
                        <Pressable
                          style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#ef444418", borderWidth: 1, borderColor: "#ef444433", borderRadius: 10, alignItems: "center" }}
                          onPress={() => void moveCandidate(candidate, "rejected")}
                          disabled={movingId === candidate.id}
                        >
                          <AppText style={{ color: "#ef4444", fontSize: 12, fontWeight: "600" }}>رفض</AppText>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
