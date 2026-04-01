import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GlassCard from "./GlassCard";
import AppText from "../ui/AppText";
import ListRow from "../ui/ListRow";
import { colors } from "../../theme/colors";
import { useNotifications } from "../../state/notifications/NotificationsContext";
import { ROOT_SHELL_ROUTES } from "../../config/routes";

const FEATURED_COMPANIES = [
  { id: "1", name: "Alloul Labs", tag: "Technology", initials: "A" },
  { id: "2", name: "Nile Commerce", tag: "Retail", initials: "N" },
  { id: "3", name: "Gulf Ops Co.", tag: "Logistics", initials: "G" },
];

const FEED_PREVIEW = [
  { id: "1", line: "Product update: new workspace shell shipped", author: "Alloul" },
  { id: "2", line: "Hiring: Senior React Native — remote friendly", author: "HR" },
];

const JOBS_SNAPSHOT = [
  { id: "1", title: "Engineering Lead", type: "Full-time" },
  { id: "2", title: "Growth Marketer", type: "Contract" },
];

const MARKETPLACE_SNAPSHOT = [
  { id: "1", title: "Enterprise SSO pack", price: "From $199/mo" },
  { id: "2", title: "Handover templates", price: "Free" },
];

const DISCOVERY = [
  { id: "1", name: "Sara M.", role: "Product · 12 mutuals" },
  { id: "2", name: "Omar K.", role: "Design · 8 mutuals" },
];

export default function PublicHomeSections({ navigation }: { navigation: any }) {
  const { displayUnreadCount } = useNotifications();
  const inboxSubtitle =
    displayUnreadCount > 0
      ? `${displayUnreadCount} unread notif. · chats & approvals`
      : "Chats, notifications, approvals";
  return (
    <View style={{ gap: 14 }}>
      <GlassCard strength="strong" style={styles.card}>
        <AppText variant="title" weight="bold">
          Welcome to the network
        </AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
          Follow people and companies, then switch to Company mode when you need to run internal operations.
        </AppText>
      </GlassCard>

      <View style={styles.kickerRow}>
        <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
          Network preview
        </AppText>
        <Pressable onPress={() => navigation.navigate("Feed")}>
          <AppText variant="micro" tone="cyan" weight="bold">
            Open Feed
          </AppText>
        </Pressable>
      </View>
      <GlassCard style={styles.card}>
        {FEED_PREVIEW.map((f) => (
          <View key={f.id} style={styles.previewRow}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodySm" weight="bold" numberOfLines={2}>
                {f.line}
              </AppText>
              <AppText variant="micro" tone="muted" style={{ marginTop: 4 }}>
                {f.author}
              </AppText>
            </View>
          </View>
        ))}
      </GlassCard>

      <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
        Featured companies
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {FEATURED_COMPANIES.map((c) => (
          <GlassCard key={c.id} style={styles.companyChip}>
            <View style={styles.companyAvatar}>
              <AppText variant="bodySm" weight="bold">
                {c.initials}
              </AppText>
            </View>
            <AppText variant="caption" weight="bold" numberOfLines={1} style={{ marginTop: 8 }}>
              {c.name}
            </AppText>
            <AppText variant="micro" tone="muted" numberOfLines={1}>
              {c.tag}
            </AppText>
          </GlassCard>
        ))}
      </ScrollView>

      <View style={styles.twoCol}>
        <GlassCard style={styles.halfCard}>
          <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
            Jobs
          </AppText>
          {JOBS_SNAPSHOT.map((j) => (
            <View key={j.id} style={styles.miniRow}>
              <Ionicons name="briefcase-outline" size={16} color={colors.accentCyan} />
              <View style={{ flex: 1 }}>
                <AppText variant="caption" weight="bold" numberOfLines={1}>
                  {j.title}
                </AppText>
                <AppText variant="micro" tone="muted">
                  {j.type}
                </AppText>
              </View>
            </View>
          ))}
          <Pressable style={{ marginTop: 8 }} onPress={() => navigation.getParent()?.navigate("Jobs")}>
            <AppText variant="micro" tone="cyan" weight="bold">
              Browse jobs →
            </AppText>
          </Pressable>
        </GlassCard>
        <GlassCard style={styles.halfCard}>
          <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
            Marketplace
          </AppText>
          {MARKETPLACE_SNAPSHOT.map((m) => (
            <View key={m.id} style={styles.miniRow}>
              <Ionicons name="storefront-outline" size={16} color={colors.accentTeal} />
              <View style={{ flex: 1 }}>
                <AppText variant="caption" weight="bold" numberOfLines={2}>
                  {m.title}
                </AppText>
                <AppText variant="micro" tone="muted">
                  {m.price}
                </AppText>
              </View>
            </View>
          ))}
        </GlassCard>
      </View>

      <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
        Suggested for you
      </AppText>
      <GlassCard style={styles.card}>
        {DISCOVERY.map((d) => (
          <View key={d.id} style={styles.discRow}>
            <View style={styles.discAvatar}>
              <AppText variant="micro" weight="bold">
                {d.name.slice(0, 1)}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodySm" weight="bold">
                {d.name}
              </AppText>
              <AppText variant="micro" tone="muted">
                {d.role}
              </AppText>
            </View>
            <AppText variant="micro" tone="cyan" weight="bold">
              Follow
            </AppText>
          </View>
        ))}
      </GlassCard>

      <AppText variant="micro" tone="muted" weight="bold" style={styles.kicker}>
        Quick actions
      </AppText>
      <View style={{ gap: 8 }}>
        <ListRow
          title="Discover"
          subtitle="People, companies, jobs, services"
          iconLeft="compass-outline"
          onPress={() => navigation.navigate("Search", { source: "home" })}
        />
        <ListRow
          title="Jobs"
          subtitle="Apply with your profile and skills"
          iconLeft="briefcase-outline"
          onPress={() => navigation.getParent()?.navigate("Jobs")}
        />
        <ListRow title="Open Feed" subtitle="Posts, media, reactions" iconLeft="radio-outline" onPress={() => navigation.navigate("Feed")} />
        <ListRow
          title="Apps hub"
          subtitle="Public & company modules"
          iconLeft="apps-outline"
          onPress={() => navigation.getParent()?.navigate(ROOT_SHELL_ROUTES.company, { screen: "CompanyWorkspace" })}
        />
        <ListRow title="Inbox" subtitle={inboxSubtitle} iconLeft="mail-outline" onPress={() => navigation.navigate("Inbox")} />
        <ListRow title="Your profile" subtitle="Activity & companies" iconLeft="person-outline" onPress={() => navigation.navigate("Profile")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  kicker: { letterSpacing: 0.8, textTransform: "uppercase" },
  kickerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewRow: { flexDirection: "row", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentCyan, marginTop: 6 },
  hScroll: { gap: 10, paddingBottom: 4 },
  companyChip: { width: 140, padding: 12 },
  companyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(56,232,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.2)",
  },
  twoCol: { flexDirection: "row", gap: 10 },
  halfCard: { flex: 1, padding: 12, minWidth: 0 },
  miniRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  discRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  discAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.bgCardStrong,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
