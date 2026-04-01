import React from "react";
import { Platform, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNotifications } from "../state/notifications/NotificationsContext";
import { useHomeMode } from "../state/mode/HomeModeContext";
import { MEDIA_TAB_ROUTES } from "../config/routes";
import FloatingMediaTabBar from "./FloatingMediaTabBar";

import MediaHomeScreen from "../features/media/screens/MediaHomeScreen";
import ExploreScreen from "../features/media/screens/ExploreScreen";
import DiscoverScreen from "../features/discover/screens/DiscoverScreen";
import ProfileScreen from "../shared/screens/ProfileScreen";
import NotificationsScreen from "../features/notifications/screens/NotificationsScreen";

const Tab = createBottomTabNavigator();

export default function MediaTabs() {
  const { displayUnreadCount } = useNotifications();
  const { setLastRoute } = useHomeMode();

  const screenOptions = React.useCallback(
    () => ({
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: styles.hiddenTabBar,
      tabBarBackground: () => null,
    }),
    []
  );

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingMediaTabBar {...props} />}
      screenOptions={screenOptions}
      screenListeners={({ route }) => ({
        focus: () => setLastRoute("public", route.name),
      })}
    >
      <Tab.Screen name={MEDIA_TAB_ROUTES.home} component={MediaHomeScreen} />
      <Tab.Screen name={MEDIA_TAB_ROUTES.explore} component={ExploreScreen} />
      <Tab.Screen
        name={MEDIA_TAB_ROUTES.inbox}
        component={NotificationsScreen}
        options={{
          tabBarBadge: displayUnreadCount > 0 ? (displayUnreadCount > 99 ? "99+" : displayUnreadCount) : undefined,
        }}
      />
      <Tab.Screen name={MEDIA_TAB_ROUTES.search} component={DiscoverScreen} />
      <Tab.Screen name={MEDIA_TAB_ROUTES.profile} component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  hiddenTabBar: {
    position: "absolute",
    height: 0,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: "transparent",
    ...Platform.select({ ios: { overflow: "visible" as const } }),
  },
});
