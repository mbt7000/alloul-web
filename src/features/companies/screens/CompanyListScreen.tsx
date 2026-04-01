import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View, I18nManager } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppInput from "../../../shared/ui/AppInput";
import AppText from "../../../shared/ui/AppText";
import ListRow from "../../../shared/ui/ListRow";
import { CompanyEmptyState, CompanyHeroCard, CompanySectionLabel } from "../components/CompanyBlocks";
import { useCompany } from "../../../state/company/CompanyContext";
import { getMarketplaceCompanies, type MarketplaceCompanyRow } from "../../../api";
import { colors } from "../../../theme/colors";

export default function CompanyListScreen() {
  const navigation = useNavigation<any>();
  const { company } = useCompany();
  const isRTL = I18nManager.isRTL;
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MarketplaceCompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getMarketplaceCompanies(query.trim() || undefined);
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const currentCompanyId = company?.id;
    return items.filter((item) => item.id !== String(currentCompanyId));
  }, [items, company?.id]);

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader title="الشركات" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        <CompanyHeroCard
          eyebrow="دليل الشركات"
          title={company?.name || "مساحة الشركات"}
          subtitle="تصفّح شركتك المرتبطة وانتقل إلى ملفها التشغيلي واستعرض بقية الجهات في السوق من دون مغادرة واجهة الشركات."
          chips={[
            { label: company ? "شركة مرتبطة" : "دليل فقط", icon: "business-outline", tone: company ? "teal" : "muted" },
            { label: `${filtered.length} ظاهر`, icon: "grid-outline", tone: "cyan" },
          ]}
        />

        <View style={{ marginTop: 14 }}>
          <AppInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => {
              setLoading(true);
              void load();
            }}
            placeholder="ابحث عن الشركات"
            iconLeft="search-outline"
          />
        </View>

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
        ) : null}

        <View style={{ marginTop: 18 }}>
          <CompanySectionLabel label="شركات السوق" meta={loading ? "جارٍ التحميل" : String(filtered.length)} />
          {loading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accentCyan} />
            </View>
          ) : filtered.length === 0 ? (
            <CompanyEmptyState
              icon="business-outline"
              title="لم يتم العثور على شركات"
              subtitle="جرّب عبارة بحث أخرى أو عُد لاحقاً بعد إضافة شركات جديدة إلى السوق."
            />
          ) : (
            <View style={styles.listWrap}>
              {filtered.map((item) => (
                <ListRow
                  key={String(item.id)}
                  title={item.name}
                  subtitle={[
                    item.industry,
                    item.location,
                    item.size,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "شركة في السوق"}
                  iconLeft={item.verified ? "checkmark-circle-outline" : "business-outline"}
                  onPress={() => navigation.navigate("Company")}
                  style={styles.row}
                  right={<AppText variant="micro" tone="muted" weight="bold">{item.verified ? "موثقة" : "عرض"}</AppText>}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  loadingWrap: {
    paddingVertical: 22,
    alignItems: "center",
  },
  listWrap: {
    gap: 10,
  },
  row: {
    minHeight: 76,
  },
});
