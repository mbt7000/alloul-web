import React from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { radius } from "../../../theme/radius";

type Props = {
  title: string;
  department: string;
  timeLabel: string;
  onApprove: () => void;
  onReject: () => void;
  onPressCard?: () => void;
};

export default function PendingApprovalCard({
  title,
  department,
  timeLabel,
  onApprove,
  onReject,
  onPressCard,
}: Props) {
  const { colors, mode } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.cardElevated,
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 12,
    },
    topRow: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 12,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: "rgba(255,255,255,0.06)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 1,
      borderColor: c.border,
    },
    textBlock: { flex: 1, gap: 6 },
    actions: {
      flexDirection: "row" as const,
      gap: 10,
      marginTop: 16,
    },
    btnReject: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: radius.lg,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center" as const,
    },
    btnApprove: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: radius.lg,
      backgroundColor: mode === "dark" ? c.white : c.black,
      alignItems: "center" as const,
    },
  }));

  const approveText = mode === "dark" ? colors.black : colors.white;
  const rejectText = colors.textPrimary;

  const body = (
    <>
      <View style={styles.topRow}>
        <View style={styles.textBlock}>
          <AppText variant="bodySm" weight="bold" numberOfLines={2}>
            {title}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {department} · {timeLabel}
          </AppText>
        </View>
        <View style={styles.iconBox}>
          <Ionicons name="document-text-outline" size={22} color={colors.textPrimary} />
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onApprove} style={({ pressed }) => [styles.btnApprove, pressed && { opacity: 0.9 }]}>
          <AppText variant="bodySm" weight="bold" style={{ color: approveText }}>
            موافقة
          </AppText>
        </Pressable>
        <Pressable onPress={onReject} style={({ pressed }) => [styles.btnReject, pressed && { opacity: 0.85 }]}>
          <AppText variant="bodySm" weight="bold" style={{ color: rejectText }}>
            رفض
          </AppText>
        </Pressable>
      </View>
    </>
  );

  if (onPressCard) {
    return (
      <Pressable onPress={onPressCard} style={({ pressed }) => [styles.card, pressed && { opacity: 0.96 }]}>
        {body}
      </Pressable>
    );
  }

  return <View style={styles.card}>{body}</View>;
}
