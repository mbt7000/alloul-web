/**
 * Feature Flags Configuration (Web)
 * إدارة الميزات المفعلة/المعطلة للتطبيق
 */

export const FEATURES = {
  // Media & Social Features
  MEDIA_WORLD: false,        // ❌ Media/Social مُعطَّل
  CORPORATE_WORLD: true,     // ✅ Business features مفعّل
  AI_HUB: true,              // ✅ AI مفعّل

  // Additional Features
  AUTOMATION: true,          // ✅ أتمتة مفعّلة
  TEAM_MANAGEMENT: true,     // ✅ إدارة الفريق مفعّلة
  BILLING: true,             // ✅ الفواتير مفعّلة
  NOTIFICATIONS: true,       // ✅ الإشعارات مفعّلة
} as const;

// Type safety
export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (feature: FeatureKey): boolean => {
  return FEATURES[feature];
};
