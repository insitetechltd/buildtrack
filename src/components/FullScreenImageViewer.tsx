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
import { SafeAreaView } from "react-native-safe-area-context";

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
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <SafeAreaView className="flex-1 bg-black">
        {/* Header */}
        <View className="absolute top-0 left-0 right-0 z-10 bg-black/80 px-4 py-3" style={{ paddingTop: Platform.OS === 'ios' ? 0 : RNStatusBar.currentHeight }}>
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={onClose}
              className="flex-row items-center"
            >
              <Ionicons name="close" size={28} color="white" />
              <Text className="text-white text-base font-medium ml-2">Close</Text>
            </Pressable>
            <Text className="text-white text-base font-medium">
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        </View>

        {/* Image Gallery */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          className="flex-1"
        >
          {images.map((imageUri, index) => (
            <View
              key={index}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              className="items-center justify-center"
            >
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT,
                }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            {/* Left Arrow */}
            {currentIndex > 0 && (
              <Pressable
                onPress={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 rounded-full items-center justify-center"
                style={{ transform: [{ translateY: -24 }] }}
              >
                <Ionicons name="chevron-back" size={28} color="white" />
              </Pressable>
            )}

            {/* Right Arrow */}
            {currentIndex < images.length - 1 && (
              <Pressable
                onPress={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 rounded-full items-center justify-center"
                style={{ transform: [{ translateY: -24 }] }}
              >
                <Ionicons name="chevron-forward" size={28} color="white" />
              </Pressable>
            )}
          </>
        )}

        {/* Bottom Thumbnail Bar (optional, for multiple images) */}
        {images.length > 1 && (
          <View className="absolute bottom-0 left-0 right-0 bg-black/80 px-4 py-3">
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
      </SafeAreaView>
    </Modal>
  );
}

