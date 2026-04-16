/**
 * Feature Flags Configuration
 * إدارة الميزات المفعلة/المعطلة للتطبيق
 *
 * تغيير القيمة يحتاج rebuild فقط
 */

export const FEATURES = {
  CORPORATE_WORLD: true,     // ✅ Business workspace
  AI_HUB: true,              // ✅ AI assistant
  AUTOMATION: true,          // ✅ Automations
  TEAM_MANAGEMENT: true,     // ✅ Team management
  BILLING: true,             // ✅ Billing & subscriptions
  NOTIFICATIONS: true,       // ✅ Notifications
} as const;

// Type safety
export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (feature: FeatureKey): boolean => {
  return FEATURES[feature];
};
