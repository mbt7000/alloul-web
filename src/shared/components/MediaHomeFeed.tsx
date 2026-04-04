import React, { useCallback, useState } from "react";
import { View, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAppTheme } from "../../theme/ThemeContext";
import { useThemedStyles } from "../../theme/useThemedStyles";
import { radius } from "../../theme/radius";
import AppText from "../ui/AppText";
import {
  getFollowingPosts,
  getPosts,
  createPost,
  likePost,
  unlikePost,
  type ApiPost,
} from "../../api";
import { formatApiError } from "../utils/apiErrors";
import MediaPostRow from "../../features/media/components/MediaPostRow";

export default function MediaHomeFeed({ navigation: _navigation }: { navigation: any }) {
  const [draft, setDraft] = useState("");
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { colors } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    root: { gap: 0 },
    composer: {
      backgroundColor: c.cardElevated,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.floatingBarBorder,
      padding: 14,
      marginBottom: 16,
    },
    composerInner: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 12 },
    thumbPh: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: "rgba(255,255,255,0.06)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    input: {
      flex: 1,
      minHeight: 52,
      color: c.textPrimary,
      fontSize: 15,
      textAlignVertical: "top" as const,
    },
    composerActions: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginTop: 14, gap: 12 },
    btnSecondary: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radius.lg,
      backgroundColor: "rgba(255,255,255,0.08)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    btnPrimary: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      paddingVertical: 12,
      borderRadius: radius.lg,
      backgroundColor: c.accentBlue,
    },
    errBox: { padding: 12, marginBottom: 12 },
    center: { paddingVertical: 32, alignItems: "center" as const },
  }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let list = await getFollowingPosts(30, 0).catch(() => [] as ApiPost[]);
      if (!Array.isArray(list) || list.length === 0) {
        list = await getPosts(30, 0);
      }
      setPosts(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(formatApiError(e));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onPublish = async () => {
    const content = draft.trim();
    if (!content) {
      Alert.alert("نشر", "اكتب نصاً قبل النشر.");
      return;
    }
    setPosting(true);
    try {
      const created = await createPost(content, undefined, "public");
      setDraft("");
      setPosts((prev) => [created, ...prev]);
    } catch (e) {
      Alert.alert("تعذّر النشر", formatApiError(e));
    } finally {
      setPosting(false);
    }
  };

  const onSmartSuggest = () => {
    // TODO(api): wire AI suggestion endpoint when available
    Alert.alert("اقتراح ذكي", "ستُتاح المقترحات الذكية عند ربط خدمة الذكاء الاصطناعي بالخادم.");
  };

  const onLike = async (id: number) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const nextLiked = !post.liked_by_me;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              liked_by_me: nextLiked,
              likes_count: nextLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1),
            }
          : p
      )
    );
    try {
      if (nextLiked) await likePost(id);
      else await unlikePost(id);
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === id ? post : p)));
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.composer}>
        <View style={styles.composerInner}>
          <View style={styles.thumbPh}>
            <Ionicons name="image-outline" size={22} color={colors.textMuted} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="ماذا يدور في ذهنك؟"
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlign="right"
          />
        </View>
        <View style={styles.composerActions}>
          <Pressable
            style={[styles.btnSecondary, posting && { opacity: 0.6 }]}
            onPress={() => void onPublish()}
            disabled={posting}
          >
            {posting ? <ActivityIndicator color={colors.textMuted} size="small" /> : <AppText variant="micro" weight="bold" tone="secondary">نشر</AppText>}
          </Pressable>
          <Pressable style={styles.btnPrimary} onPress={onSmartSuggest}>
            <Ionicons name="sparkles" size={16} color={colors.white} />
            <AppText variant="micro" weight="bold" style={{ color: colors.white }}>
              اقتراح ذكي
            </AppText>
          </Pressable>
        </View>
      </View>

      {error ? (
        <Pressable onPress={() => void load()} style={styles.errBox}>
          <AppText variant="caption" tone="danger">
            {error} — اضغط لإعادة المحاولة
          </AppText>
        </Pressable>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {posts.map((post) => (
            <MediaPostRow key={post.id} post={post} onLike={onLike} />
          ))}
        </View>
      )}

    </View>
  );
}
