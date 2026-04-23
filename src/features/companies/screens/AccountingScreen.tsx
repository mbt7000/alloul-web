import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import { useAppTheme } from "../../../theme/ThemeContext";
import { apiFetch } from "../../../api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardData = {
  period: { year: number; month: number };
  summary: {
    total_income: number;
    total_expense: number;
    net_profit: number;
    pending_review: number;
  };
  breakdown: { type: string; category: string; total: number; count: number }[];
  trend: { year: number; month: number; income: number; expense: number }[];
  setup: {
    has_google_sheet: boolean;
    has_whatsapp: boolean;
    google_sheet_url: string | null;
    currency: string;
  };
};

type RecordForm = {
  record_type: "income" | "expense";
  amount: string;
  category: string;
  external_ref: string;
};

type SetupForm = {
  google_sheet_url: string;
  whatsapp_number: string;
  currency: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ARABIC_MONTHS = [
  "", "يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const INCOME_CATS = ["مبيعات", "خدمات", "استثمارات", "أخرى"];
const EXPENSE_CATS = ["رواتب", "إيجار", "مشتريات", "مصاريف تشغيل", "تسويق", "أخرى"];
const CURRENCIES = ["SAR", "AED", "KWD", "USD"];

// ─── API ──────────────────────────────────────────────────────────────────────

const fetchDashboard = () => apiFetch<DashboardData>("/accounting/dashboard");

const postRecord = (form: RecordForm) =>
  apiFetch("/accounting/records", {
    method: "POST",
    body: JSON.stringify({
      record_type: form.record_type,
      amount: parseFloat(form.amount),
      category: form.category,
      external_ref: form.external_ref || undefined,
      source: "manual",
      recorded_at: new Date().toISOString(),
    }),
  });

const postSetup = (form: SetupForm) => {
  const m = form.google_sheet_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return apiFetch("/accounting/setup", {
    method: "POST",
    body: JSON.stringify({
      google_sheet_id: m ? m[1] : null,
      google_sheet_url: form.google_sheet_url || null,
      whatsapp_number: form.whatsapp_number || null,
      currency: form.currency,
    }),
  });
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmtAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${currency}`;
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AccountingScreen({ navigation }: { navigation: any }) {
  const { colors } = useAppTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const [currencyIdx, setCurrencyIdx] = useState(0);

  const [form, setForm] = useState<RecordForm>({
    record_type: "expense",
    amount: "",
    category: "",
    external_ref: "",
  });
  const [setupForm, setSetupForm] = useState<SetupForm>({
    google_sheet_url: "",
    whatsapp_number: "",
    currency: "SAR",
  });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const d = await fetchDashboard();
      setData(d);
      setSetupForm((f) => ({
        ...f,
        google_sheet_url: d.setup.google_sheet_url || "",
        currency: d.setup.currency,
      }));
      const idx = CURRENCIES.indexOf(d.setup.currency);
      setCurrencyIdx(idx >= 0 ? idx : 0);
    } catch {
      /* show empty */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveRecord = async () => {
    if (!form.amount || !form.category) {
      Alert.alert("تنبيه", "أدخل المبلغ والفئة");
      return;
    }
    setSaving(true);
    try {
      await postRecord(form);
      setAddOpen(false);
      setForm({ record_type: "expense", amount: "", category: "", external_ref: "" });
      load();
    } catch {
      Alert.alert("خطأ", "تعذّر الحفظ. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  const saveSetup = async () => {
    setSavingSetup(true);
    try {
      await postSetup({ ...setupForm, currency: CURRENCIES[currencyIdx] });
      setSetupOpen(false);
      load();
    } catch {
      Alert.alert("خطأ", "تعذّر حفظ الإعداد.");
    } finally {
      setSavingSetup(false);
    }
  };

  const currency = data?.setup.currency || "SAR";
  const maxTrend = data
    ? Math.max(...data.trend.map((t) => Math.max(t.income, t.expense)), 1)
    : 1;

  const S = makeStyles(colors);

  return (
    <Screen>
      <AppHeader
        title="شكرة — المحاسب الذكي"
        rightActions={
          <Pressable onPress={() => setSetupOpen(true)} style={{ padding: 8 }}>
            <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        }
      />

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={S.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          {/* Back button row */}
          <Pressable onPress={() => navigation.goBack()} style={S.backRow}>
            <Ionicons name="arrow-back-outline" size={20} color={colors.textSecondary} />
            <AppText style={[S.backText, { color: colors.textSecondary }]}>عالم الأعمال</AppText>
          </Pressable>

          {/* Privacy sub-label */}
          <AppText style={[S.subtitle, { color: colors.textMuted }]}>
            بياناتك الحساسة تبقى في Google Sheets الخاصة بك
          </AppText>

          {/* Setup Banner */}
          {data && (!data.setup.has_google_sheet || !data.setup.has_whatsapp) && (
            <Pressable onPress={() => setSetupOpen(true)} style={S.banner}>
              <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
              <View style={{ flex: 1, marginRight: 8 }}>
                <AppText style={S.bannerTitle}>أكمل الإعداد</AppText>
                <AppText style={S.bannerSub}>
                  {!data.setup.has_google_sheet ? "أضف Google Sheet · " : ""}
                  {!data.setup.has_whatsapp ? "أضف رقم WhatsApp" : ""}
                </AppText>
              </View>
              <Ionicons name="chevron-back-outline" size={16} color="#F59E0B" />
            </Pressable>
          )}

          {/* Period + Sheet Link */}
          <View style={S.periodRow}>
            <AppText style={[S.periodLabel, { color: colors.textMuted }]}>
              {data ? `${ARABIC_MONTHS[data.period.month]} ${data.period.year}` : ""}
            </AppText>
            {data?.setup.google_sheet_url ? (
              <Pressable
                onPress={() => Linking.openURL(data.setup.google_sheet_url!)}
                style={S.sheetLink}
              >
                <Ionicons name="open-outline" size={14} color="#10B981" />
                <AppText style={S.sheetLinkText}>Google Sheet</AppText>
              </Pressable>
            ) : null}
          </View>

          {/* Summary Cards 2×2 */}
          <View style={S.grid2}>
            {[
              { label: "الإيرادات",      value: fmtAmount(data?.summary.total_income ?? 0, currency),  icon: "trending-up-outline",    color: "#10B981" },
              { label: "المصروفات",     value: fmtAmount(data?.summary.total_expense ?? 0, currency), icon: "trending-down-outline",  color: "#EF4444" },
              { label: "صافي الربح",    value: fmtAmount(data?.summary.net_profit ?? 0, currency),    icon: "cash-outline",           color: (data?.summary.net_profit ?? 0) >= 0 ? "#10B981" : "#EF4444" },
              { label: "بانتظار مراجعة", value: String(data?.summary.pending_review ?? 0),            icon: "time-outline",           color: "#F59E0B" },
            ].map((item) => (
              <View key={item.label} style={[S.summaryCard, { backgroundColor: colors.card }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} style={{ marginBottom: 6 }} />
                <AppText style={[S.summaryLabel, { color: colors.textMuted }]}>{item.label}</AppText>
                <AppText style={[S.summaryValue, { color: item.color }]}>{item.value}</AppText>
              </View>
            ))}
          </View>

          {/* 6-Month Trend */}
          {data && data.trend.length > 0 && (
            <View style={[S.card, { backgroundColor: colors.card }]}>
              <View style={S.cardHeader}>
                <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
                <AppText style={[S.cardTitle, { color: colors.textPrimary }]}>الاتجاه — آخر 6 أشهر</AppText>
              </View>
              <View style={S.trendBars}>
                {data.trend.map((t, i) => (
                  <View key={i} style={S.trendCol}>
                    <View style={S.barGroup}>
                      <View style={[S.bar, { height: Math.max(4, (t.income / maxTrend) * 80), backgroundColor: "#10B98180" }]} />
                      <View style={[S.bar, { height: Math.max(4, (t.expense / maxTrend) * 80), backgroundColor: "#EF444480" }]} />
                    </View>
                    <AppText style={[S.trendLabel, { color: colors.textMuted }]}>
                      {ARABIC_MONTHS[t.month]?.slice(0, 3)}
                    </AppText>
                  </View>
                ))}
              </View>
              <View style={S.legend}>
                {[{ color: "#10B98180", label: "إيرادات" }, { color: "#EF444480", label: "مصروفات" }].map((l) => (
                  <View key={l.label} style={S.legendItem}>
                    <View style={[S.legendDot, { backgroundColor: l.color }]} />
                    <AppText style={[S.legendText, { color: colors.textMuted }]}>{l.label}</AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Category Breakdown */}
          {data && data.breakdown.length > 0 && (
            <View style={[S.card, { backgroundColor: colors.card }]}>
              <AppText style={[S.cardTitle, { color: colors.textPrimary, marginBottom: 10 }]}>التفاصيل حسب الفئة</AppText>
              {data.breakdown.map((b, i) => (
                <View key={i} style={[S.breakdownRow, { borderBottomColor: colors.border }]}>
                  <View style={[S.dot, { backgroundColor: b.type === "income" ? "#10B981" : "#EF4444" }]} />
                  <AppText style={[S.breakdownCat, { color: colors.textPrimary }]}>{b.category}</AppText>
                  <AppText style={[S.breakdownCount, { color: colors.textMuted }]}>({b.count})</AppText>
                  <View style={{ flex: 1 }} />
                  <AppText style={[S.breakdownAmt, { color: b.type === "income" ? "#10B981" : "#EF4444" }]}>
                    {fmtAmount(b.total, currency)}
                  </AppText>
                </View>
              ))}
            </View>
          )}

          {/* Privacy Notice */}
          <View style={S.privacy}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
            <AppText style={[S.privacyText, { color: colors.textMuted }]}>
              تفاصيل الفواتير الحساسة مخزّنة فقط في Google Sheets شركتك — خارج خوادم ALLOUL.
            </AppText>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable onPress={() => setAddOpen(true)} style={S.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* ── Add Record Modal ── */}
      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <View style={S.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddOpen(false)} />
          <View style={[S.sheet, { backgroundColor: colors.bgCard }]}>
            <AppText style={[S.sheetTitle, { color: colors.textPrimary }]}>إضافة سجل يدوي</AppText>

            <View style={S.typeRow}>
              {(["expense", "income"] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setForm((f) => ({ ...f, record_type: t, category: "" }))}
                  style={[
                    S.typeBtn,
                    { borderColor: colors.border },
                    form.record_type === t && { backgroundColor: t === "income" ? "#10B981" : "#EF4444", borderColor: "transparent" },
                  ]}
                >
                  <AppText style={[S.typeBtnText, { color: form.record_type === t ? "#fff" : colors.textPrimary }]}>
                    {t === "income" ? "إيراد" : "مصروف"}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={[S.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="المبلغ"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {(form.record_type === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setForm((f) => ({ ...f, category: c }))}
                  style={[S.chip, { borderColor: colors.border }, form.category === c && { backgroundColor: colors.primary, borderColor: "transparent" }]}
                >
                  <AppText style={[S.chipText, { color: form.category === c ? "#fff" : colors.textPrimary }]}>{c}</AppText>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={[S.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="رقم الفاتورة أو المرجع (اختياري)"
              placeholderTextColor={colors.textMuted}
              value={form.external_ref}
              onChangeText={(v) => setForm((f) => ({ ...f, external_ref: v }))}
            />

            <AppButton label="حفظ السجل" onPress={saveRecord} loading={saving} disabled={!form.amount || !form.category} />
            <Pressable onPress={() => setAddOpen(false)} style={S.cancelRow}>
              <AppText style={{ color: colors.textMuted }}>إلغاء</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Setup Modal ── */}
      <Modal visible={setupOpen} animationType="slide" transparent onRequestClose={() => setSetupOpen(false)}>
        <View style={S.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSetupOpen(false)} />
          <View style={[S.sheet, { backgroundColor: colors.bgCard }]}>
            <AppText style={[S.sheetTitle, { color: colors.textPrimary }]}>إعداد شكرة</AppText>

            <AppText style={[S.inputLabel, { color: colors.textMuted }]}>رابط Google Sheet</AppText>
            <TextInput
              style={[S.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={setupForm.google_sheet_url}
              onChangeText={(v) => setSetupForm((f) => ({ ...f, google_sheet_url: v }))}
            />
            <AppText style={[S.hint, { color: colors.textMuted }]}>التفاصيل الحساسة تُخزَّن هنا فقط — خارج ALLOUL</AppText>

            <AppText style={[S.inputLabel, { color: colors.textMuted }]}>رقم WhatsApp للبوت</AppText>
            <TextInput
              style={[S.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="+966500000000"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={setupForm.whatsapp_number}
              onChangeText={(v) => setSetupForm((f) => ({ ...f, whatsapp_number: v }))}
            />

            <AppText style={[S.inputLabel, { color: colors.textMuted }]}>العملة</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CURRENCIES.map((c, i) => (
                <Pressable
                  key={c}
                  onPress={() => setCurrencyIdx(i)}
                  style={[S.chip, { borderColor: colors.border }, currencyIdx === i && { backgroundColor: colors.primary, borderColor: "transparent" }]}
                >
                  <AppText style={[S.chipText, { color: currencyIdx === i ? "#fff" : colors.textPrimary }]}>{c}</AppText>
                </Pressable>
              ))}
            </ScrollView>

            <AppButton label="حفظ الإعداد" onPress={saveSetup} loading={savingSetup} />
            <Pressable onPress={() => setSetupOpen(false)} style={S.cancelRow}>
              <AppText style={{ color: colors.textMuted }}>إلغاء</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: any) =>
  StyleSheet.create({
    scroll:        { padding: 16 },
    center:        { flex: 1, alignItems: "center", justifyContent: "center" },
    backRow:       { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 4 },
    backText:      { fontSize: 13 },
    subtitle:      { fontSize: 12, textAlign: "right", marginBottom: 14 },

    banner:        { flexDirection: "row-reverse", alignItems: "center", backgroundColor: "#F59E0B20", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#F59E0B40" },
    bannerTitle:   { fontSize: 13, fontWeight: "600", color: "#F59E0B", textAlign: "right" },
    bannerSub:     { fontSize: 11, color: "#F59E0B", opacity: 0.8, textAlign: "right", marginTop: 2 },

    periodRow:     { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    periodLabel:   { fontSize: 13 },
    sheetLink:     { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
    sheetLinkText: { fontSize: 12, color: "#10B981" },

    grid2:         { flexDirection: "row-reverse", flexWrap: "wrap", margin: -4, marginBottom: 8 },
    summaryCard:   { width: "47%", margin: "1.5%", borderRadius: 14, padding: 14, minHeight: 90 },
    summaryLabel:  { fontSize: 11, marginBottom: 4, textAlign: "right" },
    summaryValue:  { fontSize: 17, fontWeight: "700", textAlign: "right" },

    card:          { borderRadius: 14, padding: 16, marginBottom: 12 },
    cardHeader:    { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 12 },
    cardTitle:     { fontSize: 13, fontWeight: "600", textAlign: "right" },

    trendBars:     { flexDirection: "row-reverse", alignItems: "flex-end", height: 90, gap: 4 },
    trendCol:      { flex: 1, alignItems: "center" },
    barGroup:      { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 80 },
    bar:           { width: 8, borderRadius: 4 },
    trendLabel:    { fontSize: 9, marginTop: 4 },
    legend:        { flexDirection: "row-reverse", gap: 16, marginTop: 10 },
    legendItem:    { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
    legendDot:     { width: 8, height: 8, borderRadius: 4 },
    legendText:    { fontSize: 11 },

    breakdownRow:  { flexDirection: "row-reverse", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
    dot:           { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
    breakdownCat:  { fontSize: 13, textAlign: "right" },
    breakdownCount:{ fontSize: 11, marginRight: 4 },
    breakdownAmt:  { fontSize: 13, fontWeight: "600" },

    privacy:       { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, backgroundColor: "#10B98115", borderRadius: 12, padding: 12, marginBottom: 12 },
    privacyText:   { fontSize: 11, flex: 1, lineHeight: 18, textAlign: "right" },

    fab:           { position: "absolute", bottom: 28, left: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#10B981", shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },

    overlay:       { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000060" },
    sheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    sheetTitle:    { fontSize: 16, fontWeight: "700", textAlign: "right", marginBottom: 16 },

    typeRow:       { flexDirection: "row-reverse", gap: 8, marginBottom: 14 },
    typeBtn:       { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
    typeBtnText:   { fontSize: 14, fontWeight: "600" },

    input:         { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, textAlign: "right", marginBottom: 12 },
    inputLabel:    { fontSize: 12, textAlign: "right", marginBottom: 4 },
    hint:          { fontSize: 10, textAlign: "right", marginBottom: 12, marginTop: -8, opacity: 0.6 },

    chip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginLeft: 8 },
    chipText:      { fontSize: 13 },
    cancelRow:     { alignItems: "center", marginTop: 12, padding: 8 },
  });
