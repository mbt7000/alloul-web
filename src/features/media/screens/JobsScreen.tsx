import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppInput from "../../../shared/ui/AppInput";
import AppText from "../../../shared/ui/AppText";
import GlassCard from "../../../shared/components/GlassCard";
import AppButton from "../../../shared/ui/AppButton";
import { applyToMediaJob, getMediaJobs, type JobPostRow } from "../../../api";
import { colors } from "../../../theme/colors";

export default function JobsScreen() {
  const [jobs, setJobs] = useState<JobPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const load = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const rows = await getMediaJobs(search);
      setJobs(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="Media Jobs" />
      <View style={styles.body}>
        <AppInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by role or skills"
          iconLeft="search-outline"
          onSubmitEditing={() => void load(q)}
        />
        <FlatList
          style={{ marginTop: 10 }}
          data={jobs}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <AppText variant="caption" tone="muted" style={{ textAlign: "center", marginTop: 24 }}>
              {loading ? "Loading jobs…" : "No jobs found for this search."}
            </AppText>
          }
          renderItem={({ item }) => (
            <GlassCard style={styles.card}>
              <AppText variant="bodySm" weight="bold">
                {item.title}
              </AppText>
              <AppText variant="micro" tone="muted" style={{ marginTop: 4 }}>
                {item.company_name} · {item.location || "Remote"} · {item.employment_type || "Full-time"}
              </AppText>
              {item.skill_tags?.length ? (
                <AppText variant="micro" tone="cyan" style={{ marginTop: 6 }}>
                  {item.skill_tags.join(" · ")}
                </AppText>
              ) : null}
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  setActiveJobId(item.id);
                }}
              >
                <AppText variant="micro" weight="bold" style={{ color: colors.accentCyan }}>
                  Apply
                </AppText>
              </TouchableOpacity>
            </GlassCard>
          )}
        />
      </View>
      {activeJobId ? (
        <QuickApply
          jobId={activeJobId}
          onClose={() => setActiveJobId(null)}
          onApplied={() => {
            setActiveJobId(null);
            Alert.alert("Application submitted", "Your profile was sent to the company.");
          }}
        />
      ) : null}
    </Screen>
  );
}

function QuickApply({ jobId, onClose, onApplied }: { jobId: string; onClose: () => void; onApplied: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState("");
  const [years, setYears] = useState("0");
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.sheetWrap}>
      <GlassCard style={styles.sheet}>
        <AppText variant="bodySm" weight="bold">
          Quick Apply
        </AppText>
        <AppInput value={name} onChangeText={setName} placeholder="Full name" />
        <AppInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
        <AppInput value={role} onChangeText={setRole} placeholder="Role (e.g. Frontend Developer)" />
        <AppInput value={skills} onChangeText={setSkills} placeholder="Skills (comma separated)" />
        <AppInput value={years} onChangeText={setYears} placeholder="Years of experience" keyboardType="numeric" />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <AppButton label="Cancel" tone="glass" onPress={onClose} />
          <AppButton
            label="Submit"
            loading={loading}
            disabled={!name || !email || !role}
            onPress={() => {
              setLoading(true);
              void (async () => {
                try {
                  await applyToMediaJob(jobId, {
                    full_name: name,
                    email,
                    role,
                    years_experience: Number(years || "0"),
                    skills: skills
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                  onApplied();
                } finally {
                  setLoading(false);
                }
              })();
            }}
          />
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: 16 },
  card: { padding: 12, marginBottom: 10 },
  applyBtn: { marginTop: 10, alignSelf: "flex-start" },
  sheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: { padding: 12, gap: 10 },
});
