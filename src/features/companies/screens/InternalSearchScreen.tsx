import React, { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import GlassCard from "../../../shared/components/GlassCard";
import AppText from "../../../shared/ui/AppText";
import AppInput from "../../../shared/ui/AppInput";
import ListRow from "../../../shared/ui/ListRow";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";

const INTERNAL_INDEX = [
  { title: "Handover Templates", subtitle: "قوالب التسليم المعتمدة" },
  { title: "Approvals Policy", subtitle: "سياسات الموافقات الداخلية" },
  { title: "Project Delivery Guide", subtitle: "دليل تنفيذ المشاريع" },
  { title: "Meeting Notes Archive", subtitle: "أرشيف ملاحظات الاجتماعات" },
  { title: "Team Directory", subtitle: "دليل الأعضاء والفرق" },
];

export default function InternalSearchScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(() => ({
    content: { padding: 16, paddingBottom: 90, gap: 12 },
    card: { padding: 14 },
    kicker: { letterSpacing: 0.8, textTransform: "uppercase" as const },
  }));
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INTERNAL_INDEX;
    return INTERNAL_INDEX.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="البحث الداخلي" leftButton="back" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppInput value={query} onChangeText={setQuery} placeholder="ابحث في المعرفة والملفات والخدمات" iconLeft="search-outline" />
        <GlassCard style={styles.card}>
          <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
            نتائج البحث الداخلي
          </AppText>
          <View style={{ marginTop: 10, gap: 8 }}>
            {results.map((item) => (
              <ListRow key={item.title} title={item.title} subtitle={item.subtitle} iconLeft="document-text-outline" />
            ))}
          </View>
        </GlassCard>
      </ScrollView>
    </Screen>
  );
}
