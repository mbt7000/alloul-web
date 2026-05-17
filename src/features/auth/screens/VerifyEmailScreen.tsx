import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../../theme/ThemeContext";
import { resendVerification } from "../../../api";

interface Props {
  email: string;
  onBack: () => void;
}

export default function VerifyEmailScreen({ email, onBack }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [resending, setResending] = useState(false);
  const [resentDone, setResentDone] = useState(false);

  // Entrance fade
  const fade = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(24)).current;

  // Envelope pulse animation
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();

    return () => { pulseLoop.current?.stop(); };
  }, []);

  const handleResend = async () => {
    if (resending || resentDone) return;
    setResending(true);
    try {
      await resendVerification(email);
      setResentDone(true);
      setTimeout(() => setResentDone(false), 4000);
    } catch {
      // fail silently — server always returns 200
      setResentDone(true);
      setTimeout(() => setResentDone(false), 4000);
    } finally {
      setResending(false);
    }
  };

  const s = styles(colors, insets);

  return (
    <View style={s.container}>
      <Animated.View style={[s.content, { opacity: fade, transform: [{ translateY: slideY }] }]}>

        {/* Envelope icon */}
        <Animated.View style={[s.iconWrap, { transform: [{ scale: pulse }] }]}>
          <Text style={s.icon}>✉️</Text>
          <View style={s.dotOrange} />
        </Animated.View>

        {/* Title */}
        <Text style={s.title}>{t("auth.verifyEmail.title")}</Text>

        {/* Subtitle + email */}
        <Text style={s.subtitle}>{t("auth.verifyEmail.subtitle")}</Text>
        <View style={s.emailBadge}>
          <Text style={s.emailText} numberOfLines={1}>{email}</Text>
        </View>

        {/* Instruction */}
        <Text style={s.instruction}>{t("auth.verifyEmail.instruction")}</Text>

        {/* Divider */}
        <View style={s.divider} />

        {/* Resend button */}
        <TouchableOpacity
          style={[s.resendBtn, (resending || resentDone) && s.resendBtnDone]}
          onPress={handleResend}
          disabled={resending || resentDone}
          activeOpacity={0.75}
        >
          {resending ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : resentDone ? (
            <Text style={s.resentText}>✓ {t("auth.verifyEmail.resentSuccess")}</Text>
          ) : (
            <Text style={s.resendText}>{t("auth.verifyEmail.resend")}</Text>
          )}
        </TouchableOpacity>

        {/* Back to login */}
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={s.backText}>← {t("auth.verifyEmail.backToLogin")}</Text>
        </TouchableOpacity>

        {/* Wrong email hint */}
        <Text style={s.hint}>{t("auth.verifyEmail.wrongEmail")}</Text>

      </Animated.View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof import("../../../theme/ThemeContext").useAppTheme>["colors"], insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    content: {
      width: "100%",
      alignItems: "center",
    },
    iconWrap: {
      width: 96,
      height: 96,
      borderRadius: 28,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 28,
      position: "relative",
    },
    icon: {
      fontSize: 44,
    },
    dotOrange: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "#F59E0B",
      borderWidth: 2,
      borderColor: colors.bgCard,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 10,
    },
    emailBadge: {
      backgroundColor: colors.bgCardStrong,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginBottom: 16,
      maxWidth: "90%",
      borderWidth: 1,
      borderColor: colors.border,
    },
    emailText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.accent,
      textAlign: "center",
    },
    instruction: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 28,
      paddingHorizontal: 8,
    },
    divider: {
      width: "100%",
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 24,
    },
    resendBtn: {
      width: "100%",
      height: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 14,
    },
    resendBtnDone: {
      borderColor: colors.accentEmerald,
      backgroundColor: `${colors.accentEmerald}15`,
    },
    resendText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.accent,
    },
    resentText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.accentEmerald,
    },
    backBtn: {
      paddingVertical: 10,
      marginBottom: 20,
    },
    backText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
    },
  });
