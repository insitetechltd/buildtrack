import React, { useEffect } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";

type Props = NativeStackScreenProps<OwnerStackParamList, "CompanyUsers">;

/** Legacy route — redirects into CompanyDetail Users pane (Option D). */
export default function CompanyUsersScreen({ navigation, route }: Props) {
  const { companyId, companyName } = route.params;

  useEffect(() => {
    navigation.replace("CompanyDetail", {
      companyId,
      companyName,
      initialSegment: "users",
    });
  }, [navigation, companyId, companyName]);

  return null;
}
