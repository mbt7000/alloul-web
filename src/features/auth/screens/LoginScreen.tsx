import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { login, register, loginWithFirebase, getApiBaseUrl, pingApiHealth } from "../../../api";
import MicrosoftSignInButton from "../components/MicrosoftSignInButton";
import { useAuth } from "../../../state/auth/AuthContext";
import { useAppTheme } from "../../../theme/ThemeContext";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import {
  exchangeAppleIdTokenForFirebaseIdToken,
  exchangeGoogleIdTokenForFirebaseIdToken,
} from "../../../shared/utils/firebaseAuth";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { refresh, sessionNotice, consumeSessionNotice } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [oauthDebug, setOauthDebug] = useState("");
  const [appleAvailableOnDevice, setAppleAvailableOnDevice] = useState(false);

  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const debugAuthVersion = typeof extra?.debugAuthVersion === "string" ? extra.debugAuthVersion : "unknown";
  const firebase = (extra?.firebase as Record<string, string> | undefined) || {};
  const googleAuth = (extra?.googleAuth as Record<string, string> | undefined) || {};
  const microsoftAuth = (extra?.microsoftAuth as Record<string, string> | undefined) || {};
  const msClientId = microsoftAuth?.clientId?.trim();
  const msTenantId = microsoftAuth?.tenantId?.trim();
  const firebaseReady = Boolean(firebase?.apiKey && firebase?.projectId);
  const isExpoGo = Constants.appOwnership === "expo";
  const googleIosClientId = googleAuth?.iosClientId?.trim();
  const googleAndroidClientId = googleAuth?.androidClientId?.trim();
  const googleWebClientId = googleAuth?.webClientId?.trim();
  const expoClientId = googleWebClientId;
  const expoOwner = Constants.expoConfig?.owner;
  const expoSlug = Constants.expoConfig?.slug;
  const googleNativeIosClientId = googleIosClientId || googleWebClientId;
  const googleIosClientBaseId = googleNativeIosClientId?.replace(".apps.googleusercontent.com", "");
  const googleIosNativeRedirect = googleIosClientBaseId
    ? `com.googleusercontent.apps.${googleIosClientBaseId}:/oauthredirect`
    : undefined;
  const googleClientId =
    Platform.OS === "ios"
      ? isExpoGo
        ? googleWebClientId
        : googleNativeIosClientId
      : isExpoGo
        ? googleWebClientId
        : googleAndroidClientId || googleWebClientId;
  const googleReady = Boolean(googleClientId);
  const canUseGoogle = firebaseReady && googleReady;
  const canUseMicrosoft = Boolean(msClientId && msTenantId);
  /** Sign in with Apple لا يعمل داخل Expo Go — يحتاج EAS build / TestFlight. */
  const canUseApple =
    Platform.OS === "ios" && appleAvailableOnDevice && firebaseReady && Constants.appOwnership !== "expo";
  const projectNameForProxy = expoOwner && expoSlug ? `@${expoOwner}/${expoSlug}` : undefined;
  const generatedRedirectUri = AuthSession.makeRedirectUri({ useProxy: true } as never);
  const expoProxyRedirectUri = projectNameForProxy ? `https://auth.expo.io/${projectNameForProxy}` : generatedRedirectUri;
  const googleRedirectUri = isExpoGo
    ? expoProxyRedirectUri
    : AuthSession.makeRedirectUri({
        native: googleIosNativeRedirect || "alloul:/oauthredirect",
      });
  const [googleRequest, googleResponse, promptAsync] = Google.useAuthRequest({
    // Keep the requested key explicitly for Expo Go proxy flow.
    expoClientId: expoClientId || "",
    clientId: googleClientId || "",
    webClientId: googleWebClientId || "",
    iosClientId: googleNativeIosClientId || "",
    androidClientId: googleAndroidClientId || "",
    redirectUri: googleRedirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ["openid", "profile", "email"],
    usePKCE: true,
    extraParams: {
      access_type: "offline",
    },
  } as never);
  const debugRunIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const debugRunId = debugRunIdRef.current;
  const appendOauthDebug = (line: string) => {
    setOauthDebug((prev) => {
      const next = prev ? `${prev}\n${line}` : line;
      return next.length > 3500 ? next.slice(next.length - 3500) : next;
    });
  };

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let alive = true;
    void AppleAuthentication.isAvailableAsync().then((ok) => {
      if (alive) setAppleAvailableOnDevice(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setOauthDebug(
      `debugVersion=${debugAuthVersion}\nrunId=${debugRunId}\napi=${getApiBaseUrl()}\nappOwnership=${
        Constants.appOwnership ?? "-"
      }\nplatform=${Platform.OS}\ngoogleClientType=${
        Platform.OS === "ios"
          ? isExpoGo
            ? "web(expo-go)"
            : "ios(standalone)"
          : isExpoGo
            ? "web(expo-go)"
            : "android_or_web(standalone)"
      }\ncanUseGoogle=${canUseGoogle ? "true" : "false"}\ncanUseMicrosoft=${
        canUseMicrosoft ? "true" : "false"
      }\ncanUseApple=${canUseApple ? "true" : "false"}`
    );
  }, [
    canUseApple,
    canUseGoogle,
    canUseMicrosoft,
    debugAuthVersion,
    extra?.apiUrl,
    firebaseReady,
    googleClientId,
    googleIosClientId,
    googleReady,
    googleWebClientId,
  ]);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) {
      setError(t("auth.emailPasswordRequired"));
      return;
    }
    if (!email.includes("@")) {
      setError(t("auth.validEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordMin"));
      return;
    }
    if (isRegister && !username) {
      setError(t("auth.usernameRequired"));
      return;
    }
    setLoading(true);
    try {
      if (isRegister) await register(username, email, password);
      else await login(email, password);
      await refresh();
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e?.message === "NETWORK_UNREACHABLE") setError(t("auth.networkError"));
      else if (e?.message === "NETWORK_TIMEOUT") setError(t("auth.networkError"));
      else if (e?.message === "SESSION_STORAGE_FAILED") setError(t("auth.sessionStorageFailed"));
      else if (typeof e?.status === "number" && e.status >= 500) {
        const detail = typeof e?.message === "string" ? e.message.trim() : "";
        const generic =
          !detail || detail === "Internal Server Error" || detail === "Request failed";
        setError(generic ? t("auth.serverError") : `${t("auth.serverError")}\n${detail}`);
      } else setError(e?.message || t("auth.authFailed"));
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    if (!canUseGoogle || !googleClientId) {
      setError(t("auth.googleNotInBuild"));
      return;
    }
    if (!googleRequest) {
      setError("Google request is still loading. Try again.");
      appendOauthDebug("[G0] request_not_ready");
      return;
    }

    setLoading(true);
    appendOauthDebug(
      `[G1] prompt start redirect=${googleRedirectUri} project=${projectNameForProxy ?? "-"} clientSuffix=${googleClientId.slice(-20)}`
    );
    try {
      await promptAsync();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? "unknown");
      appendOauthDebug(`[G1E] prompt error=${msg}`);
      setLoading(false);
      setError(`OAuth prompt failed: ${msg}`);
    }
  };

  const handleAppleSignIn = async () => {
    setError("");
    if (Platform.OS !== "ios") return;
    if (!firebaseReady) {
      setError(t("auth.firebaseNotConfiguredShort"));
      return;
    }
    if (Constants.appOwnership === "expo") {
      setError(t("auth.appleNeedsDevBuild"));
      return;
    }
    if (!appleAvailableOnDevice) {
      setError(t("auth.appleNotAvailable"));
      return;
    }
    setLoading(true);
    try {
      const rawNonce = [...Array(32)].map(() => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
      const nonceSha256 = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce, {
        encoding: Crypto.CryptoEncoding.HEX,
      });
      const appleCred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: nonceSha256,
      });
      if (!appleCred.identityToken) {
        setError(t("auth.appleTokenMissing"));
        return;
      }
      const firebaseIdToken = await exchangeAppleIdTokenForFirebaseIdToken(appleCred.identityToken, rawNonce);
      await loginWithFirebase(firebaseIdToken);
      await refresh();
    } catch (e: unknown) {
      const coded = e as { code?: string };
      if (coded?.code === "ERR_REQUEST_CANCELED") {
        appendOauthDebug("[A0] apple_cancel");
        setError("");
      } else {
        const msg = e instanceof Error ? e.message : String(e ?? "unknown");
        appendOauthDebug(`[A1] apple_err=${msg}`);
        setError(`${t("auth.appleFailed")}${msg ? `: ${msg}` : ""}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleResponse) return;

    const responseParams = "params" in googleResponse ? googleResponse.params : undefined;
    appendOauthDebug(
      `[G2] response.type=${googleResponse.type} params=${JSON.stringify(responseParams ?? {}).slice(0, 900)}`
    );

    const finish = async () => {
      try {
        if (googleResponse.type === "cancel" || googleResponse.type === "dismiss") {
          appendOauthDebug("[G3] cancel_or_dismiss");
          setError("OAuth: cancel");
          return;
        }

        if (googleResponse.type === "error") {
          appendOauthDebug(
            `[G3] error code=${googleResponse.error?.code ?? "-"} description=${googleResponse.error?.description ?? "-"}`
          );
          setError(`OAuth error: ${googleResponse.error?.description || googleResponse.error?.code || "unknown"}`);
          return;
        }

        if (googleResponse.type !== "success") {
          appendOauthDebug(`[G3] unexpected_type=${googleResponse.type}`);
          return;
        }

        const accessTokenFromAuth = googleResponse.authentication?.accessToken;
        appendOauthDebug(`[G4] accessToken=${accessTokenFromAuth ? "present" : "missing"}`);

        const authCode = responseParams?.code;
        if (!authCode || !googleRequest?.codeVerifier) {
          appendOauthDebug("[G4] missing_code_or_verifier");
          setError(t("auth.googleTokenMissing"));
          return;
        }

        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: googleClientId,
            code: authCode,
            redirectUri: googleRedirectUri,
            extraParams: {
              code_verifier: googleRequest.codeVerifier,
            },
          },
          GOOGLE_DISCOVERY
        );
        const accessToken = tokenResponse.accessToken;
        const googleIdToken = tokenResponse.idToken;
        appendOauthDebug(
          `[G5] exchange accessToken=${accessToken ? "present" : "missing"} idToken=${
            googleIdToken ? "present" : "missing"
          }`
        );

        if (!googleIdToken) {
          setError(t("auth.googleTokenMissing"));
          return;
        }

        const firebaseIdToken = await exchangeGoogleIdTokenForFirebaseIdToken(googleIdToken, accessToken);
        await loginWithFirebase(firebaseIdToken);
        await refresh();
      } catch (err: unknown) {
        const payload = err as { message?: string; status?: number; code?: string };
        const msg = typeof payload?.message === "string" ? payload.message : err instanceof Error ? err.message : "";
        const code = typeof payload?.code === "string" ? payload.code : "";
        const detail = [code, msg].filter(Boolean).join(" — ");
        appendOauthDebug(
          `[G6] catch detail=${detail || "-"} status=${typeof payload?.status === "number" ? payload.status : "-"}`
        );
        if (msg === "FIREBASE_NOT_CONFIGURED") {
          setError(t("auth.googleNotInBuild"));
        } else if (msg.toLowerCase().includes("firebase not configured")) {
          setError(t("auth.googleNotConfigured"));
        } else if (msg === "NETWORK_UNREACHABLE" || msg === "NETWORK_TIMEOUT") {
          setError(t("auth.networkError"));
        } else if (msg === "SESSION_STORAGE_FAILED") {
          setError(t("auth.sessionStorageFailed"));
        } else if (typeof payload?.status === "number" && payload.status >= 500) {
          const detail = msg.trim();
          const generic =
            !detail || detail === "Internal Server Error" || detail === "Request failed";
          setError(generic ? t("auth.serverError") : `${t("auth.serverError")}\n${detail}`);
        } else {
          setError(detail ? `${t("auth.googleFailed")}\n${detail}` : t("auth.googleFailed"));
        }
      } finally {
        setLoading(false);
      }
    };

    void finish();
  }, [googleClientId, googleRedirectUri, googleRequest, googleResponse, refresh, t]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flexGrow: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
        logoContainer: { alignItems: "center", marginBottom: 48 },
        logoCircle: {
          width: 72,
          height: 72,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.accent,
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
        },
        logoText: { color: colors.white, fontSize: 32, fontWeight: "900" },
        brandName: { color: colors.textPrimary, fontSize: 28, fontWeight: "900", marginTop: 16 },
        tagline: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
        form: { gap: 14 },
        input: {
          backgroundColor: colors.bgCard,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: colors.textPrimary,
          fontSize: 15,
        },
        passwordRow: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.bgCard,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
        },
        passwordInput: {
          flex: 1,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: colors.textPrimary,
          fontSize: 15,
        },
        eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
        eyeText: { color: colors.accentCyan, fontSize: 12, fontWeight: "700" },
        error: { color: colors.danger, fontSize: 13, textAlign: "center" },
        submitBtn: {
          backgroundColor: colors.accent,
          borderRadius: 14,
          paddingVertical: 16,
          alignItems: "center",
          marginTop: 8,
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        submitText: { color: colors.white, fontSize: 16, fontWeight: "700" },
        socialPaused: {
          color: colors.textMuted,
          fontSize: 12,
          textAlign: "center",
          marginTop: 4,
          lineHeight: 18,
        },
        divider: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
        dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
        dividerText: { color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
        socialBtn: {
          backgroundColor: colors.bgCard,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
        },
        socialBtnOff: { opacity: 0.55 },
        socialText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
        socialTextMuted: { color: colors.textMuted },
        switchText: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 16 },
        diagBox: {
          marginTop: 28,
          padding: 14,
          borderRadius: 14,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 8,
        },
        diagTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
        diagLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
        diagUrl: {
          color: colors.accentCyan,
          fontSize: 11,
          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        },
        diagBtn: {
          marginTop: 8,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: colors.bgCard,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
        },
        diagBtnText: { color: colors.accentBlue, fontSize: 13, fontWeight: "700" },
        sessionNotice: {
          marginBottom: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "rgba(255,92,124,0.36)",
          backgroundColor: "rgba(255,92,124,0.12)",
        },
        sessionNoticeText: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },
        sessionNoticeDismiss: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
      }),
    [colors]
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 60 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.brandName}>{t("auth.brand")}</Text>
          <Text style={styles.tagline}>{t("auth.tagline")}</Text>
        </View>

        {sessionNotice ? (
          <TouchableOpacity style={styles.sessionNotice} activeOpacity={0.9} onPress={consumeSessionNotice}>
            <Text style={styles.sessionNoticeText}>{sessionNotice}</Text>
            <Text style={styles.sessionNoticeDismiss}>Tap to dismiss</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.form}>
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder={t("auth.username")}
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder={t("auth.email")}
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder={t("auth.password")}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
              <Text style={styles.eyeText}>{showPassword ? t("common.hide") : t("common.show")}</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>{isRegister ? t("auth.createAccount") : t("auth.signIn")}</Text>
            )}
          </TouchableOpacity>

          {!canUseGoogle && !canUseMicrosoft && !canUseApple ? (
            <Text style={styles.socialPaused}>{t("auth.socialPaused")}</Text>
          ) : null}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("common.or")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.socialBtn, !canUseGoogle && styles.socialBtnOff]}
            disabled={loading || !canUseGoogle}
            onPress={() => {
              void handleGoogleSignIn();
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={[styles.socialText, !canUseGoogle && styles.socialTextMuted]}>{t("auth.continueGoogle")}</Text>
            )}
          </TouchableOpacity>

          {Platform.OS === "ios" && firebaseReady ? (
            <TouchableOpacity
              style={[styles.socialBtn, !canUseApple && styles.socialBtnOff]}
              disabled={loading || !canUseApple}
              onPress={() => void handleAppleSignIn()}
            >
              {loading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={[styles.socialText, !canUseApple && styles.socialTextMuted]}>
                  {Constants.appOwnership === "expo"
                    ? t("auth.continueAppleExpoGo")
                    : !appleAvailableOnDevice
                      ? t("auth.appleNotAvailable")
                      : t("auth.continueApple")}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          {canUseMicrosoft && msClientId && msTenantId ? (
            <MicrosoftSignInButton
              clientId={msClientId}
              tenantId={msTenantId}
              disabled={loading}
              onError={(msg) => setError(msg)}
              onSignedIn={async () => {
                await refresh();
              }}
              label={t("auth.continueMicrosoft")}
              socialBtn={styles.socialBtn}
              socialText={styles.socialText}
              socialBtnOff={styles.socialBtnOff}
              socialTextMuted={styles.socialTextMuted}
              spinnerColor={colors.textPrimary}
            />
          ) : (
            <TouchableOpacity style={[styles.socialBtn, styles.socialBtnOff]} disabled>
              <Text style={[styles.socialText, styles.socialTextMuted]}>{t("auth.continueMicrosoft")}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            <Text style={styles.switchText}>{isRegister ? t("auth.switchSignIn") : t("auth.switchRegister")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.diagBox}>
          <Text style={styles.diagTitle}>{t("settings.diagnostics")}</Text>
          <Text style={styles.diagLabel}>{t("settings.apiEndpoint")}</Text>
          <Text style={styles.diagUrl} selectable>
            {getApiBaseUrl()}
          </Text>
          <Text style={styles.diagLabel}>{t("auth.emailLoginActive")}</Text>
          <Text style={styles.diagLabel}>
            {googleReady && firebaseReady ? t("auth.diagGoogleOk") : t("auth.diagGoogleNo")}
          </Text>
          <Text style={styles.diagLabel}>
            {canUseMicrosoft ? t("auth.diagMicrosoftOk") : t("auth.diagMicrosoftNo")}
          </Text>
          {Platform.OS === "ios" ? (
            <Text style={styles.diagLabel}>
              {canUseApple ? t("auth.diagAppleOk") : t("auth.diagAppleNo")}
            </Text>
          ) : null}
          <TouchableOpacity
            style={styles.diagBtn}
            onPress={async () => {
              const r = await pingApiHealth();
              appendOauthDebug(`[H5] health ok=${r.ok ? "true" : "false"} detail=${r.detail}`);
              Alert.alert(
                r.ok ? t("settings.serverOk") : t("settings.serverFail"),
                r.ok ? r.detail : `${r.detail}\n\n${t("settings.rebuildHint")}`
              );
            }}
          >
            <Text style={styles.diagBtnText}>{t("settings.testConnection")}</Text>
          </TouchableOpacity>
          {oauthDebug ? (
            <Text style={styles.diagUrl} selectable>
              {oauthDebug}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
