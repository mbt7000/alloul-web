import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import LoginScreen from "../../features/auth/screens/LoginScreen";
import MobileSplashScreen from "../../features/auth/screens/MobileSplashScreen";
import { loginWithAppleNative } from "../../api";
import { useAuth } from "../../state/auth/AuthContext";
import {
  exchangeAppleIdTokenForFirebaseIdToken,
  exchangeGoogleIdTokenForFirebaseIdToken,
} from "../../shared/utils/firebaseAuth";

WebBrowser.maybeCompleteAuthSession();

const Stack = createNativeStackNavigator();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export default function AuthNavigator() {
  const { refresh } = useAuth();
  const [showSplash, setShowSplash] = useState(Platform.OS !== "web");
  const [appleAvailable, setAppleAvailable] = useState(false);

  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const firebase = (extra?.firebase as Record<string, string> | undefined) || {};
  const googleAuth = (extra?.googleAuth as Record<string, string> | undefined) || {};
  const firebaseReady = Boolean(firebase?.apiKey && firebase?.projectId);
  const googleIosClientId = googleAuth?.iosClientId?.trim() || "";
  const googleWebClientId = googleAuth?.webClientId?.trim() || "";
  const googleClientId = Platform.OS === "ios" && googleIosClientId ? googleIosClientId : googleWebClientId;
  const googleIosClientBaseId = googleIosClientId.replace(".apps.googleusercontent.com", "");
  const googleNativeRedirect = googleIosClientBaseId
    ? `com.googleusercontent.apps.${googleIosClientBaseId}:/oauthredirect`
    : undefined;

  const canGoogle = firebaseReady && Boolean(googleClientId);
  const canApple = Platform.OS === "ios" && appleAvailable && firebaseReady && Constants.appOwnership !== "expo";

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    clientId: googleClientId || "",
    iosClientId: googleIosClientId || "",
    webClientId: googleWebClientId || "",
    redirectUri: googleNativeRedirect
      ? require("expo-auth-session").makeRedirectUri({ native: googleNativeRedirect })
      : require("expo-auth-session").makeRedirectUri({ scheme: "alloul", path: "oauthredirect" }),
    responseType: require("expo-auth-session").ResponseType.Code,
    scopes: ["openid", "profile", "email"],
    usePKCE: true,
    extraParams: { access_type: "offline" },
  } as never);

  const googleResponseHandled = useRef(false);

  useEffect(() => {
    if (!googleResponse || googleResponseHandled.current) return;
    googleResponseHandled.current = true;
    const finish = async () => {
      try {
        if (googleResponse.type !== "success") return;
        const responseParams = "params" in googleResponse ? (googleResponse.params as Record<string, string>) : {};
        const authCode = responseParams?.code;
        let googleIdToken: string | undefined;
        if (authCode && googleRequest?.codeVerifier) {
          const tokenResponse = await require("expo-auth-session").exchangeCodeAsync(
            {
              clientId: googleClientId,
              code: authCode,
              redirectUri: googleNativeRedirect
                ? require("expo-auth-session").makeRedirectUri({ native: googleNativeRedirect })
                : require("expo-auth-session").makeRedirectUri({ scheme: "alloul", path: "oauthredirect" }),
              extraParams: { code_verifier: googleRequest.codeVerifier },
            },
            GOOGLE_DISCOVERY,
          );
          googleIdToken = tokenResponse.idToken;
        }
        const firebaseIdToken = await exchangeGoogleIdTokenForFirebaseIdToken(googleIdToken || null, undefined);
        await loginWithFirebase(firebaseIdToken);
        await refresh();
      } catch {
        // handled silently — errors will show in LoginScreen if user tries again
      } finally {
        googleResponseHandled.current = false;
      }
    };
    void finish();
  }, [googleResponse]);

  const handleGoogleSplash = async () => {
    if (!canGoogle || !googleRequest) { setShowSplash(false); return; }
    try { await promptGoogle(); } catch { setShowSplash(false); }
  };

  const handleAppleSplash = async () => {
    if (!canApple) { setShowSplash(false); return; }
    try {
      const rawNonce = [...Array(32)].map(() => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
      const nonceSha256 = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce, { encoding: Crypto.CryptoEncoding.HEX });
      const appleCred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: nonceSha256,
      });
      if (!appleCred.identityToken) return;
      await loginWithAppleNative(appleCred.identityToken, rawNonce);
      await refresh();
    } catch (e: unknown) {
      const coded = e as { code?: string };
      if (coded?.code !== "ERR_REQUEST_CANCELED" && coded?.code !== "ERR_CANCELED") {
        setShowSplash(false);
      }
    }
  };

  if (Platform.OS !== "web" && showSplash) {
    return (
      <MobileSplashScreen
        onSignIn={() => setShowSplash(false)}
        onRegister={() => setShowSplash(false)}
        onGoogle={canGoogle ? handleGoogleSplash : undefined}
        onApple={canApple ? handleAppleSplash : undefined}
        canGoogle={canGoogle}
        canApple={canApple}
      />
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={LoginScreen} />
    </Stack.Navigator>
  );
}
