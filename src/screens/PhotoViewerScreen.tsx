import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useUserStore } from "../state/userStore.supabase";
import { useDateFormatter } from "../utils/dateFormatter";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface PhotoViewerScreenProps {
  photos: string[];
  initialIndex?: number;
  activityInfo?: any;
  onNavigateBack: () => void;
}

export default function PhotoViewerScreen({
  photos,
  initialIndex = 0,
  activityInfo,
  onNavigateBack,
}: PhotoViewerScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { getUserById } = useUserStore();
  const dateFormatter = useDateFormatter();
  
  // Calculate top padding same as StandardHeader
  const topPadding = insets.top > 0 ? insets.top + 8 : 16;

  // Reset to initial index when photos change
  useEffect(() => {
    if (photos.length > 0 && initialIndex >= 0) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * SCREEN_WIDTH,
          animated: false,
        });
      }, 100);
    }
  }, [photos, initialIndex]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    if (newIndex >= 0 && newIndex < photos.length) {
      setCurrentIndex(newIndex);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'creation': return 'add-circle';
      case 'assignment': return 'person-add';
      case 'status_change': return 'sync';
      case 'progress_update': return 'trending-up';
      case 'metadata_edit': return 'create';
      case 'review_submission': return 'send';
      case 'review_acceptance': return 'checkmark-circle';
      case 'review_rejection': return 'close-circle';
      case 'cancellation': return 'ban';
      case 'assigner_comment': return 'chatbubble';
      default: return 'document-text';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'creation': return '#10b981';
      case 'assignment': return '#3b82f6';
      case 'status_change': return '#8b5cf6';
      case 'progress_update': return '#f59e0b';
      case 'metadata_edit': return '#6366f1';
      case 'review_submission': return '#06b6d4';
      case 'review_acceptance': return '#10b981';
      case 'review_rejection': return '#ef4444';
      case 'cancellation': return '#6b7280';
      case 'assigner_comment': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const activity = activityInfo;
  const activityType = activity?.activityType || (activity?.status ? 'status_change' : 'progress_update');
  const activityUserId = activity?.userId;
  const activityUser = activityUserId ? getUserById(activityUserId) : null;

  // Extract reason from activity.data if available
  const activityData = activity?.data as any;
  const reason = activityData?.reason;
  let actionText = activity?.description || '';
  let extractedReason: string | undefined = undefined;

  if (reason) {
    extractedReason = reason;
    const reasonPattern = new RegExp(`\\.?\\s*Reason:\\s*${reason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    actionText = actionText.replace(reasonPattern, '').trim();
  } else if (activity?.description?.includes('Reason:')) {
    const reasonMatch = activity.description.match(/Reason:\s*(.+)$/i);
    if (reasonMatch) {
      extractedReason = reasonMatch[1].trim();
      actionText = activity.description.replace(/\s*Reason:.*$/i, '').trim();
    }
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header Banner with Back Arrow - Same pattern as StandardHeader */}
      <View 
        className="flex-row items-center justify-between px-6 pb-4 bg-white border-b border-gray-200"
        style={{ paddingTop: topPadding }}
      >
        <Pressable
          onPress={onNavigateBack}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
          <Text className="text-gray-700 text-base font-medium ml-2">Back</Text>
        </Pressable>
        
        {photos.length > 1 && (
          <View className="bg-gray-100 px-3 py-1.5 rounded-full">
            <Text className="text-gray-700 text-sm font-medium">
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>
        )}
      </View>

      {/* Main Content */}
      <View className="flex-1">
        {/* Photos Section - Swipe horizontally to navigate */}
        <View 
          style={{ height: SCREEN_HEIGHT * 0.55, width: SCREEN_WIDTH }}
        >
          <ScrollView
            ref={scrollViewRef}
            horizontal={true}
            pagingEnabled={true}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.55 }}
            contentContainerStyle={{ 
              width: SCREEN_WIDTH * photos.length,
              height: SCREEN_HEIGHT * 0.55,
            }}
            bounces={false}
            scrollEnabled={true}
            nestedScrollEnabled={false}
            decelerationRate="fast"
            removeClippedSubviews={false}
            alwaysBounceHorizontal={false}
            alwaysBounceVertical={false}
            directionalLockEnabled={false}
          >
            {photos.map((photoUri, index) => (
              <View
                key={index}
                style={{ 
                  width: SCREEN_WIDTH, 
                  height: SCREEN_HEIGHT * 0.55,
                  paddingHorizontal: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3.84,
                  elevation: 3,
                }}
              >
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        </View>
        
        {/* Activity Information Section - Bottom of Screen */}
        {activity && (
          <View 
            className="w-full bg-white px-4 py-4 border-t border-gray-200" 
            style={{ height: SCREEN_HEIGHT * 0.35 }}
          >
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              <View className="border-l-4 pl-3" style={{ borderLeftColor: getActivityColor(activityType) }}>
                {/* Activity Type */}
                {/* For metadata_edit, show "Task Information" instead of "Metadata Edit" */}
                <Text className="text-base font-medium text-gray-900 capitalize mb-1">
                  {activityType === 'metadata_edit' 
                    ? 'Task Information' 
                    : (activityType?.replace(/_/g, " ") || activityType)}
                </Text>
                
                {/* User and Timestamp */}
                <View className="flex-row items-center mb-2">
                  <Ionicons 
                    name={getActivityIcon(activityType) as any} 
                    size={14} 
                    color={getActivityColor(activityType)} 
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-sm text-gray-600">
                    {activityUser?.name || "Unknown User"} • {dateFormatter.formatDateShort(activity.timestamp)} {dateFormatter.formatTime(activity.timestamp)}
                  </Text>
                </View>
                
                {/* Description */}
                {actionText && (
                  <Text className="text-sm text-gray-700 mb-2">{actionText}</Text>
                )}
                
                {/* Reason */}
                {extractedReason && (
                  <Text className="text-sm text-gray-700 mb-2">
                    <Text className="font-medium">Reason:</Text> {extractedReason}
                  </Text>
                )}
                
                {/* Progress and Status */}
                {(activity.completionPercentage !== undefined || activity.status) && (
                  <View className="flex-row items-center gap-3 mt-1">
                    {activity.completionPercentage !== undefined && (
                      <Text className="text-sm text-gray-600">
                        Progress: {activity.completionPercentage}%
                      </Text>
                    )}
                    {activity.status && (
                      <View className="px-2 py-0.5 rounded" style={{ backgroundColor: getActivityColor(activityType) + '20' }}>
                        <Text className="text-xs text-gray-700 capitalize">
                          {activity.status.replace(/_/g, " ")}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

