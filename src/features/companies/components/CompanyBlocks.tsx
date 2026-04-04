import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppPalette } from "../../../theme/palettes";
import { useAppTheme } from "../../../theme/ThemeContext";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";

type Tone = "cyan" | "teal" | "blue" | "rose" | "amber" | "muted";

function toneColor(colors: AppPalette, tone: Tone) {
  if (tone === "teal") return colors.accentTeal;
  if (tone === "blue") return colors.accentBlue;
  if (tone === "rose") return colors.accentRose;
  if (tone === "amber") return colors.accentEmber;
  if (tone === "muted") return colors.textSecondary;
  return colors.accentCyan;
}

function toneBg(colors: AppPalette, tone: Tone) {
  return `${toneColor(colors, tone)}14`;
}

type CompanySectionLabelProps = {
  label: string;
  meta?: string;
  style?: StyleProp<ViewStyle>;
};

export function CompanySectionLabel({ label, meta, style }: CompanySectionLabelProps) {
  return (
    <View style={[styles.sectionRow, style]}>
      <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
        {label}
      </AppText>
      {meta ? (
        <AppText variant="micro" tone="muted" weight="bold">
          {meta}
        </AppText>
      ) : null}
    </View>
  );
}

type CompanyChipProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
};

export function CompanyChip({ label, icon, tone = "cyan" }: CompanyChipProps) {
  const { colors } = useAppTheme();
  const tint = toneColor(colors, tone);
  return (
    <View style={[styles.chip, { borderColor: `${tint}33`, backgroundColor: toneBg(colors, tone) }]}>
      {icon ? <Ionicons name={icon} size={13} color={tint} /> : null}
      <AppText variant="micro" weight="bold" style={{ color: tint }}>
        {label}
      </AppText>
    </View>
  );
}

type CompanyHeroCardProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  chips?: Array<{ label: string; icon?: keyof typeof Ionicons.glyphMap; tone?: Tone }>;
  actions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function CompanyHeroCard({ eyebrow, title, subtitle, chips, actions, style }: CompanyHeroCardProps) {
  return (
    <GlassCard strength="strong" style={[styles.hero, style]}>
      <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
        {eyebrow}
      </AppText>
      <AppText variant="h2" weight="bold" style={{ marginTop: 8 }}>
        {title}
      </AppText>
      <AppText variant="bodySm" tone="secondary" style={{ marginTop: 8, lineHeight: 22 }}>
        {subtitle}
      </AppText>
      {chips?.length ? (
        <View style={styles.chipsWrap}>
          {chips.map((chip) => (
            <CompanyChip key={`${chip.label}-${chip.tone || "cyan"}`} label={chip.label} icon={chip.icon} tone={chip.tone} />
          ))}
        </View>
      ) : null}
      {actions ? <View style={styles.heroActions}>{actions}</View> : null}
    </GlassCard>
  );
}

type CompanyStatTileProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
};

export function CompanyStatTile({ label, value, icon, tone = "cyan", style }: CompanyStatTileProps) {
  const { colors } = useAppTheme();
  const tint = toneColor(colors, tone);
  return (
    <GlassCard style={[styles.statTile, style]}>
      <View style={styles.statHead}>
        <AppText variant="micro" tone="muted" weight="bold" style={{ flex: 1 }}>
          {label}
        </AppText>
        <View style={[styles.statIcon, { borderColor: `${tint}33`, backgroundColor: toneBg(colors, tone) }]}>
          <Ionicons name={icon} size={16} color={tint} />
        </View>
      </View>
      <AppText variant="h3" weight="bold" style={{ marginTop: 10 }}>
        {value}
      </AppText>
    </GlassCard>
  );
}

type CompanyEmptyStateProps = {
  title: string;
  subtitle: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
};

export function CompanyEmptyState({
  title,
  subtitle,
  icon = "sparkles-outline",
  actionLabel,
  onAction,
}: CompanyEmptyStateProps) {
  const { colors } = useAppTheme();
  const local = useMemo(
    () =>
      StyleSheet.create({
        emptyIcon: {
          width: 42,
          height: 42,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.cardStrong,
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [colors]
  );

  return (
    <GlassCard style={styles.emptyCard}>
      <View style={local.emptyIcon}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} />
      </View>
      <AppText variant="bodySm" weight="bold" style={styles.centeredText}>
        {title}
      </AppText>
      <AppText variant="caption" tone="muted" style={[styles.centeredText, { marginTop: 6 }]}>
        {subtitle}
      </AppText>
      {actionLabel && onAction ? (
        <View style={{ marginTop: 14 }}>
          <AppButton label={actionLabel} tone="glass" onPress={onAction} />
        </View>
      ) : null}
    </GlassCard>
  );
}

type CompanyLoadingCardProps = {
  label?: string;
};

export function CompanyLoadingCard({ label = "Loading company data..." }: CompanyLoadingCardProps) {
  const { colors } = useAppTheme();
  return (
    <GlassCard style={styles.loadingCard}>
      <ActivityIndicator color={colors.accentCyan} />
      <AppText variant="caption" tone="muted" style={{ marginTop: 10 }}>
        {label}
      </AppText>
    </GlassCard>
  );
}

type CompanyActionTileProps = {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  onPress: () => void;
};

export function CompanyActionTile({ label, subtitle, icon, tone = "cyan", onPress }: CompanyActionTileProps) {
  const { colors } = useAppTheme();
  const tint = toneColor(colors, tone);
  const tileStyles = useMemo(
    () =>
      StyleSheet.create({
        actionTile: {
          width: "48%",
          minWidth: "48%",
          padding: 14,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgCard,
        },
      }),
    [colors]
  );

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [tileStyles.actionTile, pressed && styles.actionTilePressed]}>
      <View style={[styles.actionIcon, { borderColor: `${tint}33`, backgroundColor: toneBg(colors, tone) }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <AppText variant="bodySm" weight="bold" style={{ marginTop: 10 }}>
        {label}
      </AppText>
      <AppText variant="micro" tone="muted" style={{ marginTop: 4 }}>
        {subtitle}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  kicker: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  hero: {
    padding: 16,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  statTile: {
    flex: 1,
    minWidth: 0,
    padding: 14,
  },
  statHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    padding: 20,
    alignItems: "center",
  },
  loadingCard: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  centeredText: {
    textAlign: "center",
    marginTop: 10,
  },
  actionTilePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
