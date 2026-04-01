import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { colors } from "../../../theme/colors";

export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const post = route.params?.post as { id?: number; content?: string; username?: string } | undefined;

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="تفاصيل المنشور" leftButton="back" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.card}>
          <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
            منشور عام
          </AppText>
          <AppText variant="bodySm" weight="bold" style={{ marginTop: 10 }}>
            @{post?.username || "alloul"}
          </AppText>
          <AppText variant="body" style={{ marginTop: 10, lineHeight: 24 }}>
            {post?.content || "عرض كامل لمحتوى المنشور، الردود، والتفاعلات في تجربة الميديا."}
          </AppText>
          <View style={styles.actions}>
            <AppButton label="رد" tone="glass" onPress={() => {}} />
            <AppButton label="ملف الشركة" tone="primary" onPress={() => navigation.navigate("CompanyProfile")} />
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
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
});
