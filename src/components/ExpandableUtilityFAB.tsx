import React, { useState, useRef } from "react";
import { View, Pressable, Animated, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";

interface ExpandableUtilityFABProps {
  onCreateTask: () => void;
}

export default function ExpandableUtilityFAB({ onCreateTask }: ExpandableUtilityFABProps) {
  const { logout } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim1 = useRef(new Animated.Value(0)).current;
  const scaleAnim2 = useRef(new Animated.Value(0)).current;

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
        delay: isExpanded ? 0 : 50,
      }),
      Animated.spring(scaleAnim2, {
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

  const handleLogout = () => {
    setIsExpanded(false);
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
  };

  const handleCreateTask = () => {
    setIsExpanded(false);
    onCreateTask();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View className="absolute bottom-8 right-6">
      {/* Logout Button - appears when expanded */}
      {/* Spacing: Main button (56px) + 2px gap + Create button (48px) + 2px gap + Logout button (48px) */}
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim2 },
            { translateY: scaleAnim2.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -104]
            })}
          ],
          opacity: scaleAnim2,
        }}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <Pressable
          onPress={handleLogout}
          className="w-12 h-12 bg-red-600 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            marginBottom: 2,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="white" />
        </Pressable>
      </Animated.View>

      {/* Create Task Button - appears when expanded */}
      {/* Spacing: Main button (56px) + 2px gap + Create button (48px) */}
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim1 },
            { translateY: scaleAnim1.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -54]
            })}
          ],
          opacity: scaleAnim1,
        }}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <Pressable
          onPress={handleCreateTask}
          className="w-12 h-12 bg-orange-500 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            marginBottom: 2,
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

