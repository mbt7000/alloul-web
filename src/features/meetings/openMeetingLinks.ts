import * as WebBrowser from "expo-web-browser";
import { Alert, Linking } from "react-native";

const MEET_NEW = "https://meet.google.com/new";
const ZOOM_START = "https://zoom.us/start/videomeeting";
const TEAMS_APP = "https://teams.microsoft.com/v2/";

export type MeetingProvider = "meet" | "zoom" | "teams";

const URLS: Record<MeetingProvider, string> = {
  meet: MEET_NEW,
  zoom: ZOOM_START,
  teams: TEAMS_APP,
};

/** Opens the provider in an in-app browser (Expo) with https fallback. */
export async function openMeetingProvider(kind: MeetingProvider): Promise<void> {
  const url = URLS[kind];
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert("تعذّر الفتح", "جرّب فتح الرابط من متصفح الجهاز.");
    } catch {
      Alert.alert("تعذّر الفتح", "تحقق من الاتصال بالإنترنت وحاول مرة أخرى.");
    }
  }
}
