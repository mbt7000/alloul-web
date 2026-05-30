/**
 * CompanyTeamHierarchyScreen
 * ──────────────────────────
 * Clean vertical team hierarchy view.
 * Only uses existing getCompanyMembers API — no backend changes.
 */

import React, { useCallback, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import CompanyBottomBar from "../components/CompanyBottomBar";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useAuth } from "../../../state/auth/AuthContext";
import { getCompanyMembers, type CompanyMemberRow } from "../../../api";

const ROLE_META: Record<string, { label: string; color: string; order: number }> = {
  owner:    { label: "المالك",    color: "#f59e0b", order: 0 },
  admin:    { label: "المشرفون",  color: "#ef4444", order: 1 },
  manager:  { label: "المدراء",   color: "#8b5cf6", order: 2 },
  employee: { label: "الموظفون",  color: "#3b82f6", order: 3 },
  member:   { label: "الأعضاء",   color: "#6b7280", order: 4 },
};

export default function CompanyTeamHierarchyScreen() {
  const nav = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const { user: me } = useAuth();
  const [members, setMembers] = useState<CompanyMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCompanyMembers();
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  // Group by role, sorted by hierarchy
  const byRole: Record<string, CompanyMemberRow[]> = {};
  members.forEach((m) => {
    const r = m.role ?? "member";
    if (!byRole[r]) byRole[r] = [];
    byRole[r].push(m);
  });
  const orderedRoles = Object.keys(byRole).sort((a, b) => {
    const oa = ROLE_META[a]?.order ?? 99;
    const ob = ROLE_META[b]?.order ?? 99;
    return oa - ob;
  });

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#0b0b0b" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.accentCyan} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        {/* Title */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1, marginRight: 12 }}>
            <AppText style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>الفريق</AppText>
            <AppText style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
              {members.length} عضو · {orderedRoles.length} مستوى
            </AppText>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={c.accentCyan} style={{ marginTop: 40 }} />
        ) : members.length === 0 ? (
          <View style={{ alignItems: "center", padding: 60 }}>
            <Ionicons name="people-outline" size={56} color="#333" />
            <AppText style={{ color: "#666", marginTop: 12 }}>لا يوجد أعضاء</AppText>
          </View>
        ) : (
          orderedRoles.map((role, roleIdx) => {
            const meta = ROLE_META[role] ?? { label: role, color: "#6b7280", order: 99 };
            const group = byRole[role];
            return (
              <View key={role} style={{ marginBottom: 26 }}>
                {/* Role header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <View style={{
                    width: 4, height: 22, borderRadius: 2, backgroundColor: meta.color,
                  }} />
                  <AppText style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                    {meta.label}
                  </AppText>
                  <View style={{
                    backgroundColor: `${meta.color}22`,
                    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
                  }}>
                    <AppText style={{ color: meta.color, fontSize: 11, fontWeight: "700" }}>
                      {group.length}
                    </AppText>
                  </View>
                </View>

                {/* Member cards in vertical stack with connector line */}
                <View style={{ paddingRight: 16, position: "relative" }}>
                  {/* Connector line */}
                  <View style={{
                    position: "absolute",
                    right: 22, top: 0, bottom: 0,
                    width: 1.5,
                    backgroundColor: `${meta.color}33`,
                  }} />

                  {group.map((m, idx) => {
                    const isMe = me?.id === m.user_id;
                    const initials = (m.user_name || "U").slice(0, 2).toUpperCase();
                    return (
                      <View key={m.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: idx < group.length - 1 ? 10 : 0 }}>
                        {/* Card */}
                        <View style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          backgroundColor: isMe ? `${c.accentCyan}15` : "#151515",
                          borderRadius: 16,
                          borderWidth: isMe ? 1.5 : 1,
                          borderColor: isMe ? c.accentCyan : "#222",
                          padding: 14,
                          marginRight: 12,
                        }}>
                          <View style={{
                            width: 40, height: 40, borderRadius: 12,
                            backgroundColor: `${meta.color}22`,
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <AppText style={{ color: meta.color, fontSize: 14, fontWeight: "800" }}>
                              {initials}
                            </AppText>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <AppText style={{ color: "#fff", fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
                                {m.user_name || "مستخدم"}
                              </AppText>
                              {isMe && (
                                <View style={{ backgroundColor: c.accentCyan, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                                  <AppText style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>أنت</AppText>
                                </View>
                              )}
                            </View>
                            {m.job_title && (
                              <AppText style={{ color: "#888", fontSize: 11 }} numberOfLines={1}>
                                {m.job_title}
                              </AppText>
                            )}
                            {m.work_id && (
                              <AppText style={{ color: "#555", fontSize: 10, fontFamily: "monospace" }} numberOfLines={1}>
                                {m.work_id}
                              </AppText>
                            )}
                          </View>
                        </View>

                        {/* Connector node */}
                        <View style={{
                          width: 12, height: 12, borderRadius: 6,
                          backgroundColor: meta.color,
                          borderWidth: 2, borderColor: "#0b0b0b",
                        }} />
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <CompanyBottomBar />
    </Screen>
  );
}
