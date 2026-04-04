import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import GlassCard from "../components/GlassCard";
import AppText from "./AppText";

type Props = {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
};

/** Compact error + retry for list screens (Feed, Inbox, etc.). */
export default function InlineErrorRetry({ message, onRetry, retryLabel = "Retry" }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(() => ({
    card: { padding: 20, marginVertical: 8 },
    retryBtn: {
      alignSelf: "center" as const,
      marginTop: 14,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(56,232,255,0.35)",
      backgroundColor: "rgba(56,232,255,0.08)",
    },
  }));

  return (
    <GlassCard style={styles.card}>
      <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} style={{ alignSelf: "center" }} />
      <AppText variant="bodySm" tone="secondary" style={{ textAlign: "center", marginTop: 12 }}>
        {message}
      </AppText>
      <Pressable onPress={onRetry} style={styles.retryBtn}>
        <AppText variant="micro" weight="bold" tone="cyan">
          {retryLabel}
        </AppText>
      </Pressable>
    </GlassCard>
  );
}
