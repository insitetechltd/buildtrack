import React, { useState } from "react";
import {
  Modal,
  View,
  Image,
  Pressable,
  Text,
  ScrollView,
  Dimensions,
  StatusBar as RNStatusBar,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface FullScreenImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function FullScreenImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: FullScreenImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  
  // Calculate top padding same as StandardHeader
  const topPadding = insets.top > 0 ? insets.top + 8 : 16;

  // Reset to initial index when modal opens
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      // Scroll to the initial image after a short delay to ensure layout is complete
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * SCREEN_WIDTH,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(newIndex);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({
        x: newIndex * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({
        x: newIndex * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View className="bg-gray-50" style={{ height: '90%', marginTop: 'auto' }}>
        <StatusBar style="dark" />
        {/* Top Handle */}
        <View className="w-full items-center pt-2 pb-1">
          <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </View>
        <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom', 'left', 'right']}>
          <View className="flex-1 bg-gray-50">
          {/* Header Banner with Back Arrow - Same pattern as StandardHeader */}
          <View 
            className="flex-row items-center justify-between px-6 pb-4 bg-white border-b border-gray-200"
            style={{ paddingTop: topPadding }}
          >
            <Pressable
              onPress={onClose}
              className="flex-row items-center"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
              <Text className="text-gray-700 text-base font-medium ml-2">Back</Text>
            </Pressable>
            
            {images.length > 1 && (
              <View className="bg-gray-100 px-3 py-1.5 rounded-full">
                <Text className="text-gray-700 text-sm font-medium">
                  {currentIndex + 1} / {images.length}
                </Text>
              </View>
            )}
          </View>

        {/* Image Gallery - Swipe horizontally to navigate */}
        <View className="flex-1">
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            className="flex-1"
            directionalLockEnabled={false}
            scrollEnabled={true}
          >
          {images.map((imageUri, index) => (
            <View
              key={index}
              style={{ 
                width: SCREEN_WIDTH, 
                height: SCREEN_HEIGHT,
                paddingHorizontal: 20,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#ffffff',
              }}
            >
              <Image
                source={{ uri: imageUri }}
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

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            {/* Left Arrow */}
            {currentIndex > 0 && (
              <Pressable
                onPress={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full items-center justify-center shadow-lg"
                style={{ transform: [{ translateY: -24 }] }}
              >
                <Ionicons name="chevron-back" size={28} color="#374151" />
              </Pressable>
            )}

            {/* Right Arrow */}
            {currentIndex < images.length - 1 && (
              <Pressable
                onPress={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 rounded-full items-center justify-center shadow-lg"
                style={{ transform: [{ translateY: -24 }] }}
              >
                <Ionicons name="chevron-forward" size={28} color="#374151" />
              </Pressable>
            )}
          </>
        )}

        {/* Bottom Thumbnail Bar (optional, for multiple images) */}
        {images.length > 1 && (
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4 }}
            >
              {images.map((imageUri, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    setCurrentIndex(index);
                    scrollViewRef.current?.scrollTo({
                      x: index * SCREEN_WIDTH,
                      animated: true,
                    });
                  }}
                  className={`mr-2 rounded-lg overflow-hidden border-2 ${
                    index === currentIndex ? "border-white" : "border-transparent"
                  }`}
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: 60, height: 60 }}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

