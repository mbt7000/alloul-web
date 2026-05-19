/**
 * WorkspaceAssistantScreen — AlloulAI Workspace Assistant
 * Bilingual (AR/EN) AI chat powered by Ollama (default) or cloud LLMs (BYOK).
 * Feature flag: ALLOULAI_ASSISTANT
 * Calls /agent/chat SSE endpoint. Falls back to /agent/message for non-streaming.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  I18nManager,
  Alert,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { getToken } from "../../../api/client";
import { getApiBaseUrl } from "../../../config/env";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const QUICK_AR = [
  { id: "1", text: "لخّص أداء فريقي هذا الأسبوع", icon: "bar-chart-outline" as const },
  { id: "2", text: "ما المهام المتأخرة اليوم؟", icon: "checkbox-outline" as const },
  { id: "3", text: "حضّر تقرير المبيعات الشهري", icon: "briefcase-outline" as const },
  { id: "4", text: "ما الاجتماعات القادمة هذا الأسبوع؟", icon: "calendar-outline" as const },
];

const QUICK_EN = [
  { id: "1", text: "Summarize my team's performance this week", icon: "bar-chart-outline" as const },
  { id: "2", text: "What tasks are overdue today?", icon: "checkbox-outline" as const },
  { id: "3", text: "Prepare monthly sales report", icon: "briefcase-outline" as const },
  { id: "4", text: "What meetings do I have this week?", icon: "calendar-outline" as const },
];

export default function WorkspaceAssistantScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [lang, setLang] = useState<"ar" | "en">(isRTL ? "ar" : "en");
  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  const quickSuggestions = lang === "ar" ? QUICK_AR : QUICK_EN;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);
    scrollToBottom();

    try {
      const token = await getToken();
      const base = getApiBaseUrl();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const res = await fetch(`${base}/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, lang }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.delta ?? parsed.content ?? parsed.text ?? "";
              accumulated += delta;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
              );
              scrollToBottom();
            } catch {
              accumulated += data;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
              );
            }
          }
        }
      }

      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m)
      );
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const errorText = lang === "ar"
        ? "تعذّر الاتصال بالمساعد. تأكد من تشغيل Ollama محليًا."
        : "Could not reach assistant. Make sure Ollama is running locally.";
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: errorText, streaming: false } : m)
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [streaming, lang, scrollToBottom]);

  const handleQuick = useCallback((text: string) => sendMessage(text), [sendMessage]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "82%",
        marginVertical: 4,
        marginHorizontal: 16,
      }}>
        <View style={{
          backgroundColor: isUser ? c.accentBlue : c.bgCard,
          borderRadius: 18,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}>
          <AppText style={{
            color: isUser ? "#fff" : c.textPrimary,
            fontSize: 14,
            lineHeight: 20,
            textAlign: isRTL ? "right" : "left",
          }}>
            {item.content}
            {item.streaming && <AppText style={{ color: c.accentCyan }}>▋</AppText>}
          </AppText>
        </View>
      </View>
    );
  }, [c, isRTL]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        gap: 10,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText style={{ color: c.textPrimary, fontSize: 16, fontWeight: "700" }}>
            {lang === "ar" ? "مساعد AlloulAI" : "AlloulAI Assistant"}
          </AppText>
          <AppText style={{ color: c.textMuted, fontSize: 11 }}>
            {lang === "ar" ? "مدعوم بـ Ollama • مجاني" : "Powered by Ollama • Free"}
          </AppText>
        </View>
        <TouchableOpacity
          onPress={() => setLang(l => l === "ar" ? "en" : "ar")}
          style={{
            paddingHorizontal: 10, paddingVertical: 5,
            borderRadius: 10, borderWidth: 1, borderColor: c.border,
            backgroundColor: c.bgCard,
          }}
        >
          <AppText style={{ color: c.accentCyan, fontSize: 12, fontWeight: "700" }}>
            {lang === "ar" ? "EN" : "AR"}
          </AppText>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 60}
      >
        {messages.length === 0 ? (
          <View style={{ flex: 1, padding: 20 }}>
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: c.accentBlue + "22",
                alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <Ionicons name="sparkles" size={30} color={c.accentBlue} />
              </View>
              <AppText style={{ color: c.textPrimary, fontSize: 18, fontWeight: "800", marginBottom: 6 }}>
                {lang === "ar" ? "مرحباً بك في AlloulAI" : "Welcome to AlloulAI"}
              </AppText>
              <AppText style={{ color: c.textMuted, fontSize: 13, textAlign: "center", maxWidth: 280 }}>
                {lang === "ar"
                  ? "اسألني عن فريقك، مشاريعك، صفقاتك، أو أي شيء يخص عملك"
                  : "Ask me about your team, projects, deals, or anything about your workspace"}
              </AppText>
            </View>

            <View style={{ gap: 10 }}>
              {quickSuggestions.map(s => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => handleQuick(s.text)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  <Ionicons name={s.icon} size={18} color={c.accentBlue} />
                  <AppText style={{ color: c.textSecondary, fontSize: 13, flex: 1 }}>{s.text}</AppText>
                  <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          />
        )}

        {/* Input */}
        <View style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 12,
          paddingVertical: 10,
          paddingBottom: insets.bottom + 10,
          borderTopWidth: 1,
          borderTopColor: c.border,
          gap: 8,
          backgroundColor: c.bg,
        }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={lang === "ar" ? "اكتب رسالتك..." : "Type your message..."}
            placeholderTextColor={c.textMuted}
            style={{
              flex: 1,
              backgroundColor: c.bgCard,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: c.textPrimary,
              fontSize: 14,
              maxHeight: 120,
              textAlign: isRTL ? "right" : "left",
            }}
            multiline
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
            editable={!streaming}
          />
          <TouchableOpacity
            onPress={() => streaming ? abortRef.current?.abort() : sendMessage(input)}
            disabled={!streaming && !input.trim()}
            style={{
              width: 42, height: 42, borderRadius: 21,
              backgroundColor: streaming ? c.danger : c.accentBlue,
              alignItems: "center", justifyContent: "center",
              opacity: !streaming && !input.trim() ? 0.4 : 1,
            }}
          >
            <Ionicons
              name={streaming ? "stop" : "send"}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
