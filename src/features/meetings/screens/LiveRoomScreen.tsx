import React, { useRef, useState, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { getToken } from "../../../api/client";

interface RouteParams {
  room_name: string;
  token: string;
  ws_url: string;
  title: string;
}

const MEET_BASE = "https://alloul.app/workspace/smart-meetings";

export default function LiveRoomScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors: c } = useAppTheme();
  const webRef = useRef<WebView>(null);

  const { room_name, token, ws_url, title } = (route.params ?? {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // جلب توكن المستخدم من SecureStore
  useEffect(() => {
    getToken().then(setAuthToken);
  }, []);

  const meetUrl = `${MEET_BASE}?room=${encodeURIComponent(room_name ?? "")}&token=${encodeURIComponent(token ?? "")}&wsUrl=${encodeURIComponent(ws_url ?? "")}`;

  // حقن التوكن في localStorage قبل تحميل الصفحة — يمنع شاشة تسجيل الدخول
  const injectedJS = authToken
    ? `
      (function() {
        try {
          localStorage.setItem('alloul_token', ${JSON.stringify(authToken)});
          localStorage.setItem('access_token', ${JSON.stringify(authToken)});
        } catch(e) {}
      })();
      true;
    `
    : undefined;

  // لا نحمّل الـ WebView حتى نجلب التوكن
  if (authToken === null) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator color="#3b82f6" size="large" />
        <AppText style={{ color: "#888", fontSize: 13, marginTop: 12 }}>جارٍ التحقق من الهوية...</AppText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={{
        paddingTop: insets.top,
        backgroundColor: "#111",
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
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
            {title ?? "اجتماع مباشر"}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#22c55e" }} />
            <AppText style={{ color: "#22c55e", fontSize: 11 }}>مباشر</AppText>
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
      {!error ? (
        <WebView
          ref={webRef}
          source={{ uri: meetUrl }}
          style={{ flex: 1, backgroundColor: "#000" }}
          injectedJavaScriptBeforeContentLoaded={injectedJS}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          originWhitelist={["*"]}
          userAgent="ALLOULQ/1.0 Mobile"
        />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Ionicons name="wifi-outline" size={48} color="#555" />
          <AppText style={{ color: "#888", fontSize: 14 }}>تعذّر تحميل الاجتماع</AppText>
          <TouchableOpacity
            onPress={() => { setError(false); setLoading(true); }}
            style={{ paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: "#ffffff18" }}
          >
            <AppText style={{ color: "#fff", fontSize: 14 }}>إعادة المحاولة</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading overlay */}
      {loading && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 14,
        }}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <AppText style={{ color: "#888", fontSize: 13 }}>جارٍ تحميل الاجتماع...</AppText>
        </View>
      )}
    </View>
  );
}
