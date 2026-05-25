import { useCallback, useState } from "react";
import { Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { apiFetch } from "../api/client";

const LIVEKIT_MEET_URL = "https://alloul.app/workspace/smart-meetings";

interface LiveKitRoom {
  room_name: string;
  token: string;
  ws_url: string;
  title: string;
}

export function useCompanyDailyRoom() {
  const [dailyLoading, setDailyLoading] = useState(false);

  const openCompanyDaily = useCallback(async () => {
    setDailyLoading(true);
    try {
      const data = await apiFetch<LiveKitRoom>("/livekit/rooms", {
        method: "POST",
        body: JSON.stringify({ title: "غرفة الشركة المباشرة" }),
      });
      const meetUrl = `${LIVEKIT_MEET_URL}?room=${encodeURIComponent(data.room_name)}&token=${encodeURIComponent(data.token)}&wsUrl=${encodeURIComponent(data.ws_url)}`;
      await WebBrowser.openBrowserAsync(meetUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "تعذّر فتح الاجتماع";
      Alert.alert("غرفة الشركة", msg, [{ text: "حسناً" }]);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  return { openCompanyDaily, dailyLoading };
}
