import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors } from "../../../theme/colors";
import { getSavedPosts, likePost, unlikePost, type ApiPost } from "../../../api";
import MediaPostRow from "../components/MediaPostRow";

export default function SavedPostsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await getSavedPosts(40, 0);
      setPosts(Array.isArray(p) ? p : []);
    } catch {
      setPosts([]);
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

  const handleLike = async (postId: number) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
    try {
      if (post.liked_by_me) await unlikePost(postId);
      else await likePost(postId);
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === postId ? post : p)));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.iconBtn} hitSlop={12}>
          <Ionicons name="menu-outline" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("saved.title")}</Text>
        <View style={styles.iconBtn} />
      </View>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <MediaPostRow post={item} onLike={handleLike} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accentCyan} />
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.empty}>{t("saved.empty")}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 48 },
});
