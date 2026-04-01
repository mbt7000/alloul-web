import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ApiPost } from "../../../api";
import AppText from "../../../shared/ui/AppText";
import { colors } from "../../../theme/colors";

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "الآن";
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  return `${Math.floor(hrs / 24)}ي`;
}

function formatCount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}

type Props = {
  post: ApiPost;
  onLike: (id: number) => void;
};

export default function MediaPostRow({ post, onLike }: Props) {
  const initials = (post.author_name || "U").slice(0, 2).toUpperCase();
  const hasVisual = Boolean(post.image_url);

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        {post.author_avatar ? (
          <Image source={{ uri: post.author_avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <AppText variant="bodySm" weight="bold" style={styles.avatarText}>
              {initials}
            </AppText>
          </View>
        )}

        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <AppText variant="bodySm" weight="bold" numberOfLines={1} style={styles.authorName}>
              {post.author_name || "User"}
            </AppText>
            {post.author_verified ? <Ionicons name="checkmark-circle" size={14} color={colors.accentCyan} /> : null}
            <AppText variant="micro" tone="muted" weight="bold" style={styles.dot}>
              • {timeAgo(post.created_at)}
            </AppText>
          </View>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            @{post.author_username || "alloul"}
          </AppText>
        </View>

        {hasVisual ? (
          <View style={styles.visualBadge}>
            <Ionicons name="images-outline" size={13} color={colors.accentCyan} />
            <AppText variant="micro" tone="cyan" weight="bold">
              مرئي
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText variant="body" style={styles.content}>
        {post.content}
      </AppText>

      {post.image_url ? <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" /> : null}

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => {}}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
          <AppText variant="caption" tone="muted" weight="bold">
            {formatCount(post.comments_count)}
          </AppText>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={() => {}}>
          <Ionicons
            name="repeat-outline"
            size={18}
            color={post.reposted_by_me ? colors.accentEmerald : colors.textMuted}
          />
          <AppText
            variant="caption"
            tone="muted"
            weight="bold"
            style={post.reposted_by_me ? styles.repostedCount : undefined}
          >
            {formatCount(post.reposts_count || 0)}
          </AppText>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={() => onLike(post.id)}>
          <Ionicons
            name={post.liked_by_me ? "heart" : "heart-outline"}
            size={18}
            color={post.liked_by_me ? colors.accentRose : colors.textMuted}
          />
          <AppText
            variant="caption"
            tone="muted"
            weight="bold"
            style={post.liked_by_me ? styles.likedCount : undefined}
          >
            {formatCount(post.likes_count)}
          </AppText>
        </Pressable>

        <Pressable style={styles.actionBtn}>
          <Ionicons
            name={post.saved_by_me ? "bookmark" : "bookmark-outline"}
            size={18}
            color={post.saved_by_me ? colors.accentBlue : colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 22,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.floatingBarBorder,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56,232,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.18)",
  },
  avatarText: {
    color: colors.accentCyan,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  authorName: {
    maxWidth: "70%",
  },
  dot: {
    letterSpacing: 0.2,
  },
  visualBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,232,255,0.22)",
    backgroundColor: "rgba(56,232,255,0.10)",
  },
  content: {
    lineHeight: 24,
  },
  postImage: {
    width: "100%",
    height: 244,
    borderRadius: 22,
    backgroundColor: colors.bgCard,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  likedCount: {
    color: colors.accentRose,
  },
  repostedCount: {
    color: colors.accentEmerald,
  },
});
