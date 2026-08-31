import React, { useEffect } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { OwnerStackParamList } from "../../navigation/OwnerAppNavigator";

type Props = NativeStackScreenProps<OwnerStackParamList, "CompanyProjects">;

/** Legacy route — redirects into CompanyDetail Projects pane (Option D). */
export default function CompanyProjectsScreen({ navigation, route }: Props) {
  const { companyId, companyName } = route.params;

  useEffect(() => {
    navigation.replace("CompanyDetail", {
      companyId,
      companyName,
      initialSegment: "projects",
    });
  }, [navigation, companyId, companyName]);

  return null;
}
