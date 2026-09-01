import React from "react";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";
import TaskListPane from "./TaskListPane";

type Props = {
  companyId: string;
  companyName: string;
  navigation: NativeStackNavigationProp<OwnerStackParamList>;
};

/** Company-wide task stream on CompanyDetail → Tasks segment. */
export default function CompanyTasksPane({ companyId, companyName, navigation }: Props) {
  return (
    <TaskListPane
      scope={{ companyId, companyName }}
      navigation={navigation}
      testID="owner-tenant-company-detail__tasks_pane"
      showProjectColumn
    />
  );
}
