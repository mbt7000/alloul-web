import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getEmailInviteInfo, acceptEmailInvite, type EmailInviteInfo } from "../../../api";
import { saveToken } from "../../../storage/token";
import { useAuth } from "../../../state/auth/AuthContext";

const C = {
  bg: "#0A0B0D",
  card: "#111318",
  border: "#1E2027",
  text: "#E8E9EB",
  sub: "#6B7280",
  gold: "#D4A853",
  error: "#EF4444",
  label: "#9CA3AF",
};

interface Props {
  route: { params: { token: string } };
  navigation: any;
}

export default function AcceptInviteScreen({ route, navigation }: Props) {
  const { token } = route.params;
  const insets = useSafeAreaInsets();
  const { refresh } = useAuth();

  const [invite, setInvite] = useState<EmailInviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEmailInviteInfo(token)
      .then((info) => {
        setInvite(info);
        // Pre-fill username from email
        const emailUser = info.email.split("@")[0].replace(/[^a-z0-9_]/gi, "_");
        setUsername(emailUser);
      })
      .catch(() => setLoadError("الدعوة غير موجودة أو انتهت صلاحيتها."));
  }, [token]);

  const handleAccept = async () => {
    if (!name.trim() || !username.trim() || password.length < 8) {
      setError("يرجى ملء جميع الحقول. كلمة المرور 8 أحرف على الأقل.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await acceptEmailInvite(token, { name: name.trim(), username: username.trim(), password });
      await saveToken(res.access_token);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "حدث خطأ، حاول مجدداً.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: C.gold, fontWeight: "600" }}>العودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!invite) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <ActivityIndicator color={C.gold} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Company Card */}
        <View style={styles.companyCard}>
          {invite.company_logo ? (
            <Image source={{ uri: invite.company_logo }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoInitial}>{invite.company_name[0]}</Text>
            </View>
          )}
          <Text style={styles.companyName}>{invite.company_name}</Text>
          <Text style={styles.invitedBy}>
            دعاك <Text style={{ color: C.text }}>{invite.inviter_name || "مسؤول الشركة"}</Text> للانضمام كـ{" "}
            <Text style={{ color: C.gold }}>{invite.role}</Text>
          </Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>أنشئ حسابك</Text>
          <Text style={styles.emailHint}>سيتم ربط الحساب بـ {invite.email}</Text>

          <Text style={styles.label}>الاسم الكامل</Text>
          <TextInput
            style={styles.input}
            placeholder="محمد العنزي"
            placeholderTextColor={C.sub}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>اسم المستخدم</Text>
          <TextInput
            style={styles.input}
            placeholder="username"
            placeholderTextColor={C.sub}
            value={username}
            onChangeText={(v) => setUsername(v.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
            autoCapitalize="none"
          />

          <Text style={styles.label}>كلمة المرور</Text>
          <TextInput
            style={styles.input}
            placeholder="8 أحرف على الأقل"
            placeholderTextColor={C.sub}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.btn} onPress={handleAccept} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.btnText}>قبول الدعوة والانضمام</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, alignItems: "stretch" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  companyCard: {
    alignItems: "center",
    marginBottom: 24,
    padding: 24,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  logo: { width: 72, height: 72, borderRadius: 16, marginBottom: 12 },
  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "#1a2035",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoInitial: { color: C.gold, fontSize: 28, fontWeight: "700" },
  companyName: { color: C.text, fontSize: 20, fontWeight: "700", marginBottom: 6 },
  invitedBy: { color: C.sub, fontSize: 14, textAlign: "center" },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
  },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  emailHint: { color: C.sub, fontSize: 12, marginBottom: 20 },
  label: { color: C.label, fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input: {
    height: 48,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: C.text,
    fontSize: 14,
    marginBottom: 16,
  },
  btn: {
    height: 50,
    backgroundColor: C.gold,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnText: { color: "#000", fontSize: 15, fontWeight: "700" },
  errorText: { color: C.error, fontSize: 13, marginBottom: 12, textAlign: "center" },
  backBtn: { marginTop: 16, padding: 12 },
});
