import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { getToken } from "../../../api";
import { getApiBaseUrl } from "../../../api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

type Mode = "company" | "media";

// ─── Suggestion cards (like Claude / ChatGPT) ─────────────────────────────────

const SUGGESTIONS = [
  {
    icon: "bar-chart-outline" as const,
    title: "تحليل الأداء",
    sub: "لوحة القيادة والمؤشرات",
    topic: "dashboard",
    color: "#60a5fa",
  },
  {
    icon: "checkbox-outline" as const,
    title: "أولويات المهام",
    sub: "المهام المتأخرة والعاجلة",
    topic: "tasks",
    color: "#34d399",
  },
  {
    icon: "briefcase-outline" as const,
    title: "حالة الصفقات",
    sub: "CRM وفرص البيع",
    topic: "deals",
    color: "#fb923c",
  },
  {
    icon: "calendar-outline" as const,
    title: "الاجتماعات",
    sub: "جدول اليوم والأسبوع",
    topic: "meetings",
    color: "#c084fc",
  },
];

// ─── AI Logo ──────────────────────────────────────────────────────────────────

function AiOrb({ size = 36, glow = false }: { size?: number; glow?: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!glow) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [glow, pulse]);

  return (
    <Animated.View style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0d0f1a",
        borderWidth: 1.5,
        borderColor: "#7c3aed60",
      },
      glow && {
        transform: [{ scale: pulse }],
        shadowColor: "#7c3aed",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
        elevation: 8,
      },
    ]}>
      {/* Inner gradient simulation via nested Views */}
      <View style={{
        width: size - 8,
        height: size - 8,
        borderRadius: (size - 8) / 2,
        backgroundColor: "#7c3aed22",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Ionicons name="sparkles" size={size * 0.44} color="#a78bfa" />
      </View>
    </Animated.View>
  );
}

