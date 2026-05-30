import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { apiFetch } from "../../../api/client";
import { chatBus, type ChatMessagePayload } from "../../../lib/chatBus";
import { sendWsEvent } from "../../../hooks/useCallSocket";

// ─── Types matching backend MessageResponse / ChannelResponse ────────────────

interface Author { id: number; name: string; avatar_url: string | null; }

interface Message {
  id: number;
  channel_id: number;
  user_id: number;
  content: string;
  author: Author;
  created_at: string;
  is_self: boolean;
}

interface Channel {
  id: number;
  name: string;
  description: string | null;
  type: string;
  last_message: string | null;
  last_message_at: string | null;
  message_count: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function MessageItem({ msg, showAvatar }: { msg: Message; showAvatar: boolean }) {
  return (
    <View style={{
      flexDirection: msg.is_self ? "row-reverse" : "row",
      alignItems: "flex-end", gap: 8, marginBottom: 4, paddingHorizontal: 16,
    }}>
      {!msg.is_self && (showAvatar
        ? <Avatar name={msg.author.name} size={30} />
        : <View style={{ width: 30 }} />
      )}
      <View style={{ maxWidth: "72%", alignItems: msg.is_self ? "flex-end" : "flex-start" }}>
        {showAvatar && !msg.is_self && (
          <AppText style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginBottom: 3, marginHorizontal: 4 }}>
            {msg.author.name}
          </AppText>
        )}
        <View style={{
          paddingHorizontal: 13, paddingVertical: 9,
          borderRadius: msg.is_self ? 18 : 4,
          borderTopRightRadius: msg.is_self ? 4 : 18,
          borderTopLeftRadius: msg.is_self ? 18 : 4,
          borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
          backgroundColor: msg.is_self ? "#1d4ed8" : "rgba(255,255,255,0.07)",
          borderWidth: msg.is_self ? 0 : 1,
          borderColor: "rgba(255,255,255,0.08)",
        }}>
          <AppText style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 21 }}>
            {msg.content}
          </AppText>
        </View>
        <AppText style={{
          color: "rgba(255,255,255,0.25)", fontSize: 10,
          marginTop: 3, marginHorizontal: 4,
          textAlign: msg.is_self ? "right" : "left",
        }}>
          {formatTime(msg.created_at)}
        </AppText>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CompanyChatScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();

  const [channels, setChannels]     = useState<Channel[]>([]);
  const [active, setActive]         = useState<Channel | null>(null);
  const activeRef = useRef<Channel | null>(null);
  activeRef.current = active;

  const [messages, setMessages]     = useState<Message[]>([]);
  const [text, setText]             = useState("");
  const [loadingCh, setLoadingCh]   = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending]       = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);

  const listRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMsgIdRef = useRef<number>(0);

  // ── Load channels ────────────────────────────────────────────────────────

  useEffect(() => {
    apiFetch<Channel[]>("/channels/")
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setChannels(list);
        if (list.length && !activeRef.current) setActive(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingCh(false));
  }, []);

  // ── Load messages for active channel ────────────────────────────────────

  const loadMessages = useCallback(async (ch: Channel, replace = true) => {
    try {
      const params = replace ? "" : `?after_id=${lastMsgIdRef.current}`;
      const d = await apiFetch<Message[]>(`/channels/${ch.id}/messages${params}`);
      const list = Array.isArray(d) ? d : [];
      if (replace) {
        setMessages(list);
        lastMsgIdRef.current = list.length ? list[list.length - 1].id : 0;
      } else if (list.length) {
        setMessages(prev => {
          const existing = new Set(prev.map(m => m.id));
          const fresh = list.filter(m => !existing.has(m.id));
          if (!fresh.length) return prev;
          lastMsgIdRef.current = fresh[fresh.length - 1].id;
          return [...prev, ...fresh];
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!active) return;
    setLoadingMsg(true);
    void loadMessages(active, true).finally(() => setLoadingMsg(false));
  }, [active, loadMessages]);

  // ── Re-fetch on screen focus (fallback for missed WS events) ────────────

  useFocusEffect(
    useCallback(() => {
      if (activeRef.current) {
        void loadMessages(activeRef.current, false);
      }
    }, [loadMessages])
  );

  // ── Real-time: subscribe to chatBus ─────────────────────────────────────

  useEffect(() => {
    const unsub = chatBus.subscribe((event) => {
      if (event.type === "chat:message") {
        // Only append if it's for the active channel
        if (activeRef.current && event.channel_id === activeRef.current.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === event.message.id)) return prev; // deduplicate
            lastMsgIdRef.current = event.message.id;
            return [...prev, event.message];
          });
        }
      } else if (event.type === "chat:typing") {
        if (activeRef.current && event.channel_id === activeRef.current.id) {
          setTypingName(event.user_name);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setTypingName(null), 3000);
        }
      }
    });
    return () => {
      unsub();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!text.trim() || !active || sending) return;
    Keyboard.dismiss();
    setSending(true);
    const content = text.trim();
    setText("");

    // Optimistic UI — local message
    const optimistic: Message = {
      id: Date.now(), // temporary id
      channel_id: active.id,
      user_id: -1,
      content,
      author: { id: -1, name: "أنت", avatar_url: null },
      created_at: new Date().toISOString(),
      is_self: true,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const saved = await apiFetch<Message>(`/channels/${active.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      // Replace optimistic with real message
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...saved, is_self: true } : m));
      lastMsgIdRef.current = saved.id;
    } catch {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  // ── Typing indicator: send WS event while typing ─────────────────────────

  const onTyping = (val: string) => {
    setText(val);
    if (active && val.length > 0) {
      sendWsEvent({ type: "chat:typing", channel_id: active.id });
    }
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
          {typingName ? (
            <AppText style={{ color: "#14E0A4", fontSize: 11 }}>
              {typingName} يكتب…
            </AppText>
          ) : active ? (
            <AppText style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
              {active.message_count} رسالة
            </AppText>
          ) : null}
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
            keyExtractor={m => String(m.id)}
            renderItem={({ item, index }) => (
              <MessageItem
                msg={item}
                showAvatar={!item.is_self && (index === 0 || messages[index - 1]?.author.id !== item.author.id)}
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
              onChangeText={onTyping}
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
