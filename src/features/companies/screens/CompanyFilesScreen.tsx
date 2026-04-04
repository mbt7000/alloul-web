import React from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import GlassCard from "../../../shared/components/GlassCard";
import ListRow from "../../../shared/ui/ListRow";
import { CompanyActionTile, CompanyChip, CompanyHeroCard, CompanySectionLabel, CompanyStatTile } from "../components/CompanyBlocks";
import { useCompany } from "../../../state/company/CompanyContext";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";

const FILE_GROUPS = [
  { id: "contracts", title: "العقود", count: "18", icon: "document-text-outline" as const, tone: "blue" as const },
  { id: "handover", title: "حزم التسليم", count: "9", icon: "folder-open-outline" as const, tone: "amber" as const },
  { id: "brand", title: "أصول الهوية", count: "24", icon: "color-palette-outline" as const, tone: "cyan" as const },
  { id: "policies", title: "السياسات", count: "12", icon: "shield-checkmark-outline" as const, tone: "teal" as const },
];

const RECENT_FILES = [
  { id: "1", title: "handover-q2-operations.pdf", meta: "التسليم · تم التحديث قبل ساعتين · 2.1 MB" },
  { id: "2", title: "client-renewal-template.docx", meta: "العقود · تم التحديث أمس · 420 KB" },
  { id: "3", title: "arabic-brand-guidelines.fig", meta: "أصول الهوية · تم التحديث قبل 3 أيام · 6.4 MB" },
];

export default function CompanyFilesScreen() {
  const navigation = useNavigation<any>();
  const { company } = useCompany();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(() => ({
    content: {
      padding: 16,
      paddingBottom: 110,
    },
    statRow: {
      flexDirection: "row" as const,
      gap: 10,
      marginTop: 10,
    },
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 10,
    },
    listWrap: {
      gap: 10,
    },
    row: {
      minHeight: 74,
    },
    workflowCard: {
      padding: 14,
      gap: 12,
    },
    workflowStep: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 10,
    },
  }));

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title="ملفات الشركة"
        leftButton="none"
        rightActions={<AppButton label="رفع" size="sm" onPress={() => {}} />}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CompanyHeroCard
          eyebrow="وحدة الملفات"
          title={company?.name || "ملفات الشركة المشتركة"}
          subtitle="نظّم المستندات بحسب الغرض التشغيلي: التسليمات والعقود والأصول والسياسات. صُمم التخطيط للوصول السريع والمشاركة المنضبطة."
          chips={[
            { label: "مكتبة مشتركة", icon: "folder-open-outline", tone: "cyan" },
            { label: "صلاحيات منضبطة", icon: "lock-closed-outline", tone: "teal" },
          ]}
          actions={
            <>
              <AppButton label="افتح التسليم" onPress={() => navigation.navigate("Handover")} />
              <AppButton label="الأعضاء" tone="glass" onPress={() => navigation.navigate("Teams")} />
            </>
          }
        />

        <View style={styles.statRow}>
          <CompanyStatTile label="المجلدات" value="4" icon="folder-open-outline" tone="blue" />
          <CompanyStatTile label="الملفات الحديثة" value="28" icon="document-text-outline" tone="cyan" />
        </View>
        <View style={styles.statRow}>
          <CompanyStatTile label="مشاركة خارجية" value="3" icon="share-social-outline" tone="amber" />
          <CompanyStatTile label="مستندات محمية" value="12" icon="shield-checkmark-outline" tone="teal" />
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="التجميعات" />
          <View style={styles.grid}>
            {FILE_GROUPS.map((group) => (
              <CompanyActionTile
                key={group.id}
                label={group.title}
                subtitle={`${group.count} عنصر`}
                icon={group.icon}
                tone={group.tone}
                onPress={() => {}}
              />
            ))}
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="الملفات الحديثة" meta={String(RECENT_FILES.length)} />
          <View style={styles.listWrap}>
            {RECENT_FILES.map((file) => (
              <ListRow
                key={file.id}
                title={file.title}
                subtitle={file.meta}
                iconLeft="attach-outline"
                style={styles.row}
                right={<Ionicons name="download-outline" size={18} color={colors.textSecondary} />}
              />
            ))}
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="سير عمل الملفات" />
          <GlassCard style={styles.workflowCard}>
            <View style={styles.workflowStep}>
              <CompanyChip label="رفع" icon="cloud-upload-outline" tone="cyan" />
              <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                أضف الملفات إلى التجميعة المناسبة مع تسمية موحدة وسياق واضح للمالك.
              </AppText>
            </View>
            <View style={styles.workflowStep}>
              <CompanyChip label="مشاركة" icon="share-social-outline" tone="blue" />
              <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                اربط الملفات بالتسليمات أو المشاريع أو الأعضاء حتى تبقى المعرفة مرتبطة بالعمل نفسه.
              </AppText>
            </View>
            <View style={styles.workflowStep}>
              <CompanyChip label="حماية" icon="lock-closed-outline" tone="teal" />
              <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                اجعل المستندات الحساسة مرئية للفرق المناسبة فقط مع الحفاظ على سجل المراجعة.
              </AppText>
            </View>
          </GlassCard>
        </View>
      </ScrollView>
    </Screen>
  );
}
