import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../../shared/layout/Screen";
import AppHeader from "../../../shared/layout/AppHeader";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import GlassCard from "../../../shared/components/GlassCard";
import { CompanyChip, CompanyEmptyState, CompanyHeroCard, CompanySectionLabel } from "../components/CompanyBlocks";
import { useCompany } from "../../../state/company/CompanyContext";
import { getDashboardActivity, getPosts, type ApiPost, type DashboardActivityItem } from "../../../api";
import { colors } from "../../../theme/colors";

function relativeTime(value?: string | null) {
  if (!value) return "Just now";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CompanyFeedScreen() {
  const navigation = useNavigation<any>();
  const { company } = useCompany();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [activity, setActivity] = useState<DashboardActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [postRows, activityRows] = await Promise.all([
        getPosts(10, 0).catch(() => [] as ApiPost[]),
        getDashboardActivity(6).catch(() => [] as DashboardActivityItem[]),
      ]);
      setPosts(Array.isArray(postRows) ? postRows : []);
      setActivity(Array.isArray(activityRows) ? activityRows : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const summary = useMemo(
    () => [
      { label: "Announcements", value: String(posts.length), icon: "megaphone-outline" as const },
      { label: "Timeline events", value: String(activity.length), icon: "pulse-outline" as const },
    ],
    [posts.length, activity.length]
  );

  return (
    <Screen edges={["top", "left", "right", "bottom"]} style={{ backgroundColor: colors.mediaCanvas }}>
      <AppHeader
        title="الإعلانات"
        rightActions={
          <AppButton label="نشر" size="sm" onPress={() => navigation.navigate("CreatePost")} />
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />}
        showsVerticalScrollIndicator={false}
      >
        <CompanyHeroCard
          eyebrow="Internal updates"
          title={company?.name || "Company feed"}
          subtitle="A structured stream for announcements, status updates, and cross-team visibility. This keeps company communication visible without borrowing the public media chrome."
          chips={[
            { label: "Announcements", icon: "megaphone-outline", tone: "cyan" },
            { label: "Operational", icon: "business-outline", tone: "teal" },
          ]}
          actions={
            <>
              <AppButton label="New internal post" onPress={() => navigation.navigate("CreatePost")} />
              <AppButton label="View profile" tone="glass" onPress={() => navigation.navigate("Company")} />
            </>
          }
        />

        <View style={styles.summaryRow}>
          {summary.map((item) => (
            <GlassCard key={item.label} style={styles.summaryCard}>
              <View style={styles.summaryHead}>
                <AppText variant="micro" tone="muted" weight="bold">
                  {item.label}
                </AppText>
                <Ionicons name={item.icon} size={16} color={colors.accentCyan} />
              </View>
              <AppText variant="h3" weight="bold" style={{ marginTop: 10 }}>
                {item.value}
              </AppText>
            </GlassCard>
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="Announcements" meta={loading ? "Loading" : String(posts.length)} />
          {loading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accentCyan} />
            </View>
          ) : posts.length === 0 ? (
            <CompanyEmptyState
              icon="megaphone-outline"
              title="No announcements yet"
              subtitle="Publish the first internal update to start the company feed."
              actionLabel="Create post"
              onAction={() => navigation.navigate("CreatePost")}
            />
          ) : (
            <View style={styles.stack}>
              {posts.map((post) => (
                <GlassCard key={post.id} style={styles.postCard}>
                  <View style={styles.postTop}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodySm" weight="bold">
                        {post.author_name || "Company member"}
                      </AppText>
                      <AppText variant="micro" tone="muted" style={{ marginTop: 4 }}>
                        @{post.author_username || "alloul"} · {relativeTime(post.created_at)}
                      </AppText>
                    </View>
                    <CompanyChip label={post.image_url ? "Media attached" : "Update"} icon={post.image_url ? "images-outline" : "document-text-outline"} tone={post.image_url ? "blue" : "cyan"} />
                  </View>
                  <AppText variant="body" tone="secondary" style={styles.postBody}>
                    {post.content}
                  </AppText>
                  <View style={styles.postMeta}>
                    <MetaPill icon="heart-outline" label={`${post.likes_count} likes`} />
                    <MetaPill icon="chatbubble-outline" label={`${post.comments_count} comments`} />
                    <MetaPill icon="repeat-outline" label={`${post.reposts_count} reshares`} />
                  </View>
                </GlassCard>
              ))}
            </View>
          )}
        </View>

        <View style={{ marginTop: 20 }}>
          <CompanySectionLabel label="Operational timeline" meta={loading ? "Loading" : String(activity.length)} />
          {loading && !refreshing ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accentCyan} />
            </View>
          ) : activity.length === 0 ? (
            <CompanyEmptyState
              icon="pulse-outline"
              title="No timeline events"
              subtitle="Project, task, and handover activity will appear here once teams begin working in the company shell."
            />
          ) : (
            <View style={styles.stack}>
              {activity.map((item, index) => (
                <GlassCard key={`${item.type}-${index}`} style={styles.activityCard}>
                  <View style={styles.activityIcon}>
                    <Ionicons name="pulse-outline" size={16} color={colors.accentTeal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodySm" weight="bold">
                      {item.title}
                    </AppText>
                    <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>
                      {item.time ? `${item.type} · ${item.time}` : item.type}
                    </AppText>
                  </View>
                </GlassCard>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={13} color={colors.textSecondary} />
      <AppText variant="micro" tone="muted" weight="bold">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
  },
  summaryHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  stack: {
    gap: 10,
  },
  postCard: {
    padding: 14,
  },
  postTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  postBody: {
    marginTop: 12,
    lineHeight: 22,
  },
  postMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  activityCard: {
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(45,226,199,0.18)",
    backgroundColor: "rgba(45,226,199,0.10)",
  },
});
