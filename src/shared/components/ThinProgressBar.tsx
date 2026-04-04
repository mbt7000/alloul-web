import React from "react";
import { View } from "react-native";
import { radius } from "../../theme/radius";
import { useThemedStyles } from "../../theme/useThemedStyles";

export default function ThinProgressBar({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(100, progress));
  const styles = useThemedStyles((c) => ({
    track: {
      height: 3,
      borderRadius: radius.pill,
      backgroundColor: c.border,
      overflow: "hidden" as const,
    },
    fill: {
      height: "100%" as const,
      borderRadius: radius.pill,
      backgroundColor: c.accentBlue,
    },
  }));

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${p}%` }]} />
    </View>
  );
}
