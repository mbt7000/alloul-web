import React from "react";
import { ScrollView, View, I18nManager } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import ListRow from "../../../shared/ui/ListRow";
import { CompanyEmptyState, CompanyHeroCard, CompanySectionLabel } from "../components/CompanyBlocks";
import { useCompany } from "../../../state/company/CompanyContext";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";

export default function CompanyListScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(() => ({
    content: {
      padding: 16,
      paddingBottom: 110,
    },
  }));
  const { company } = useCompany();
  const isRTL = I18nManager.isRTL;

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="الشركات" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <CompanyHeroCard
          eyebrow="مساحة الشركات"
          title={company?.name || "شركاتك"}
          subtitle="تصفّح شركتك المرتبطة وانتقل إلى ملفها التشغيلي."
          chips={[
            { label: company ? "شركة مرتبطة" : "لا توجد شركة", icon: "business-outline", tone: company ? "teal" : "muted" },
          ]}
        />

        {company ? (
          <View style={{ marginTop: 18 }}>
            <CompanySectionLabel label="شركتك" />
            <ListRow
              title={company.name}
              subtitle={company.i_code ? `رمز الشركة ${company.i_code} · مساحة تشغيلية` : "مساحة تشغيلية"}
              iconLeft="shield-checkmark-outline"
              onPress={() => navigation.navigate("Company")}
              right={<Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={18} color={colors.accentTeal} />}
            />
          </View>
        ) : (
          <View style={{ marginTop: 18 }}>
            <CompanyEmptyState
              icon="business-outline"
              title="لا توجد شركة مرتبطة"
              subtitle="أنشئ شركة جديدة أو انضم بكود دعوة للبدء."
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
