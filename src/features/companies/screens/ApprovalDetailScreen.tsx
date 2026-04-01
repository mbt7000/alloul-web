import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import { colors } from "../../../theme/colors";

export default function ApprovalDetailScreen() {
  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="Approval" />
      <View style={styles.body}>
        <GlassCard style={styles.card}>
          <Ionicons
            name="checkmark-circle-outline"
            size={38}
            color={colors.accentCyan}
            style={{ alignSelf: "center", marginBottom: 10 }}
          />
          <AppText variant="body" tone="secondary" style={{ textAlign: "center" }}>
            Approval detail will live here (status, request data, actions, audit log).
          </AppText>
        </GlassCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16 },
  card: { padding: 18 },
});

