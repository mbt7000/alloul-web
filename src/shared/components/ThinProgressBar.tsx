import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";

export default function ThinProgressBar({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(100, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${p}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
});
