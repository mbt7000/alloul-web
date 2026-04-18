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
  Animated,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { login, register, loginWithFirebase, loginWithAppleNative, getApiBaseUrl } from "../../../api";
import { useAuth } from "../../../state/auth/AuthContext";
import { useAppTheme } from "../../../theme/ThemeContext";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import {
  exchangeAppleIdTokenForFirebaseIdToken,
  exchangeGithubAccessTokenForFirebaseIdToken,
  exchangeGoogleIdTokenForFirebaseIdToken,
} from "../../../shared/utils/firebaseAuth";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const GITHUB_DISCOVERY = {
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
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

  // ─── Entrance animation ───────────────────────────────────────────────────
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // ─── Auth config ──────────────────────────────────────────────────────────
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const debugAuthVersion = typeof extra?.debugAuthVersion === "string" ? extra.debugAuthVersion : "unknown";
  const firebase = (extra?.firebase as Record<string, string> | undefined) || {};
  const googleAuth = (extra?.googleAuth as Record<string, string> | undefined) || {};
  const githubAuth = (extra?.githubAuth as Record<string, string> | undefined) || {};
  const githubClientId = githubAuth?.clientId?.trim() || "";
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
  const googleClientId =
    Platform.OS === "ios" && !isExpoGo && googleIosClientId
      ? googleIosClientId
      : googleWebClientId;
  const googleReady = Boolean(googleClientId);
  const canUseGoogle = firebaseReady && googleReady;
  const canUseApple =
    Platform.OS === "ios" && appleAvailableOnDevice && firebaseReady && Constants.appOwnership !== "expo";
  const projectNameForProxy = expoOwner && expoSlug ? `@${expoOwner}/${expoSlug}` : undefined;
  const generatedRedirectUri = AuthSession.makeRedirectUri({ useProxy: true } as never);
  const expoProxyRedirectUri = projectNameForProxy ? `https://auth.expo.io/${projectNameForProxy}` : generatedRedirectUri;
  const googleIosNativeRedirect = googleIosClientBaseId
    ? `com.googleusercontent.apps.${googleIosClientBaseId}:/oauthredirect`
    : undefined;
  // Web: use plain origin as redirect URI (register https://alloul-q-preview.vercel.app in Google Console)
  const googleRedirectUri = isExpoGo
    ? expoProxyRedirectUri
    : Platform.OS === "web"
      ? AuthSession.makeRedirectUri()
      : Platform.OS === "ios" && googleIosNativeRedirect
        ? AuthSession.makeRedirectUri({ native: googleIosNativeRedirect })
        : AuthSession.makeRedirectUri({ scheme: "alloul", path: "oauthredirect" });

  // Web uses implicit flow (token) — no client_secret needed.
  // Native uses auth code + PKCE.
  const isWeb = Platform.OS === "web";
  const [googleRequest, googleResponse, promptAsync] = Google.useAuthRequest({
    clientId: googleClientId || "",
    iosClientId: googleIosClientId || "",
    webClientId: googleWebClientId || "",
    redirectUri: googleRedirectUri,
    responseType: isWeb ? AuthSession.ResponseType.Token : AuthSession.ResponseType.Code,
    scopes: ["openid", "profile", "email"],
    usePKCE: !isWeb,
    extraParams: isWeb ? {} : { access_type: "offline" },
  } as never);

  const githubRedirectUri = isExpoGo
    ? expoProxyRedirectUri
    : AuthSession.makeRedirectUri({ scheme: "alloul", path: "oauth/github" });
  const [githubRequest, githubResponse, githubPromptAsync] = AuthSession.useAuthRequest(
    { clientId: githubClientId, scopes: ["read:user", "user:email"], redirectUri: githubRedirectUri, usePKCE: true },
    GITHUB_DISCOVERY
  );
  const canUseGitHub = firebaseReady && Boolean(githubClientId);

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
    return () => { alive = false; };
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError(t("auth.emailPasswordRequired")); return; }
    if (!email.includes("@")) { setError(t("auth.validEmail")); return; }
    if (password.length < 8) { setError(t("auth.passwordMin")); return; }
    if (isRegister && !username) { setError(t("auth.usernameRequired")); return; }
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
        const generic = !detail || detail === "Internal Server Error" || detail === "Request failed";
        setError(generic ? t("auth.serverError") : `${t("auth.serverError")}\n${detail}`);
      } else setError(e?.message || t("auth.authFailed"));
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    if (!canUseGoogle || !googleClientId) { setError(t("auth.googleNotInBuild")); return; }
    if (!googleRequest) { setError("Google request is still loading. Try again."); appendOauthDebug("[G0] request_not_ready"); return; }
    setLoading(true);
    appendOauthDebug(`[G1] prompt start redirect=${googleRedirectUri} project=${projectNameForProxy ?? "-"} clientSuffix=${googleClientId.slice(-20)}`);
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
    if (!firebaseReady) { setError(t("auth.firebaseNotConfiguredShort")); return; }
    if (Constants.appOwnership === "expo") { setError(t("auth.appleNeedsDevBuild")); return; }
    if (!appleAvailableOnDevice) { setError(t("auth.appleNotAvailable")); return; }
    setLoading(true);
    try {
      const rawNonce = [...Array(32)].map(() => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
      const nonceSha256 = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce, { encoding: Crypto.CryptoEncoding.HEX });
      const appleCred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: nonceSha256,
      });
      if (!appleCred.identityToken) { setError(t("auth.appleTokenMissing")); return; }
      await loginWithAppleNative(appleCred.identityToken, rawNonce);
      await refresh();
    } catch (e: unknown) {
      const coded = e as { code?: string; message?: string };
      if (coded?.code === "ERR_REQUEST_CANCELED" || coded?.code === "ERR_CANCELED") {
        appendOauthDebug("[A0] apple_cancel"); setError("");
      } else {
        const msg = coded?.message || (e instanceof Error ? e.message : String(e ?? "unknown"));
        const code = coded?.code || "";
        appendOauthDebug(`[A1] apple_err code=${code} msg=${msg}`);
        setError(`${t("auth.appleFailed")}${msg ? `: ${msg}` : ""}`);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!googleResponse) return;
    const responseParams = "params" in googleResponse ? googleResponse.params : undefined;
    appendOauthDebug(`[G2] response.type=${googleResponse.type} params=${JSON.stringify(responseParams ?? {}).slice(0, 900)}`);
    const finish = async () => {
      try {
        if (googleResponse.type === "cancel" || googleResponse.type === "dismiss") { appendOauthDebug("[G3] cancel_or_dismiss"); setError("OAuth: cancel"); return; }
        if (googleResponse.type === "error") { appendOauthDebug(`[G3] error code=${googleResponse.error?.code ?? "-"} description=${googleResponse.error?.description ?? "-"}`); setError(`OAuth error: ${googleResponse.error?.description || googleResponse.error?.code || "unknown"}`); return; }
        if (googleResponse.type !== "success") { appendOauthDebug(`[G3] unexpected_type=${googleResponse.type}`); return; }
        const accessTokenFromAuth = googleResponse.authentication?.accessToken;
        const directIdToken = responseParams?.id_token;
        appendOauthDebug(`[G4] accessToken=${accessTokenFromAuth ? "present" : "missing"} directIdToken=${directIdToken ? "present" : "missing"}`);
        let googleIdToken: string | undefined = directIdToken;
        const authIdToken = (googleResponse.authentication as unknown as Record<string, unknown>)?.idToken as string | undefined;
        if (!googleIdToken && authIdToken) { googleIdToken = authIdToken; appendOauthDebug("[G4a] using authentication.idToken"); }
        let accessToken: string | undefined = accessTokenFromAuth;
        if (!googleIdToken) {
          const authCode = responseParams?.code;
          if (authCode && googleRequest?.codeVerifier) {
            appendOauthDebug("[G4c] code_exchange with iOS client (no secret needed)");
            try {
              const tokenResponse = await AuthSession.exchangeCodeAsync({ clientId: googleClientId, code: authCode, redirectUri: googleRedirectUri, extraParams: { code_verifier: googleRequest.codeVerifier } }, GOOGLE_DISCOVERY);
              googleIdToken = tokenResponse.idToken;
              accessToken = tokenResponse.accessToken || accessToken;
              appendOauthDebug(`[G4d] exchange ok idToken=${googleIdToken ? "yes" : "no"} access=${accessToken ? "yes" : "no"}`);
            } catch (exErr: unknown) {
              const exMsg = exErr instanceof Error ? exErr.message : String(exErr ?? "");
              appendOauthDebug(`[G4e] exchange_err=${exMsg.slice(0, 300)}`);
            }
          }
        }
        // Web implicit flow: accessToken comes directly in authentication object
        if (!googleIdToken && !accessToken && isWeb) {
          const webToken = (googleResponse as unknown as { authentication?: { accessToken?: string } })?.authentication?.accessToken;
          if (webToken) {
            accessToken = webToken;
            appendOauthDebug("[G4w] web implicit accessToken present");
          }
        }

        if (googleIdToken || accessToken) {
          appendOauthDebug(`[G5] idToken=${googleIdToken ? "yes" : "no"} accessToken=${accessToken ? "yes" : "no"}`);
          const firebaseIdToken = await exchangeGoogleIdTokenForFirebaseIdToken(googleIdToken || null, accessToken);
          await loginWithFirebase(firebaseIdToken);
          await refresh(); return;
        }
        appendOauthDebug("[G5] no_tokens"); setError(t("auth.googleTokenMissing"));
      } catch (err: unknown) {
        const payload = err as { message?: string; status?: number; code?: string };
        const msg = typeof payload?.message === "string" ? payload.message : err instanceof Error ? err.message : "";
        const code = typeof payload?.code === "string" ? payload.code : "";
        const detail = [code, msg].filter(Boolean).join(" — ");
        appendOauthDebug(`[G6] catch detail=${detail || "-"} status=${typeof payload?.status === "number" ? payload.status : "-"}`);
        if (msg === "FIREBASE_NOT_CONFIGURED") setError(t("auth.googleNotInBuild"));
        else if (msg.toLowerCase().includes("firebase not configured")) setError(t("auth.googleNotConfigured"));
        else if (msg === "NETWORK_UNREACHABLE" || msg === "NETWORK_TIMEOUT") setError(t("auth.networkError"));
        else if (msg === "SESSION_STORAGE_FAILED") setError(t("auth.sessionStorageFailed"));
        else if (typeof payload?.status === "number" && payload.status >= 500) {
          const d = msg.trim();
          const generic = !d || d === "Internal Server Error" || d === "Request failed";
          setError(generic ? t("auth.serverError") : `${t("auth.serverError")}\n${d}`);
        } else setError(detail ? `${t("auth.googleFailed")}\n${detail}` : t("auth.googleFailed"));
      } finally { setLoading(false); }
    };
    void finish();
  }, [googleClientId, googleRedirectUri, googleRequest, googleResponse, refresh, t]);

  useEffect(() => {
    if (!githubResponse) return;
    const responseParams = "params" in githubResponse ? githubResponse.params : undefined;
    appendOauthDebug(`[GH2] type=${githubResponse.type} params=${JSON.stringify(responseParams ?? {}).slice(0, 600)}`);
    const finish = async () => {
      try {
        if (githubResponse.type === "cancel" || githubResponse.type === "dismiss") { appendOauthDebug("[GH3] cancel_or_dismiss"); setError(""); return; }
        if (githubResponse.type === "error") { appendOauthDebug(`[GH3] err code=${githubResponse.error?.code ?? "-"} ${githubResponse.error?.description ?? "-"}`); setError(githubResponse.error?.description || githubResponse.error?.code || t("auth.githubFailed")); return; }
        if (githubResponse.type !== "success") { appendOauthDebug(`[GH3] unexpected_type=${githubResponse.type}`); return; }
        const authCode = responseParams?.code;
        if (!authCode || !githubRequest?.codeVerifier) { appendOauthDebug("[GH4] missing_code_or_verifier"); setError(t("auth.githubTokenMissing")); return; }
        const tokenResponse = await AuthSession.exchangeCodeAsync({ clientId: githubClientId, code: authCode, redirectUri: githubRedirectUri, extraParams: { code_verifier: githubRequest.codeVerifier } }, GITHUB_DISCOVERY);
        const ghAccess = tokenResponse.accessToken;
        appendOauthDebug(`[GH5] accessToken=${ghAccess ? "present" : "missing"}`);
        if (!ghAccess) { setError(t("auth.githubTokenMissing")); return; }
        const firebaseIdToken = await exchangeGithubAccessTokenForFirebaseIdToken(ghAccess);
        await loginWithFirebase(firebaseIdToken);
        await refresh();
      } catch (err: unknown) {
        const payload = err as { message?: string; status?: number; code?: string };
        const msg = typeof payload?.message === "string" ? payload.message : err instanceof Error ? err.message : "";
        const code = typeof payload?.code === "string" ? payload.code : "";
        const detail = [code, msg].filter(Boolean).join(" — ");
        appendOauthDebug(`[GH6] catch ${detail || "-"}`);
        if (msg === "FIREBASE_NOT_CONFIGURED") setError(t("auth.githubNotConfigured"));
        else if (msg === "NETWORK_UNREACHABLE" || msg === "NETWORK_TIMEOUT") setError(t("auth.networkError"));
        else if (msg === "SESSION_STORAGE_FAILED") setError(t("auth.sessionStorageFailed"));
        else if (typeof payload?.status === "number" && payload.status >= 500) {
          const d = msg.trim();
          const generic = !d || d === "Internal Server Error" || d === "Request failed";
          setError(generic ? t("auth.serverError") : `${t("auth.serverError")}\n${d}`);
        } else setError(detail ? `${t("auth.githubFailed")}\n${detail}` : t("auth.githubFailed"));
      } finally { setLoading(false); }
    };
    void finish();
  }, [githubClientId, githubRedirectUri, githubRequest, githubResponse, refresh, t]);

  const handleGithubSignIn = async () => {
    setError("");
    if (!canUseGitHub || !githubClientId) { setError(t("auth.githubNotConfigured")); return; }
    if (!githubRequest) { setError(t("auth.githubAuthNotReady")); appendOauthDebug("[GH0] request_not_ready"); return; }
    setLoading(true);
    appendOauthDebug(`[GH1] prompt redirect=${githubRedirectUri}`);
    try {
      await githubPromptAsync();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? "unknown");
      appendOauthDebug(`[GH1E] prompt error=${msg}`);
      setLoading(false);
      setError(`GitHub OAuth: ${msg}`);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Background glow blobs */}
      <View style={s.glowTopRight} pointerEvents="none" />
      <View style={s.glowBottomLeft} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + (Platform.OS === "web" ? 48 : 60), paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[s.card, { opacity: fade }]}>

          {/* ── Logo ── */}
          <View style={s.logoSection}>
            <Image
              source={require("../../../../assets/logo/alloul-logo-dark.png")}
              style={s.logo}
              resizeMode="contain"
            />
            <Text style={s.tagline}>المنصة الذكية لإدارة الشركات</Text>
          </View>

          {/* ── Session notice ── */}
          {sessionNotice ? (
            <TouchableOpacity style={s.sessionNotice} activeOpacity={0.9} onPress={consumeSessionNotice}>
              <Text style={s.sessionNoticeText}>{sessionNotice}</Text>
              <Text style={s.sessionNoticeDismiss}>اضغط للإغلاق</Text>
            </TouchableOpacity>
          ) : null}

          {/* ── Tab switcher ── */}
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, !isRegister && s.tabActive]}
              onPress={() => { setIsRegister(false); setError(""); }}
            >
              <Text style={[s.tabText, !isRegister && s.tabTextActive]}>تسجيل الدخول</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, isRegister && s.tabActive]}
              onPress={() => { setIsRegister(true); setError(""); }}
            >
              <Text style={[s.tabText, isRegister && s.tabTextActive]}>إنشاء حساب</Text>
            </TouchableOpacity>
          </View>

          {/* ── Form ── */}
          <View style={s.form}>
            {isRegister && (
              <View style={s.inputWrapper}>
                <Text style={s.inputLabel}>اسم المستخدم</Text>
                <TextInput
                  style={s.input}
                  placeholder="أدخل اسم المستخدم"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={s.inputWrapper}>
              <Text style={s.inputLabel}>البريد الإلكتروني</Text>
              <TextInput
                style={s.input}
                placeholder="example@company.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={s.inputWrapper}>
              <Text style={s.inputLabel}>كلمة المرور</Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={s.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                  <Text style={s.eyeText}>{showPassword ? "إخفاء" : "إظهار"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            {/* Primary action */}
            <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={s.submitText}>{isRegister ? "إنشاء الحساب" : "تسجيل الدخول"}</Text>
              )}
            </TouchableOpacity>

            {/* ── Google on web ── */}
            {Platform.OS === "web" && canUseGoogle && (
              <>
                <View style={s.divider}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerLabel}>أو</Text>
                  <View style={s.dividerLine} />
                </View>
                <TouchableOpacity
                  style={s.googleBtn}
                  onPress={() => { void handleGoogleSignIn(); }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="rgba(255,255,255,0.7)" />
                  ) : (
                    <View style={s.googleBtnInner}>
                      <Text style={s.googleIcon}>G</Text>
                      <Text style={s.googleText}>المتابعة عبر Google</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* ── Native OAuth (hidden on web) ── */}
            {Platform.OS !== "web" && (canUseGoogle || canUseGitHub || canUseApple) && (
              <>
                <View style={s.divider}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerLabel}>أو</Text>
                  <View style={s.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[s.socialBtn, !canUseGoogle && s.socialBtnOff]}
                  disabled={loading || !canUseGoogle}
                  onPress={() => { void handleGoogleSignIn(); }}
                >
                  {loading ? <ActivityIndicator color="rgba(255,255,255,0.7)" /> : (
                    <Text style={[s.socialText, !canUseGoogle && s.socialTextMuted]}>{t("auth.continueGoogle")}</Text>
                  )}
                </TouchableOpacity>

                {Platform.OS === "ios" && firebaseReady ? (
                  <TouchableOpacity
                    style={[s.socialBtn, !canUseApple && s.socialBtnOff]}
                    disabled={loading || !canUseApple}
                    onPress={() => void handleAppleSignIn()}
                  >
                    {loading ? <ActivityIndicator color="rgba(255,255,255,0.7)" /> : (
                      <Text style={[s.socialText, !canUseApple && s.socialTextMuted]}>
                        {Constants.appOwnership === "expo"
                          ? t("auth.continueAppleExpoGo")
                          : !appleAvailableOnDevice ? t("auth.appleNotAvailable") : t("auth.continueApple")}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[s.socialBtn, !canUseGitHub && s.socialBtnOff]}
                  disabled={loading || !canUseGitHub}
                  onPress={() => void handleGithubSignIn()}
                >
                  {loading ? <ActivityIndicator color="rgba(255,255,255,0.7)" /> : (
                    <Text style={[s.socialText, !canUseGitHub && s.socialTextMuted]}>{t("auth.continueGithub")}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Terms */}
          <Text style={s.terms}>
            بالمتابعة، أنت توافق على{" "}
            <Text style={s.termsLink}>شروط الخدمة</Text>
            {" "}و{" "}
            <Text style={s.termsLink}>سياسة الخصوصية</Text>
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  // Background glows
  glowTopRight: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "#38e8ff",
    opacity: 0.05,
    top: -80,
    right: -100,
  },
  glowBottomLeft: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#a78bfa",
    opacity: 0.04,
    bottom: 60,
    left: -80,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  // Glass card
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 28,
    gap: 20,
  },
  // Logo
  logoSection: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
  },
  logo: {
    width: 140,
    height: 50,
  },
  tagline: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  // Session notice
  sessionNotice: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,92,124,0.36)",
    backgroundColor: "rgba(255,92,124,0.1)",
  },
  sessionNoticeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  sessionNoticeDismiss: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4 },
  // Tab switcher
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  tabText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  // Form
  form: { gap: 12 },
  inputWrapper: { gap: 6 },
  inputLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 15,
    textAlign: "right",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 15,
    textAlign: "right",
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  eyeText: { color: "#38e8ff", fontSize: 12, fontWeight: "700" },
  error: {
    color: "#fb7185",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  // Primary button
  submitBtn: {
    backgroundColor: "#38e8ff",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#38e8ff",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  submitText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "800",
  },
  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dividerLabel: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 11,
    letterSpacing: 1,
  },
  // Google button (web)
  googleBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  googleBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  googleIcon: {
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "900",
  },
  googleText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    fontWeight: "600",
  },
  // Social buttons (native)
  socialBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  socialBtnOff: { opacity: 0.4 },
  socialText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "700",
  },
  socialTextMuted: { color: "rgba(255,255,255,0.3)" },
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
