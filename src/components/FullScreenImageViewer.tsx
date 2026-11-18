import React, { useState } from "react";
import {
  Modal as RNModal,
  View,
  Pressable,
  Text,
  ScrollView,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

const Modal = RNModal || View;

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
  const scrollRef = React.useRef<ScrollView>(null);
  const pageWidth = Dimensions.get("window").width;

  React.useEffect(() => {
    if (!visible) {
      return;
    }
    setCurrentIndex(initialIndex);
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: pageWidth * initialIndex, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [visible, initialIndex, pageWidth]);

  const showIndex = (index: number) => {
    const nextIndex = Math.max(0, Math.min(images.length - 1, index));
    setCurrentIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: pageWidth * nextIndex, animated: true });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        testID="fullscreen-image-viewer"
        className="flex-1 items-center justify-center bg-black/90"
      >
        <Pressable
          testID="fullscreen-image-viewer__close"
          accessibilityRole="button"
          className="absolute top-12 right-6 z-10 rounded-full bg-white/10 px-3 py-2"
          onPress={onClose}
        >
          <Text className="text-sm font-semibold text-white">Close</Text>
        </Pressable>

        {currentIndex > 0 ? (
          <Pressable
            testID="fullscreen-image-viewer__previous"
            accessibilityRole="button"
            className="absolute left-4 z-10 rounded-full bg-white/15 px-4 py-3"
            onPress={() => showIndex(currentIndex - 1)}
          >
            <Text className="text-sm font-semibold text-white">Previous</Text>
          </Pressable>
        ) : null}

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(
              event.nativeEvent.contentOffset.x /
                Math.max(event.nativeEvent.layoutMeasurement.width, 1),
            );
            setCurrentIndex(nextIndex);
          }}
          className="h-full w-full"
        >
          {images.map((imageUri, index) => (
            <View key={`${imageUri}-${index}`} style={{ width: pageWidth, height: "100%" }}>
              <ExpoImage
                testID={index === currentIndex ? "fullscreen-image-viewer__image" : undefined}
                source={{ uri: imageUri }}
                contentFit="contain"
                cachePolicy="memory-disk"
                style={StyleSheet.absoluteFillObject}
              />
            </View>
          ))}
        </ScrollView>

        {images.length > 1 ? (
          <View className="absolute bottom-10 z-10 rounded-full bg-black/45 px-3 py-1.5">
            <Text className="text-sm font-semibold text-white">
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        ) : null}

        {currentIndex < images.length - 1 ? (
          <Pressable
            testID="fullscreen-image-viewer__next"
            accessibilityRole="button"
            className="absolute right-4 z-10 rounded-full bg-white/15 px-4 py-3"
            onPress={() => showIndex(currentIndex + 1)}
          >
            <Text className="text-sm font-semibold text-white">Next</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}
