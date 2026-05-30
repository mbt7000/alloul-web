import React from "react";
import { View, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../ui/AppText";
import { radius } from "../../theme/radius";

export type PresenceStatus = "online" | "busy" | "offline" | "away";

type Action = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
  loading?: boolean;
};

type UserCardProps = {
  name: string;
  jobTitle?: string;
  role?: string;
  avatarUrl?: string | null;
  presence?: PresenceStatus | null;
  actions?: Action[];
  compact?: boolean;
};

const ROLE_COLORS: Record<string, string> = {
  owner: "#FFB24D",
  admin: "#FF4757",
  manager: "#8B5CF6",
  employee: "#2E8BFF",
};

const PRESENCE_COLOR: Record<string, string> = {
  online: "#14E0A4",
  busy: "#FF4757",
  away: "#FFB24D",
  offline: "#475569",
};

function getHue(name: string): number {
  return name ? (name.charCodeAt(0) * 47) % 360 : 200;
}

export function UserCard({
  name,
  jobTitle,
  role,
  avatarUrl,
  presence,
  actions = [],
  compact = false,
}: UserCardProps) {
  const hue = getHue(name);
  const roleColor = role ? (ROLE_COLORS[role] ?? "#14E0A4") : undefined;
  const presenceColor = PRESENCE_COLOR[presence ?? "offline"];
  const avatarSize = compact ? 38 : 46;

  return (
    <View style={{
      backgroundColor: "rgba(255,255,255,0.035)",
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.06)",
      padding: compact ? 10 : 14,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: actions.length > 0 ? 14 : 0 }}>
        {/* Avatar */}
        <View style={{ position: "relative" }}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: avatarSize, height: avatarSize,
                borderRadius: avatarSize * 0.28,
              }}
            />
          ) : (
            <View style={{
              width: avatarSize, height: avatarSize,
              borderRadius: avatarSize * 0.28,
              backgroundColor: `hsl(${hue},45%,20%)`,
              borderWidth: 1.5,
              borderColor: `hsl(${hue},50%,35%)`,
              alignItems: "center", justifyContent: "center",
            }}>
              <AppText style={{
                color: `hsl(${hue},70%,72%)`,
                fontSize: avatarSize * 0.33,
                fontWeight: "800",
              }}>
                {(name || "؟").slice(0, 2).toUpperCase()}
              </AppText>
            </View>
          )}
          {/* Presence dot */}
          <View style={{
            position: "absolute",
            bottom: -1, right: -1,
            width: 12, height: 12,
            borderRadius: 6,
            backgroundColor: presenceColor,
            borderWidth: 2,
            borderColor: "#090d1a",
          }} />
        </View>

        {/* Info */}
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ color: "#e2e8f0", fontSize: compact ? 13 : 15, fontWeight: "700" }} numberOfLines={1}>
            {name}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {jobTitle ? (
              <AppText style={{ color: "rgba(255,255,255,0.38)", fontSize: compact ? 11 : 12 }} numberOfLines={1}>
                {jobTitle}
              </AppText>
            ) : null}
            {roleColor ? (
              <View style={{
                paddingHorizontal: 7, paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: `${roleColor}18`,
              }}>
                <AppText style={{ color: roleColor, fontSize: 10, fontWeight: "700" }}>{role}</AppText>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Actions */}
      {actions.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {actions.map((a, i) => (
            <TouchableOpacity
              key={i}
              onPress={a.onPress}
              disabled={a.loading}
              style={{ alignItems: "center", gap: 5, flex: 1 }}
            >
              <View style={{
                width: 42, height: 42, borderRadius: 13,
                backgroundColor: `${a.color}18`,
                borderWidth: 1, borderColor: `${a.color}35`,
                alignItems: "center", justifyContent: "center",
              }}>
                {a.loading
                  ? <ActivityIndicator size="small" color={a.color} />
                  : <Ionicons name={a.icon} size={18} color={a.color} />
                }
              </View>
              <AppText style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "600" }}>
                {a.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
