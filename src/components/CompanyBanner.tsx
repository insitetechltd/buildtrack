import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { resolveCompanyBannerImageUrl } from "../api/companyBannerStorage";
import { useCompanyStore } from "../state/companyStore";

interface CompanyBannerProps {
  companyId: string;
  /** When set, the banner is tappable (e.g. Company Plan entrance). */
  onPress?: () => void;
  /**
   * When the company has no visible custom banner, still render a plan entrance
   * strip using this label (defaults to "Company Plan").
   */
  showPlanEntranceFallback?: boolean;
  fallbackLabel?: string;
}

export default function CompanyBanner({
  companyId,
  onPress,
  showPlanEntranceFallback = false,
  fallbackLabel = "Company Plan",
}: CompanyBannerProps) {
  const banner = useCompanyStore((state) => state.getCompanyBanner(companyId));
  const company = useCompanyStore((state) =>
    state.companies.find((candidate) => candidate.id === companyId),
  );
  const ensureCompanyLoaded = useCompanyStore((state) => state.ensureCompanyLoaded);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      return;
    }
    void ensureCompanyLoaded(companyId);
  }, [companyId, ensureCompanyLoaded]);

  useEffect(() => {
    let cancelled = false;

    if (!banner?.isVisible) {
      setResolvedImageUrl(null);
      return;
    }

    void (async () => {
      const url = await resolveCompanyBannerImageUrl(banner);
      if (!cancelled) {
        setResolvedImageUrl(url);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [banner]);

  const hasCustomBanner = Boolean(
    banner?.isVisible && (resolvedImageUrl || banner?.text?.trim()),
  );

  let body: React.ReactNode = null;

  if (hasCustomBanner && resolvedImageUrl) {
    body = (
      <View testID="company-banner__image-wrap" className="w-full bg-black">
        <Image
          testID="company-banner__image"
          source={{ uri: resolvedImageUrl }}
          style={{ width: "100%", height: 72 }}
          resizeMode="cover"
          accessibilityLabel={banner?.text ? `Company banner: ${banner.text}` : "Company banner"}
        />
        {onPress ? (
          <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between bg-black/45 px-4 py-2">
            <Text className="text-sm font-semibold text-white" numberOfLines={1}>
              {fallbackLabel}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#ffffff" />
          </View>
        ) : null}
      </View>
    );
  } else if (hasCustomBanner && banner?.text?.trim()) {
    body = (
      <View
        testID="company-banner__text"
        style={{
          backgroundColor: banner.backgroundColor,
          height: 44,
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
          flexDirection: "row",
        }}
      >
        <Text
          style={{
            color: banner.textColor,
            fontSize: 14,
            fontWeight: "600",
            textAlign: "center",
            flex: 1,
          }}
          numberOfLines={1}
        >
          {banner.text}
        </Text>
        {onPress ? <Ionicons name="chevron-forward" size={16} color={banner.textColor} /> : null}
      </View>
    );
  } else if (showPlanEntranceFallback) {
    const label = company?.name?.trim()
      ? `${company.name} · ${fallbackLabel}`
      : fallbackLabel;
    body = (
      <View
        testID="company-banner__plan-entrance"
        className="w-full flex-row items-center justify-between bg-[#0D6E87] px-4"
        style={{ height: 48 }}
      >
        <Text className="flex-1 text-base font-semibold text-[#F8FCFF]" numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#F8FCFF" />
      </View>
    );
  }

  if (!body) {
    return null;
  }

  if (onPress) {
    return (
      <Pressable
        testID="company-banner__pressable"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={fallbackLabel}
      >
        {body}
      </Pressable>
    );
  }

  return <>{body}</>;
}
