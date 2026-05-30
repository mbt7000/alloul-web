import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../state/auth/AuthContext";
import { apiFetch } from "../../../api/client";

const C = {
  bg: "#0A0B0D",
  card: "#111318",
  border: "#1E2027",
  text: "#E8E9EB",
  sub: "#6B7280",
  gold: "#D4A853",
  error: "#EF4444",
  cyan: "#22D3EE",
};

interface Props {
  navigation?: any;
}

export default function LobbyScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoinByCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    try {
      await apiFetch("/companies/join", { method: "POST", body: JSON.stringify({ invite_code: code }) });
      Alert.alert("تم!", "انضممت للشركة بنجاح. أعد تشغيل التطبيق.");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "الكود غير صحيح أو منتهي الصلاحية.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color={C.gold} />
          </View>
          <Text style={styles.greeting}>مرحباً، {user?.name || user?.username || "بك"}</Text>
          <Text style={styles.subGreeting}>حسابك جاهز — انضم لمؤسستك أو تصفح الفرص</Text>
        </View>

        {/* Join by invite code */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="link-outline" size={20} color={C.gold} />
            <Text style={styles.cardTitle}>انضم بكود دعوة</Text>
          </View>
          <Text style={styles.cardSub}>أدخل كود الدعوة الذي أرسله لك مسؤول الشركة</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]}
              placeholder="XXXX-XXXX"
              placeholderTextColor={C.sub}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              maxLength={12}
            />
            <TouchableOpacity
              style={[styles.smallBtn, { opacity: joining ? 0.6 : 1 }]}
              onPress={handleJoinByCode}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.smallBtnText}>انضم</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="mail-outline" size={20} color={C.cyan} style={{ marginBottom: 8 }} />
          <Text style={styles.infoTitle}>بانتظار دعوة؟</Text>
          <Text style={styles.infoText}>
            إذا دعاك مسؤول شركة عبر إيميلك، ستصلك رسالة تحتوي رابطاً مباشراً للانضمام.
            {"\n"}تحقق من بريدك الإلكتروني: <Text style={{ color: C.text }}>{user?.email || ""}</Text>
          </Text>
        </View>

        {/* Create company */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="business-outline" size={20} color={C.gold} />
            <Text style={styles.cardTitle}>أنشئ مؤسستك</Text>
          </View>
          <Text style={styles.cardSub}>
            هل أنت صاحب عمل؟ أنشئ مؤسستك وادعُ فريقك.
          </Text>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => navigation?.navigate?.("CreateCompany")}
          >
            <Text style={styles.outlineBtnText}>إنشاء مؤسسة جديدة</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()}>
          <Ionicons name="log-out-outline" size={16} color={C.sub} />
          <Text style={styles.signOutText}>تسجيل خروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: "center", paddingVertical: 32 },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1a1f2e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  greeting: { color: C.text, fontSize: 20, fontWeight: "700", marginBottom: 6 },
  subGreeting: { color: C.sub, fontSize: 14, textAlign: "center" },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  cardSub: { color: C.sub, fontSize: 13, marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center" },
  input: {
    height: 46,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: C.text,
    fontSize: 15,
    letterSpacing: 2,
    marginBottom: 0,
  },
  smallBtn: {
    height: 46,
    paddingHorizontal: 18,
    backgroundColor: C.gold,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },
  outlineBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { color: C.gold, fontWeight: "600", fontSize: 14 },
  infoCard: {
    backgroundColor: "#0d1520",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#163147",
    padding: 18,
    marginBottom: 14,
  },
  infoTitle: { color: C.cyan, fontSize: 14, fontWeight: "700", marginBottom: 6 },
  infoText: { color: C.sub, fontSize: 13, lineHeight: 20 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    padding: 12,
  },
  signOutText: { color: C.sub, fontSize: 13 },
});
