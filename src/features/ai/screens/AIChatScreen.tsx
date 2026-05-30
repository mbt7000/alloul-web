/**
 * AI Chat Screen — Corporate Workspace Assistant
 * ================================================
 * Uses the real /agent/chat SSE streaming endpoint.
 * Auth token injected automatically via getToken().
 * History loaded from /agent/history on mount.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { radii } from "../../../theme/radii";
import { getToken } from "../../../api/client";
import { getApiBaseUrl } from "../../../config/env";
import { apiFetch } from "../../../api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// ─── Quick Suggestions ────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  { id: "1", text: "لخّص مهامي الأسبوع الحالي", icon: "list-outline" as const },
  { id: "2", text: "ما الصفقات التي تحتاج متابعة؟", icon: "briefcase-outline" as const },
  { id: "3", text: "حضّر تقريراً عن أداء الشركة", icon: "bar-chart-outline" as const },
  { id: "4", text: "ما الاجتماعات القادمة؟", icon: "calendar-outline" as const },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIChatScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const isRTL = I18nManager.isRTL;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  const styles = useThemedStyles((c) => ({
    root: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.bgCard,
    },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: "700" as const, color: c.textPrimary },
    headerBadge: {
      backgroundColor: c.accent + "22",
      borderRadius: radii.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    headerBadgeText: { fontSize: 11, color: c.accent, fontWeight: "600" as const },
    list: { paddingHorizontal: 16, paddingVertical: 12 },
    // Empty state
    emptyWrap: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 32, paddingTop: 60 },
    emptyIcon: { marginBottom: 14 },
    emptyTitle: { fontSize: 20, fontWeight: "700" as const, color: c.textPrimary, textAlign: "center" as const, marginBottom: 6 },
    emptySubtitle: { fontSize: 14, color: c.textMuted, textAlign: "center" as const, lineHeight: 22, marginBottom: 28 },
    suggestionsGrid: { width: "100%" as const, gap: 10 },
    suggestionChip: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: radii.md,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
    },
    suggestionText: { flex: 1, fontSize: 14, color: c.textPrimary },
    // Bubbles
    bubbleRow: { marginVertical: 5 },
    userRow: { alignItems: "flex-end" as const },
    assistantRow: { alignItems: "flex-start" as const },
    userBubble: {
      backgroundColor: c.accent,
      borderRadius: radii.md,
      borderBottomRightRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: "82%" as const,
    },
    assistantBubble: {
      backgroundColor: c.bgCard,
      borderRadius: radii.md,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: "88%" as const,
    },
    userText: { fontSize: 14, lineHeight: 22, color: "#fff", textAlign: isRTL ? "right" : "left" as const },
    assistantText: { fontSize: 14, lineHeight: 22, color: c.textPrimary, textAlign: isRTL ? "right" : "left" as const },
    streamingDots: { flexDirection: "row" as const, gap: 4, paddingVertical: 6 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.textMuted },
    // Input
    inputArea: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bgCard,
      flexDirection: "row" as const,
      alignItems: "flex-end" as const,
      gap: 8,
    },
    inputWrap: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "flex-end" as const,
      backgroundColor: c.bg,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    input: { flex: 1, fontSize: 14, color: c.textPrimary, maxHeight: 100, textAlign: isRTL ? "right" : "left" as const },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    sendBtnDisabled: { backgroundColor: c.border },
    clearBtn: { padding: 4 },
  }));

  // ─── Load history ──────────────────────────────────────────────────────────

  useEffect(() => {
    apiFetch<{ id: string; role: string; content: string }[]>("/agent/history?mode=company")
      .then((hist) => {
        const loaded: ChatMessage[] = hist.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        setMessages(loaded);
      })
      .catch(() => {/* no history yet */})
      .finally(() => setHistoryLoaded(true));
  }, []);

  // ─── Auto-scroll ───────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // ─── Clear history ─────────────────────────────────────────────────────────

  const handleClear = useCallback(async () => {
    await apiFetch("/agent/history", { method: "DELETE" }).catch(() => {});
    setMessages([]);
  }, []);

  // ─── Send message with SSE streaming ──────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
    };

    const assistantId = `a_${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputText("");
    setIsStreaming(true);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const token = await getToken();
      const res = await fetch(`${getApiBaseUrl()}/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history, mode: "company" }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const chunk = JSON.parse(payload) as { text?: string };
            if (chunk.text) {
              accumulated += chunk.text;
              const snap = accumulated;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: snap, streaming: true }
                    : m
                )
              );
            }
          } catch {/* skip malformed chunk */}
        }
      }

      // Mark streaming done
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || "توقّف.", streaming: false }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "حدث خطأ، يرجى المحاولة مجدداً.", streaming: false }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [inputText, isStreaming, messages]);

  const handleQuickSuggestion = useCallback((text: string) => {
    setInputText(text);
  }, []);

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.bubbleRow, isUser ? styles.userRow : styles.assistantRow]}>
        <View style={isUser ? styles.userBubble : styles.assistantBubble}>
          {item.streaming && !item.content ? (
            <View style={styles.streamingDots}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          ) : (
            <Text style={isUser ? styles.userText : styles.assistantText}>
              {item.content}
            </Text>
          )}
        </View>
      </View>
    );
  }, [styles]);

  const EmptyState = useCallback(() => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name="sparkles" size={48} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>مساعد الذكاء الاصطناعي</Text>
      <Text style={styles.emptySubtitle}>
        اسألني عن مهامك، مشاريعك، صفقاتك، أو اجتماعاتك
      </Text>
      <View style={styles.suggestionsGrid}>
        {QUICK_SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.suggestionChip}
            onPress={() => handleQuickSuggestion(s.text)}
            activeOpacity={0.7}
          >
            <Ionicons name={s.icon} size={18} color={colors.accent} />
            <Text style={styles.suggestionText}>{s.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [styles, colors, handleQuickSuggestion]);

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (!historyLoaded) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const canSend = inputText.trim().length > 0 && !isStreaming;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons
            name={isRTL ? "chevron-forward" : "chevron-back"}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مساعد الذكاء الاصطناعي</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>AI</Text>
        </View>
        {messages.length > 0 && (
          <Pressable style={styles.clearBtn} onPress={handleClear} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[styles.list, messages.length === 0 && { flex: 1 }]}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Input */}
      <View style={[styles.inputArea, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="اكتب رسالتك..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!isStreaming}
            onSubmitEditing={canSend ? handleSend : undefined}
            returnKeyType="send"
          />
        </View>
        {isStreaming ? (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => abortRef.current?.abort()}
          >
            <Ionicons name="stop" size={16} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
