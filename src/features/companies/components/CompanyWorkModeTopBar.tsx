import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { useCompany } from "../../../state/company/CompanyContext";

type Props = {
  /** يظهر في المنتصف بدل اسم الشركة */
  centerLabel?: string;
};

/**
 * شريط علوي موحّد لنمط الأعمال (مثل مساحة العمل) للشاشات داخل كومة الشركات.
 */
export default function CompanyWorkModeTopBar({ centerLabel }: Props) {
  const navigation = useNavigation<any>();
  const { company } = useCompany();
  const { colors, mode, toggleMode } = useAppTheme();
  const styles = useThemedStyles((c) => ({
    topbar: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      gap: 6,
    },
    topbarLeft: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      maxWidth: "34%",
    },
    greenDocBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: c.accentNeonGreen,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: c.accentNeonGreen,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    switchBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(56,232,255,0.35)",
      backgroundColor: "rgba(56,232,255,0.10)",
      flexShrink: 0,
    },
    center: { flex: 1, minWidth: 0, alignItems: "center" as const, paddingHorizontal: 4 },
  }));

  const center = centerLabel ?? company?.name ?? "ALLOUL&Q";

  return (
    <View style={styles.topbar}>
      <Pressable
        style={styles.topbarLeft}
        onPress={() => navigation.navigate("CompanyWorkspace")}
        accessibilityRole="button"
        accessibilityLabel="نمط الأعمال، فتح المساحة"
      >
        <View style={styles.greenDocBtn}>
          <Ionicons name="document-text" size={18} color={colors.white} />
        </View>
        <AppText variant="micro" weight="bold" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
          نمط الأعمال
        </AppText>
      </Pressable>

      <Pressable
        style={styles.iconBtn}
        onPress={() => navigation.navigate("CompanyWorkspace")}
        accessibilityLabel="المساحة"
      >
        <Ionicons name="apps-outline" size={20} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.center}>
        <AppText variant="caption" weight="bold" tone="muted" numberOfLines={1}>
          {center}
        </AppText>
      </View>

      <Pressable style={styles.switchBtn} onPress={() => navigation.goBack()} accessibilityLabel="العودة لميديا">
        <Ionicons name="return-down-back-outline" size={17} color={colors.accentCyan} />
        <AppText variant="micro" tone="cyan" weight="bold" numberOfLines={1}>
          ميديا
        </AppText>
      </Pressable>

      <Pressable style={styles.iconBtn} onPress={() => toggleMode()} accessibilityLabel="تبديل المظهر">
        <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={20} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}
