/**
 * XSettingsScreen
 * ───────────────
 * Twitter/X-style settings page. Clean grouped sections.
 * Only existing routes & data — no backend changes.
 */

import React, { useState } from "react";
import { View, ScrollView, Pressable, Alert, Image, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import * as Updates from "expo-updates";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useAuth } from "../../../state/auth/AuthContext";
import { useCompany } from "../../../state/company/CompanyContext";
import { SUPPORTED_LANGUAGES, setAppLanguage, type AppLanguage } from "../../../i18n/index";
import { applyRtlForLanguage } from "../../../shared/utils/rtl";
import Constants from "expo-constants";

const LANG_META: Record<AppLanguage, string> = {
  en: "English", ar: "العربية", fr: "Français", es: "Español", hi: "हिन्दी",
};

interface SettingItem {
  key: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  route?: string;
  danger?: boolean;
  rightValue?: string;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

export default function XSettingsScreen() {
  const nav = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { colors, mode, setMode } = useAppTheme();
  const { user, signOut } = useAuth();
  const { company } = useCompany();
  const [langOpen, setLangOpen] = useState(false);

  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const currentLang = (i18n.language as AppLanguage) || "ar";

  const sections: SettingSection[] = [
    {
      title: "الحساب",
      items: [
        { key: "edit-profile", icon: "create-outline", title: "تعديل الملف الشخصي", subtitle: "الاسم، الصورة، النبذة", route: "EditProfile" },
        { key: "account-info", icon: "person-outline", title: "معلومات الحساب", subtitle: user?.email, route: "UserProfile" },
        { key: "security", icon: "lock-closed-outline", title: "الأمان وكلمة المرور", subtitle: "حماية حسابك", route: "ChangePassword" },
        { key: "subscription", icon: "card-outline", title: "الاشتراك والفواتير", subtitle: "إدارة الخطة", route: "Billing" },
      ],
    },
    {
      title: "الإشعارات والصوت",
      items: [
        { key: "notifications", icon: "notifications-outline", title: "الإشعارات", subtitle: "إدارة التنبيهات", route: "Inbox" },
        { key: "push", icon: "phone-portrait-outline", title: "إشعارات الجهاز", onPress: () => Alert.alert("إشعارات الجهاز", "الإشعارات مفعّلة — أدرها من إعدادات iOS") },
        { key: "sound", icon: "volume-medium-outline", title: "الأصوات والاهتزاز", onPress: () => Alert.alert("الأصوات", "الأصوات مفعّلة افتراضياً") },
      ],
    },
    {
      title: "العرض واللغة",
      items: [
        {
          key: "theme",
          icon: mode === "dark" ? "moon-outline" : "sunny-outline",
          title: "المظهر",
          subtitle: mode === "dark" ? "داكن" : "فاتح",
          onPress: () => setMode(mode === "dark" ? "light" : "dark"),
        },
        {
          key: "language",
          icon: "language-outline",
          title: "اللغة",
          subtitle: LANG_META[currentLang],
          rightValue: LANG_META[currentLang],
          onPress: () => setLangOpen((v) => !v),
        },
      ],
    },
    {
      title: "الخصوصية",
      items: [
        { key: "blocked", icon: "ban-outline", title: "الحسابات المحظورة", onPress: () => Alert.alert("المحظورون", "لا يوجد حسابات محظورة") },
        { key: "muted", icon: "volume-mute-outline", title: "الحسابات الكتومة", onPress: () => Alert.alert("الكتومة", "لا يوجد حسابات كتومة") },
        { key: "data", icon: "server-outline", title: "استخدام البيانات", onPress: () => Alert.alert("البيانات", "استخدام عادي") },
      ],
    },
    {
      title: "مصادر إضافية",
      items: [
        { key: "help", icon: "help-circle-outline", title: "مركز المساعدة", onPress: () => Alert.alert("المساعدة", "للدعم راسل: support@alloul.app") },
        { key: "terms", icon: "document-outline", title: "شروط الخدمة", onPress: () => Alert.alert("الشروط", "Alloul One © 2026") },
        { key: "privacy", icon: "shield-outline", title: "سياسة الخصوصية", onPress: () => Alert.alert("الخصوصية", "نحترم خصوصيتك بالكامل") },
        { key: "about", icon: "information-circle-outline", title: "عن التطبيق", subtitle: `v${appVersion}`, onPress: () => Alert.alert("Alloul One", `الإصدار ${appVersion}\n© 2026 Alloul`) },
      ],
    },
    {
      title: "",
      items: [
        {
          key: "signout",
          icon: "log-out-outline",
          title: "تسجيل الخروج",
          danger: true,
          onPress: () => {
            Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
              { text: "إلغاء", style: "cancel" },
              { text: "خروج", style: "destructive", onPress: () => void signOut() },
            ]);
          },
        },
      ],
    },
  ];

  const handleItemPress = (item: SettingItem) => {
    if (item.onPress) { item.onPress(); return; }
    if (item.route) { nav.navigate(item.route); return; }
  };

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#000" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 16,
          paddingHorizontal: 16, paddingVertical: 12,
          borderBottomWidth: 0.5, borderBottomColor: "#1a1a1a",
        }}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <AppText style={{ color: "#fff", fontSize: 19, fontWeight: "800" }}>
            الإعدادات والخصوصية
          </AppText>
        </View>

        {/* Profile header card */}
        <Pressable
          onPress={() => nav.navigate("UserProfile")}
          style={({ pressed }) => ({
            flexDirection: "row", alignItems: "center", gap: 14,
            padding: 16,
            borderBottomWidth: 0.5, borderBottomColor: "#1a1a1a",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={{ width: 54, height: 54, borderRadius: 27 }} />
          ) : (
            <View style={{
              width: 54, height: 54, borderRadius: 27,
              backgroundColor: "#1a1a1a",
              alignItems: "center", justifyContent: "center",
            }}>
              <AppText style={{ color: colors.accentCyan, fontSize: 22, fontWeight: "800" }}>
                {(user?.name || user?.username || "U").slice(0, 1).toUpperCase()}
              </AppText>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
              {user?.name || user?.username || "مستخدم"}
            </AppText>
            <AppText style={{ color: "#71767b", fontSize: 13, marginTop: 2 }}>
              @{user?.username || ""}
            </AppText>
          </View>
          <Ionicons name="chevron-back" size={18} color="#71767b" />
        </Pressable>

        {/* Sections */}
        {sections.map((section, sIdx) => (
          <View key={`${section.title}-${sIdx}`}>
            {section.title ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 8 }}>
                <AppText style={{ color: "#71767b", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                  {section.title}
                </AppText>
              </View>
            ) : <View style={{ height: 10 }} />}

            {section.items.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => handleItemPress(item)}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: 16,
                  paddingHorizontal: 20, paddingVertical: 14,
                  backgroundColor: pressed ? "#0a0a0a" : "transparent",
                })}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.danger ? "#ef4444" : "#fff"}
                />
                <View style={{ flex: 1 }}>
                  <AppText style={{
                    color: item.danger ? "#ef4444" : "#fff",
                    fontSize: 15,
                    fontWeight: "500",
                  }}>
                    {item.title}
                  </AppText>
                  {item.subtitle && (
                    <AppText style={{ color: "#71767b", fontSize: 12, marginTop: 2 }}>
                      {item.subtitle}
                    </AppText>
                  )}
                </View>
                {!item.danger && (
                  <Ionicons name="chevron-back" size={16} color="#71767b" />
                )}
              </Pressable>
            ))}

            {/* Language picker (inline) */}
            {section.items.some(i => i.key === "language") && langOpen && (
              <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang}
                    onPress={async () => {
                      await setAppLanguage(lang);
                      setLangOpen(false);
                      const dirChanged = applyRtlForLanguage(lang);
                      if (dirChanged) {
                        Alert.alert(
                          "تغيير اللغة",
                          "سيتم إعادة تشغيل التطبيق لتطبيق اتجاه النص",
                          [{ text: "حسناً", onPress: () => void Updates.reloadAsync() }]
                        );
                      }
                    }}
                    style={{
                      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: currentLang === lang ? "#0a0a0a" : "transparent",
                      marginTop: 4,
                    }}
                  >
                    <AppText style={{ color: "#fff", fontSize: 14 }}>{LANG_META[lang]}</AppText>
                    {currentLang === lang && (
                      <Ionicons name="checkmark" size={18} color={colors.accentCyan} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
