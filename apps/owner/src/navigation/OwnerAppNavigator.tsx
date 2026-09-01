import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import EconomicsScreen from "../screens/EconomicsScreen";
import MonitoringScreen from "../screens/MonitoringScreen";
import OwnerHomeScreen from "../screens/OwnerHomeScreen";
import AuditLogScreen from "../screens/tenant/AuditLogScreen";
import AllProjectsScreen from "../screens/tenant/AllProjectsScreen";
import AllUsersScreen from "../screens/tenant/AllUsersScreen";
import CompanyDetailScreen from "../screens/tenant/CompanyDetailScreen";
import CompanyListScreen from "../screens/tenant/CompanyListScreen";
import CompanyProjectsScreen from "../screens/tenant/CompanyProjectsScreen";
import CompanyUsersScreen from "../screens/tenant/CompanyUsersScreen";
import CreateUserScreen from "../screens/tenant/CreateUserScreen";
import ProjectMembersScreen from "../screens/tenant/ProjectMembersScreen";
import ProjectSummaryScreen from "../screens/tenant/ProjectSummaryScreen";
import TenantHubScreen from "../screens/tenant/TenantHubScreen";
import UserAssignmentsScreen from "../screens/tenant/UserAssignmentsScreen";
import UserDetailScreen from "../screens/tenant/UserDetailScreen";
import UserSearchScreen from "../screens/tenant/UserSearchScreen";
import EntityListScreen from "../screens/tenant/EntityListScreen";
import TaskDetailScreen from "../screens/tenant/TaskDetailScreen";
import type { EntityListParams } from "../lib/fetchOwnerTenantRead";
import { buildOwnerStackScreenOptions } from "./nativeStackOptions";

export type OwnerStackParamList = {
  Home: undefined;
  Monitoring: undefined;
  Economics: undefined;
  TenantOps: undefined;
  CompanyList: undefined;
  AllProjects: undefined;
  AllUsers: undefined;
  AuditLog: undefined;
  UserSearch: undefined;
  CompanyDetail: {
    companyId: string;
    companyName: string;
    initialSegment?: "overview" | "projects" | "users" | "tasks";
  };
  CompanyProjects: { companyId: string; companyName: string };
  ProjectSummary: {
    companyId: string;
    companyName: string;
    projectId: string;
    projectName: string;
  };
  ProjectMembers: {
    companyId: string;
    companyName: string;
    projectId: string;
    projectName: string;
  };
  CompanyUsers: { companyId: string; companyName: string };
  CreateUser: { companyId: string; companyName: string };
  UserDetail: {
    companyId: string;
    companyName: string;
    userId: string;
    userName: string;
  };
  UserAssignments: {
    companyId: string;
    companyName: string;
    userId: string;
    userName: string;
  };
  EntityList: EntityListParams;
  TaskDetail: {
    companyId: string;
    companyName: string;
    taskId: string;
    taskTitle: string;
  };
};

const Stack = createNativeStackNavigator<OwnerStackParamList>();

type Props = {
  onSignOut: () => void;
};

export default function OwnerAppNavigator({ onSignOut }: Props) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={buildOwnerStackScreenOptions()}>
        <Stack.Screen name="Home">
          {({ navigation }) => (
            <OwnerHomeScreen
              onSignOut={onSignOut}
              onOpenMonitoring={() => navigation.navigate("Monitoring")}
              onOpenEconomics={() => navigation.navigate("Economics")}
              onOpenTenantOps={() => navigation.navigate("TenantOps")}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Monitoring">
          {({ navigation }) => (
            <MonitoringScreen onBack={() => navigation.goBack()} />
          )}
        </Stack.Screen>
        <Stack.Screen name="Economics">
          {({ navigation }) => (
            <EconomicsScreen onBack={() => navigation.goBack()} />
          )}
        </Stack.Screen>
        <Stack.Screen name="TenantOps" component={TenantHubScreen} />
        <Stack.Screen name="CompanyList" component={CompanyListScreen} />
        <Stack.Screen name="AllProjects" component={AllProjectsScreen} />
        <Stack.Screen name="AllUsers" component={AllUsersScreen} />
        <Stack.Screen name="AuditLog" component={AuditLogScreen} />
        <Stack.Screen name="UserSearch" component={UserSearchScreen} />
        <Stack.Screen name="CompanyDetail" component={CompanyDetailScreen} />
        <Stack.Screen name="CompanyProjects" component={CompanyProjectsScreen} />
        <Stack.Screen name="ProjectSummary" component={ProjectSummaryScreen} />
        <Stack.Screen name="ProjectMembers" component={ProjectMembersScreen} />
        <Stack.Screen name="CompanyUsers" component={CompanyUsersScreen} />
        <Stack.Screen name="CreateUser" component={CreateUserScreen} />
        <Stack.Screen name="UserDetail" component={UserDetailScreen} />
        <Stack.Screen name="UserAssignments" component={UserAssignmentsScreen} />
        <Stack.Screen name="EntityList" component={EntityListScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
