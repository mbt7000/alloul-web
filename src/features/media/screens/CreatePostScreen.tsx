import React, { useState } from "react";
import { View, Alert, Pressable } from "react-native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppInput from "../../../shared/ui/AppInput";
import AppButton from "../../../shared/ui/AppButton";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import { createPost } from "../../../api";
import { useCompany } from "../../../state/company/CompanyContext";
import { useHomeMode } from "../../../state/mode/HomeModeContext";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";

export default function CreatePostScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    body: { padding: 16 },
    card: { padding: 16, gap: 12 },
    input: { minHeight: 120, textAlignVertical: "top" as any },
    visibilityRow: { flexDirection: "row" as const, gap: 8 },
    visibilityPill: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center" as const,
      backgroundColor: c.bgCard,
    },
    visibilityPillActive: { borderColor: "rgba(56,232,255,0.35)", backgroundColor: "rgba(56,232,255,0.12)" },
    visibilityPillInternal: { borderColor: "rgba(45,226,199,0.35)", backgroundColor: "rgba(45,226,199,0.12)" },
  }));
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "internal">("public");
  const { canUseCompanyMode } = useHomeMode();
  const { company } = useCompany();

  const submit = async () => {
    const text = content.trim();
    if (!text) return;
    setLoading(true);
    try {
      await createPost(text, undefined, visibility);
      Alert.alert("Posted", "Your update is live.");
      setContent("");
    } catch (e) {
      Alert.alert("Failed", "Could not create post yet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="Create post" />
      <View style={styles.body}>
        <GlassCard style={styles.card}>
          <AppText variant="caption" tone="muted" weight="bold">
            Share an update
          </AppText>
          {canUseCompanyMode ? (
            <View style={styles.visibilityRow}>
              <Pressable
                onPress={() => setVisibility("public")}
                style={[styles.visibilityPill, visibility === "public" && styles.visibilityPillActive]}
              >
                <AppText variant="micro" weight="bold" style={{ color: visibility === "public" ? colors.accentCyan : undefined }}>
                  Public (Media)
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => setVisibility("internal")}
                style={[styles.visibilityPill, visibility === "internal" && styles.visibilityPillInternal]}
              >
                <AppText variant="micro" weight="bold" style={{ color: visibility === "internal" ? colors.accentTeal : undefined }}>
                  Internal ({company?.name || "Company"})
                </AppText>
              </Pressable>
            </View>
          ) : null}
          <AppInput
            value={content}
            onChangeText={setContent}
            placeholder="What’s happening in your workspace?"
            multiline
            style={styles.input}
          />
          <AppButton label="Post" onPress={() => void submit()} loading={loading} disabled={!content.trim()} />
        </GlassCard>
      </View>
    </Screen>
  );
}
