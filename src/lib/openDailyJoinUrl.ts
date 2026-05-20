import * as WebBrowser from "expo-web-browser";
import { Alert, Linking } from "react-native";

/** يفتح غرفة Daily في المتصفح داخل التطبيق (Expo). */
export async function openDailyJoinUrl(joinUrl: string): Promise<void> {
  // Only allow HTTPS URLs from Daily.co
  if (!joinUrl.startsWith('https://')) {
    Alert.alert("خطأ", "رابط الاجتماع غير صالح.")
    return
  }
  try {
    await WebBrowser.openBrowserAsync(joinUrl);
  } catch {
    try {
      const ok = await Linking.canOpenURL(joinUrl);
      if (ok) await Linking.openURL(joinUrl);
      else Alert.alert("تعذّر الفتح", "جرّب من متصفح الجهاز.");
    } catch {
      Alert.alert("تعذّر الفتح", "تحقق من الاتصال بالإنترنت.");
    }
  }
}
