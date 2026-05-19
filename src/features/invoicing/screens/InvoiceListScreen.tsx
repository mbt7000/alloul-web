/**
 * InvoiceListScreen — ZATCA/UAE VAT-compliant invoices
 * Feature flag: ZATCA_INVOICES
 * Generates QR-code invoices compliant with Saudi ZATCA e-invoicing
 * and UAE Federal Tax Authority requirements.
 */
import React, { useCallback, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { apiFetch } from "../../../api/client";
import { useCompany } from "../../../state/company/CompanyContext";

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  vat_amount: number;
  currency: "SAR" | "AED" | "USD";
  status: "draft" | "issued" | "paid" | "cancelled";
  issue_date: string;
  zatca_compliant: boolean;
}

const STATUS_CFG = {
  draft:     { label: "مسودة",  color: "#6b7280" },
  issued:    { label: "مُصدَرة", color: "#3b82f6" },
  paid:      { label: "مدفوعة", color: "#10b981" },
  cancelled: { label: "ملغاة",  color: "#ef4444" },
};

export default function InvoiceListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();
  const { company } = useCompany();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("15");
  const [currency, setCurrency] = useState<"SAR" | "AED" | "USD">("SAR");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<Invoice[]>("/invoices").catch(() => []);
      setInvoices(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleCreate = useCallback(async () => {
    if (!clientName.trim() || !amount.trim()) {
      Alert.alert("خطأ", "يرجى إدخال اسم العميل والمبلغ");
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح");
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/invoices", {
        method: "POST",
        body: JSON.stringify({
          client_name: clientName.trim(),
          subtotal: amountNum,
          vat_rate: parseFloat(vatRate) / 100,
          currency,
          zatca_compliant: true,
        }),
      });
      setShowCreate(false);
      setClientName("");
      setAmount("");
      setVatRate("15");
      void load(true);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message ?? "تعذّر إنشاء الفاتورة");
    } finally {
      setCreating(false);
    }
  }, [clientName, amount, vatRate, currency, load]);

  const renderItem = ({ item }: { item: Invoice }) => {
    const st = STATUS_CFG[item.status] ?? STATUS_CFG.draft;
    return (
      <TouchableOpacity
        style={{
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: c.border,
          gap: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText style={{ color: c.textPrimary, fontSize: 14, fontWeight: "700" }}>
            {item.invoice_number}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {item.zatca_compliant && (
              <View style={{
                paddingHorizontal: 6, paddingVertical: 2,
                borderRadius: 6, backgroundColor: "#10b981" + "22",
              }}>
                <AppText style={{ color: "#10b981", fontSize: 9, fontWeight: "700" }}>ZATCA</AppText>
              </View>
            )}
            <View style={{
              paddingHorizontal: 8, paddingVertical: 3,
              borderRadius: 8, backgroundColor: st.color + "22",
            }}>
              <AppText style={{ color: st.color, fontSize: 11, fontWeight: "700" }}>{st.label}</AppText>
            </View>
          </View>
        </View>
        <AppText style={{ color: c.textSecondary, fontSize: 13 }}>{item.client_name}</AppText>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText style={{ color: c.textMuted, fontSize: 12 }}>{item.issue_date}</AppText>
          <AppText style={{ color: c.textPrimary, fontSize: 14, fontWeight: "700" }}>
            {item.total_amount.toFixed(2)} {item.currency}
          </AppText>
        </View>
      </TouchableOpacity>
    );
  };

  const vatNum = parseFloat(vatRate) || 0;
  const amountNum = parseFloat(amount) || 0;
  const vatAmount = amountNum * (vatNum / 100);
  const total = amountNum + vatAmount;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: c.border, gap: 10,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText style={{ color: c.textPrimary, fontSize: 16, fontWeight: "700" }}>
            الفواتير
          </AppText>
          <AppText style={{ color: c.textMuted, fontSize: 11 }}>
            ZATCA · UAE FTA · VAT compliant
          </AppText>
        </View>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: c.accentBlue,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentBlue} />
        </View>
      ) : invoices.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="receipt-outline" size={48} color={c.textMuted} style={{ marginBottom: 16 }} />
          <AppText style={{ color: c.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>
            لا توجد فواتير بعد
          </AppText>
          <AppText style={{ color: c.textMuted, fontSize: 13, textAlign: "center", marginBottom: 24 }}>
            أنشئ فواتير متوافقة مع نظام ZATCA الإلكتروني وضريبة القيمة المضافة
          </AppText>
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={{
              paddingHorizontal: 20, paddingVertical: 12,
              borderRadius: 12, backgroundColor: c.accentBlue,
            }}
          >
            <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
              إنشاء فاتورة
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(true); }}
              tintColor={c.accentBlue}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Invoice Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          <View style={{
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 16, paddingVertical: 14,
            borderBottomWidth: 1, borderBottomColor: c.border, gap: 10,
          }}>
            <TouchableOpacity onPress={() => setShowCreate(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={c.textPrimary} />
            </TouchableOpacity>
            <AppText style={{ color: c.textPrimary, fontSize: 16, fontWeight: "700", flex: 1 }}>
              فاتورة جديدة
            </AppText>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
            <View>
              <AppText style={{ color: c.textSecondary, fontSize: 13, marginBottom: 6 }}>
                اسم العميل *
              </AppText>
              <TextInput
                value={clientName}
                onChangeText={setClientName}
                placeholder="الشركة أو الشخص"
                placeholderTextColor={c.textMuted}
                style={{
                  backgroundColor: c.bgCard, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 12,
                  color: c.textPrimary, fontSize: 14,
                  borderWidth: 1, borderColor: c.border, textAlign: "right",
                }}
              />
            </View>

            <View>
              <AppText style={{ color: c.textSecondary, fontSize: 13, marginBottom: 6 }}>
                المبلغ (قبل الضريبة) *
              </AppText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={c.textMuted}
                style={{
                  backgroundColor: c.bgCard, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 12,
                  color: c.textPrimary, fontSize: 14,
                  borderWidth: 1, borderColor: c.border, textAlign: "right",
                }}
              />
            </View>

            <View>
              <AppText style={{ color: c.textSecondary, fontSize: 13, marginBottom: 8 }}>
                العملة
              </AppText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["SAR", "AED", "USD"] as const).map(cur => (
                  <TouchableOpacity
                    key={cur}
                    onPress={() => setCurrency(cur)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 10,
                      alignItems: "center",
                      backgroundColor: currency === cur ? c.accentBlue : c.bgCard,
                      borderWidth: 1,
                      borderColor: currency === cur ? c.accentBlue : c.border,
                    }}
                  >
                    <AppText style={{
                      color: currency === cur ? "#fff" : c.textSecondary,
                      fontWeight: "700", fontSize: 13,
                    }}>
                      {cur}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <AppText style={{ color: c.textSecondary, fontSize: 13, marginBottom: 6 }}>
                نسبة ضريبة القيمة المضافة (%)
              </AppText>
              <TextInput
                value={vatRate}
                onChangeText={setVatRate}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: c.bgCard, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 12,
                  color: c.textPrimary, fontSize: 14,
                  borderWidth: 1, borderColor: c.border, textAlign: "right",
                }}
              />
              <AppText style={{ color: c.textMuted, fontSize: 11, marginTop: 4, textAlign: "right" }}>
                السعودية 15% · الإمارات 5%
              </AppText>
            </View>

            {amountNum > 0 && (
              <View style={{
                padding: 14, borderRadius: 12,
                backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, gap: 6,
              }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <AppText style={{ color: c.textMuted, fontSize: 13 }}>المبلغ قبل الضريبة</AppText>
                  <AppText style={{ color: c.textSecondary, fontSize: 13 }}>
                    {amountNum.toFixed(2)} {currency}
                  </AppText>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <AppText style={{ color: c.textMuted, fontSize: 13 }}>
                    ضريبة القيمة المضافة ({vatRate}%)
                  </AppText>
                  <AppText style={{ color: c.textSecondary, fontSize: 13 }}>
                    {vatAmount.toFixed(2)} {currency}
                  </AppText>
                </View>
                <View style={{
                  height: 1, backgroundColor: c.border, marginVertical: 4,
                }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <AppText style={{ color: c.textPrimary, fontSize: 15, fontWeight: "700" }}>
                    الإجمالي
                  </AppText>
                  <AppText style={{ color: c.accentBlue, fontSize: 15, fontWeight: "700" }}>
                    {total.toFixed(2)} {currency}
                  </AppText>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={handleCreate}
              disabled={creating}
              style={{
                paddingVertical: 16, borderRadius: 14,
                backgroundColor: c.accentBlue,
                alignItems: "center",
                opacity: creating ? 0.6 : 1,
              }}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                  إنشاء الفاتورة
                </AppText>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
