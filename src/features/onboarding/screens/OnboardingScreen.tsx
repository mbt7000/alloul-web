import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import { spacing } from "../../../theme/spacing";
import { radii } from "../../../theme/radii";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";

type Props = {
  onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
  const styles = useThemedStyles((colors) => ({
    root: { paddingHorizontal: spacing.xxl },
    glow1: {
      position: "absolute" as const,
      top: -120,
      left: -60,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: "rgba(76,111,255,0.16)",
    },
    glow2: {
      position: "absolute" as const,
      bottom: 40,
      right: -80,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: "rgba(56,232,255,0.10)",
    },
    content: { flex: 1, paddingTop: 44 },
    logo: {
      width: 52,
      height: 52,
      borderRadius: radii.lg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: colors.cardStrong,
      borderWidth: 1,
      borderColor: colors.floatingBarBorder,
      marginBottom: 18,
    },
    bullets: { marginTop: 24, gap: 14 },
    footer: { paddingBottom: 18 },
  }));

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={styles.root}>
      <View style={styles.glow1} pointerEvents="none" />
      <View style={styles.glow2} pointerEvents="none" />

      <View style={styles.content}>
        <BulletScreenLogo />

        <AppText variant="display" weight="bold">
          Alloul One
        </AppText>
        <AppText variant="body" tone="secondary" style={{ marginTop: 10 }}>
          A mobile-first workspace + media hub built for iPhone. Fast, secure, and designed like a premium App Store product.
        </AppText>

        <View style={styles.bullets}>
          <Bullet icon="lock-closed" title="Secure sign-in" body="Modern auth + token storage." />
          <Bullet icon="apps" title="Workspace" body="Inbox, services, teams, projects." />
          <Bullet icon="radio" title="Media" body="Feed, discover, communities, marketplace." />
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton label="Get started" onPress={onDone} tone="primary" size="lg" />
        <AppText variant="micro" tone="muted" style={{ textAlign: "center", marginTop: 10 }}>
          By continuing, you agree to the app policies (to be added).
        </AppText>
      </View>
    </Screen>
  );
}

function BulletScreenLogo() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    logo: {
      width: 52,
      height: 52,
      borderRadius: radii.lg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.cardStrong,
      borderWidth: 1,
      borderColor: c.floatingBarBorder,
      marginBottom: 18,
    },
  }));
  return (
    <View style={styles.logo}>
      <Ionicons name="diamond" size={24} color={colors.accentCyan} />
    </View>
  );
}

function Bullet({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    bulletRow: {
      flexDirection: "row" as const,
      gap: 12,
      padding: 14,
      borderRadius: radii.lg,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
    },
    bulletIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: c.cardStrong,
      borderWidth: 1,
      borderColor: c.floatingBarBorder,
    },
  }));

  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletIcon}>
        <Ionicons name={icon} size={18} color={colors.accentCyan} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="bold">
          {title}
        </AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {body}
        </AppText>
      </View>
    </View>
  );
}
