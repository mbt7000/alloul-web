import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { getCompanyDailyJoinUrl } from "../api";
import { openDailyJoinUrl } from "./openDailyJoinUrl";

const DAILY_HINT =
  "تأكد من ضبط DAILY_API_KEY و DAILY_SUBDOMAIN على الخادم، وأنك عضو في شركة.";

export function useCompanyDailyRoom() {
  const [dailyLoading, setDailyLoading] = useState(false);

  const openCompanyDaily = useCallback(async () => {
    setDailyLoading(true);
    try {
      const r = await getCompanyDailyJoinUrl();
      await openDailyJoinUrl(r.join_url);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "تعذّر فتح Daily";
      Alert.alert("غرفة Daily", `${msg}\n\n${DAILY_HINT}`, [{ text: "حسناً" }]);
    } finally {
      setDailyLoading(false);
    }
  }, []);

  return { openCompanyDaily, dailyLoading };
}
