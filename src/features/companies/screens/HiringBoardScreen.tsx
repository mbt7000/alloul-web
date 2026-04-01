import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppInput from "../../../shared/ui/AppInput";
import AppText from "../../../shared/ui/AppText";
import GlassCard from "../../../shared/components/GlassCard";
import { colors } from "../../../theme/colors";
import {
  getCompanyCandidates,
  setCompanyCandidateStatus,
  type CompanyCandidateRow,
} from "../../../api";

const STATUSES: CompanyCandidateRow["status"][] = ["pending", "shortlisted", "interview", "accepted", "rejected"];

export default function HiringBoardScreen() {
  const [roleFilter, setRoleFilter] = useState("");
  const [rows, setRows] = useState<CompanyCandidateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (role?: string) => {
    setLoading(true);
    try {
      const data = await getCompanyCandidates(role);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    return STATUSES.map((status) => ({
      status,
      items: rows.filter((r) => r.status === status),
    }));
  }, [rows]);

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="Hiring Console" />
      <View style={styles.container}>
        <AppInput
          value={roleFilter}
          onChangeText={setRoleFilter}
          placeholder="Filter candidates by role"
          iconLeft="search-outline"
          onSubmitEditing={() => void load(roleFilter)}
        />
        <FlatList
          style={{ marginTop: 12 }}
          data={grouped}
          keyExtractor={(g) => g.status}
          renderItem={({ item: col }) => (
            <GlassCard style={styles.column}>
              <AppText variant="bodySm" weight="bold">
                {col.status.toUpperCase()} ({col.items.length})
              </AppText>
              {col.items.length === 0 ? (
                <AppText variant="micro" tone="muted" style={{ marginTop: 8 }}>
                  No candidates
                </AppText>
              ) : (
                col.items.map((candidate) => (
                  <View key={candidate.id} style={styles.candidate}>
                    <AppText variant="caption" weight="bold">
                      {candidate.full_name}
                    </AppText>
                    <AppText variant="micro" tone="muted" style={{ marginTop: 4 }}>
                      {candidate.role} · {candidate.years_experience}y · {candidate.skills.join(", ")}
                    </AppText>
                    <View style={styles.actions}>
                      {STATUSES.filter((s) => s !== candidate.status).map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={styles.pill}
                          onPress={() => {
                            void (async () => {
                              await setCompanyCandidateStatus(candidate.id, status);
                              await load(roleFilter);
                            })();
                          }}
                        >
                          <AppText variant="micro" weight="bold" style={{ color: colors.accentCyan }}>
                            {status}
                          </AppText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </GlassCard>
          )}
          ListEmptyComponent={
            <AppText variant="caption" tone="muted" style={{ textAlign: "center", marginTop: 24 }}>
              {loading ? "Loading candidates…" : "No candidates yet."}
            </AppText>
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  column: { padding: 12, marginBottom: 10 },
  candidate: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.3)",
    backgroundColor: "rgba(56,232,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
