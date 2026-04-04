import { apiFetch } from "./client";

export type DailyJoinResponse = {
  join_url: string;
  room_name: string;
  provider: string;
};

/** غرفة الشركة على Daily (فيديو + شات داخل الجلسة) — يتطلب عضوية شركة وإعداد الخادم */
export const getCompanyDailyJoinUrl = () => apiFetch<DailyJoinResponse>("/daily/company-join");
