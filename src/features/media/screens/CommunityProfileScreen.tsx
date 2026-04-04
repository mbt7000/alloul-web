import React from "react";
import { ScrollView } from "react-native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";

export default function CommunityProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(() => ({
    content: { padding: 16, paddingBottom: 90 },
    card: { padding: 16 },
  }));
  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="ملف المجتمع" leftButton="back" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.card}>
          <AppText variant="h3" weight="bold">
            مجتمع اللّول للتقنية
          </AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
            مساحة عامة للنقاشات المهنية، الاكتشاف، والنشر المجتمعي.
          </AppText>
          <AppText variant="bodySm" style={{ marginTop: 14, lineHeight: 22 }}>
            هذا الملف يركز على تفاصيل المجتمع: القواعد، المشرفون، المواضيع الرائجة، والمنشورات المثبتة.
          </AppText>
          <AppButton label="انضمام للمجتمع" tone="primary" onPress={() => {}} style={{ marginTop: 16 }} />
        </GlassCard>
      </ScrollView>
    </Screen>
  );
}
