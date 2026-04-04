import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { loginWithAzureAd } from "../../../api";

WebBrowser.maybeCompleteAuthSession();

type Props = {
  tenantId: string;
  clientId: string;
  disabled: boolean;
  onError: (msg: string) => void;
  onSignedIn: () => Promise<void>;
  label: string;
  socialBtn: object;
  socialText: object;
  socialBtnOff?: object;
  socialTextMuted?: object;
  spinnerColor: string;
};

export default function MicrosoftSignInButton({
  tenantId,
  clientId,
  disabled,
  onError,
  onSignedIn,
  label,
  socialBtn,
  socialText,
  socialBtnOff,
  socialTextMuted,
  spinnerColor,
}: Props) {
  const [exchanging, setExchanging] = useState(false);
  const processedAuthCode = useRef<string | null>(null);
  const discovery = AuthSession.useAutoDiscovery(`https://login.microsoftonline.com/${tenantId}/v2.0`);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "alloul",
    path: "oauth/microsoft",
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ["openid", "profile", "email", "offline_access"],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  const ready = Boolean(request && discovery);

  const runExchange = useCallback(async () => {
    if (!response || response.type !== "success") return;
    if (!discovery) return;
    const code = "params" in response && response.params ? (response.params as { code?: string }).code : undefined;
    if (!code || !request?.codeVerifier) {
      onError("Microsoft: missing authorization code");
      return;
    }
    setExchanging(true);
    try {
      const tokenRes = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier },
        },
        discovery
      );
      const idToken = tokenRes.idToken;
      if (!idToken) {
        onError("Microsoft: no id_token in token response");
        return;
      }
      await loginWithAzureAd(idToken);
      await onSignedIn();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : String(e);
      const st = e && typeof e === "object" && "status" in e ? (e as { status: number }).status : 0;
      if (st >= 500) {
        onError(msg || "Microsoft: server error");
      } else {
        onError(msg || "Microsoft sign-in failed");
      }
    } finally {
      setExchanging(false);
    }
  }, [clientId, discovery, onError, onSignedIn, redirectUri, request, response]);

  useEffect(() => {
    if (!response) return;
    if (response.type === "cancel" || response.type === "dismiss") return;
    if (response.type === "error") {
      onError(response.error?.description || response.error?.code || "Microsoft OAuth error");
      return;
    }
    if (response.type !== "success") return;
    const code = "params" in response && response.params ? (response.params as { code?: string }).code : undefined;
    if (!code || processedAuthCode.current === code) return;
    processedAuthCode.current = code;
    void runExchange();
  }, [response, runExchange, onError]);

  const onPress = () => {
    if (!ready) {
      onError("Microsoft: auth request not ready");
      return;
    }
    void promptAsync();
  };

  const off = disabled || !ready || exchanging;

  return (
    <TouchableOpacity style={[socialBtn, off && socialBtnOff]} disabled={off} onPress={onPress}>
      {exchanging ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[socialText, !ready && socialTextMuted]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
