import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useThemedStyles } from "../../theme/useThemedStyles";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const styles = useThemedStyles((c) => ({
    container: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 10,
    },
    title: { color: c.textPrimary, fontSize: 16, fontWeight: "700" as const },
    action: { color: c.accentCyan, fontSize: 12, fontWeight: "700" as const },
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
