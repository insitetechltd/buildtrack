import React, { useState, useRef } from "react";
import { View, Pressable, Animated, Alert, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";

interface ExpandableUtilityFABProps {
  onCreateTask: () => void;
  onSearch?: () => void;
  onReports?: () => void;
}

export default function ExpandableUtilityFAB({ onCreateTask, onSearch, onReports }: ExpandableUtilityFABProps) {
  const { logout } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim1 = useRef(new Animated.Value(0)).current;
  const scaleAnim2 = useRef(new Animated.Value(0)).current;
  const scaleAnim3 = useRef(new Animated.Value(0)).current;
  const scaleAnim4 = useRef(new Animated.Value(0)).current;

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
        delay: isExpanded ? 0 : 50,
      }),
      Animated.spring(scaleAnim3, {
        toValue,
        useNativeDriver: true,
        friction: 7,
        delay: isExpanded ? 0 : 150,
      }),
      Animated.spring(scaleAnim4, {
        toValue,
        useNativeDriver: true,
        friction: 7,
        delay: isExpanded ? 0 : 200,
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
    scaleAnim4.stopAnimation();
    
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
      Animated.timing(scaleAnim4, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsExpanded(false);
  };

  const handleLogout = () => {
    collapseImmediately();
    setTimeout(() => {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Logout", 
            style: "destructive",
            onPress: logout
          },
        ]
      );
    }, 200);
  };

  const handleCreateTask = () => {
    collapseImmediately();
    setTimeout(() => onCreateTask(), 200);
  };

  const handleSearch = () => {
    collapseImmediately();
    if (onSearch) {
      setTimeout(() => onSearch(), 200);
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
    <View className="absolute bottom-8 right-6 items-end">
      {/* Logout Button - appears when expanded */}
      {/* Custom position: Center at -144px - HIGHEST POSITION */}
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim4 },
            { translateY: scaleAnim4.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -144]
            })}
          ],
          opacity: scaleAnim4,
        }}
        pointerEvents={isExpanded ? 'auto' : 'none'}
        className="flex-row items-center"
      >
        <View className="bg-gray-800 px-3 py-2 rounded-lg mr-2 shadow-lg">
          <Text className="text-white text-sm font-medium">Logout</Text>
        </View>
        <Pressable
          onPress={handleLogout}
          className="w-12 h-12 bg-red-600 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="white" />
        </Pressable>
      </Animated.View>

      {/* Reports Button - appears when expanded */}
      {/* Custom position: Center at -108px */}
      {onReports && (
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim3 },
              { translateY: scaleAnim3.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -108]
              })}
            ],
            opacity: scaleAnim3,
          }}
          pointerEvents={isExpanded ? 'auto' : 'none'}
          className="flex-row items-center"
        >
          <View className="bg-gray-800 px-3 py-2 rounded-lg mr-2 shadow-lg">
            <Text className="text-white text-sm font-medium">Reports</Text>
          </View>
          <Pressable
            onPress={handleReports}
            className="w-12 h-12 bg-green-600 rounded-full items-center justify-center shadow-lg"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Ionicons name="bar-chart" size={20} color="white" />
          </Pressable>
        </Animated.View>
      )}

      {/* Search Button - appears when expanded */}
      {/* Custom position: Center at -72px */}
      {onSearch && (
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
          }}
          pointerEvents={isExpanded ? 'auto' : 'none'}
          className="flex-row items-center"
        >
          <View className="bg-gray-800 px-3 py-2 rounded-lg mr-2 shadow-lg">
            <Text className="text-white text-sm font-medium">Search</Text>
          </View>
          <Pressable
            onPress={handleSearch}
            className="w-12 h-12 bg-purple-600 rounded-full items-center justify-center shadow-lg"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Ionicons name="search" size={20} color="white" />
          </Pressable>
        </Animated.View>
      )}

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
        }}
        pointerEvents={isExpanded ? 'auto' : 'none'}
        className="flex-row items-center"
      >
        <View className="bg-gray-800 px-3 py-2 rounded-lg mr-2 shadow-lg">
          <Text className="text-white text-sm font-medium">New Task</Text>
        </View>
        <Pressable
          onPress={handleCreateTask}
          className="w-12 h-12 bg-yellow-500 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </Pressable>
      </Animated.View>

      {/* Main Utility FAB */}
      <Pressable
        onPress={handlePress}
        className="w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="apps" size={28} color="white" />
        </Animated.View>
      </Pressable>

      {/* Backdrop - tap to close when expanded */}
      {isExpanded && (
        <Pressable
          onPress={toggleExpand}
          className="absolute -inset-96"
          style={{ zIndex: -1 }}
        />
      )}
    </View>
  );
}
