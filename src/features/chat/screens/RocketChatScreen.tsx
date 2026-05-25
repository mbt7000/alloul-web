import React, { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator, TouchableOpacity, StatusBar } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { apiFetch } from "../../../api/client";

interface RCSession {
  rc_token: string;
  rc_user_id: string;
  rc_url: string;
}

export default function RocketChatScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();
  const webRef = useRef<WebView>(null);

  const [session, setSession] = useState<RCSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<RCSession>("/rocketchat/token", { method: "POST" })
      .then(setSession)
      .catch(() => setError("تعذّر الاتصال بالشات"));
  }, []);

  // SSO: حقن RC token في localStorage قبل تحميل الصفحة
  const injectedJS = session
    ? `
      (function() {
        try {
          localStorage.setItem('Meteor.loginToken', ${JSON.stringify(session.rc_token)});
          localStorage.setItem('Meteor.userId', ${JSON.stringify(session.rc_user_id)});
        } catch(e) {}
      })();
      true;
    `
    : undefined;

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Ionicons name="chatbubbles-outline" size={48} color="#555" />
        <AppText style={{ color: c.textMuted, fontSize: 14 }}>{error}</AppText>
        <TouchableOpacity
          onPress={() => { setError(null); setSession(null); apiFetch<RCSession>("/rocketchat/token", { method: "POST" }).then(setSession).catch(() => setError("تعذّر الاتصال")); }}
          style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: c.accentBlue }}
        >
          <AppText style={{ color: "#fff", fontSize: 14 }}>إعادة المحاولة</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator color="#3b82f6" size="large" />
        <AppText style={{ color: "#888", fontSize: 13, marginTop: 12 }}>جارٍ فتح الشات...</AppText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Header */}
      <View style={{
        paddingTop: insets.top,
        backgroundColor: "#1f1f3a",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingBottom: 10,
        gap: 10,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffffff18", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>الشات</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#22c55e" }} />
            <AppText style={{ color: "#22c55e", fontSize: 11 }}>متصل</AppText>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => webRef.current?.reload()}
          hitSlop={10}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffffff18", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <WebView
        ref={webRef}
        source={{ uri: `${session.rc_url}/home` }}
        style={{ flex: 1 }}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        originWhitelist={["*"]}
        userAgent="ALLOULQ/1.0 Mobile"
      />

      {loading && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "#1a1a2e", alignItems: "center", justifyContent: "center", gap: 14,
        }}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <AppText style={{ color: "#888", fontSize: 13 }}>جارٍ تحميل الشات...</AppText>
        </View>
      )}
    </View>
  );
}
