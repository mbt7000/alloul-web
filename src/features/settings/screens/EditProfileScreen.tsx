/**
 * EditProfileScreen — X/LinkedIn quality
 * ─────────────────────────────────────────
 * Rich profile editor with:
 *   - Photo picker for avatar + cover (expo-image-picker → upload/image API)
 *   - Headline, bio, location, name, username
 *   - Character counts, validation, haptics
 *   - Keyboard-aware form
 *   - Clean X-style layout (dark, spacious, bold typography)
 */

import React, { useState, useRef } from "react";
import {
  View, ScrollView, TextInput, Pressable, Image, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import GlassCard from "../../../shared/components/GlassCard";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useAuth } from "../../../state/auth/AuthContext";
import { updateMe } from "../../../api/auth.api";
import { apiFetch } from "../../../api/client";

const MAX_BIO = 160;
const MAX_HEADLINE = 80;
const MAX_LOCATION = 60;
const MAX_NAME = 50;

type UploadKind = "avatar" | "cover" | null;

export default function EditProfileScreen() {
  const nav = useNavigation<any>();
  const { colors } = useAppTheme();
  const { user, refresh } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [headline, setHeadline] = useState(user?.skills ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [coverUrl, setCoverUrl] = useState(user?.cover_url ?? "");
  const [uploading, setUploading] = useState<UploadKind>(null);
  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState(user?.voice_profile_url ?? "");
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Initialize audio permissions
  const requestAudioPermissions = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("الإذن مطلوب", "اسمح بالوصول للميكروفون لتسجيل الرسالة الصوتية.");
      return false;
    }
    return true;
  };

  // Start recording voice message
  const startVoiceRecording = async () => {
    try {
      const hasPermission = await requestAudioPermissions();
      if (!hasPermission) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل التسجيل";
      Alert.alert("خطأ", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  // Stop recording and upload voice
  const stopVoiceRecording = async () => {
    try {
      if (!recordingRef.current) return;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (!uri) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "voice_message.m4a",
        type: "audio/m4a",
      } as any);

      const res = await apiFetch<{ url: string }>("/upload/image", {
        method: "POST",
        body: formData as any,
      });

      setVoiceUrl(res.url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل رفع الرسالة الصوتية";
      Alert.alert("خطأ", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  // Play voice message
  const playVoiceMessage = async () => {
    try {
      if (isPlayingVoice) {
        await soundRef.current?.stopAsync();
        setIsPlayingVoice(false);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.playAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync({ uri: voiceUrl });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            setIsPlayingVoice(false);
          }
        });
        await sound.playAsync();
      }
      setIsPlayingVoice(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل التشغيل";
      Alert.alert("خطأ", msg);
    }
  };

  const deleteVoiceMessage = () => {
    Alert.alert(
      "حذف الرسالة الصوتية",
      "هل تريد حذف الرسالة الصوتية؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            setVoiceUrl("");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          },
        },
      ]
    );
  };

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    const fields = [
      name.trim(),
      username.trim(),
      headline.trim(),
      bio.trim(),
      location.trim(),
      avatarUrl.trim(),
      coverUrl.trim(),
    ];
    const filled = fields.filter(f => f).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completion = calculateCompletion();

  const pickAndUpload = async (kind: "avatar" | "cover") => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("الإذن مطلوب", "اسمح بالوصول لمعرض الصور من الإعدادات.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        aspect: kind === "avatar" ? [1, 1] : [3, 1],
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setUploading(kind);

      const asset = result.assets[0];
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.uri.split("/").pop() || `${kind}.jpg`,
        type: "image/jpeg",
      } as any);

      const res = await apiFetch<{ url: string }>("/upload/image", {
        method: "POST",
        body: formData as any,
      });

      if (kind === "avatar") setAvatarUrl(res.url);
      else setCoverUrl(res.url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "تعذّر رفع الصورة";
      Alert.alert("فشل الرفع", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await updateMe({
        name: name.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        cover_url: coverUrl.trim() || null,
        location: location.trim() || null,
        skills: headline.trim() || null,
        username: username.trim() !== user?.username ? username.trim() : undefined,
        voice_profile_url: voiceUrl.trim() || null,
      });
      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      nav.goBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "تعذّر حفظ التعديلات";
      Alert.alert("خطأ", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={["top"]} style={{ backgroundColor: "#000" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => nav.goBack()} hitSlop={14}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <AppText style={styles.headerTitle}>تعديل الملف الشخصي</AppText>
          <Pressable
            onPress={handleSave}
            disabled={saving || uploading !== null}
            style={[styles.saveBtn, { opacity: (saving || uploading !== null) ? 0.5 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <AppText style={styles.saveBtnText}>حفظ</AppText>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cover photo with overlay picker */}
          <Pressable onPress={() => pickAndUpload("cover")} style={styles.coverWrap}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={styles.coverImg} resizeMode="cover" />
            ) : (
              <View style={styles.coverEmpty}>
                <Ionicons name="image-outline" size={32} color="#333" />
              </View>
            )}
            <View style={styles.coverOverlay}>
              {uploading === "cover" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="camera" size={22} color="#fff" />
              )}
            </View>
          </Pressable>

          {/* Avatar overlapping the cover */}
          <View style={styles.avatarRow}>
            <Pressable onPress={() => pickAndUpload("avatar")} style={styles.avatarWrap}>
              <View style={styles.avatarInner}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <AppText style={{ color: colors.accentCyan, fontSize: 36, fontWeight: "800" }}>
                    {(name || username || "U").slice(0, 1).toUpperCase()}
                  </AppText>
                )}
              </View>
              <View style={styles.avatarCameraBadge}>
                {uploading === "avatar" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={14} color="#fff" />
                )}
              </View>
            </Pressable>

            {user?.verified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#1d9bf0" />
                <AppText style={styles.verifiedText}>موثّق</AppText>
              </View>
            ) : null}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Profile Completion Card */}
            <GlassCard>
              <View style={styles.completionCard}>
                <View style={styles.completionHeader}>
                  <AppText style={styles.completionTitle}>اكتمال الملف الشخصي</AppText>
                  <AppText style={styles.completionPercent}>{completion}%</AppText>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBar, { width: `${completion}%` }]} />
                </View>
                <AppText style={styles.completionHint}>
                  {completion === 100
                    ? "✓ ملفك الشخصي مكتمل!"
                    : `أتمم ${7 - Math.ceil((7 * (100 - completion)) / 100)} حقول أخرى`}
                </AppText>
              </View>
            </GlassCard>

            <Field
              label="الاسم"
              value={name}
              onChange={setName}
              placeholder="اسمك الكامل"
              maxLength={MAX_NAME}
              icon="person-outline"
            />

            <Field
              label="اسم المستخدم"
              value={username}
              onChange={setUsername}
              placeholder="username"
              maxLength={30}
              icon="at-outline"
              prefix="@"
            />

            <Field
              label="العنوان المهني"
              value={headline}
              onChange={setHeadline}
              placeholder="مطوّر تطبيقات · مؤسس · مهندس منتج"
              maxLength={MAX_HEADLINE}
              icon="briefcase-outline"
            />

            <Field
              label="النبذة"
              value={bio}
              onChange={setBio}
              placeholder="عرّف الناس عنك بسطرين..."
              multiline
              maxLength={MAX_BIO}
              icon="create-outline"
            />

            <Field
              label="الموقع"
              value={location}
              onChange={setLocation}
              placeholder="دبي · الإمارات"
              maxLength={MAX_LOCATION}
              icon="location-outline"
            />

            {/* Voice Profile Section — native only (expo-av not supported on web) */}
            {Platform.OS !== "web" && <GlassCard>
              <View style={styles.voiceSection}>
                <View style={styles.voiceSectionHeader}>
                  <Ionicons name="mic-outline" size={14} color="#1d9bf0" />
                  <AppText style={styles.voiceSectionTitle}>رسالتك الصوتية</AppText>
                </View>
                <AppText style={styles.voiceDescription}>
                  أضف رسالة صوتية قصيرة لملفك الشخصي
                </AppText>

                {voiceUrl ? (
                  <View style={styles.voicePlayback}>
                    <Pressable
                      onPress={playVoiceMessage}
                      style={[styles.playBtn, isPlayingVoice && { backgroundColor: "#ff4444" }]}
                    >
                      <Ionicons
                        name={isPlayingVoice ? "pause" : "play"}
                        size={16}
                        color="#fff"
                      />
                    </Pressable>
                    <AppText style={styles.voiceIndicator}>رسالة موجودة ✓</AppText>
                    <Pressable onPress={deleteVoiceMessage} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color="#ff4444" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.recordBtnWrap}>
                    <Pressable
                      onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
                      style={[
                        styles.recordBtn,
                        isRecording && styles.recordBtnActive,
                      ]}
                    >
                      {isRecording ? (
                        <>
                          <View style={styles.recordingPulse} />
                          <AppText style={styles.recordBtnText}>إيقاف التسجيل</AppText>
                        </>
                      ) : (
                        <>
                          <Ionicons name="mic" size={18} color="#fff" />
                          <AppText style={styles.recordBtnText}>ابدأ التسجيل</AppText>
                        </>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            </GlassCard>}

            {/* Account info card */}
            <GlassCard style={styles.accountCard}>
              <View style={styles.accountCardHeader}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#71767b" />
                <AppText style={styles.accountCardTitle}>معلومات الحساب</AppText>
              </View>
              <InfoRow label="البريد" value={user?.email ?? "—"} />
              <InfoRow label="الهاتف" value={user?.phone ?? "—"} />
              <InfoRow label="رمز المستخدم" value={user?.i_code ?? "—"} mono />
              <InfoRow
                label="تاريخ الإنشاء"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString("ar") : "—"}
              />
            </GlassCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, multiline, maxLength, icon, prefix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; maxLength?: number;
  icon?: keyof typeof Ionicons.glyphMap; prefix?: string;
}) {
  return (
    <View>
      <View style={styles.fieldLabelRow}>
        {icon ? <Ionicons name={icon} size={13} color="#71767b" /> : null}
        <AppText style={styles.fieldLabel}>{label}</AppText>
        {maxLength ? (
          <AppText style={[styles.fieldCounter, value.length > maxLength * 0.9 && { color: "#ff4757" }]}>
            {value.length}/{maxLength}
          </AppText>
        ) : null}
      </View>
      <View style={styles.fieldInputWrap}>
        {prefix ? <AppText style={styles.fieldPrefix}>{prefix}</AppText> : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#3a3a3a"
          multiline={multiline}
          maxLength={maxLength}
          style={[styles.fieldInput, multiline && { minHeight: 72, textAlignVertical: "top" }]}
        />
      </View>
    </View>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText style={[styles.infoValue, mono && { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}>
        {value}
      </AppText>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  completionCard: {
    padding: 14,
    gap: 10,
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completionTitle: {
    color: "#71767b",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  completionPercent: {
    color: "#1d9bf0",
    fontSize: 13,
    fontWeight: "800",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#1d9bf0",
    borderRadius: 3,
  },
  completionHint: {
    color: "#71767b",
    fontSize: 11,
    fontWeight: "500",
  },
  voiceSection: {
    padding: 14,
    gap: 10,
  },
  voiceSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  voiceSectionTitle: {
    color: "#1d9bf0",
    fontSize: 13,
    fontWeight: "700",
  },
  voiceDescription: {
    color: "#71767b",
    fontSize: 11,
    fontWeight: "500",
  },
  recordBtnWrap: {
    marginTop: 8,
  },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(29,155,240,0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1d9bf0",
  },
  recordBtnActive: {
    backgroundColor: "rgba(255,68,68,0.2)",
    borderColor: "#ff4444",
  },
  recordBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  recordingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff4444",
    marginRight: 4,
  },
  voicePlayback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(29,155,240,0.1)",
    borderRadius: 8,
    marginTop: 8,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1d9bf0",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceIndicator: {
    flex: 1,
    color: "#1d9bf0",
    fontSize: 12,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1a1a1a",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    minWidth: 62,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "800",
  },
  coverWrap: {
    height: 150,
    position: "relative",
    backgroundColor: "#0a0a0a",
  },
  coverImg: { width: "100%", height: "100%" },
  coverEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  coverOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: -44,
  },
  avatarWrap: {
    width: 92,
    height: 92,
    position: "relative",
  },
  avatarInner: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: "#0a0a0a",
    borderWidth: 4, borderColor: "#000",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 92, height: 92 },
  avatarCameraBadge: {
    position: "absolute",
    right: 2, bottom: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#1d9bf0",
    borderWidth: 2, borderColor: "#000",
    alignItems: "center", justifyContent: "center",
  },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(29,155,240,0.12)",
    borderWidth: 1, borderColor: "rgba(29,155,240,0.35)",
    marginBottom: 6,
  },
  verifiedText: { color: "#1d9bf0", fontSize: 11, fontWeight: "700" },
  form: {
    padding: 16,
    paddingTop: 20,
    gap: 20,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    color: "#71767b",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    flex: 1,
  },
  fieldCounter: { color: "#555", fontSize: 10, fontWeight: "600" },
  fieldInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  fieldPrefix: {
    color: "#71767b",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 4,
  },
  fieldInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 6,
    minHeight: 36,
  },
  accountCard: {
    marginTop: 10,
    padding: 14,
  },
  accountCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1a1a1a",
  },
  accountCardTitle: {
    color: "#71767b",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  infoLabel: { color: "#71767b", fontSize: 12 },
  infoValue: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
