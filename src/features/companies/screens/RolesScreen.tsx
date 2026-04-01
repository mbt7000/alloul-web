import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import { colors } from "../../../theme/colors";

const ROLES = [
  { id: "1", name: "Owner", perms: "إدارة كاملة + السياسات + الفوترة" },
  { id: "2", name: "Admin", perms: "إدارة الفريق، الموافقات، والخدمات" },
  { id: "3", name: "Manager", perms: "المشاريع، المهام، والتسليم" },
  { id: "4", name: "Member", perms: "تشغيل يومي ضمن صلاحيات القسم" },
];

export default function RolesScreen() {
  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="الأدوار" leftButton="back" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.card}>
          <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
            Company Workspace Roles
          </AppText>
          <View style={{ marginTop: 10, gap: 10 }}>
            {ROLES.map((role) => (
              <View key={role.id} style={styles.row}>
                <AppText variant="bodySm" weight="bold">
                  {role.name}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                  {role.perms}
                </AppText>
              </View>
            ))}
          </View>
        </GlassCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 90 },
  card: { padding: 16 },
  kicker: { letterSpacing: 0.8, textTransform: "uppercase" },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.12)" },
});
