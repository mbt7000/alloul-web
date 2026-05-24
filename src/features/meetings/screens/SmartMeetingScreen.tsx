/**
 * SmartMeetingScreen — LiveKit video meetings + AI transcription + action items
 */
import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { apiFetch } from "../../../api/client";

interface MeetingRoom {
  room_name: string;
  token: string;
  ws_url: string;
  title: string;
}

interface ActionItem {
  assignee: string;
  task: string;
  due: string | null;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
}

const LIVEKIT_MEET_URL = "https://alloul.app/workspace/smart-meetings";

export default function SmartMeetingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();

  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [room, setRoom] = useState<MeetingRoom | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);

  const createRoom = useCallback(async () => {
    const t = topic.trim();
    if (!t) {
      Alert.alert("الاجتماع", "يرجى إدخال موضوع الاجتماع أولاً");
      return;
    }
    setCreating(true);
    try {
      const data = await apiFetch<MeetingRoom>("/livekit/rooms", {
        method: "POST",
        body: JSON.stringify({ title: t }),
      });
      setRoom(data);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر إنشاء غرفة الاجتماع");
    } finally {
      setCreating(false);
    }
  }, [topic]);

  const joinMeeting = useCallback(async () => {
    if (!room) return;
    setJoining(true);
    try {
      const url = `${room.ws_url.replace("wss://", "https://").replace("ws://", "http://")}`;
      const meetUrl = `${LIVEKIT_MEET_URL}?room=${encodeURIComponent(room.room_name)}&token=${encodeURIComponent(room.token)}&wsUrl=${encodeURIComponent(room.ws_url)}`;
      await WebBrowser.openBrowserAsync(meetUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch {
      Alert.alert("خطأ", "تعذّر فتح الاجتماع");
    } finally {
      setJoining(false);
    }
  }, [room]);

  const shareRoom = useCallback(async () => {
    if (!room) return;
    const meetUrl = `${LIVEKIT_MEET_URL}?room=${encodeURIComponent(room.room_name)}&token=${encodeURIComponent(room.token)}&wsUrl=${encodeURIComponent(room.ws_url)}`;
    await Share.share({
      message: `انضم للاجتماع: ${room.title}\n${meetUrl}`,
      title: room.title,
    });
  }, [room]);

  const endMeeting = useCallback(async () => {
    if (!room) return;
    setMeetingEnded(true);
    setLoadingActions(true);
    try {
      const data = await apiFetch<{ transcript: TranscriptSegment[]; action_items: ActionItem[] }>(
        `/livekit/rooms/${room.room_name}/transcript`
      ).catch(() => ({ transcript: [], action_items: [] }));
      setTranscript(data.transcript ?? []);
      setActionItems(data.action_items ?? []);
    } finally {
      setLoadingActions(false);
    }
  }, [room]);

  if (!room) {
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
              اجتماع ذكي
            </AppText>
            <AppText style={{ color: c.textMuted, fontSize: 11 }}>
              LiveKit · تفريغ تلقائي · بنود عمل بالـ AI
            </AppText>
          </View>
        </View>

        <View style={{ flex: 1, padding: 24, gap: 20 }}>
          {/* Feature chips */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              { icon: "videocam-outline" as const, label: "فيديو LiveKit" },
              { icon: "document-text-outline" as const, label: "تفريغ تلقائي" },
              { icon: "checkmark-circle-outline" as const, label: "بنود عمل بالـ AI" },
              { icon: "language-outline" as const, label: "عربي + إنجليزي" },
            ].map(f => (
              <View key={f.label} style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 10, paddingVertical: 5,
                borderRadius: 20, backgroundColor: c.bgCard,
                borderWidth: 1, borderColor: c.border,
              }}>
                <Ionicons name={f.icon} size={13} color={c.accentCyan} />
                <AppText style={{ color: c.textSecondary, fontSize: 12 }}>{f.label}</AppText>
              </View>
            ))}
          </View>

          {/* Topic input */}
          <View>
            <AppText style={{ color: c.textSecondary, fontSize: 13, marginBottom: 8 }}>
              موضوع الاجتماع *
            </AppText>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="مثال: مراجعة مشروع Q2"
              placeholderTextColor={c.textMuted}
              style={{
                backgroundColor: c.bgCard,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: c.textPrimary,
                fontSize: 15,
                borderWidth: 1,
                borderColor: c.border,
                textAlign: "right",
              }}
            />
          </View>

          {/* Create button */}
          <TouchableOpacity
            onPress={createRoom}
            disabled={creating || !topic.trim()}
            style={{
              paddingVertical: 16,
              borderRadius: 14,
              backgroundColor: c.accentBlue,
              alignItems: "center",
              opacity: creating || !topic.trim() ? 0.5 : 1,
            }}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="videocam" size={18} color="#fff" />
                <AppText style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                  إنشاء الاجتماع
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: c.border, gap: 10,
      }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ color: c.textPrimary, fontSize: 15, fontWeight: "700" }}>{room.title}</AppText>
          <AppText style={{ color: meetingEnded ? c.textMuted : "#25D366", fontSize: 11 }}>
            {meetingEnded ? "انتهى الاجتماع" : "🟢 الغرفة جاهزة"}
          </AppText>
        </View>
        {!meetingEnded && (
          <TouchableOpacity
            onPress={() => Alert.alert("إنهاء الاجتماع", "هل تريد إنهاء الاجتماع واستخراج بنود العمل؟", [
              { text: "إلغاء", style: "cancel" },
              { text: "إنهاء", style: "destructive", onPress: endMeeting },
            ])}
            style={{
              paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: 10, backgroundColor: c.danger + "22",
            }}
          >
            <AppText style={{ color: c.danger, fontSize: 12, fontWeight: "700" }}>إنهاء</AppText>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Room info card */}
        <View style={{
          padding: 16, borderRadius: 14,
          backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, gap: 8,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText style={{ color: c.textMuted, fontSize: 11 }}>اسم الغرفة</AppText>
            <TouchableOpacity onPress={shareRoom}>
              <Ionicons name="share-outline" size={18} color={c.accentBlue} />
            </TouchableOpacity>
          </View>
          <AppText style={{ color: c.accentCyan, fontSize: 13, fontWeight: "700" }}>
            {room.room_name}
          </AppText>
        </View>

        {/* Join button */}
        {!meetingEnded && (
          <TouchableOpacity
            onPress={joinMeeting}
            disabled={joining}
            style={{
              paddingVertical: 16, borderRadius: 14,
              backgroundColor: "#25D366", alignItems: "center",
              opacity: joining ? 0.7 : 1,
            }}
          >
            {joining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="videocam" size={18} color="#fff" />
                <AppText style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                  انضم للاجتماع
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Share button */}
        {!meetingEnded && (
          <TouchableOpacity
            onPress={shareRoom}
            style={{
              paddingVertical: 14, borderRadius: 14,
              backgroundColor: c.bgCard, alignItems: "center",
              borderWidth: 1, borderColor: c.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="link-outline" size={18} color={c.accentBlue} />
              <AppText style={{ color: c.accentBlue, fontSize: 14, fontWeight: "600" }}>
                مشاركة الرابط
              </AppText>
            </View>
          </TouchableOpacity>
        )}

        {/* Loading AI */}
        {loadingActions && (
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
            <ActivityIndicator color={c.accentBlue} />
            <AppText style={{ color: c.textMuted, fontSize: 13 }}>
              يستخرج الـ AI بنود العمل...
            </AppText>
          </View>
        )}

        {/* Action items */}
        {actionItems.length > 0 && (
          <View>
            <AppText style={{ color: c.textPrimary, fontSize: 15, fontWeight: "700", marginBottom: 12 }}>
              بنود العمل ({actionItems.length})
            </AppText>
            {actionItems.map((item, i) => (
              <View key={i} style={{
                padding: 14, borderRadius: 12,
                backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border,
                marginBottom: 8, gap: 4,
              }}>
                <AppText style={{ color: c.textPrimary, fontSize: 14 }}>{item.task}</AppText>
                <AppText style={{ color: c.textMuted, fontSize: 12 }}>
                  {item.assignee}{item.due ? ` · ${item.due}` : ""}
                </AppText>
              </View>
            ))}
          </View>
        )}

        {/* Transcript */}
        {transcript.length > 0 && (
          <View>
            <AppText style={{ color: c.textPrimary, fontSize: 15, fontWeight: "700", marginBottom: 12 }}>
              النص المفرَّغ
            </AppText>
            {transcript.map((seg, i) => (
              <View key={i} style={{ marginBottom: 10 }}>
                <AppText style={{ color: c.accentBlue, fontSize: 11, fontWeight: "700" }}>
                  {seg.speaker} · {seg.timestamp}
                </AppText>
                <AppText style={{ color: c.textSecondary, fontSize: 13, lineHeight: 20 }}>
                  {seg.text}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
