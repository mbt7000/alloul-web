import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";

export default function ApprovalDetailScreen() {
  const { colors } = useAppTheme();
  const route = useRoute<any>();
  const title = typeof route.params?.title === "string" ? route.params.title : "تفاصيل الموافقة";
  const styles = useThemedStyles(() => ({
    body: { padding: 16 },
    card: { padding: 18 },
  }));
  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }} edges={["top", "left", "right", "bottom"]}>
      <CompanyWorkModeTopBar />
      <AppHeader title={title} />
      <View style={styles.body}>
        <GlassCard style={styles.card}>
          <Ionicons
            name="checkmark-circle-outline"
            size={38}
            color={colors.accentCyan}
            style={{ alignSelf: "center", marginBottom: 10 }}
          />
          <AppText variant="body" tone="secondary" style={{ textAlign: "center" }}>
            ستظهر هنا حالة الطلب والبيانات وسجل القرار عند ربطها بالخادم.
          </AppText>
        </GlassCard>
      </View>
    </Screen>
  );
}

