import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/ThemeContext";
import AppText from "../../../shared/ui/AppText";
import { apiFetch } from "../../../api";

interface PublicUser {
  id: number;
  name: string;
  email?: string;
  avatar_url?: string | null;
  bio?: string | null;
  job_title?: string | null;
  work_id?: string | null;
  company_name?: string | null;
  role?: string | null;
}

function avatarColor(id: number) {
  const palette = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#db2777"];
  return palette[id % palette.length];
}

export default function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();

  const { userId } = route.params ?? {};
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<PublicUser>(`/users/${userId}/profile`);
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const bg = avatarColor(userId ?? 0);
  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : "؟؟";

  return (
    <View style={{ flex: 1, backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <AppText variant="bodySm" weight="bold">الملف الشخصي</AppText>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentCyan} />
        </View>
      ) : !user ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Ionicons name="person-outline" size={48} color={c.textMuted} />
          <AppText tone="muted">لم يتم العثور على الملف الشخصي</AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
          {/* Avatar */}
          <View style={{ alignItems: "center", gap: 12 }}>
            {user.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={{ width: 90, height: 90, borderRadius: 28, borderWidth: 3, borderColor: bg + "66" }}
              />
            ) : (
              <View
                style={{
                  width: 90, height: 90, borderRadius: 28,
                  backgroundColor: bg + "33",
                  borderWidth: 3, borderColor: bg + "66",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <AppText style={{ color: bg, fontSize: 30, fontWeight: "800" }}>{initials}</AppText>
              </View>
            )}
            <AppText style={{ fontSize: 22, fontWeight: "800", color: c.textPrimary }}>{user.name}</AppText>
            {user.job_title ? (
              <AppText variant="bodySm" tone="muted">{user.job_title}</AppText>
            ) : null}
          </View>

          {/* Info card */}
          <View
            style={{
              backgroundColor: c.bgCard,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.border,
              padding: 20,
              gap: 16,
            }}
          >
            {user.company_name ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentCyan + "22", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="business-outline" size={18} color={c.accentCyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="micro" tone="muted">الشركة</AppText>
                  <AppText variant="bodySm" weight="bold">{user.company_name}</AppText>
                </View>
              </View>
            ) : null}

            {user.role ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#a78bfa22", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#a78bfa" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="micro" tone="muted">الدور</AppText>
                  <AppText variant="bodySm" weight="bold">{user.role}</AppText>
                </View>
              </View>
            ) : null}

            {user.work_id ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#f59e0b22", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="id-card-outline" size={18} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="micro" tone="muted">Work ID</AppText>
                  <AppText variant="bodySm" weight="bold">{user.work_id}</AppText>
                </View>
              </View>
            ) : null}

            {user.bio ? (
              <View style={{ gap: 4 }}>
                <AppText variant="micro" tone="muted">نبذة</AppText>
                <AppText variant="bodySm" style={{ lineHeight: 22 }}>{user.bio}</AppText>
              </View>
            ) : null}
          </View>

          {/* DM button */}
          <TouchableOpacity
            onPress={() => navigation.navigate("DirectMessage", { userId: user.id, userName: user.name })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              paddingVertical: 16,
              borderRadius: 16,
              backgroundColor: c.accentCyan + "22",
              borderWidth: 1.5,
              borderColor: c.accentCyan + "66",
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color={c.accentCyan} />
            <AppText style={{ color: c.accentCyan, fontWeight: "800", fontSize: 15 }}>
              إرسال رسالة
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
