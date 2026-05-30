import { apiFetch } from "./client";

export type AdminStats = {
  total_users: number;
  verified_users: number;
  total_companies: number;
};

export function getAdminStats() {
  return apiFetch<AdminStats>("/admin/stats");
}
