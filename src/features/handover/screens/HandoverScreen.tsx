import React, { useCallback, useState } from "react";
import {
  View, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, Alert, Modal,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import CompanyWorkModeTopBar from "../../companies/components/CompanyWorkModeTopBar";
import AIComposeSheet from "../../../shared/components/AIComposeSheet";
import AISummaryModal from "../../../shared/components/AISummaryModal";
import { summarizeHandover } from "../../../api/ai.api";
import {
  getHandovers, createHandover, updateHandover, deleteHandover,
  analyzeHandover, importHandoversToKnowledge, type HandoverRow,
} from "../../../api";

const STATUS_CFG: Record<string, { label: string; color: string; next: string }> = {
  pending:     { label: "معلق",    color: "#94A3B8", next: "in_progress" },
  in_progress: { label: "جارٍ",   color: "#60A5FA", next: "submitted"   },
  submitted:   { label: "مُسلَّم", color: "#FBBF24", next: "accepted"   },
  accepted:    { label: "مقبول",  color: "#34D399", next: "closed"      },
  closed:      { label: "مغلق",   color: "#A78BFA", next: "pending"     },
};

function scoreColor(s: number) {
  return s >= 80 ? "#34D399" : s >= 50 ? "#FBBF24" : "#F87171";
}

function Field({ label, value, onChange, placeholder, multiline }: {
  label?: string; value: string; onChange: (v: string) => void;
  placeholder: string; multiline?: boolean;
}) {
  const { colors: c } = useAppTheme();
  return (
    <TextInput
      value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor={c.textMuted} multiline={multiline}
      numberOfLines={multiline ? 4 : 1}
      style={{
        backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 11, color: c.textPrimary,
        fontSize: 14, borderWidth: 1, borderColor: c.border, textAlign: "right",
        ...(multiline ? { minHeight: 90 } : {}),
      }}
    />
  );
}

export default function HandoverScreen() {
  const { colors: c } = useAppTheme();
  const [items, setItems] = useState<HandoverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analysisMap, setAnalysisMap] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showAICompose, setShowAICompose] = useState(false);
  const [smartSummaryFor, setSmartSummaryFor] = useState<HandoverRow | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getHandovers();
      setItems(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await createHandover({
        title: newTitle.trim(),
        from_person: newFrom.trim() || undefined,
        to_person: newTo.trim() || undefined,
        department: newDept.trim() || undefined,
        content: newContent.trim() || undefined,
      });
      setShowCreate(false);
      setNewTitle(""); setNewFrom(""); setNewTo(""); setNewDept(""); setNewContent("");
      void load();
    } catch { Alert.alert("خطأ", "تعذّر إنشاء التسليمة."); }
    finally { setCreating(false); }
  }, [newTitle, newFrom, newTo, newDept, newContent, load]);

  const handleAdvance = useCallback(async (item: HandoverRow) => {
    const next = STATUS_CFG[item.status]?.next || "in_progress";
    await updateHandover(item.id, { status: next }).catch(() => {});
    void load();
  }, [load]);

  const handleDelete = useCallback((item: HandoverRow) => {
    Alert.alert("حذف", `حذف "${item.title}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: async () => {
        await deleteHandover(item.id).catch(() => {});
        void load();
      }},
    ]);
  }, [load]);

  const handleAnalyze = useCallback(async (item: HandoverRow) => {
    setAnalyzingId(item.id);
    try {
      const r = await analyzeHandover(item.id);
      setAnalysisMap(prev => ({ ...prev, [item.id]: r.analysis }));
    } catch { Alert.alert("خطأ", "تعذّر التحليل."); }
    finally { setAnalyzingId(null); }
  }, []);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const r = await importHandoversToKnowledge();
      Alert.alert("تم", `استُورد ${r.imported} عنصر إلى قاعدة المعرفة.`);
    } catch { Alert.alert("خطأ", "تعذّر الاستيراد."); }
    finally { setImporting(false); }
  }, []);

  const avgScore = items.length
    ? Math.round(items.reduce((s, i) => s + (i.score || 0), 0) / items.length) : 0;

  if (loading && !refreshing) {
    return (
      <Screen style={{ backgroundColor: c.mediaCanvas }}>
        <CompanyWorkModeTopBar />
        <AppHeader title="التسليمات" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={c.accentCyan} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      <CompanyWorkModeTopBar />
      <AppHeader
        title="التسليمات"
        rightActions={
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowAICompose(true)}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${c.accentCyan}22`, borderWidth: 1, borderColor: `${c.accentCyan}55`, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="sparkles-outline" size={18} color={c.accentCyan} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCreate(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${c.accentCyan}22`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: c.accentCyan }}
            >
              <Ionicons name="add" size={16} color={c.accentCyan} />
              <AppText style={{ color: c.accentCyan, fontSize: 13, fontWeight: "700" }}>جديدة</AppText>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={c.accentCyan} />}
      >
        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[
            { v: items.length,                                              l: "الإجمالي",     col: c.accentCyan },
            { v: items.filter(i => i.status === "in_progress").length,     l: "جارية",        col: "#60A5FA"    },
            { v: items.filter(i => i.status === "accepted").length,        l: "مقبولة",       col: "#34D399"    },
            { v: `${avgScore}%`,                                            l: "متوسط الدرجة", col: "#FBBF24"    },
          ].map(s => (
            <View key={s.l} style={{ flex: 1, backgroundColor: `${s.col}12`, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", gap: 3, borderWidth: 1, borderColor: `${s.col}30` }}>
              <AppText style={{ fontSize: 18, fontWeight: "800", color: s.col }}>{s.v}</AppText>
              <AppText variant="micro" tone="muted" style={{ textAlign: "center" }}>{s.l}</AppText>
            </View>
          ))}
        </View>

        {/* Import to KB button */}
        <TouchableOpacity
          onPress={handleImport} disabled={importing}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(167,139,250,0.12)", borderRadius: 14, paddingVertical: 11, borderWidth: 1, borderColor: "#A78BFA", marginBottom: 16 }}
        >
          {importing ? <ActivityIndicator size="small" color="#A78BFA" /> : <AppText style={{ fontSize: 16 }}>🧠</AppText>}
          <AppText style={{ color: "#A78BFA", fontWeight: "700", fontSize: 13 }}>
            {importing ? "جارٍ الاستيراد..." : "استيراد إلى قاعدة المعرفة"}
          </AppText>
        </TouchableOpacity>

        {/* List */}
        {items.length === 0 ? (
          <View style={{ backgroundColor: c.bgCard, borderRadius: 16, padding: 28, alignItems: "center", gap: 10, borderWidth: 1, borderColor: c.border }}>
            <AppText style={{ fontSize: 40 }}>🔄</AppText>
            <AppText variant="bodySm" weight="bold">لا توجد تسليمات</AppText>
            <AppText variant="caption" tone="muted" style={{ textAlign: "center" }}>أنشئ تسليمة لنقل المعرفة بين الموظفين</AppText>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {items.map(item => {
              const cfg = STATUS_CFG[item.status] || STATUS_CFG.pending;
              const expanded = expandedId === item.id;
              const sc = scoreColor(item.score || 0);
              const prog = item.tasks > 0 ? Math.min((item.completed_tasks / item.tasks) * 100, 100) : 0;
              const aiText = analysisMap[item.id];

              return (
                <View key={item.id} style={{ backgroundColor: c.bgCard, borderRadius: 18, borderWidth: 1, borderColor: expanded ? cfg.color : c.border, overflow: "hidden" }}>
                  <View style={{ height: 3, backgroundColor: cfg.color }} />

                  <TouchableOpacity onPress={() => setExpandedId(expanded ? null : item.id)} activeOpacity={0.85}>
                    <View style={{ padding: 14 }}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: `${cfg.color}20`, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <AppText style={{ fontSize: 22 }}>🔄</AppText>
                        </View>
                        <View style={{ flex: 1, gap: 5 }}>
                          <AppText variant="bodySm" weight="bold" numberOfLines={1}>{item.title}</AppText>
                          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${cfg.color}20`, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.color }} />
                              <AppText style={{ fontSize: 11, color: cfg.color, fontWeight: "700" }}>{cfg.label}</AppText>
                            </View>
                            <View style={{ backgroundColor: `${sc}20`, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 }}>
                              <AppText style={{ fontSize: 11, color: sc, fontWeight: "700" }}>{item.score || 0}%</AppText>
                            </View>
                          </View>
                          {(item.from_person || item.to_person) && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              {item.from_person ? <AppText variant="micro" tone="muted">{item.from_person}</AppText> : null}
                              {item.from_person && item.to_person ? <Ionicons name="arrow-forward" size={10} color={c.textMuted} /> : null}
                              {item.to_person ? <AppText variant="micro" tone="muted">{item.to_person}</AppText> : null}
                            </View>
                          )}
                        </View>
                        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} />
                      </View>

                      {item.tasks > 0 && (
                        <View style={{ marginTop: 10, gap: 5 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <AppText variant="micro" tone="muted">المهام</AppText>
                            <AppText variant="micro" weight="bold" style={{ color: sc }}>{item.completed_tasks}/{item.tasks}</AppText>
                          </View>
                          <View style={{ height: 5, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                            <View style={{ width: `${prog}%`, height: "100%", backgroundColor: sc, borderRadius: 3 }} />
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {expanded && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderTopColor: c.border }}>
                      {/* Meta row */}
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                        {item.department && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                            <Ionicons name="business-outline" size={12} color={c.textMuted} />
                            <AppText variant="micro" tone="muted">{item.department}</AppText>
                          </View>
                        )}
                        {item.risk_level && (
                          <View style={{
                            flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
                            backgroundColor: item.risk_level === "critical" ? "#ef444420" : item.risk_level === "high" ? "#f59e0b20" : "#6b728020",
                          }}>
                            <Ionicons name="warning-outline" size={12} color={item.risk_level === "critical" ? "#ef4444" : item.risk_level === "high" ? "#f59e0b" : "#6b7280"} />
                            <AppText variant="micro" style={{ color: item.risk_level === "critical" ? "#ef4444" : item.risk_level === "high" ? "#f59e0b" : "#6b7280", fontWeight: "700" }}>
                              مخاطرة {item.risk_level === "critical" ? "حرجة" : item.risk_level === "high" ? "عالية" : item.risk_level === "medium" ? "متوسطة" : "منخفضة"}
                            </AppText>
                          </View>
                        )}
                      </View>

                      {/* Pending actions checklist */}
                      {item.pending_actions && item.pending_actions.length > 0 && (
                        <View style={{ backgroundColor: "rgba(251,191,36,0.07)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(251,191,36,0.2)" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <Ionicons name="checkmark-done-outline" size={14} color="#FBBF24" />
                            <AppText variant="caption" weight="bold" style={{ color: "#FBBF24" }}>الإجراءات المعلقة</AppText>
                            <View style={{ backgroundColor: "#FBBF2430", paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8 }}>
                              <AppText style={{ color: "#FBBF24", fontSize: 10, fontWeight: "700" }}>{item.pending_actions.length}</AppText>
                            </View>
                          </View>
                          {item.pending_actions.map((action, idx) => (
                            <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: idx < item.pending_actions!.length - 1 ? 8 : 0 }}>
                              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: "#FBBF24", alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FBBF2444" }} />
                              </View>
                              <AppText variant="caption" style={{ flex: 1, lineHeight: 20 }}>{action}</AppText>
                            </View>
                          ))}
                        </View>
                      )}

                      {item.content && (
                        <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12 }}>
                          <AppText variant="caption" style={{ lineHeight: 20 }}>{item.content}</AppText>
                        </View>
                      )}

                      {/* AI Result */}
                      {aiText && (
                        <View style={{ backgroundColor: "rgba(96,165,250,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(96,165,250,0.25)" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <AppText style={{ fontSize: 14 }}>✨</AppText>
                            <AppText variant="caption" weight="bold" style={{ color: "#60A5FA" }}>تحليل الذكاء الاصطناعي</AppText>
                          </View>
                          <AppText variant="caption" style={{ lineHeight: 20 }}>{aiText}</AppText>
                        </View>
                      )}

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => setSmartSummaryFor(item)}
                          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(0,212,255,0.14)", borderWidth: 1, borderColor: "#00D4FF" }}
                        >
                          <AppText style={{ fontSize: 13 }}>⚡</AppText>
                          <AppText style={{ color: "#00D4FF", fontWeight: "800", fontSize: 12 }}>ملخص ذكي</AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleAnalyze(item)}
                          disabled={analyzingId === item.id}
                          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(96,165,250,0.12)", borderWidth: 1, borderColor: "#60A5FA", opacity: analyzingId === item.id ? 0.6 : 1 }}
                        >
                          {analyzingId === item.id ? <ActivityIndicator size="small" color="#60A5FA" /> : <AppText style={{ fontSize: 13 }}>✨</AppText>}
                          <AppText style={{ color: "#60A5FA", fontWeight: "700", fontSize: 12 }}>تحليل</AppText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleAdvance(item)}
                          style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: `${cfg.color}18`, borderWidth: 1, borderColor: cfg.color }}
                        >
                          <AppText style={{ color: cfg.color, fontWeight: "700", fontSize: 12 }}>{STATUS_CFG[cfg.next]?.label ?? "تقدّم"}</AppText>
                          <Ionicons name="arrow-forward" size={13} color={cfg.color} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDelete(item)}
                          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(248,113,113,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(248,113,113,0.3)" }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#F87171" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: "center", marginBottom: 4 }} />
            <AppText variant="bodySm" weight="bold" style={{ textAlign: "right" }}>تسليمة جديدة</AppText>

            <Field value={newTitle}   onChange={setNewTitle}   placeholder="عنوان التسليمة *" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field value={newFrom} onChange={setNewFrom} placeholder="من (المسلِّم)" />
              </View>
              <View style={{ flex: 1 }}>
                <Field value={newTo}   onChange={setNewTo}   placeholder="إلى (المستلِم)" />
              </View>
            </View>
            <Field value={newDept}    onChange={setNewDept}    placeholder="القسم / الدائرة" />
            <Field value={newContent} onChange={setNewContent} placeholder="المحتوى — العمليات، المعرفة، الملاحظات..." multiline />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" }}>
                <AppText style={{ color: c.textMuted, fontWeight: "700" }}>إلغاء</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} disabled={!newTitle.trim() || creating} style={{ flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: !newTitle.trim() ? "rgba(255,255,255,0.08)" : c.accentCyan, alignItems: "center" }}>
                {creating ? <ActivityIndicator color="#000" /> : (
                  <AppText style={{ color: !newTitle.trim() ? c.textMuted : "#000", fontWeight: "800" }}>حفظ</AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AIComposeSheet
        visible={showAICompose}
        mode="handover"
        onClose={() => setShowAICompose(false)}
        onSaved={() => { setShowAICompose(false); setLoading(true); void load(); }}
      />

      <AISummaryModal
        visible={!!smartSummaryFor}
        onClose={() => setSmartSummaryFor(null)}
        title={`ملخص ذكي: ${smartSummaryFor?.title ?? ""}`}
        subtitle="Overview · Action items · Risks · Start today with"
        accentColor="#00D4FF"
        fetcher={() => summarizeHandover(smartSummaryFor!.id)}
      />
    </Screen>
  );
}
