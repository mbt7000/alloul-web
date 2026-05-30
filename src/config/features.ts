/**
 * Feature Flags Configuration
 * إدارة الميزات المفعلة/المعطلة للتطبيق
 *
 * تغيير القيمة يحتاج rebuild فقط
 */

export const FEATURES = {
  // ─── Existing features ────────────────────────────────────────────────────
  CORPORATE_WORLD: true,     // ✅ Business workspace
  AI_HUB: true,              // ✅ AI assistant
  AUTOMATION: true,          // ✅ Automations
  TEAM_MANAGEMENT: true,     // ✅ Team management
  BILLING: true,             // ✅ Billing & subscriptions
  NOTIFICATIONS: true,       // ✅ Notifications

  // ─── Phase 3: Auth & Billing Migration (default OFF until backend ready) ──
  USE_PARENT_AUTH: false,    // 🔒 SSO via alloul-platform identity service
  USE_PARENT_BILLING: false, // 🔒 Unified billing via alloul-platform

  // ─── Phase 3: AI Features ─────────────────────────────────────────────────
  ALLOULAI_ASSISTANT: true,  // ✅ AlloulAI workspace assistant (Ollama-powered)
  AI_SALES_ASSISTANT: false, // 🔒 AI sidebar in CRM / Deals
  DOCUMENT_AI: false,        // 🔒 Document upload + RAG ($49/mo add-on)

  // ─── Phase 3: Communication ───────────────────────────────────────────────
  WHATSAPP_INTEGRATION: true,  // ✅ WhatsApp Business ($99/mo add-on)
  SMART_MEETINGS: true,        // ✅ LiveKit + AI transcription + action items

  // ─── Phase 3: Growth & Finance ────────────────────────────────────────────
  LEAD_GENERATION: false,    // 🔒 ALLOUL Automation lead capture ($0.20/lead or $99/mo)
  ZATCA_INVOICES: false,     // 🔒 ZATCA/UAE tax-compliant invoice generation
} as const;

// Type safety
export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (feature: FeatureKey): boolean => {
  return FEATURES[feature];
};
