import React, { useState, useRef } from "react";
import { View, Pressable, Animated, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../utils/useTranslation";
import { useNavigation } from "@react-navigation/native";

interface ExpandableUtilityFABProps {
  onCreateTask: () => void;
  onReports?: () => void;
}

export default function ExpandableUtilityFAB({ onCreateTask, onReports }: ExpandableUtilityFABProps) {
  const t = useTranslation();
  const navigation = useNavigation<any>();
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim1 = useRef(new Animated.Value(0)).current; // Create Task
  const scaleAnim2 = useRef(new Animated.Value(0)).current; // Dashboard
  const scaleAnim3 = useRef(new Animated.Value(0)).current; // Reports

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
      Animated.spring(scaleAnim2, {
        toValue,
        useNativeDriver: true,
        friction: 7,
        delay: isExpanded ? 0 : 125,
      }),
      Animated.spring(scaleAnim3, {
        toValue,
        useNativeDriver: true,
        friction: 7,
        delay: isExpanded ? 0 : 150,
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
    scaleAnim2.stopAnimation();
    scaleAnim3.stopAnimation();
    
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
      Animated.timing(scaleAnim2, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim3, {
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

  const handleDashboard = () => {
    collapseImmediately();
    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.navigate("Dashboard");
    }
  };

  const handleReports = () => {
    collapseImmediately();
    if (onReports) {
      setTimeout(() => onReports(), 200);
    }
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
        {/* Reports Button - appears when expanded */}
        {/* Custom position: Center at -144px */}
        {onReports && (
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim3 },
              { translateY: scaleAnim3.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -144]
              })}
            ],
            opacity: scaleAnim3,
            zIndex: 1002,
          }}
          pointerEvents={isExpanded ? 'auto' : 'none'}
          className="flex-row items-center"
        >
          <View className="bg-gray-800 px-3 py-2 rounded-lg mr-2 shadow-lg">
            <Text className="text-white text-base font-medium">{t.nav.reports}</Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleReports();
            }}
            className="w-12 h-12 bg-green-600 rounded-full items-center justify-center shadow-lg"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              zIndex: 1003,
            }}
          >
            <Ionicons name="bar-chart" size={20} color="white" />
          </Pressable>
        </Animated.View>
      )}

      {/* Dashboard Button - appears when expanded */}
      {/* Custom position: Center at -72px */}
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim2 },
            { translateY: scaleAnim2.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -72]
            })}
          ],
          opacity: scaleAnim2,
          zIndex: 1002,
        }}
        pointerEvents={isExpanded ? 'auto' : 'none'}
        className="flex-row items-center"
      >
        <View className="bg-gray-800 px-3 py-2 rounded-lg mr-2 shadow-lg">
          <Text className="text-white text-base font-medium">{t.nav.dashboard || "Dashboard"}</Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleDashboard();
          }}
          className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            zIndex: 1003,
          }}
        >
          <Ionicons name="home" size={20} color="white" />
        </Pressable>
      </Animated.View>

      {/* Create Task Button - appears when expanded */}
      {/* Custom position: Center at -36px */}
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim1 },
            { translateY: scaleAnim1.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -36]
            })}
          ],
          opacity: scaleAnim1,
          zIndex: 1002,
        }}
        pointerEvents={isExpanded ? 'auto' : 'none'}
        className="flex-row items-center"
      >
        <View className="bg-gray-800 px-3 py-2 rounded-lg mr-2 shadow-lg">
          <Text className="text-white text-base font-medium">{t.fab.newTask}</Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleCreateTask();
          }}
          className="w-12 h-12 bg-yellow-500 rounded-full items-center justify-center shadow-lg"
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
