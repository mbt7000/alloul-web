import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MediaTabs from "../MediaTabs";
import CreatePostScreen from "../../features/media/screens/CreatePostScreen";
import CommunitiesScreen from "../../features/media/screens/CommunitiesScreen";
import JobsScreen from "../../features/media/screens/JobsScreen";
import MarketplaceScreen from "../../features/media/screens/MarketplaceScreen";
import DiscoverScreen from "../../features/discover/screens/DiscoverScreen";
import CompanyProfileScreen from "../../shared/screens/CompanyProfileScreen";
import SettingsScreen from "../../features/settings/screens/SettingsScreen";
import AdminHubScreen from "../../features/settings/screens/AdminHubScreen";
import NotificationsScreen from "../../features/notifications/screens/NotificationsScreen";
import PostDetailScreen from "../../features/media/screens/PostDetailScreen";
import CommunityProfileScreen from "../../features/media/screens/CommunityProfileScreen";

const Stack = createNativeStackNavigator();

export default function MediaNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MediaTabs" component={MediaTabs} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Communities" component={CommunitiesScreen} />
      <Stack.Screen name="CommunityProfile" component={CommunityProfileScreen} />
      <Stack.Screen name="Jobs" component={JobsScreen} />
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="Discover" component={DiscoverScreen} />
      <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AdminHub" component={AdminHubScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
