import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/ThemeContext";

type ScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Array<"top" | "left" | "right" | "bottom">;
};

export default function Screen({ children, style, edges = ["top", "left", "right"] }: ScreenProps) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
