import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Pressable, Animated, I18nManager, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import AppText from "../ui/AppText";
import type { HomeAppMode } from "../../state/mode/HomeModeContext";

type Props = {
  firstName: string;
  mode: HomeAppMode;
  onModeChange: (m: HomeAppMode) => void;
  companyName?: string | null;
  companyLoading?: boolean;
  canUseCompanyMode?: boolean;
  onSearch?: () => void;
  onNotifications: () => void;
  /** Unified inbox / server notification unread count (dot when count is above zero). */
  inboxUnreadCount?: number;
  /** Compact ALLOUL&Q-style strip for media feed (globe pill + mode). */
  variant?: "default" | "mediaStrip";
};

export default function HomeSmartHeader({
  firstName,
  mode,
  onModeChange,
  companyName,
  companyLoading,
  canUseCompanyMode = false,
  onSearch,
  onNotifications,
  inboxUnreadCount = 0,
  variant = "default",
}: Props) {
  const isMedia = mode === "public";
  const isRTL = I18nManager.isRTL;
  const trackInset = 6;
  const segmentGap = 8;
  const [trackWidth, setTrackWidth] = useState(0);
  const slide = useRef(new Animated.Value(isMedia ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: isMedia ? 0 : 1,
      damping: 18,
      stiffness: 220,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [isMedia, slide]);

  const segmentWidth = trackWidth > 0 ? Math.max((trackWidth - trackInset * 2 - segmentGap) / 2, 0) : 0;
  const knobTravel = segmentWidth + segmentGap;
  const knobTranslate = useMemo(
    () =>
      slide.interpolate({
        inputRange: [0, 1],
        outputRange: [0, isRTL ? -knobTravel : knobTravel],
      }),
    [isRTL, knobTravel, slide]
  );

  const subtitle =
    isMedia
      ? "واجهة خفيفة وسريعة لاكتشاف المحتوى والبحث والمتابعة."
      : companyLoading
        ? "جارٍ تجهيز مساحة الشركة..."
        : companyName
          ? `${companyName} · تشغيل وخدمات وتعاون منظّم`
          : "مساحة عمل منظّمة للخدمات والملفات والفريق.";

  if (variant === "mediaStrip" && isMedia) {
    return (
      <View style={styles.stripWrap}>
        <AppText variant="caption" weight="bold" tone="muted" style={styles.brandTop}>
          ALLOUL&Q
        </AppText>
        <View style={styles.stripRow}>
          <Pressable style={styles.globeBtn} hitSlop={8}>
            <Ionicons name="globe" size={20} color={colors.white} />
          </Pressable>
          <View style={styles.stripPill}>
            <AppText variant="micro" weight="bold" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
              نمط التواصل
            </AppText>
            <Pressable
              onPress={() => {
                if (canUseCompanyMode) onModeChange("company");
                else Alert.alert("وضع الشركات", "تحتاج عضوية شركة فعّالة للتبديل.");
              }}
              hitSlop={8}
              style={styles.stripSwap}
            >
              <Ionicons name="swap-horizontal" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Pressable style={styles.roundGhost} onPress={onNotifications} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
            {inboxUnreadCount > 0 ? <View style={styles.notifDot} /> : null}
          </Pressable>
          <Pressable
            style={styles.roundGhost}
            onPress={() => Alert.alert("المظهر", "تبديل الوضع الفاتح قريباً.")}
            hitSlop={8}
          >
            <Ionicons name="sunny-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.copyBlock}>
          <AppText variant="h2" weight="bold" numberOfLines={1}>
            أهلاً، {firstName}
          </AppText>
          <View style={styles.badgeRow}>
            <View style={[styles.modePill, isMedia ? styles.modePillMedia : styles.modePillCompany]}>
              <Ionicons
                name={isMedia ? "radio-outline" : "business-outline"}
                size={12}
                color={isMedia ? colors.accentCyan : colors.accentTeal}
              />
              <AppText variant="micro" weight="bold" style={{ color: isMedia ? colors.accentCyan : colors.accentTeal }}>
                {isMedia ? "عالم ميديا" : "عالم الشركات"}
              </AppText>
            </View>
            <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
              {subtitle}
            </AppText>
          </View>
        </View>
        <Pressable style={styles.iconBtn} onPress={onSearch ?? (() => {})} hitSlop={8}>
          <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onNotifications} hitSlop={8}>
          <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
          {inboxUnreadCount > 0 ? <View style={styles.notifDot} /> : null}
        </Pressable>
      </View>

      <View style={[styles.switchCard, isMedia ? styles.switchCardMedia : styles.switchCardCompany]}>
        <View style={styles.switchMetaRow}>
          <AppText variant="micro" weight="bold" tone="secondary">
            بدّل التجربة
          </AppText>
          <AppText variant="micro" tone={canUseCompanyMode ? "muted" : "danger"}>
            {canUseCompanyMode ? "تجربتان منفصلتان بالكامل" : "وضع الشركات يتطلب عضوية فعّالة"}
          </AppText>
        </View>

        <View
          style={[styles.switchRow, isRTL ? styles.switchRowRtl : null]}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            if (Math.abs(nextWidth - trackWidth) > 1) {
              setTrackWidth(nextWidth);
            }
          }}
        >
          {segmentWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.switchKnob,
                isMedia ? styles.switchKnobMedia : styles.switchKnobCompany,
                isRTL ? { right: trackInset } : { left: trackInset },
                {
                  width: segmentWidth,
                  transform: [{ translateX: knobTranslate }],
                },
              ]}
            />
          ) : null}

          <Pressable onPress={() => onModeChange("public")} style={styles.seg}>
            <View style={[styles.segIcon, isMedia ? styles.segIconMediaActive : styles.segIconIdle]}>
              <Ionicons name="radio-outline" size={16} color={isMedia ? colors.accentCyan : colors.textSecondary} />
            </View>
            <AppText variant="bodySm" weight="bold" tone={isMedia ? "primary" : "secondary"}>
              ميديا
            </AppText>
            <AppText variant="micro" tone={isMedia ? "cyan" : "muted"} numberOfLines={1}>
              سريع، حي، وموجّه للمحتوى
            </AppText>
          </Pressable>

          <Pressable onPress={() => onModeChange("company")} style={styles.seg}>
            <View
              style={[
                styles.segIcon,
                !canUseCompanyMode ? styles.segIconLocked : mode === "company" ? styles.segIconCompanyActive : styles.segIconIdle,
              ]}
            >
              <Ionicons
                name={canUseCompanyMode ? "business-outline" : "lock-closed-outline"}
                size={16}
                color={mode === "company" && canUseCompanyMode ? colors.accentTeal : colors.textSecondary}
              />
            </View>
            <AppText variant="bodySm" weight="bold" tone={mode === "company" ? "primary" : "secondary"}>
              شركات
            </AppText>
            <AppText variant="micro" tone={mode === "company" ? "primary" : "muted"} numberOfLines={1}>
              منظّم، تشغيلي، وتعاوني
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 14 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  copyBlock: { flex: 1, gap: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  modePillMedia: {
    borderColor: "rgba(56,232,255,0.28)",
    backgroundColor: "rgba(56,232,255,0.10)",
  },
  modePillCompany: {
    borderColor: "rgba(45,226,199,0.35)",
    backgroundColor: "rgba(45,226,199,0.10)",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  switchCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 6,
    gap: 8,
    overflow: "hidden",
  },
  switchCardMedia: {
    borderColor: "rgba(56,232,255,0.18)",
    backgroundColor: "rgba(11,17,27,0.94)",
  },
  switchCardCompany: {
    borderColor: "rgba(45,226,199,0.18)",
    backgroundColor: "rgba(10,20,22,0.96)",
  },
  switchMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    gap: 12,
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accentRose,
  },
  switchRow: {
    flexDirection: "row",
    padding: 6,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    position: "relative",
    overflow: "hidden",
  },
  switchRowRtl: {
    flexDirection: "row-reverse",
  },
  switchKnob: {
    position: "absolute",
    top: 6,
    bottom: 6,
    borderRadius: 16,
    backgroundColor: "rgba(56,232,255,0.10)",
    borderWidth: 1,
  },
  switchKnobMedia: {
    borderColor: "rgba(56,232,255,0.22)",
    backgroundColor: "rgba(56,232,255,0.12)",
  },
  switchKnobCompany: {
    borderColor: "rgba(45,226,199,0.24)",
    backgroundColor: "rgba(45,226,199,0.12)",
  },
  seg: {
    flex: 1,
    minHeight: 82,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 1,
  },
  segIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  segIconIdle: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  segIconMediaActive: {
    backgroundColor: "rgba(56,232,255,0.14)",
    borderColor: "rgba(56,232,255,0.26)",
  },
  segIconCompanyActive: {
    backgroundColor: "rgba(45,226,199,0.14)",
    borderColor: "rgba(45,226,199,0.26)",
  },
  segIconLocked: {
    backgroundColor: "rgba(255,122,89,0.08)",
    borderColor: "rgba(255,122,89,0.16)",
  },
  stripWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 8 },
  brandTop: { textAlign: "center", letterSpacing: 1 },
  stripRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  globeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentBlue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accentBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  stripPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.floatingBarBorder,
  },
  stripSwap: { padding: 4 },
  roundGhost: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
