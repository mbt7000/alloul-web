/**
 * MobileSplashScreen
 * ──────────────────
 * Mobile-only: Logo + tagline + two big buttons (like X/TikTok/Instagram)
 * Shown before the actual login form.
 */
import React, { useEffect, useRef } from "react";
import {
  View, Image, Pressable, StyleSheet, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "../../../shared/ui/AppText";

interface Props {
  onSignIn: () => void;
  onRegister: () => void;
}

export default function MobileSplashScreen({ onSignIn, onRegister }: Props) {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[s.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      {/* Subtle background glow */}
      <View style={s.glow} pointerEvents="none" />

      <Animated.View style={[s.content, { opacity: fade }]}>

        {/* ── Logo section ── */}
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
    alignItems: "center",
  },
  glow: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#38e8ff",
    opacity: 0.06,
    top: 80,
    alignSelf: "center",
  },
  content: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  // Logo
  logoSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  logo: {
    width: 180,
    height: 70,
  },
  tagline: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
  },
  // Buttons
  buttons: {
    width: "100%",
    gap: 12,
    paddingBottom: 8,
  },
  btnPrimary: {
    width: "100%",
    backgroundColor: "#38e8ff",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  btnPrimaryTxt: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },
  btnOutline: {
    width: "100%",
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#2a2a2a",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  btnOutlineTxt: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  terms: {
    color: "#444",
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
