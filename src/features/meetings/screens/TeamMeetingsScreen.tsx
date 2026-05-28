import React, { useEffect, useState, useCallback } from "react";
import {
  View, FlatList, TouchableOpacity, ActivityIndicator,
  StatusBar, RefreshControl, Modal, ScrollView, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { apiFetch } from "../../../api/client";
import { getCompanyMembers } from "../../../api/companies.api";
import { useAuth } from "../../../state/auth/AuthContext";
import { UserCard, type PresenceStatus } from "../../../shared/components/UserCard";

interface Member {
  id: number;
  user_id: number;
  user_name: string;
  job_title?: string;
  role?: string;
  avatar_url?: string | null;
  presence_status?: PresenceStatus | null;
}

function MemberAvatar({ name, size = 38 }: { name: string; size?: number }) {
  const hue = name ? (name.charCodeAt(0) * 47) % 360 : 200;
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.28,
      backgroundColor: `hsl(${hue},45%,20%)`,
      borderWidth: 1.5, borderColor: `hsl(${hue},50%,35%)`,
      alignItems: "center", justifyContent: "center",
    }}>
      <AppText style={{ color: `hsl(${hue},70%,72%)`, fontSize: size * 0.33, fontWeight: "800" }}>
        {(name || "؟").slice(0, 2).toUpperCase()}
      </AppText>
    </View>
  );
}

