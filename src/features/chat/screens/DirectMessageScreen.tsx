import React, { useState, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/ThemeContext";
import AppText from "../../../shared/ui/AppText";
import { apiFetch } from "../../../api";

interface DMMessage {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

interface MeResponse {
  id: number;
  name: string;
}

export default function DirectMessageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors: c } = useAppTheme();
  const insets = useSafeAreaInsets();

  const { userId, userName } = route.params ?? {};

  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);
  const flatRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const [me, msgs] = await Promise.all([
        apiFetch<MeResponse>("/auth/me"),
        apiFetch<DMMessage[]>(`/chat/dm/${userId}`).catch(() => []),
      ]);
      setMyId(me.id);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const send = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      const msg = await apiFetch<DMMessage>(`/chat/dm/${userId}`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.mediaCanvas }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
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
          backgroundColor: c.bgCard,
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View
          style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: c.accentCyan + "33",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <AppText style={{ color: c.accentCyan, fontWeight: "800", fontSize: 14 }}>
            {(userName || "؟").slice(0, 2).toUpperCase()}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold" numberOfLines={1}>{userName || `مستخدم #${userId}`}</AppText>
          <AppText variant="micro" tone="muted">رسالة مباشرة</AppText>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentCyan} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 16 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Ionicons name="chatbubble-outline" size={40} color={c.textMuted} />
              <AppText variant="bodySm" tone="muted" style={{ marginTop: 12 }}>
                ابدأ المحادثة مع {userName || "هذا المستخدم"}
              </AppText>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender_id === myId;
            return (
              <View
                style={{
                  alignSelf: isMine ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  backgroundColor: isMine ? c.accentCyan + "cc" : c.bgCard,
                  borderRadius: 18,
                  borderBottomRightRadius: isMine ? 4 : 18,
                  borderBottomLeftRadius: isMine ? 18 : 4,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: isMine ? 0 : 1,
                  borderColor: c.border,
                }}
              >
                <AppText style={{ color: isMine ? "#fff" : c.textPrimary, fontSize: 14, lineHeight: 20 }}>
                  {item.content}
                </AppText>
                <AppText style={{ color: isMine ? "rgba(255,255,255,0.6)" : c.textMuted, fontSize: 10, marginTop: 4, textAlign: isMine ? "right" : "left" }}>
                  {new Date(item.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                </AppText>
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
          borderTopWidth: 1,
          borderTopColor: c.border,
          backgroundColor: c.bgCard,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 14,
            color: c.textPrimary,
            backgroundColor: c.bg,
            maxHeight: 100,
          }}
          placeholder="اكتب رسالة..."
          placeholderTextColor={c.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType="send"
          onSubmitEditing={send}
        />
        <TouchableOpacity
          onPress={send}
          disabled={!text.trim() || sending}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: text.trim() ? c.accentCyan : c.border,
            alignItems: "center", justifyContent: "center",
          }}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
