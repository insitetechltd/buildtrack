import React, { useMemo } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import { goBackTenant, resetToTenantHome } from "../../navigation/tenantNavigation";
import TaskListPane from "./TaskListPane";
import TenantScreenHeader from "./TenantScreenHeader";
import { tenantStyles as s } from "./tenantScreenStyles";

type Props = NativeStackScreenProps<OwnerStackParamList, "EntityList">;

export default function EntityListScreen({ navigation, route }: Props) {
  const { entity, companyId, companyName, projectId, projectName, userId, userName } =
    route.params;

  const title = useMemo(() => {
    if (entity !== "tasks") return "List";
    if (projectName) return `${projectName} tasks`;
    if (userName) return `${userName} tasks`;
    return "Tasks";
  }, [entity, projectName, userName]);

  if (entity !== "tasks") {
    return null;
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]} testID="owner-tenant-entity-list__root">
      <TenantScreenHeader
        title={title}
        onBack={() => goBackTenant(navigation)}
        onHome={() => resetToTenantHome(navigation)}
        backTestID="owner-tenant-entity-list__back"
        homeTestID="owner-tenant-entity-list__home"
      />
      <View style={s.contentFlex}>
        <TaskListPane
          scope={{ companyId, companyName, projectId, userId }}
          navigation={navigation}
          testID="owner-tenant-entity-list__tasks"
          showProjectColumn={!projectId}
        />
      </View>
    </SafeAreaView>
  );
}
