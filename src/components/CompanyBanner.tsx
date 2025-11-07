import React from "react";
import { View, Text } from "react-native";
import { useCompanyStore } from "../state/companyStore";

interface CompanyBannerProps {
  companyId: string;
}

export default function CompanyBanner({ companyId }: CompanyBannerProps) {
  const banner = useCompanyStore(state => state.getCompanyBanner(companyId));

  // Don't render if no banner or not visible
  if (!banner || !banner.isVisible) {
    return null;
  }

  return (
    <View 
      style={{ 
        backgroundColor: banner.backgroundColor,
        height: 44,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
      }}
    >
      <Text 
        style={{ 
          color: banner.textColor,
          fontSize: 14,
          fontWeight: '600',
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {banner.text}
      </Text>
    </View>
  );
}
