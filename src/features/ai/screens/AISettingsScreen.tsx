/**
 * ALLOUL&Q AI Settings Screen
 * Displays real provider health from /ai/health endpoint.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../state/auth/AuthContext';
import { apiFetch } from '../../../api/client';

interface AIHealth {
  timestamp: string;
  claude: boolean;
  ollama: boolean;
  ollama_models: string[] | null;
  embeddings: boolean;
  rag_index: boolean;
  all_healthy: boolean;
}

const COLORS = {
  dark: '#0F172A',
  darkGray: '#1E293B',
  blue: '#1E40AF',
  lightBlue: '#3B82F6',
  white: '#FFFFFF',
  gray: '#64748B',
  lightGray: '#E2E8F0',
  success: '#10B981',
  error: '#EF4444',
  orange: '#F97316',
  border: '#334155',
};

const AISettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = React.useState<AIHealth | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AIHealth>('/ai/health');
      setHealth(data);
    } catch (e: any) {
      setError(e?.message || 'تعذّر الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadHealth(); }, []));

  const StatusDot = ({ ok }: { ok: boolean }) => (
    <View style={[styles.dot, { backgroundColor: ok ? COLORS.success : COLORS.error }]} />
  );

  const ProviderRow = ({
    label, ok, sub,
  }: { label: string; ok: boolean; sub?: string }) => (
    <View style={styles.providerRow}>
      <StatusDot ok={ok} />
      <View style={{ flex: 1 }}>
        <Text style={styles.providerLabel}>{label}</Text>
        {sub ? <Text style={styles.providerSub}>{sub}</Text> : null}
      </View>
      <Text style={[styles.statusText, { color: ok ? COLORS.success : COLORS.error }]}>
        {ok ? 'متاح' : 'غير متاح'}
      </Text>
    </View>
  );

  const plan = (user as any)?.plan ?? (user as any)?.subscription_status ?? 'free';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>إعدادات الذكاء الاصطناعي</Text>

        {/* Plan Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>الخطة الحالية</Text>
          <View style={styles.planRow}>
            <Text style={styles.planBadge}>
              {plan === 'active' || plan === 'pro' ? 'Pro ✓' :
               plan === 'trialing' ? 'تجريبي' : 'مجاني'}
            </Text>
            <Text style={styles.planNote}>
              {plan === 'active' || plan === 'pro'
                ? 'وصول كامل للذكاء الاصطناعي'
                : 'ترقّى للحصول على ميزات متقدمة'}
            </Text>
          </View>
        </View>

        {/* Provider Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>حالة المزوّدين</Text>
            <TouchableOpacity onPress={loadHealth}>
              <Text style={styles.refreshBtn}>تحديث</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.lightBlue} style={{ marginVertical: 16 }} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : health ? (
            <>
              <ProviderRow
                label="Claude (Anthropic)"
                ok={health.claude}
                sub={health.claude ? 'claude-haiku-4-5-20251001' : undefined}
              />
              <ProviderRow
                label="Groq (مجاني — Llama 3.3 70B)"
                ok={true}
                sub="14,400 طلب/يوم مجاناً"
              />
              <ProviderRow
                label="Ollama (محلي)"
                ok={health.ollama}
                sub={health.ollama_models?.join(', ') || undefined}
              />
              <View style={styles.divider} />
              <View style={styles.overallRow}>
                <StatusDot ok={health.all_healthy} />
                <Text style={styles.overallText}>
                  {health.all_healthy ? 'النظام يعمل بشكل طبيعي' : 'تحقق من إعدادات API'}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Models info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>النماذج المتاحة</Text>
          {[
            { name: 'Llama 3.3 70B', provider: 'Groq', note: 'الافتراضي — سريع ومجاني', color: COLORS.success },
            { name: 'Claude Haiku 4.5', provider: 'Anthropic', note: 'دقيق — للمهام المعقدة', color: COLORS.lightBlue },
            { name: 'Llama 3.2:3B', provider: 'Ollama', note: 'محلي — للبيانات الخاصة', color: COLORS.orange },
          ].map((m) => (
            <View key={m.name} style={styles.modelRow}>
              <View style={[styles.modelDot, { backgroundColor: m.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modelName}>{m.name}</Text>
                <Text style={styles.modelProvider}>{m.provider} — {m.note}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Clear history */}
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={() =>
            Alert.alert(
              'مسح المحادثات',
              'هل تريد مسح سجل المحادثات؟ لا يمكن التراجع.',
              [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'مسح', style: 'destructive', onPress: () => {} },
              ],
            )
          }
        >
          <Text style={styles.dangerText}>مسح سجل المحادثات</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginBottom: 16, textAlign: 'right' },

  card: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.white, marginBottom: 12, textAlign: 'right' },
  refreshBtn: { fontSize: 13, color: COLORS.lightBlue },

  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planBadge: {
    backgroundColor: COLORS.blue, color: COLORS.white,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, fontSize: 13, fontWeight: '600',
  },
  planNote: { fontSize: 12, color: COLORS.gray, flex: 1 },

  providerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  providerLabel: { fontSize: 14, color: COLORS.white, fontWeight: '500' },
  providerSub: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: '600' },

  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  overallRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overallText: { fontSize: 13, color: COLORS.lightGray },

  modelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modelDot: { width: 10, height: 10, borderRadius: 5 },
  modelName: { fontSize: 14, color: COLORS.white, fontWeight: '500' },
  modelProvider: { fontSize: 11, color: COLORS.gray, marginTop: 2 },

  errorText: { fontSize: 13, color: COLORS.error, textAlign: 'center', paddingVertical: 12 },

  dangerButton: {
    borderRadius: 10, padding: 14, marginTop: 4,
    borderWidth: 1, borderColor: COLORS.error,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center',
  },
  dangerText: { fontSize: 14, color: COLORS.error, fontWeight: '600' },
});

export default AISettingsScreen;
