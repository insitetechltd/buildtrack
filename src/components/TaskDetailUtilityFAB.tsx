import React, { useState, useRef } from "react";
import { View, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TaskDetailUtilityFABProps {
  onUpdate: () => void;
  onEdit: () => void;
  canUpdate: boolean;
}

export default function TaskDetailUtilityFAB({ onUpdate, onEdit, canUpdate }: TaskDetailUtilityFABProps) {
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
    toggleExpand();
  };

  const handleEdit = () => {
    setIsExpanded(false);
    onEdit();
  };

  const handleUpdate = () => {
    setIsExpanded(false);
    onUpdate();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View className="absolute bottom-6 right-6">
      {/* Edit Task Button - appears when expanded */}
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
      >
        <Pressable
          onPress={handleEdit}
          className="w-12 h-12 bg-green-600 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons name="pencil" size={20} color="white" />
        </Pressable>
      </Animated.View>

      {/* Update Button - appears when expanded (only if user can update) */}
      {canUpdate && (
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
        >
          <Pressable
            onPress={handleUpdate}
            className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center shadow-lg"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Ionicons name="create-outline" size={20} color="white" />
          </Pressable>
        </Animated.View>
      )}

      {/* Main Utility FAB */}
      <Pressable
        onPress={handlePress}
        className="w-14 h-14 bg-purple-600 rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="settings" size={28} color="white" />
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

