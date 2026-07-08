import React, { useState, useRef } from "react";
import { View, Pressable, Animated, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../utils/useTranslation";

interface ExpandableUtilityFABProps {
  onCreateTask: () => void;
  onReports?: () => void;
}

export default function ExpandableUtilityFAB({
  onCreateTask,
  onReports: _onReports,
}: ExpandableUtilityFABProps) {
  const t = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim1 = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    
    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue,
        useNativeDriver: true,
        friction: 5,
      }),
      Animated.spring(scaleAnim1, {
        toValue,
        useNativeDriver: true,
        friction: 7,
        delay: isExpanded ? 0 : 100,
      }),
    ]).start();
    
    setIsExpanded(!isExpanded);
  };

  const handlePress = () => {
    // Short press - toggle expand/collapse
    toggleExpand();
  };

  const collapseImmediately = () => {
    // Stop all running animations
    rotateAnim.stopAnimation();
    scaleAnim1.stopAnimation();
    
    // Reset all animations to collapsed state immediately
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim1, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsExpanded(false);
  };

  const handleCreateTask = () => {
    collapseImmediately();
    // Call immediately without delay to ensure navigation happens
    onCreateTask();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* Full-screen backdrop - tap to close when expanded */}
      {isExpanded && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 998,
          }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={toggleExpand}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </View>
      )}
      
      <View className="absolute bottom-8 right-6 items-end" style={{ zIndex: 1001 }} pointerEvents="box-none">
        {/* Create Task Button - appears when expanded */}
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim1 },
              {
                translateY: scaleAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -56],
                }),
              },
            ],
            opacity: scaleAnim1,
            zIndex: 1002,
          }}
          pointerEvents={isExpanded ? "auto" : "none"}
          className="flex-row items-center"
        >
          <View className="mr-2 rounded-lg bg-gray-800 px-3 py-2 shadow-lg">
            <Text className="text-base font-medium text-white">{t.fab.newTask}</Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleCreateTask();
            }}
            className="h-12 w-12 items-center justify-center rounded-full bg-yellow-500 shadow-lg"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              zIndex: 1003,
            }}
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </Animated.View>

      {/* Main Utility FAB */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          handlePress();
        }}
        className="w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 1004,
        }}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="apps" size={28} color="white" />
        </Animated.View>
      </Pressable>
    </View>
    </>
  );
}
