import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";

const { width } = Dimensions.get("window");

export interface IncomingCallPayload {
  call_id: number;
  caller_id: number;
  caller_name: string;
  caller_avatar?: string | null;
  call_type: "video" | "audio";
  room_name: string;
  ws_url?: string;
}

interface Props {
  call: IncomingCallPayload;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallScreen({ call, onAccept, onReject }: Props) {
  const { colors } = useAppTheme();
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [accepting, setAccepting] = React.useState(false);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Ringtone + vibration
  useEffect(() => {
    let mounted = true;

    // Vibration pattern: ring ring ring...
    const vibPattern = [0, 400, 200, 400, 200, 400, 800];
    Vibration.vibrate(vibPattern, true);

    // Try to play a ringtone sound
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          // Use a bundled asset if available, otherwise skip
          { uri: "https://cdn.pixabay.com/audio/2023/01/04/audio_7eaeac5e7e.mp3" },
          { shouldPlay: true, isLooping: true, volume: 0.9 }
        );
        if (mounted) soundRef.current = sound;
      } catch {
        // If sound fails, vibration alone is fine
      }
    })();

    return () => {
      mounted = false;
      Vibration.cancel();
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const handleAccept = () => {
    if (accepting) return;
    setAccepting(true);
    Vibration.cancel();
    soundRef.current?.stopAsync().catch(() => {});
    onAccept();
  };

  const handleReject = () => {
    Vibration.cancel();
    soundRef.current?.stopAsync().catch(() => {});
    onReject();
  };

  const isVideo = call.call_type === "video";
  const initials = (call.caller_name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: "#0a0a0f" }]}>
      {/* Background blur rings */}
      <View style={styles.bgRings}>
        <View style={[styles.ring, { width: 320, height: 320, borderColor: "rgba(46,139,255,0.08)" }]} />
        <View style={[styles.ring, { width: 240, height: 240, borderColor: "rgba(46,139,255,0.12)" }]} />
        <View style={[styles.ring, { width: 160, height: 160, borderColor: "rgba(46,139,255,0.18)" }]} />
      </View>

      <View style={styles.content}>
        {/* Call type label */}
        <AppText variant="caption" tone="muted" style={{ textAlign: "center", marginBottom: 8 }}>
          {isVideo ? "اتصال فيديو وارد" : "اتصال صوتي وارد"}
        </AppText>

        {/* Avatar with pulse */}
        <Animated.View style={[styles.avatarPulse, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.avatarOuter}>
            <View style={[styles.avatar, { backgroundColor: colors.accentBlue + "33" }]}>
              <AppText
                variant="h1"
                weight="bold"
                style={{ fontSize: 48, color: colors.accentBlue }}
              >
                {initials}
              </AppText>
            </View>
          </View>
        </Animated.View>

        {/* Caller name */}
        <AppText variant="h2" weight="bold" style={{ color: "#fff", textAlign: "center", marginTop: 24, marginBottom: 6 }}>
          {call.caller_name}
        </AppText>

        {/* Ringing indicator */}
        <View style={styles.ringingRow}>
          <Animated.View
            style={[styles.dot, { backgroundColor: colors.success, opacity: pulseAnim }]}
          />
          <Animated.View
            style={[styles.dot, { backgroundColor: colors.success, opacity: pulseAnim }]}
          />
          <Animated.View
            style={[styles.dot, { backgroundColor: colors.success, opacity: pulseAnim }]}
          />
        </View>
        <AppText variant="caption" tone="muted" style={{ textAlign: "center", marginTop: 4 }}>
          يرن...
        </AppText>

        {/* Action buttons */}
        <View style={styles.buttons}>
          {/* Reject */}
          <TouchableOpacity onPress={handleReject} style={styles.rejectWrap} activeOpacity={0.85}>
            <View style={[styles.btn, styles.rejectBtn]}>
              <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
            </View>
            <AppText variant="caption" style={{ color: "rgba(255,255,255,0.6)", marginTop: 8, textAlign: "center" }}>
              رفض
            </AppText>
          </TouchableOpacity>

          {/* Accept */}
          <TouchableOpacity onPress={handleAccept} style={styles.acceptWrap} activeOpacity={0.85} disabled={accepting}>
            <View style={[styles.btn, styles.acceptBtn]}>
              <Ionicons name={isVideo ? "videocam" : "call"} size={32} color="#fff" />
            </View>
            <AppText variant="caption" style={{ color: "rgba(255,255,255,0.6)", marginTop: 8, textAlign: "center" }}>
              قبول
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  bgRings: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  avatarPulse: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "rgba(46,139,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  ringingRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttons: {
    flexDirection: "row",
    gap: 60,
    marginTop: 56,
    alignItems: "center",
  },
  btn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    backgroundColor: "#EF4444",
  },
  acceptBtn: {
    backgroundColor: "#22C55E",
  },
  rejectWrap: {
    alignItems: "center",
  },
  acceptWrap: {
    alignItems: "center",
  },
});
