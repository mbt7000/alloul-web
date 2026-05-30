import React, { useState } from "react";
import { View, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import CompanyWorkModeTopBar from "../components/CompanyWorkModeTopBar";

const STEPS = [
  { key: "submitted", label: "تم الإرسال",     icon: "paper-plane-outline",      color: "#10b981" },
  { key: "review",    label: "قيد المراجعة",   icon: "eye-outline",              color: "#3b82f6" },
  { key: "decision",  label: "اتخاذ القرار",   icon: "checkmark-circle-outline", color: "#f59e0b" },
];

const MOCK_DETAILS = [
  { label: "القسم",     value: "قسم التقنية" },
  { label: "مقدم الطلب", value: "أحمد المحمود" },
  { label: "التاريخ",   value: "16 أبريل 2026" },
  { label: "الأولوية",  value: "عالية" },
];

export default function ApprovalDetailScreen() {
  const { colors: c } = useAppTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const title = typeof route.params?.title === "string" ? route.params.title : "تفاصيل الموافقة";
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");

  const statusMeta = {
    pending:  { label: "قيد الانتظار", color: "#f59e0b", icon: "time-outline" },
    approved: { label: "تمت الموافقة", color: "#10b981", icon: "checkmark-circle" },
    rejected: { label: "مرفوض",        color: "#ef4444", icon: "close-circle" },
  }[status];

  const handleApprove = () => {
    Alert.alert("تأكيد الاعتماد", "هل تريد اعتماد هذا الطلب؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "اعتماد", onPress: () => setStatus("approved") },
    ]);
  };

  const handleReject = () => {
    Alert.alert("تأكيد الرفض", "هل تريد رفض هذا الطلب؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "رفض", style: "destructive", onPress: () => setStatus("rejected") },
    ]);
  };

  return (
    <Screen style={{ backgroundColor: "#0b0b0b" }} edges={["top"]}>
      <CompanyWorkModeTopBar />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <AppText style={{ color: "#fff", fontSize: 18, fontWeight: "800", flex: 1, marginRight: 12 }} numberOfLines={2}>
            {title}
          </AppText>
          {/* Status badge */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: statusMeta.color + "20", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: statusMeta.color + "44" }}>
            <Ionicons name={statusMeta.icon as any} size={13} color={statusMeta.color} />
            <AppText style={{ color: statusMeta.color, fontSize: 11, fontWeight: "700" }}>{statusMeta.label}</AppText>
          </View>
        </View>

        {/* Timeline */}
        <View style={{ backgroundColor: "#151515", borderRadius: 18, borderWidth: 1, borderColor: "#222", padding: 18, marginBottom: 16 }}>
          <AppText style={{ color: "#fff", fontSize: 13, fontWeight: "700", marginBottom: 14 }}>مراحل الطلب</AppText>
          {STEPS.map((step, i) => {
            const done = status !== "pending" || i === 0;
            return (
              <View key={step.key} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: i < STEPS.length - 1 ? 0 : 0 }}>
                <View style={{ alignItems: "center", marginLeft: 12 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: done ? step.color + "22" : "#1a1a1a",
                    borderWidth: 1.5, borderColor: done ? step.color : "#333",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name={step.icon as any} size={15} color={done ? step.color : "#444"} />
                  </View>
                  {i < STEPS.length - 1 && (
                    <View style={{ width: 1.5, height: 24, backgroundColor: done ? step.color + "55" : "#222", marginVertical: 3 }} />
                  )}
                </View>
                <View style={{ flex: 1, paddingTop: 6, paddingBottom: i < STEPS.length - 1 ? 24 : 0 }}>
                  <AppText style={{ color: done ? "#fff" : "#555", fontSize: 13, fontWeight: "600" }}>{step.label}</AppText>
                </View>
              </View>
            );
          })}
        </View>

        {/* Details card */}
        <View style={{ backgroundColor: "#151515", borderRadius: 18, borderWidth: 1, borderColor: "#222", padding: 18, marginBottom: 16 }}>
          <AppText style={{ color: "#fff", fontSize: 13, fontWeight: "700", marginBottom: 14 }}>تفاصيل الطلب</AppText>
          {MOCK_DETAILS.map((d, i) => (
            <View key={d.label} style={{
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              paddingVertical: 10,
              borderBottomWidth: i < MOCK_DETAILS.length - 1 ? 1 : 0,
              borderBottomColor: "#1e1e1e",
            }}>
              <AppText style={{ color: "#666", fontSize: 12 }}>{d.label}</AppText>
              <AppText style={{ color: "#ccc", fontSize: 13, fontWeight: "600" }}>{d.value}</AppText>
            </View>
          ))}
        </View>

        {/* Notes placeholder */}
        <View style={{ backgroundColor: "#151515", borderRadius: 18, borderWidth: 1, borderColor: "#222", padding: 18, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Ionicons name="chatbox-outline" size={16} color="#888" />
            <AppText style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>ملاحظات</AppText>
          </View>
          <AppText style={{ color: "#555", fontSize: 12, lineHeight: 20 }}>
            لا توجد ملاحظات بعد. ستظهر تعليقات المراجعين هنا عند ربط الطلب بالخادم.
          </AppText>
        </View>

        {/* Action buttons — only show if pending */}
        {status === "pending" && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              style={{ flex: 1, backgroundColor: "#ef4444" + "20", borderWidth: 1.5, borderColor: "#ef4444" + "55", paddingVertical: 14, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              onPress={handleReject}
            >
              <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
              <AppText style={{ color: "#ef4444", fontSize: 14, fontWeight: "700" }}>رفض</AppText>
            </Pressable>
            <Pressable
              style={{ flex: 1, backgroundColor: "#10b981", paddingVertical: 14, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
              onPress={handleApprove}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>اعتماد</AppText>
            </Pressable>
          </View>
        )}

        {status !== "pending" && (
          <View style={{ backgroundColor: statusMeta.color + "15", borderWidth: 1, borderColor: statusMeta.color + "44", borderRadius: 14, padding: 16, alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "center" }}>
            <Ionicons name={statusMeta.icon as any} size={20} color={statusMeta.color} />
            <AppText style={{ color: statusMeta.color, fontSize: 14, fontWeight: "700" }}>{statusMeta.label}</AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
