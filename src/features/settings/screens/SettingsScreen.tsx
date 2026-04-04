import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useAppTheme } from "../../../theme/ThemeContext";
import { SUPPORTED_LANGUAGES, setAppLanguage, type AppLanguage } from "../../../i18n/index";
import { getApiBaseUrl, getApiDocsUrl, pingApiHealth } from "../../../api";
import { useAuth } from "../../../state/auth/AuthContext";
import { useCompany } from "../../../state/company/CompanyContext";
import { useHomeMode } from "../../../state/mode/HomeModeContext";

const LANG_META: Record<AppLanguage, { labelKey: string; native: string }> = {
  en: { labelKey: "settings.langEn", native: "English" },
  ar: { labelKey: "settings.langAr", native: "العربية" },
  fr: { labelKey: "settings.langFr", native: "Français" },
  es: { labelKey: "settings.langEs", native: "Español" },
  hi: { labelKey: "settings.langHi", native: "हिन्दी" },
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const { colors, mode, setMode } = useAppTheme();
  const { user, signOut } = useAuth();
  const { company, isMember, isActive } = useCompany();
  const { mode: homeMode, setMode: setHomeMode, canUseCompanyMode } = useHomeMode();
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const firebaseReady = Boolean(
    extra?.firebase && typeof extra.firebase === "object" && (extra.firebase as { apiKey?: string }).apiKey
  );
  const googleAuth = extra?.googleAuth as { iosClientId?: string; webClientId?: string } | undefined;
  const googleReady = Boolean(googleAuth?.iosClientId || googleAuth?.webClientId);
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const build = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || "local";

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.bg },
        header: {
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        title: { color: colors.textPrimary, fontSize: 22, fontWeight: "800" },
        scroll: { padding: 16, paddingBottom: 100 },
        section: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 6 },
        sectionHint: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 8 },
        restartHint: { color: colors.accentCyan, fontSize: 12, marginBottom: 16, lineHeight: 18 },
        langRow: {
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgCard,
          marginBottom: 10,
        },
        langRowActive: { borderColor: colors.accentBlue, backgroundColor: colors.cardStrong },
        langTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
        langNative: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
        diagUrl: {
          color: colors.accentCyan,
          fontSize: 12,
          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
          marginBottom: 8,
        },
        testBtn: {
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: colors.bgCard,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          marginTop: 8,
        },
        testBtnText: { color: colors.accentBlue, fontSize: 14, fontWeight: "700" },
        heroCard: {
          padding: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgCard,
          marginBottom: 18,
        },
        heroTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
        heroSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
        block: {
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgCard,
          padding: 12,
          gap: 10,
        },
        modeButton: {
          marginTop: 4,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.floatingBarBorder,
          backgroundColor: colors.cardStrong,
          paddingVertical: 10,
          alignItems: "center",
        },
        modeButtonText: { color: colors.accentCyan, fontSize: 13, fontWeight: "700" },
        logoutBtn: {
          marginTop: 4,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "rgba(255,92,124,0.4)",
          backgroundColor: "rgba(255,92,124,0.12)",
          paddingVertical: 11,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          flexDirection: "row",
        },
        logoutText: { color: colors.accentRose, fontSize: 13, fontWeight: "700" },
        themeRow: {
          flexDirection: "row",
          gap: 10,
          marginTop: 4,
        },
        themeChip: {
          flex: 1,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgSurface,
          alignItems: "center",
        },
        themeChipOn: {
          borderColor: colors.accentBlue,
          backgroundColor: colors.cardStrong,
        },
        themeChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
        themeChipTextOn: { color: colors.textPrimary },
        adminRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 4,
          paddingHorizontal: 4,
        },
      }),
    [colors]
  );

  const selectLang = async (lng: AppLanguage) => {
    await setAppLanguage(lng);
  };

  const confirmSignOut = () => {
    Alert.alert("Log out", "You are about to end your current session on this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  const accountSubtitle = user?.is_admin ? `${user?.email || "Signed in"} · Admin` : user?.email || "Signed in";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("settings.title")}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Control Center</Text>
          <Text style={styles.heroSubtitle}>
            {homeMode === "company" ? "ALOULL &Q mode active" : "Media mode active"} · account and workspace controls
          </Text>
        </View>

        <Text style={styles.section}>Account</Text>
        <View style={styles.block}>
          <Row icon="person-outline" title={user?.name || user?.username || "Account"} subtitle={accountSubtitle} />
          <Row icon="mail-outline" title="Email / phone" subtitle="Manage contact methods" />
          <Row icon="key-outline" title="Password & sign-in" subtitle="Email login active, social login staged" />
          <Row icon="link-outline" title="Connected accounts" subtitle={googleReady ? "Google ready" : "No provider linked"} />
        </View>

        <Text style={[styles.section, { marginTop: 20 }]}>{t("settings.appearance")}</Text>
        <View style={styles.block}>
          <View style={styles.themeRow}>
            <TouchableOpacity
              style={[styles.themeChip, mode === "light" && styles.themeChipOn]}
              onPress={() => setMode("light")}
              activeOpacity={0.88}
            >
              <Text style={[styles.themeChipText, mode === "light" && styles.themeChipTextOn]}>{t("settings.themeLight")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeChip, mode === "dark" && styles.themeChipOn]}
              onPress={() => setMode("dark")}
              activeOpacity={0.88}
            >
              <Text style={[styles.themeChipText, mode === "dark" && styles.themeChipTextOn]}>{t("settings.themeDark")}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionHint}>
            {t("settings.themeActive")}: {mode === "light" ? t("settings.themeLight") : t("settings.themeDark")}
          </Text>
        </View>

        {user?.is_admin ? (
          <>
            <Text style={[styles.section, { marginTop: 20 }]}>{t("settings.adminConsole")}</Text>
            <TouchableOpacity
              style={styles.block}
              onPress={() => navigation.navigate("AdminHub" as never)}
              activeOpacity={0.88}
            >
              <View style={styles.adminRow}>
                <View style={{ flex: 1 }}>
                  <Row icon="shield-checkmark-outline" title={t("settings.adminConsole")} subtitle={t("settings.adminSubtitle")} />
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </>
        ) : null}

        <Text style={[styles.section, { marginTop: 20 }]}>Preferences</Text>
        <Text style={styles.sectionHint}>{t("settings.languageSubtitle")}</Text>
        <Text style={styles.restartHint}>{t("settings.restartHint")}</Text>

        {SUPPORTED_LANGUAGES.map((lng) => {
          const active = i18n.language === lng || i18n.language.startsWith(`${lng}-`);
          return (
            <TouchableOpacity
              key={lng}
              style={[styles.langRow, active && styles.langRowActive]}
              onPress={() => selectLang(lng)}
              activeOpacity={0.88}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.langTitle}>{t(LANG_META[lng].labelKey)}</Text>
                <Text style={styles.langNative}>{LANG_META[lng].native}</Text>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={22} color={colors.accentCyan} /> : null}
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.section, { marginTop: 24 }]}>Workspace / Company</Text>
        <View style={styles.block}>
          <Row
            icon="business-outline"
            title={company?.name || "No active company"}
            subtitle={
              isMember
                ? isActive
                  ? `Member active · i_code ${company?.i_code || "—"}`
                  : "Membership found but inactive subscription"
                : "Join or subscribe to enable ALOULL &Q"
            }
          />
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => {
              const target = homeMode === "public" ? "company" : "public";
              const ok = setHomeMode(target);
              if (!ok) {
                Alert.alert("Access required", "You need active company access to switch to ALOULL &Q.");
              }
            }}
          >
            <Text style={styles.modeButtonText}>
              Switch to {homeMode === "public" ? "ALOULL &Q" : "Media"} {canUseCompanyMode ? "" : "(locked)"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.section, { marginTop: 24 }]}>Security</Text>
        <View style={styles.block}>
          <Row icon="shield-checkmark-outline" title="Session status" subtitle={user ? "Authenticated" : "Signed out"} />
          <Row icon="phone-portrait-outline" title="Active device" subtitle={`${Platform.OS} · Build ${String(build)}`} />
          <TouchableOpacity style={styles.logoutBtn} onPress={confirmSignOut}>
            <Ionicons name="log-out-outline" size={16} color={colors.accentRose} />
            <Text style={styles.logoutText}>Logout with confirmation</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.section, { marginTop: 24 }]}>Support</Text>
        <View style={styles.block}>
          <Row icon="help-circle-outline" title="Help center" subtitle="Guides and FAQs" />
          <Row icon="chatbox-ellipses-outline" title="Contact support" subtitle="Open support channel" />
          <Row icon="information-circle-outline" title="About app" subtitle={`Version ${appVersion} · Build ${String(build)}`} />
        </View>

        <Text style={[styles.section, { marginTop: 24 }]}>{t("settings.diagnostics")}</Text>
        <Text style={styles.sectionHint}>{t("settings.apiEndpoint")}</Text>
        <Text style={styles.diagUrl} selectable>
          {getApiBaseUrl()}
        </Text>
        <Text style={styles.section}>{t("settings.apiDocs")}</Text>
        <Text style={styles.sectionHint}>{t("settings.apiDocsHint")}</Text>
        <Text style={styles.diagUrl} selectable>
          {getApiDocsUrl()}
        </Text>
        <TouchableOpacity style={styles.testBtn} onPress={() => Linking.openURL(getApiDocsUrl())}>
          <Text style={styles.testBtnText}>{t("settings.openDocs")}</Text>
        </TouchableOpacity>
        <Text style={[styles.sectionHint, { marginTop: 16 }]}>
          {googleReady && firebaseReady ? t("settings.googleReady") : t("settings.googleMissing")}
        </Text>
        <TouchableOpacity
          style={styles.testBtn}
          onPress={async () => {
            const r = await pingApiHealth();
            Alert.alert(
              r.ok ? t("settings.serverOk") : t("settings.serverFail"),
              r.ok ? r.detail : `${r.detail}\n\n${t("settings.rebuildHint")}`
            );
          }}
        >
          <Text style={styles.testBtnText}>{t("settings.testConnection")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  const { colors } = useAppTheme();
  const rowStyles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: "row", alignItems: "center", gap: 10 },
        iconWrap: {
          width: 30,
          height: 30,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.floatingBarBorder,
          backgroundColor: colors.cardStrong,
          alignItems: "center",
          justifyContent: "center",
        },
        title: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
        subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
      }),
    [colors]
  );

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconWrap}>
        <Ionicons name={icon} size={16} color={colors.accentCyan} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.title}>{title}</Text>
        <Text style={rowStyles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}