// ─── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots() {
  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const d3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const make = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 350, useNativeDriver: true }),
          Animated.delay(700 - delay),
        ]),
      );
    const a1 = make(d1, 0);
    const a2 = make(d2, 200);
    const a3 = make(d3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [d1, d2, d3]);

  return (
    <View style={{ flexDirection: "row", gap: 5, paddingHorizontal: 4 }}>
      {[d1, d2, d3].map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: "#a78bfa",
            opacity: d,
          }}
        />
      ))}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AiAssistantScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("company");
  const [sending, setSending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const c = colors;
  const BG = "#080c18";

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ─── Send message ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text.trim() };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setSending(true);

    try {
      const token = await getToken();
      const base = getApiBaseUrl();
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${base}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: history, mode }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { text?: string };
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
              );
            }
          } catch {}
        }
      }

      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m)
      );
    } catch (e: unknown) {
      const status = e instanceof Error && "status" in e ? (e as any).status : 0;
      let errorMsg: string;
      if (status === 503 || status === 502) {
        errorMsg = "خدمة الذكاء الاصطناعي غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.";
      } else if (status === 401) {
        errorMsg = "جلستك انتهت. أعد تسجيل الدخول.";
      } else {
        errorMsg = "تعذّر الاتصال بالذكاء الاصطناعي. تحقق من الإنترنت وأعد المحاولة.\n\nإذا استمرت المشكلة، تأكد من إعداد الخادم بشكل صحيح.";
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: errorMsg, streaming: false }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }, [messages, mode, sending]);

  // ─── Quick analyze ──────────────────────────────────────────────────────────

  const runAnalysis = useCallback(async (topic: string, title: string) => {
    if (analyzing || sending) return;
    setAnalyzing(true);

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: `حلّل لي: ${title}` };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", streaming: true }]);

    try {
      const token = await getToken();
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/agent/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { summary: string };
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: data.summary, streaming: false } : m)
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "تعذّر تحليل البيانات.", streaming: false } : m
        )
      );
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, sending]);

  const clearHistory = useCallback(() => {
    Alert.alert("مسح المحادثة", "هل تريد مسح كل سجل المحادثة؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "مسح", style: "destructive", onPress: () => setMessages([]) },
    ]);
  }, []);

  const isThinking = (sending || analyzing) && messages[messages.length - 1]?.content === "" && messages[messages.length - 1]?.streaming;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Screen style={{ backgroundColor: BG }}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Brand */}
        <View style={styles.headerBrand}>
          <AiOrb size={32} />
          <View>
            <AppText style={styles.headerTitle}>Alloul AI</AppText>
            <View style={styles.headerStatus}>
              <View style={styles.headerStatusDot} />
              <AppText style={styles.headerStatusText}>
                {mode === "company" ? "وضع الشركة" : "وضع المحتوى"}
              </AppText>
            </View>
          </View>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          {(["company", "media"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            >
              <AppText style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === "company" ? "شركة" : "محتوى"}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {messages.length > 0 && (
          <TouchableOpacity onPress={clearHistory} hitSlop={8} style={styles.clearBtn}>
            <Ionicons name="refresh-outline" size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.bottom + 60}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scrollContent, messages.length === 0 && styles.scrollEmpty]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Empty / Welcome state ── */}
          {messages.length === 0 && (
            <View style={styles.welcomeContainer}>
              {/* Big glowing orb */}
              <View style={styles.orbWrapper}>
                <View style={styles.orbGlow} />
                <View style={styles.orbOuter}>
                  <View style={styles.orbInner}>
                    <Ionicons name="sparkles" size={40} color="#a78bfa" />
                  </View>
                </View>
              </View>

              <AppText style={styles.welcomeTitle}>مساعدك الذكي</AppText>
              <AppText style={styles.welcomeSub}>
                اسألني أي شيء عن شركتك، مشاريعك، أو مهامك.{"\n"}أنا هنا للتحليل والمساعدة.
              </AppText>

              {/* Suggestion cards — like Claude / ChatGPT */}
              {mode === "company" && (
                <View style={styles.suggestionGrid}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s.topic}
                      onPress={() => void runAnalysis(s.topic, s.title)}
                      disabled={analyzing}
                      activeOpacity={0.7}
                      style={[styles.suggestionCard, { borderColor: s.color + "30" }]}
                    >
                      {/* Subtle colored glow */}
                      <View style={[styles.suggestionCardGlow, { backgroundColor: s.color + "08" }]} />
                      <View style={[styles.suggestionIcon, { backgroundColor: s.color + "18" }]}>
                        <Ionicons name={s.icon} size={18} color={s.color} />
                      </View>
                      <AppText style={[styles.suggestionTitle, { color: s.color }]}>{s.title}</AppText>
                      <AppText style={styles.suggestionSub}>{s.sub}</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Capability pills */}
              <View style={styles.capabilityRow}>
                {["تحليل البيانات", "خطط العمل", "تلخيص التقارير", "ردود احترافية"].map((cap) => (
                  <View key={cap} style={styles.capabilityPill}>
                    <AppText style={styles.capabilityText}>{cap}</AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Messages ── */}
          {messages.map((msg) => {
            const isUser = msg.role === "user";

            if (isUser) {
              return (
                <View key={msg.id} style={styles.userMsgRow}>
                  <View style={styles.userBubble}>
                    <AppText style={styles.userBubbleText}>{msg.content}</AppText>
                  </View>
                </View>
              );
            }

            // AI message
            return (
              <View key={msg.id} style={styles.aiMsgRow}>
                <AiOrb size={30} glow={!!msg.streaming} />
                <View style={styles.aiBubble}>
                  {msg.content === "" && msg.streaming ? (
                    <TypingDots />
                  ) : (
                    <>
                      <AppText style={styles.aiBubbleText}>
                        {msg.content}
                      </AppText>
                      {msg.streaming && (
                        <View style={styles.cursor} />
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}

          {/* Spacer */}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Input bar ── */}
        <View style={[
          styles.inputBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          inputFocused && styles.inputBarFocused,
        ]}>
          {/* Quick action row when chatting */}
          {messages.length > 0 && mode === "company" && !sending && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChipRow}
            >
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s.topic}
                  onPress={() => void runAnalysis(s.topic, s.title)}
                  disabled={analyzing || sending}
                  style={[styles.quickChip, { borderColor: s.color + "40" }]}
                >
                  <Ionicons name={s.icon} size={13} color={s.color} />
                  <AppText style={[styles.quickChipText, { color: s.color }]}>{s.title}</AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Text input row */}
          <View style={[
            styles.inputRow,
            inputFocused && styles.inputRowFocused,
          ]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="اسأل Alloul AI..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              style={styles.textInput}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={() => void sendMessage(input)}
            />

            <TouchableOpacity
              onPress={() => void sendMessage(input)}
              disabled={!input.trim() || sending}
              style={[
                styles.sendBtn,
                input.trim() && !sending ? styles.sendBtnActive : styles.sendBtnInactive,
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#a78bfa" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={input.trim() ? "#fff" : "rgba(255,255,255,0.25)"}
                />
              )}
            </TouchableOpacity>
          </View>

          <AppText style={styles.disclaimer}>
            Alloul AI قد يرتكب أخطاء. راجع المعلومات المهمة.
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    gap: 10,
  },
  headerBack: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  headerStatusText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modeBtn: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
  },
  modeBtnActive: {
    backgroundColor: "#7c3aed",
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
  },
  modeBtnTextActive: {
    color: "#fff",
  },
  clearBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
    gap: 16,
  },
  scrollEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },

  // Welcome
  welcomeContainer: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 20,
  },
  orbWrapper: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  orbGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#7c3aed",
    opacity: 0.12,
    // blur simulation
    transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }],
  },
  orbOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(124,58,237,0.08)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  orbInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(124,58,237,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  welcomeSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },

  // Suggestion cards
  suggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 4,
  },
  suggestionCard: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    overflow: "hidden",
  },
  suggestionCardGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  suggestionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  suggestionSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    lineHeight: 16,
  },

  // Capability pills
  capabilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    justifyContent: "center",
    marginTop: 2,
  },
  capabilityPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  capabilityText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "500",
  },

  // Messages
  userMsgRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  userBubble: {
    maxWidth: "78%",
    backgroundColor: "rgba(124,58,237,0.18)",
    borderRadius: 20,
    borderTopRightRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.35)",
  },
  userBubbleText: {
    color: "#e2d9f3",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "right",
  },

  aiMsgRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  aiBubble: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    borderTopLeftRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 44,
    justifyContent: "center",
  },
  aiBubbleText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    lineHeight: 24,
  },
  cursor: {
    width: 8,
    height: 16,
    backgroundColor: "#a78bfa",
    marginTop: 2,
    borderRadius: 2,
  },

  // Input bar
  inputBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#080c18",
  },
  inputBarFocused: {
    borderTopColor: "rgba(124,58,237,0.3)",
  },
  quickChipRow: {
    gap: 7,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputRowFocused: {
    borderColor: "rgba(124,58,237,0.5)",
    backgroundColor: "rgba(124,58,237,0.06)",
  },
  textInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    lineHeight: 22,
    maxHeight: 120,
    textAlign: "right",
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnActive: {
    backgroundColor: "#7c3aed",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnInactive: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  disclaimer: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 10,
    textAlign: "center",
    paddingBottom: 2,
  },
});
