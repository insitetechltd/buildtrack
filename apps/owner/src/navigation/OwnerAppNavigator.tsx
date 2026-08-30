import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import EconomicsScreen from "../screens/EconomicsScreen";
import MonitoringScreen from "../screens/MonitoringScreen";
import OwnerHomeScreen from "../screens/OwnerHomeScreen";
import StubSectionScreen from "../screens/StubSectionScreen";
import AuditLogScreen from "../screens/tenant/AuditLogScreen";
import CompanyDetailScreen from "../screens/tenant/CompanyDetailScreen";
import CompanyListScreen from "../screens/tenant/CompanyListScreen";
import CompanyProjectsScreen from "../screens/tenant/CompanyProjectsScreen";
import CompanyUsersScreen from "../screens/tenant/CompanyUsersScreen";
import CreateUserScreen from "../screens/tenant/CreateUserScreen";
import ProjectSummaryScreen from "../screens/tenant/ProjectSummaryScreen";
import UserDetailScreen from "../screens/tenant/UserDetailScreen";
import UserSearchScreen from "../screens/tenant/UserSearchScreen";

export type OwnerStackParamList = {
  Home: undefined;
  Monitoring: undefined;
  Economics: undefined;
  TenantOps: undefined;
  CompanyList: undefined;
  AuditLog: undefined;
  UserSearch: undefined;
  CompanyDetail: { companyId: string; companyName: string };
  CompanyProjects: { companyId: string; companyName: string };
  ProjectSummary: {
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
};

const Stack = createNativeStackNavigator<OwnerStackParamList>();

type Props = {
  onSignOut: () => void;
};

export default function OwnerAppNavigator({ onSignOut }: Props) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home">
          {({ navigation }) => (
            <OwnerHomeScreen
              onSignOut={onSignOut}
              onOpenMonitoring={() => navigation.navigate("Monitoring")}
              onOpenEconomics={() => navigation.navigate("Economics")}
              onOpenTenantOps={() => navigation.navigate("CompanyList")}
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
        <Stack.Screen name="TenantOps">
          {({ navigation }) => (
            <StubSectionScreen
              title="Tenant ops"
              testID="owner-tenant__root"
              body="Use Companies from home — full drill-down is live in Phase 1c."
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="CompanyList" component={CompanyListScreen} />
        <Stack.Screen name="AuditLog" component={AuditLogScreen} />
        <Stack.Screen name="UserSearch" component={UserSearchScreen} />
        <Stack.Screen name="CompanyDetail" component={CompanyDetailScreen} />
        <Stack.Screen name="CompanyProjects" component={CompanyProjectsScreen} />
        <Stack.Screen name="ProjectSummary" component={ProjectSummaryScreen} />
        <Stack.Screen name="CompanyUsers" component={CompanyUsersScreen} />
        <Stack.Screen name="CreateUser" component={CreateUserScreen} />
        <Stack.Screen name="UserDetail" component={UserDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
