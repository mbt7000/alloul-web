/**
 * MobileSplashScreen
 * ──────────────────
 * Mobile-only: Logo + tagline + auth buttons
 */
import React, { useEffect, useRef } from "react";
import {
  View, Image, Pressable, StyleSheet, Animated, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "../../../shared/ui/AppText";

interface Props {
  onSignIn: () => void;
  onRegister: () => void;
  onGoogle?: () => void;
  onApple?: () => void;
  canGoogle?: boolean;
  canApple?: boolean;
}

export default function MobileSplashScreen({
  onSignIn, onRegister, onGoogle, onApple, canGoogle, canApple,
}: Props) {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[s.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.glow} pointerEvents="none" />

      <Animated.View style={[s.content, { opacity: fade }]}>

        {/* ── Logo ── */}
        <View style={s.logoSection}>
          <Image
            source={require("../../../../assets/logo/alloul-logo-dark.png")}
            style={s.logo}
            resizeMode="contain"
          />
          <AppText style={s.tagline}>المنصة الذكية لإدارة الشركات</AppText>
        </View>

        {/* ── Buttons ── */}
        <View style={s.buttons}>

          {/* Google */}
          {canGoogle && onGoogle && (
            <Pressable
              style={({ pressed }) => [s.btnGoogle, pressed && { opacity: 0.85 }]}
              onPress={onGoogle}
            >
              <AppText style={s.googleG}>G</AppText>
              <AppText style={s.btnGoogleTxt}>المتابعة مع Google</AppText>
            </Pressable>
          )}

          {/* Apple */}
          {canApple && onApple && Platform.OS === "ios" && (
            <Pressable
              style={({ pressed }) => [s.btnApple, pressed && { opacity: 0.85 }]}
              onPress={onApple}
            >
              <AppText style={s.appleIcon}></AppText>
              <AppText style={s.btnAppleTxt}>المتابعة مع Apple</AppText>
            </Pressable>
          )}

          {/* Divider */}
          {(canGoogle || canApple) && (
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <AppText style={s.dividerText}>أو</AppText>
              <View style={s.dividerLine} />
            </View>
          )}

          {/* Register — primary */}
          <Pressable
            style={({ pressed }) => [s.btnPrimary, pressed && { opacity: 0.9 }]}
            onPress={onRegister}
          >
            <AppText style={s.btnPrimaryTxt}>إنشاء حساب جديد</AppText>
          </Pressable>

          {/* Sign in — outline */}
          <Pressable
            style={({ pressed }) => [s.btnOutline, pressed && { opacity: 0.9 }]}
            onPress={onSignIn}
          >
            <AppText style={s.btnOutlineTxt}>تسجيل الدخول</AppText>
          </Pressable>

          {/* Terms */}
          <AppText style={s.terms}>
            بالمتابعة، أنت توافق على{" "}
            <AppText style={s.termsLink}>شروط الخدمة</AppText>
            {" "}و{" "}
            <AppText style={s.termsLink}>سياسة الخصوصية</AppText>
          </AppText>
        </View>

      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between",
  },
  glow: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "#38e8ff",
    opacity: 0.04,
    top: -100,
    alignSelf: "center",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  logoSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 65,
  },
  tagline: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    letterSpacing: 0.3,
  },
  buttons: {
    gap: 12,
  },
  // Google button
  btnGoogle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 15,
    gap: 10,
  },
  googleG: {
    color: "#4285F4",
    fontSize: 17,
    fontWeight: "900",
  },
  btnGoogleTxt: {
    color: "#1f1f1f",
    fontSize: 15,
    fontWeight: "700",
  },
  // Apple button
  btnApple: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 15,
    gap: 10,
  },
  appleIcon: {
    color: "#fff",
    fontSize: 17,
  },
  btnAppleTxt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 11,
    letterSpacing: 1,
  },
  // Primary button
  btnPrimary: {
    backgroundColor: "#38e8ff",
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: "#38e8ff",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  btnPrimaryTxt: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },
  // Outline button
  btnOutline: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
  },
  btnOutlineTxt: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: "700",
  },
  // Terms
  terms: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  termsLink: {
    color: "#38e8ff",
    fontSize: 11,
  },
});
