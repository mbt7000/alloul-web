import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { apiFetch } from "../../../api/client";

interface Channel { id: string; name: string; unread: number; last_message: string; members: number; }
interface Message  { id: string; text: string; sender_name: string; created_at: string; is_mine: boolean; }

function formatTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

function getHue(name: string) { return name ? (name.charCodeAt(0) * 47) % 360 : 200; }

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const hue = getHue(name);
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.28,
      backgroundColor: `hsl(${hue},45%,22%)`,
      borderWidth: 1, borderColor: `hsl(${hue},50%,35%)`,
      alignItems: "center", justifyContent: "center",
    }}>
      <AppText style={{ color: `hsl(${hue},70%,72%)`, fontSize: size * 0.34, fontWeight: "800" }}>
        {(name || "??").slice(0, 2).toUpperCase()}
      </AppText>
    </View>
  );
}

function CallCard({ url, title }: { url: string; title: string }) {
  const { colors: c } = useAppTheme();
  return (
    <View style={{
      borderRadius: 16, overflow: "hidden",
      borderWidth: 1, borderColor: "rgba(20,224,164,0.25)",
      backgroundColor: "rgba(20,224,164,0.07)", width: 240,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }}>
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: "rgba(20,224,164,0.15)",
          borderWidth: 1, borderColor: "rgba(20,224,164,0.3)",
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="videocam" size={15} color="#14E0A4" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ color: "#fff", fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
            {title || "مكالمة فيديو"}
          </AppText>
          <AppText style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>مكالمة جماعية</AppText>
        </View>
      </View>
      <TouchableOpacity style={{
        marginHorizontal: 12, marginBottom: 12, paddingVertical: 9, borderRadius: 12,
        alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6,
        backgroundColor: "#14E0A4",
      }}>
        <Ionicons name="call" size={13} color="#0a0a0f" />
        <AppText style={{ color: "#0a0a0f", fontSize: 13, fontWeight: "800" }}>انضم للمكالمة</AppText>
      </TouchableOpacity>
    </View>
  );
}

function MessageItem({ msg, showAvatar }: { msg: Message; showAvatar: boolean }) {
  const callMatch = msg.text.match(/https:\/\/alloul\.app\/workspace\/smart-meetings\S*/);
  const titleMatch = msg.text.match(/مكالمة[:\s]+(.+?)(?:\s*[|]|$)/);

  return (
    <View style={{
      flexDirection: msg.is_mine ? "row-reverse" : "row",
      alignItems: "flex-end", gap: 8, marginBottom: 4, paddingHorizontal: 16,
    }}>
      {!msg.is_mine && (showAvatar
        ? <Avatar name={msg.sender_name} size={30} />
        : <View style={{ width: 30 }} />
      )}
      <View style={{ maxWidth: "72%", alignItems: msg.is_mine ? "flex-end" : "flex-start" }}>
        {showAvatar && !msg.is_mine && (
          <AppText style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginBottom: 3, marginHorizontal: 4 }}>
            {msg.sender_name}
          </AppText>
        )}
        {callMatch ? (
          <CallCard url={callMatch[0]} title={titleMatch?.[1]?.trim() || "مكالمة الشركة"} />
        ) : (
          <View style={{
            paddingHorizontal: 13, paddingVertical: 9,
            borderRadius: msg.is_mine ? 18 : 4,
            borderTopRightRadius: msg.is_mine ? 4 : 18,
            borderTopLeftRadius: msg.is_mine ? 18 : 4,
            borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
            backgroundColor: msg.is_mine ? "#1d4ed8" : "rgba(255,255,255,0.07)",
            borderWidth: msg.is_mine ? 0 : 1,
            borderColor: "rgba(255,255,255,0.08)",
          }}>
            <AppText style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 21 }}>
              {msg.text}
            </AppText>
          </View>
        )}
        <AppText style={{
          color: "rgba(255,255,255,0.25)", fontSize: 10,
          marginTop: 3, marginHorizontal: 4,
          textAlign: msg.is_mine ? "right" : "left",
        }}>
          {formatTime(msg.created_at)}
        </AppText>
      </View>
    </View>
  );
}

