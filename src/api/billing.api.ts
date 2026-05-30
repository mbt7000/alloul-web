/**
 * ALLOUL&Q — Billing API (wires to /companies/* — the canonical Stripe
 * integration used by Cowork and the production backend).
 *
 * Plan IDs match Stripe Dashboard:
 *   starter  → prod_UB8zDoyn2YPFFY ($30/mo)
 *   pro      → prod_UB90ckEsKlawsj ($90/mo)
 *   business → prod_UB91gU3Z32gHKq ($210/mo)
 *   enterprise → contact sales
 */
import { apiFetch } from "./client";

export type PlanTier = "starter" | "pro" | "business" | "enterprise";

export interface StripeConfig {
  publishable_key: string;
  plans: {
    starter: { price_id: string; amount: number; employees: number };
    pro: { price_id: string; amount: number; employees: number };
    business: { price_id: string; amount: number; employees: number };
  };
}

export interface SubscriptionStatus {
  plan_id: PlanTier | "admin" | null;
  status: "active" | "trialing" | "past_due" | "canceled" | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
}

export interface SubscribeResponse {
  checkout_url: string;
}

// ─── Endpoints (ALL hitting /companies/* — the canonical ones) ──────────────

export const getStripeConfig = () =>
  apiFetch<StripeConfig>("/companies/stripe-config");

export const subscribe = (plan_id: PlanTier) =>
  apiFetch<SubscribeResponse>("/companies/subscribe", {
    method: "POST",
    body: JSON.stringify({ plan_id }),
  });

export const getSubscriptionStatus = () =>
  apiFetch<SubscriptionStatus>("/companies/subscription-status");

export const cancelSubscription = () =>
  apiFetch<{ message: string }>("/companies/cancel-subscription", {
    method: "POST",
  });

// ─── Plan metadata (matches Stripe Dashboard exactly) ──────────────────────

export const PLANS: Record<
  Exclude<PlanTier, "enterprise">,
  {
    nameEn: string;
    nameAr: string;
    monthlyPriceUsd: number;
    employeeLimit: number;
    trialDays: number;
    features: string[];
    accentColor: string;
  }
> = {
  starter: {
    nameEn: "Starter",
    nameAr: "المبتدئ",
    monthlyPriceUsd: 30,
    employeeLimit: 5,
    trialDays: 14,
    accentColor: "#2E8BFF",
    features: [
      "حتى 5 موظفين",
      "لوحة تحكم الفريق",
      "المشاريع والمهام",
      "CRM أساسي",
      "10GB تخزين",
      "مساعد AI محدود (50/شهر)",
      "دعم إيميل",
    ],
  },
  pro: {
    nameEn: "Pro",
    nameAr: "الاحترافي",
    monthlyPriceUsd: 90,
    employeeLimit: 25,
    trialDays: 14,
    accentColor: "#14E0A4",
    features: [
      "كل ميزات Starter",
      "حتى 25 موظف",
      "مساعد AI كامل (500/شهر)",
      "اجتماعات ذكية",
      "50GB تخزين",
      "تكامل WhatsApp",
      "دعم أولوية",
    ],
  },
  business: {
    nameEn: "Business",
    nameAr: "الأعمال",
    monthlyPriceUsd: 210,
    employeeLimit: 100,
    trialDays: 14,
    accentColor: "#C9A260",
    features: [
      "كل ميزات Pro",
      "حتى 100 موظف",
      "AI غير محدود",
      "Document AI + RAG",
      "فواتير ZATCA/VAT",
      "توليد العملاء (Automation)",
      "200GB تخزين",
      "API access",
      "دعم VIP 24/7",
    ],
  },
};
