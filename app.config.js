// App config with env-based overrides for Expo Go and EAS
const path = require("path");
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
  // `.env.local` يتجاوز `.env` على جهازك فقط؛ مُستثنى من Git (انظر `.gitignore`).
  require("dotenv").config({
    path: path.join(__dirname, ".env.local"),
    override: true,
  });
} catch {
  /* dotenv is optional if missing */
}

function pickEnv(envKey, fallback) {
  const raw = process.env[envKey];
  if (raw == null || String(raw).trim() === "") {
    return fallback != null && String(fallback).trim() !== "" ? String(fallback).trim() : "";
  }
  return String(raw).replace(/^["']|["']$/g, "").trim();
}

function isAllowedApiHostname(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (h === "localhost") return true;
  if (h.endsWith(".local")) return true;
  return h.includes(".");
}

function normalizeApiUrl(raw, fallback = "https://api.alloul.app") {
  const candidate = String(raw || "").trim().replace(/\/+$/, "");
  if (!candidate) return fallback;
  if (candidate === "https://api" || candidate === "http://api") return fallback;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname || !isAllowedApiHostname(parsed.hostname)) return fallback;
    return candidate;
  } catch {
    return fallback;
  }
}

module.exports = ({ config }) => {
    const ios = config.ios ? { ...config.ios } : config.ios;
    const android = config.android ? { ...config.android } : config.android;
    if (ios && Object.prototype.hasOwnProperty.call(ios, "googleServicesFile")) {
        delete ios.googleServicesFile;
    }
    if (android && Object.prototype.hasOwnProperty.call(android, "googleServicesFile")) {
        delete android.googleServicesFile;
    }
    return {
        ...config,
        ios,
        android,
        extra: {
            ...(config.extra || {}),
            debugAuthVersion: "oauth-debug-v10",
            apiUrl: normalizeApiUrl(pickEnv("EXPO_PUBLIC_API_URL", config.extra?.apiUrl)),
            apiDocsUrl: pickEnv("EXPO_PUBLIC_API_DOCS_URL", config.extra?.apiDocsUrl),
            apiOpenapiUrl: pickEnv("EXPO_PUBLIC_API_OPENAPI_URL", config.extra?.apiOpenapiUrl),
            firebase: {
                apiKey: pickEnv("EXPO_PUBLIC_FIREBASE_API_KEY", config.extra?.firebase?.apiKey),
                authDomain: pickEnv("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", config.extra?.firebase?.authDomain),
                projectId: pickEnv("EXPO_PUBLIC_FIREBASE_PROJECT_ID", config.extra?.firebase?.projectId),
                storageBucket: pickEnv("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET", config.extra?.firebase?.storageBucket),
                messagingSenderId: pickEnv("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", config.extra?.firebase?.messagingSenderId),
                appId: pickEnv("EXPO_PUBLIC_FIREBASE_APP_ID", config.extra?.firebase?.appId),
            },
            googleAuth: {
                iosClientId: pickEnv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", config.extra?.googleAuth?.iosClientId),
                androidClientId: pickEnv("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID", config.extra?.googleAuth?.androidClientId),
                webClientId: pickEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", config.extra?.googleAuth?.webClientId),
            },
            microsoftAuth: {
                clientId: pickEnv("EXPO_PUBLIC_MICROSOFT_CLIENT_ID", config.extra?.microsoftAuth?.clientId),
                tenantId: pickEnv("EXPO_PUBLIC_MICROSOFT_TENANT_ID", config.extra?.microsoftAuth?.tenantId),
            },
        },
    };
};