export default function RocketChatScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();

  const [channels, setChannels]   = useState<Channel[]>([]);
  const [active, setActive]       = useState<Channel | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [text, setText]           = useState("");
  const [loadingCh, setLoadingCh] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending]     = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    apiFetch<{ channels: Channel[] }>("/chat/channels")
      .then(d => {
        setChannels(d.channels || []);
        if (d.channels?.length) setActive(d.channels[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingCh(false));
  }, []);

  const loadMessages = useCallback(async (ch: Channel) => {
    try {
      const d = await apiFetch<{ messages: Message[] }>(`/chat/channels/${ch.id}/messages`);
      setMessages(d.messages || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!active) return;
    setLoadingMsg(true);
    loadMessages(active).finally(() => setLoadingMsg(false));
    pollRef.current = setInterval(() => loadMessages(active), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, loadMessages]);

  const sendMessage = async () => {
    if (!text.trim() || !active || sending) return;
    Keyboard.dismiss();
    setSending(true);
    const optimistic: Message = {
      id: Date.now().toString(), text: text.trim(),
      sender_name: "أنت", created_at: new Date().toISOString(), is_mine: true,
    };
    setMessages(p => [...p, optimistic]);
    const sent = text.trim();
    setText("");
    try {
      await apiFetch(`/chat/channels/${active.id}/messages`, {
        method: "POST", body: JSON.stringify({ text: sent }),
      });
    } catch {} finally { setSending(false); }
  };

  const bg = "#090d1a";

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle="light-content" backgroundColor={bg} />

      {/* Header */}
      <View style={{
        paddingTop: insets.top + 6, paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: "rgba(12,17,32,0.98)",
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-back" size={19} color="#fff" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <AppText style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
            {active ? `# ${active.name}` : "دردشة الشركة"}
          </AppText>
          {active && (
            <AppText style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
              {active.members} أعضاء
            </AppText>
          )}
        </View>

        <TouchableOpacity onPress={() => setShowChannels(s => !s)} hitSlop={10}
          style={{
            paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
            backgroundColor: showChannels ? "rgba(46,139,255,0.2)" : "rgba(255,255,255,0.06)",
            borderWidth: 1, borderColor: showChannels ? "rgba(46,139,255,0.4)" : "rgba(255,255,255,0.08)",
            flexDirection: "row", alignItems: "center", gap: 5,
          }}>
          <Ionicons name="list" size={14} color={showChannels ? "#2E8BFF" : "rgba(255,255,255,0.4)"} />
          <AppText style={{ color: showChannels ? "#2E8BFF" : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "600" }}>
            القنوات
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Channels dropdown */}
      {showChannels && (
        <View style={{
          backgroundColor: "rgba(10,14,28,0.98)", borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.07)", paddingVertical: 6,
        }}>
          {loadingCh ? (
            <ActivityIndicator color="#2E8BFF" style={{ paddingVertical: 12 }} />
          ) : channels.map(ch => (
            <TouchableOpacity key={ch.id}
              onPress={() => { setActive(ch); setShowChannels(false); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 10,
                paddingHorizontal: 16, paddingVertical: 11,
                backgroundColor: active?.id === ch.id ? "rgba(46,139,255,0.1)" : "transparent",
              }}>
              <Ionicons name="grid-outline" size={14} color={active?.id === ch.id ? "#2E8BFF" : "#475569"} />
              <AppText style={{ flex: 1, color: active?.id === ch.id ? "#e2e8f0" : "#64748b", fontSize: 14, fontWeight: active?.id === ch.id ? "700" : "400" }}>
                {ch.name}
              </AppText>
              {ch.unread > 0 && (
                <View style={{ backgroundColor: "#2E8BFF", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <AppText style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{ch.unread}</AppText>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}>

        {loadingMsg && messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#2E8BFF" />
          </View>
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Ionicons name="chatbubbles-outline" size={40} color="rgba(255,255,255,0.12)" />
            <AppText style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}>لا توجد رسائل — ابدأ المحادثة</AppText>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={({ item, index }) => (
              <MessageItem
                msg={item}
                showAvatar={!item.is_mine && (index === 0 || messages[index - 1]?.sender_name !== item.sender_name)}
              />
            )}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input */}
        <View style={{
          flexDirection: "row", alignItems: "flex-end", gap: 10,
          paddingHorizontal: 14, paddingTop: 10,
          paddingBottom: insets.bottom + 10,
          borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)",
          backgroundColor: "rgba(12,17,32,0.98)",
        }}>
          <View style={{
            flex: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", maxHeight: 120,
          }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={active ? `رسالة في #${active.name}...` : "رسالة..."}
              placeholderTextColor="rgba(255,255,255,0.22)"
              style={{ color: "#e2e8f0", fontSize: 14, textAlign: "right", lineHeight: 20 }}
              multiline
              returnKeyType="default"
            />
          </View>
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!text.trim() || sending}
            style={{
              width: 42, height: 42, borderRadius: 14,
              alignItems: "center", justifyContent: "center",
              backgroundColor: text.trim() ? "#2563eb" : "rgba(255,255,255,0.06)",
              borderWidth: 1, borderColor: text.trim() ? "transparent" : "rgba(255,255,255,0.08)",
            }}>
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={16} color={text.trim() ? "#fff" : "#475569"} style={{ transform: [{ scaleX: -1 }] }} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
