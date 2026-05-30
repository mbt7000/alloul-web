/**
 * WebLandingScreen — Dark SaaS landing page
 * Arabic RTL · Animated · Mobile + Desktop responsive
 */
import React, { useEffect, useRef } from "react";
import {
  View, ScrollView, Pressable, Image,
  Animated, Dimensions, StyleSheet,
} from "react-native";
import AppText from "../../shared/ui/AppText";

const { width: W } = Dimensions.get("window");
const IS_WIDE = W > 900;
const IS_MED  = W > 600;

// ─── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "🤝",
    title: "التسليم والاستلام الذكي",
    body: "وثّق كل معرفة مؤسسية وسلّمها بشكل منظم. لا مزيد من المعلومات الضائعة عند انتقال الموظفين.",
    accent: "#38e8ff",
    tags: ["تحليل AI", "تقدم مهام", "مستوى الخطر"],
  },
  {
    icon: "🤖",
    title: "مساعد ذكاء اصطناعي متكامل",
    body: "مساعد AI يحلل التسليمات، يقترح توصيات ذكية، ويجيب على استفسارات فريقك في الوقت الفعلي.",
    accent: "#a78bfa",
    tags: ["Claude AI", "تحليل فوري", "توصيات ذكية"],
  },
  {
    icon: "👥",
    title: "إدارة الفريق والهيكل التنظيمي",
    body: "Work IDs فريدة لكل موظف، هيكل هرمي واضح، وصلاحيات دقيقة لكل مستوى في المنظمة.",
    accent: "#34d399",
    tags: ["Work ID", "أدوار", "صلاحيات"],
  },
  {
    icon: "📊",
    title: "لوحة تحكم بمؤشرات صحة المنظمة",
    body: "قياس صحة الشركة لحظة بلحظة: معدل اكتمال التسليمات، استقرار الفريق، مستوى التوثيق.",
    accent: "#f59e0b",
    tags: ["مؤشرات KPI", "تقارير", "تحليلات"],
  },
  {
    icon: "📋",
    title: "المشاريع والمهام",
    body: "إدارة المشاريع بنظام Kanban أو قائمة، تتبع تقدم المهام، وربط كل شيء بفريقك.",
    accent: "#60a5fa",
    tags: ["Kanban", "تتبع", "تعاون"],
  },
  {
    icon: "🔗",
    title: "CRM والصفقات",
    body: "تتبع العملاء المحتملين، مراحل الصفقات، واحتمالية الإغلاق — كل ذلك داخل مساحة عملك.",
    accent: "#fb7185",
    tags: ["عملاء", "صفقات", "تحويل"],
  },
];

const STATS = [
  { value: "٦+",   label: "خدمات مؤسسية متكاملة", color: "#38e8ff",  icon: "🏢" },
  { value: "AI",   label: "مدعوم بالذكاء الاصطناعي", color: "#a78bfa", icon: "🤖" },
  { value: "١٠٠٪", label: "آمن ومشفّر بالكامل",     color: "#34d399",  icon: "🔒" },
  { value: "∞",    label: "تسليمات غير محدودة",       color: "#f59e0b",  icon: "♾️" },
];

const STEPS = [
  { n: "١", color: "#38e8ff", title: "أنشئ شركتك",  body: "سجّل في دقيقة وأضف فريقك بكود دعوة بسيط" },
  { n: "٢", color: "#a78bfa", title: "وثّق معرفتك", body: "أنشئ تسليمات احترافية بمساعدة الذكاء الاصطناعي" },
  { n: "٣", color: "#34d399", title: "أدِر وتابع",  body: "لوحة تحكم شاملة تعطيك رؤية كاملة لحظة بلحظة" },
];

const MARQUEE_ITEMS = [
  "التسليم الذكي", "إدارة الفريق", "الذكاء الاصطناعي",
  "المشاريع", "الصفقات", "CRM", "الموافقات", "الوظائف",
  "التحليلات", "Work ID", "Claude AI", "B2B",
];

// ─── Animation helper — web-safe, minimal ─────────────────────────────────────

