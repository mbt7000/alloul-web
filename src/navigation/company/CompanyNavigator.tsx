import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CompanyListScreen from "../../features/companies/screens/CompanyListScreen";
import CompanyWorkspaceShellScreen from "../../features/companies/screens/CompanyWorkspaceShellScreen";
import ServicesHubScreen from "../../features/companies/screens/ServicesHubScreen";
import ApprovalsScreen from "../../features/companies/screens/ApprovalsScreen";
import CompanyMoreScreen from "../../features/companies/screens/CompanyMoreScreen";
import TeamScreen from "../../features/companies/screens/TeamScreen";
import ProjectsScreen from "../../features/companies/screens/ProjectsScreen";
import TasksScreen from "../../features/companies/screens/TasksScreen";
import MeetingsScreen from "../../features/meetings/screens/MeetingsScreen";
import HandoverScreen from "../../features/handover/screens/HandoverScreen";
import ChatScreen from "../../features/chat/screens/ChatScreen";
import KnowledgeScreen from "../../shared/screens/KnowledgeScreen";
import CRMScreen from "../../features/companies/screens/CRMScreen";
import ReportsScreen from "../../shared/screens/ReportsScreen";
import SettingsScreen from "../../features/settings/screens/SettingsScreen";
import ApprovalDetailScreen from "../../features/companies/screens/ApprovalDetailScreen";
import CompanyProfileScreen from "../../shared/screens/CompanyProfileScreen";
import CompanyFeedScreen from "../../features/companies/screens/CompanyFeedScreen";
import CompanyFilesScreen from "../../features/companies/screens/CompanyFilesScreen";
import HiringBoardScreen from "../../features/companies/screens/HiringBoardScreen";
import NotificationsScreen from "../../features/notifications/screens/NotificationsScreen";
import RolesScreen from "../../features/companies/screens/RolesScreen";
import InternalSearchScreen from "../../features/companies/screens/InternalSearchScreen";
import { useCompany } from "../../state/company/CompanyContext";

const Stack = createNativeStackNavigator();

function CompanySelectorEntry({ navigation }: { navigation: any }) {
  const { company, loading } = useCompany();

  React.useEffect(() => {
    if (loading) return;
    // Route company members directly to the new workspace shell design.
    if (company) navigation.replace("CompanyWorkspace");
    else navigation.replace("Companies");
  }, [company, loading, navigation]);

  return null;
}

export default function CompanyNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CompanySelector" component={CompanySelectorEntry} />
      <Stack.Screen name="Companies" component={CompanyListScreen} />
      <Stack.Screen name="CompanyWorkspace" component={CompanyWorkspaceShellScreen} />
      <Stack.Screen name="Apps" component={ServicesHubScreen} />
      <Stack.Screen name="Inbox" component={ApprovalsScreen} />
      <Stack.Screen name="Profile" component={CompanyMoreScreen} />
      <Stack.Screen name="Teams" component={TeamScreen} />
      <Stack.Screen name="Projects" component={ProjectsScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="Meetings" component={MeetingsScreen} />
      <Stack.Screen name="Handover" component={HandoverScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Knowledge" component={KnowledgeScreen} />
      <Stack.Screen name="CRM" component={CRMScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ApprovalDetail" component={ApprovalDetailScreen} />
      <Stack.Screen name="Company" component={CompanyProfileScreen} />
      <Stack.Screen name="CompanyFeed" component={CompanyFeedScreen} />
      <Stack.Screen name="CompanyFiles" component={CompanyFilesScreen} />
      <Stack.Screen name="Members" component={TeamScreen} />
      <Stack.Screen name="Roles" component={RolesScreen} />
      <Stack.Screen name="InternalSearch" component={InternalSearchScreen} />
      <Stack.Screen name="HiringBoard" component={HiringBoardScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