export default function TeamMeetingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();
  const { user } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [callingId, setCallingId] = useState<number | null>(null);
  const [callType, setCallType] = useState<"audio" | "video" | null>(null);

  const [showGroup, setShowGroup] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCompanyMembers();
      setMembers(Array.isArray(data) ? (data as any[]) : []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCall = async (member: Member, type: "audio" | "video") => {
    setCallingId(member.user_id);
    setCallType(type);
    try {
      const data = await apiFetch<{ call_id: number; room_name: string; token: string; ws_url: string }>(
        "/call/initiate",
        { method: "POST", body: JSON.stringify({ receiver_id: member.user_id, call_type: type }) }
      );
      navigation.navigate("LiveRoom", {
        room_name: data.room_name,
        token: data.token,
        ws_url: data.ws_url,
        call_id: data.call_id,
        title: `${type === "video" ? "مكالمة فيديو" : "مكالمة صوتية"} مع ${member.user_name}`,
      });
    } catch (e: any) {
      const msg: string = e?.message || "";
      Alert.alert("خطأ", msg.includes("مشغول") ? "المستخدم مشغول حالياً" : "تعذّر بدء المكالمة");
    } finally {
      setCallingId(null);
      setCallType(null);
    }
  };

  const openDM = async (member: Member) => {
    try {
      await apiFetch("/chat/dm", { method: "POST", body: JSON.stringify({ target_user_id: member.user_id }) });
      navigation.navigate("CompanyChat");
    } catch {
      navigation.navigate("CompanyChat");
    }
  };

  const startGroupCall = async () => {
    if (selected.length === 0) return;
    setGroupLoading(true);
    try {
      const names = members.filter(m => selected.includes(m.user_id)).map(m => m.user_name).join("، ");
      const title = `اجتماع مجموعة: ${names}`;
      const data = await apiFetch<{ room_name: string; token: string; ws_url: string; title: string }>(
        "/livekit/rooms", { method: "POST", body: JSON.stringify({ title }) }
      );
      setShowGroup(false);
      setSelected([]);
      navigation.navigate("LiveRoom", {
        room_name: data.room_name,
        token: data.token,
        ws_url: data.ws_url,
        title: data.title,
      });
    } catch {} finally {
      setGroupLoading(false);
    }
  };

  const bg = "#090d1a";

  const renderMember = ({ item: m }: { item: Member }) => {
    const isCalling = callingId === m.user_id;
    const isSelf = m.user_id === user?.id;

    return (
      <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
        <UserCard
          name={m.user_name}
          jobTitle={m.job_title}
          role={m.role}
          avatarUrl={m.avatar_url}
          presence={m.presence_status ?? "offline"}
          actions={isSelf ? [] : [
            {
              icon: "chatbubble",
              color: "#2E8BFF",
              label: "شات",
              onPress: () => openDM(m),
            },
            {
              icon: "call",
              color: "#14E0A4",
              label: "صوتي",
              onPress: () => startCall(m, "audio"),
              loading: isCalling && callType === "audio",
            },
            {
              icon: "videocam",
              color: "#8B5CF6",
              label: "فيديو",
              onPress: () => startCall(m, "video"),
              loading: isCalling && callType === "video",
            },
          ]}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle="light-content" backgroundColor={bg} />

      {/* Header */}
      <View style={{
        paddingTop: insets.top + 6, paddingBottom: 14, paddingHorizontal: 16,
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: "rgba(12,17,32,0.98)",
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={19} color="#fff" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <AppText style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>الاجتماعات</AppText>
          <AppText style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 1 }}>
            {members.length} عضو
          </AppText>
        </View>

        {/* Calls History button */}
        <TouchableOpacity onPress={() => navigation.navigate("CallsPanel")} hitSlop={8}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: "rgba(255,75,87,0.12)",
            borderWidth: 1, borderColor: "rgba(255,75,87,0.25)",
            alignItems: "center", justifyContent: "center",
          }}>
          <Ionicons name="call" size={16} color="#FF4757" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowGroup(true)}
          style={{
            flexDirection: "row", alignItems: "center", gap: 7,
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
            backgroundColor: "rgba(139,92,246,0.15)",
            borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
          }}>
          <Ionicons name="people" size={15} color="#8B5CF6" />
          <AppText style={{ color: "#8B5CF6", fontSize: 13, fontWeight: "700" }}>مجموعة</AppText>
        </TouchableOpacity>
      </View>

      {/* Section label */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <AppText style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
          أعضاء الشركة
        </AppText>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#2E8BFF" size="large" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={m => String(m.user_id)}
          renderItem={renderMember}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#2E8BFF" />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 }}>
              <Ionicons name="people-outline" size={44} color="rgba(255,255,255,0.1)" />
              <AppText style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}>لا يوجد أعضاء</AppText>
            </View>
          }
        />
      )}

      {/* Group Call Modal */}
      <Modal visible={showGroup} transparent animationType="slide"
        onRequestClose={() => setShowGroup(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View style={{
            backgroundColor: "#0d1221", borderTopLeftRadius: 28, borderTopRightRadius: 28,
            borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
            paddingBottom: insets.bottom + 16, maxHeight: "80%",
          }}>
            <View style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
              borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
            }}>
              <TouchableOpacity onPress={() => { setShowGroup(false); setSelected([]); }}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
              <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>اجتماع مجموعة</AppText>
              <AppText style={{ color: selected.length ? "#8B5CF6" : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: "700" }}>
                {selected.length} محدد
              </AppText>
            </View>

            <ScrollView style={{ paddingTop: 8 }}>
              {members.map(m => {
                const isSelected = selected.includes(m.user_id);
                return (
                  <TouchableOpacity key={m.user_id}
                    onPress={() => setSelected(s => isSelected ? s.filter(x => x !== m.user_id) : [...s, m.user_id])}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 12,
                      paddingHorizontal: 20, paddingVertical: 12,
                      backgroundColor: isSelected ? "rgba(139,92,246,0.1)" : "transparent",
                    }}>
                    <MemberAvatar name={m.user_name} size={38} />
                    <View style={{ flex: 1 }}>
                      <AppText style={{ color: "#e2e8f0", fontSize: 14, fontWeight: "600" }}>
                        {m.user_name}
                      </AppText>
                      {m.job_title && (
                        <AppText style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                          {m.job_title}
                        </AppText>
                      )}
                    </View>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: isSelected ? "#8B5CF6" : "transparent",
                      borderWidth: 2, borderColor: isSelected ? "#8B5CF6" : "rgba(255,255,255,0.2)",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={startGroupCall}
              disabled={selected.length === 0 || groupLoading}
              style={{
                marginHorizontal: 20, marginTop: 12, paddingVertical: 14,
                borderRadius: 16, alignItems: "center", justifyContent: "center",
                backgroundColor: selected.length > 0 ? "#8B5CF6" : "rgba(255,255,255,0.06)",
                flexDirection: "row", gap: 8,
              }}>
              {groupLoading
                ? <ActivityIndicator color="#fff" />
                : <>
                  <Ionicons name="videocam" size={16} color={selected.length > 0 ? "#fff" : "#475569"} />
                  <AppText style={{ color: selected.length > 0 ? "#fff" : "#475569", fontSize: 15, fontWeight: "800" }}>
                    بدء الاجتماع
                  </AppText>
                </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