function useFadeIn(delay: number) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 500, delay, useNativeDriver: true,
    }).start();
  }, [anim, delay]);
  return { opacity: anim };
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface Props { onEnter: () => void }

export default function WebLandingScreen({ onEnter }: Props) {
  // Only 2 Animated.Value instances total — hero + badge pulse
  const heroFade = useRef(new Animated.Value(0)).current;
  const pulse    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(heroFade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  /* eslint-disable react-hooks/rules-of-hooks */
  const sectionFade  = useFadeIn(200);
  const ctaAnim      = useFadeIn(200);
  /* eslint-enable react-hooks/rules-of-hooks */

  return (
    <View style={s.root}>
      {/* Background glow blobs */}
      <View style={s.blobTopRight}   pointerEvents="none" />
      <View style={s.blobBottomLeft} pointerEvents="none" />
      <View style={s.blobCenter}     pointerEvents="none" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── NAV ─────────────────────────────────────────────────────────── */}
        <View style={s.nav}>
          <Image
            source={require("../../../assets/logo/alloul-logo-dark.png")}
            style={s.navLogo}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }} />
          <Pressable style={s.navLoginBtn} onPress={onEnter}>
            <AppText style={s.navLoginTxt}>تسجيل الدخول</AppText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.navCta, pressed && { opacity: 0.85 }]}
            onPress={onEnter}
          >
            <AppText style={s.navCtaTxt}>ابدأ مجاناً</AppText>
          </Pressable>
        </View>

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <Animated.View style={[s.hero, { opacity: heroFade }]}>
          {/* Animated badge */}
          <View style={s.heroBadge}>
            <Animated.View style={[s.heroBadgeDot, { transform: [{ scale: pulse }] }]} />
            <AppText style={s.heroBadgeTxt}>منصة B2B · مدعومة بـ Claude AI</AppText>
          </View>

          {/* Headline */}
          <AppText style={[s.heroH1, IS_WIDE && s.heroH1Wide]}>
            المنصة الذكية{"\n"}
            <AppText style={[s.heroH1, IS_WIDE && s.heroH1Wide, s.heroH1Accent]}>
              لإدارة الشركات
            </AppText>
          </AppText>

          <AppText style={[s.heroSub, IS_WIDE && s.heroSubWide]}>
            من التسليم الوظيفي الذكي إلى إدارة الفريق والمشاريع والصفقات —{"\n"}
            كل ما تحتاجه مؤسستك في مكان واحد، مدعوم بالذكاء الاصطناعي.
          </AppText>

          {/* CTAs */}
          <View style={s.heroCtas}>
            <Pressable
              style={({ pressed }) => [s.ctaPrimary, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}
              onPress={onEnter}
            >
              <AppText style={s.ctaPrimaryTxt}>ابدأ مجاناً ←</AppText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.ctaSecondary, pressed && { opacity: 0.7 }]}
              onPress={onEnter}
            >
              <AppText style={s.ctaSecondaryTxt}>تسجيل الدخول</AppText>
            </Pressable>
          </View>

          <AppText style={s.heroTrust}>لا بطاقة ائتمان · مجاني للبدء · آمن ١٠٠٪</AppText>

          {/* Feature pills marquee */}
          <View style={s.marqueeWrap}>
            <View style={s.marqueeRow}>
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <View key={`${item}-${i}`} style={s.marqueeItem}>
                  <View style={s.marqueeDot} />
                  <AppText style={s.marqueeTxt}>{item}</AppText>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── DIVIDER ─────────────────────────────────────────────────────── */}
        <View style={s.divLine} />

        {/* ── STATS BAR ───────────────────────────────────────────────────── */}
        <Animated.View style={[s.statsSection, sectionFade]}>
          <View style={[s.statsRow, IS_WIDE && s.statsRowWide]}>
            {STATS.map((stat) => (
              <View key={stat.label} style={s.statItem}>
                <AppText style={s.statIcon}>{stat.icon}</AppText>
                <AppText style={[s.statVal, { color: stat.color }]}>{stat.value}</AppText>
                <AppText style={s.statLbl}>{stat.label}</AppText>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── FEATURES SECTION ────────────────────────────────────────────── */}
        <Animated.View style={sectionFade}>
          <SectionLabel
            eyebrow="الميزات"
            title="كل ما تحتاجه مؤسستك"
            sub="منصة متكاملة تجمع التسليم الذكي، إدارة الفريق، المشاريع، والذكاء الاصطناعي في واجهة واحدة."
          />
        </Animated.View>

        <View style={[s.grid, IS_WIDE && s.gridWide]}>
          {FEATURES.map((f) => (
            <View
              key={f.title}
              style={[
                s.card,
                IS_WIDE && s.cardWide,
                IS_MED && !IS_WIDE && s.cardMed,
              ]}
            >
              <View style={[s.cardBar, { backgroundColor: f.accent }]} />
              <View style={s.cardInner}>
                <View style={s.cardTop}>
                  <AppText style={s.cardIcon}>{f.icon}</AppText>
                  <View style={[s.cardAccentDot, { backgroundColor: f.accent + "30", borderColor: f.accent + "50" }]}>
                    <View style={[s.cardAccentDotInner, { backgroundColor: f.accent }]} />
                  </View>
                </View>
                <AppText style={s.cardTitle}>{f.title}</AppText>
                <AppText style={s.cardBody}>{f.body}</AppText>
                <View style={s.tagRow}>
                  {f.tags.map((t) => (
                    <View key={t} style={[s.tag, { borderColor: f.accent + "44", backgroundColor: f.accent + "10" }]}>
                      <AppText style={[s.tagTxt, { color: f.accent }]}>{t}</AppText>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
        <SectionLabel
          eyebrow="كيف تبدأ"
          title="ثلاث خطوات للانطلاق"
          sub="ابدأ خلال دقائق — لا إعداد معقد، لا تدريب طويل."
        />

        <View style={[s.stepsRow, IS_WIDE && s.stepsRowWide]}>
          {STEPS.map((step, i) => (
            <View key={step.n} style={[s.step, IS_WIDE && s.stepWide]}>
              <View style={[s.stepCircle, { backgroundColor: step.color + "20", borderColor: step.color + "40" }]}>
                <AppText style={[s.stepN, { color: step.color }]}>{step.n}</AppText>
              </View>
              {i < STEPS.length - 1 && IS_WIDE && (
                <View style={s.stepConnector}>
                  <View style={[s.stepConnectorLine, { backgroundColor: step.color + "30" }]} />
                </View>
              )}
              <AppText style={[s.stepTitle, { color: step.color }]}>{step.title}</AppText>
              <AppText style={s.stepBody}>{step.body}</AppText>
            </View>
          ))}
        </View>

        {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
        <Animated.View style={[s.finalCta, ctaAnim]}>
          <View style={s.finalCtaGlow} pointerEvents="none" />
          <View style={s.finalBadge}>
            <AppText style={s.finalBadgeTxt}>🚀 جاهز للبدء؟</AppText>
          </View>
          <AppText style={s.finalH}>حوّل إدارة شركتك اليوم</AppText>
          <AppText style={s.finalSub}>
            انضم الآن وابدأ بتوثيق معرفتك المؤسسية بشكل احترافي
          </AppText>
          <Pressable
            style={({ pressed }) => [
              s.ctaPrimary, s.finalBtn,
              pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
            ]}
            onPress={onEnter}
          >
            <AppText style={s.ctaPrimaryTxt}>ابدأ مجاناً — إنشاء حساب ←</AppText>
          </Pressable>
          <Pressable onPress={onEnter} style={{ marginTop: 16 }}>
            <AppText style={s.finalLink}>لديك حساب؟ سجّل الدخول</AppText>
          </Pressable>
        </Animated.View>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Image
            source={require("../../../assets/logo/alloul-logo-dark.png")}
            style={s.footerLogo}
            resizeMode="contain"
          />
          <AppText style={s.footerLine}>المنصة الذكية لإدارة الشركات · مدعوم بـ Claude AI</AppText>
          <AppText style={s.footerCopy}>© 2026 ALLOUL&Q · جميع الحقوق محفوظة</AppText>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <View style={sl.wrap}>
      <View style={sl.eyebrowRow}>
        <View style={sl.eyebrowDot} />
        <AppText style={sl.eyebrow}>{eyebrow}</AppText>
      </View>
      <AppText style={sl.title}>{title}</AppText>
      <AppText style={sl.sub}>{sub}</AppText>
    </View>
  );
}

const sl = StyleSheet.create({
  wrap:       { alignItems: "center", paddingHorizontal: 24, marginBottom: 40, marginTop: 64 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#38e8ff" },
  eyebrow:    { color: "#38e8ff", fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  title:      { color: "#fff",   fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 12, lineHeight: 38 },
  sub:        { color: "#555",   fontSize: 15, textAlign: "center", lineHeight: 26, maxWidth: 560 },
});

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#020204" },
  scroll: { alignItems: "center" },

  // Background glow blobs
  blobTopRight: {
    position: "absolute", width: 700, height: 700, borderRadius: 350,
    backgroundColor: "#38e8ff", opacity: 0.025, top: -250, right: -250,
  },
  blobBottomLeft: {
    position: "absolute", width: 500, height: 500, borderRadius: 250,
    backgroundColor: "#a78bfa", opacity: 0.025, bottom: 500, left: -200,
  },
  blobCenter: {
    position: "absolute", width: 800, height: 800, borderRadius: 400,
    backgroundColor: "#34d399", opacity: 0.012, top: 1000, alignSelf: "center",
  },

  // ── Nav ────────────────────────────────────────────────────────────────────

  nav: {
    flexDirection: "row", alignItems: "center",
    width: "100%", maxWidth: 1100,
    paddingHorizontal: 32, paddingVertical: 18,
  },
  navLogo:     { width: 120, height: 36 },
  navLoginBtn: { paddingHorizontal: 16, paddingVertical: 8, marginLeft: 8 },
  navLoginTxt: { color: "#666", fontSize: 14, fontWeight: "600" },
  navCta: {
    backgroundColor: "#fff",
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10,
  },
  navCtaTxt: { color: "#000", fontSize: 13, fontWeight: "700" },

  // ── Hero ───────────────────────────────────────────────────────────────────

  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
    width: "100%",
    maxWidth: 900,
  },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(56,232,255,0.06)",
    borderWidth: 1, borderColor: "rgba(56,232,255,0.14)",
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 32,
  },
  heroBadgeDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: "#38e8ff",
  },
  heroBadgeTxt: { color: "#38e8ff", fontSize: 12, fontWeight: "600" },

  heroH1: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 56,
    letterSpacing: -1,
    marginBottom: 20,
  },
  heroH1Wide:   { fontSize: 68, lineHeight: 84 },
  heroH1Accent: { color: "#38e8ff" },

  heroSub: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 28,
    maxWidth: 520,
    marginBottom: 36,
  },
  heroSubWide: { fontSize: 18, lineHeight: 32 },

  heroCtas: { flexDirection: "row", gap: 14, marginBottom: 20 },

  ctaPrimary: {
    backgroundColor: "#38e8ff",
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#38e8ff",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  ctaPrimaryTxt: { color: "#000", fontSize: 15, fontWeight: "800" },

  ctaSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 12,
  },
  ctaSecondaryTxt: { color: "#888", fontSize: 15, fontWeight: "600" },

  heroTrust: { color: "#333", fontSize: 12, marginBottom: 36 },

  // Marquee
  marqueeWrap: {
    width: "100%",
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingVertical: 14, overflow: "hidden",
  },
  marqueeRow: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "center", gap: 8, paddingHorizontal: 8,
  },
  marqueeItem: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  marqueeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#38e8ff" },
  marqueeTxt: { color: "#555", fontSize: 12, fontWeight: "600" },

  // Divider
  divLine: {
    width: "90%", height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginVertical: 8,
  },

  // Stats
  statsSection: {
    width: "100%", maxWidth: 1100,
    paddingHorizontal: 24, paddingVertical: 40,
  },
  statsRow: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "center", gap: 16,
  },
  statsRowWide: { gap: 24, flexWrap: "nowrap" },
  statItem: {
    alignItems: "center", flex: 1,
    minWidth: 130,
    backgroundColor: "#0e0e0e",
    borderRadius: 20,
    borderWidth: 1, borderColor: "#1e1e1e",
    padding: 24,
  },
  statIcon: { fontSize: 24, marginBottom: 10 },
  statVal:  { fontSize: 32, fontWeight: "900", marginBottom: 4 },
  statLbl:  { color: "#555", fontSize: 12, textAlign: "center", fontWeight: "500" },

  // Features grid
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 16, width: "100%", maxWidth: 1100,
    paddingHorizontal: 24,
    justifyContent: "center",
    marginBottom: 8,
  },
  gridWide: { gap: 20 },
  card: {
    backgroundColor: "#0c0c0c",
    borderRadius: 20,
    borderWidth: 1, borderColor: "#1a1a1a",
    overflow: "hidden",
    flex: 1, minWidth: 280, maxWidth: 340,
  },
  cardWide: { maxWidth: 320 },
  cardMed:  { maxWidth: 360 },
  cardBar:  { height: 3, width: "100%" },
  cardInner: { padding: 22 },
  cardTop: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 14,
  },
  cardIcon:       { fontSize: 28 },
  cardAccentDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  cardAccentDotInner: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 10, lineHeight: 22 },
  cardBody:  { color: "#555", fontSize: 13, lineHeight: 22, marginBottom: 16 },
  tagRow:    { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag:       { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagTxt:    { fontSize: 11, fontWeight: "700" },

  // Steps
  stepsRow: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 16, width: "100%", maxWidth: 1100,
    paddingHorizontal: 24,
    justifyContent: "center",
    marginBottom: 64,
  },
  stepsRowWide: { flexWrap: "nowrap", gap: 0 },
  step: {
    alignItems: "center", padding: 28,
    backgroundColor: "#0c0c0c",
    borderRadius: 20, borderWidth: 1, borderColor: "#1a1a1a",
    flex: 1, minWidth: 200,
    position: "relative",
  },
  stepWide: {},
  stepCircle: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  stepN:     { fontSize: 22, fontWeight: "900" },
  stepConnector: {
    position: "absolute", top: 50, right: -20,
    width: 40, height: 2, justifyContent: "center", zIndex: 1,
  },
  stepConnectorLine: { height: 2, borderRadius: 1 },
  stepTitle: { fontSize: 15, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  stepBody:  { color: "#555", fontSize: 13, textAlign: "center", lineHeight: 22 },

  // Final CTA
  finalCta: {
    alignItems: "center",
    paddingHorizontal: 32, paddingVertical: 72,
    width: "100%", maxWidth: 700,
    position: "relative",
  },
  finalCtaGlow: {
    position: "absolute",
    width: 400, height: 400, borderRadius: 200,
    backgroundColor: "#38e8ff", opacity: 0.03,
    top: "50%", alignSelf: "center",
  },
  finalBadge: {
    backgroundColor: "rgba(56,232,255,0.07)",
    borderWidth: 1, borderColor: "rgba(56,232,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 8,
    marginBottom: 24,
  },
  finalBadgeTxt: { color: "#38e8ff", fontSize: 13, fontWeight: "700" },
  finalH: {
    color: "#fff", fontSize: IS_WIDE ? 40 : 28, fontWeight: "900",
    textAlign: "center", marginBottom: 16, lineHeight: IS_WIDE ? 52 : 38,
  },
  finalSub: {
    color: "#555", fontSize: 16, textAlign: "center",
    lineHeight: 26, marginBottom: 32, maxWidth: 480,
  },
  finalBtn: {
    paddingHorizontal: 40, paddingVertical: 16,
    borderRadius: 14,
  },
  finalLink: { color: "#444", fontSize: 14 },

  // Footer
  footer: {
    width: "100%",
    borderTopWidth: 1, borderTopColor: "#111",
    paddingVertical: 40, paddingHorizontal: 32,
    alignItems: "center", gap: 8,
    backgroundColor: "#020204",
  },
  footerLogo: { width: 100, height: 30, marginBottom: 4 },
  footerLine: { color: "#444", fontSize: 13 },
  footerCopy: { color: "#2a2a2a", fontSize: 12 },
});
