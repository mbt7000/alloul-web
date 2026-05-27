import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";

interface LiveKitRoom {
  room_name: string;
  token: string;
  ws_url: string;
  title: string;
}

export function useCompanyDailyRoom() {
  const navigation = useNavigation<any>();
  const [dailyLoading, setDailyLoading] = useState(false);

  const openCompanyDaily = useCallback(async () => {
    setDailyLoading(true);
    try {
      const data = await apiFetch<LiveKitRoom>("/livekit/company-room", {
        method: "GET",
      });
      navigation.navigate("LiveRoom", {
        room_name: data.room_name,
        token: data.token,
        ws_url: data.ws_url,
        title: data.title,
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
  }, [navigation]);

  return { openCompanyDaily, dailyLoading };
}
