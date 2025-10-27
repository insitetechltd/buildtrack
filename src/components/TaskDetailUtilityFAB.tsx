import React, { useState, useRef } from "react";
import { View, Pressable, Animated, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TaskDetailUtilityFABProps {
  onUpdate: () => void;
  onEdit: () => void;
  onCameraUpdate: () => void;
  canUpdate: boolean;
  canEdit: boolean;
}

export default function TaskDetailUtilityFAB({ onUpdate, onEdit, onCameraUpdate, canUpdate, canEdit }: TaskDetailUtilityFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim1 = useRef(new Animated.Value(0)).current;
  const scaleAnim2 = useRef(new Animated.Value(0)).current;
  const scaleAnim3 = useRef(new Animated.Value(0)).current;

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
    toggleExpand();
  };

  const handleEdit = () => {
    if (!canEdit) return; // Don't allow edit if user can't edit
    setIsExpanded(false);
    onEdit();
  };

  const handleUpdate = () => {
    setIsExpanded(false);
    onUpdate();
  };

  const handleCameraUpdate = () => {
    setIsExpanded(false);
    onCameraUpdate();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View className="absolute bottom-6 right-6">
      {/* Edit Task Button - appears when expanded */}
      {/* Position: Center at -108px - YELLOW for Edit */}
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim3 },
            { translateY: scaleAnim3.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -108]
            })}
          ],
          opacity: 1, // Always fully opaque
        }}
        pointerEvents={isExpanded ? 'auto' : 'none'}
        className="flex-row items-center"
      >
        <View className={`px-3 py-2 rounded-lg mr-2 shadow-lg ${canEdit ? 'bg-gray-800' : 'bg-gray-600'}`}>
          <Text className={`text-sm font-medium ${canEdit ? 'text-white' : 'text-gray-300'}`}>Edit</Text>
        </View>
        <Pressable
          onPress={handleEdit}
          disabled={!canEdit}
          className={`w-12 h-12 rounded-full items-center justify-center shadow-lg ${canEdit ? 'bg-yellow-500' : 'bg-gray-400'}`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: canEdit ? 0.25 : 0.1,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons name="pencil" size={20} color="white" style={{ opacity: canEdit ? 1 : 0.5 }} />
        </Pressable>
      </Animated.View>

      {/* Update Button - appears when expanded (only if user can update) */}
      {/* Position: Center at -72px - GREEN for Update */}
      {canUpdate && (
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim2 },
              { translateY: scaleAnim2.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -72]
              })}
            ],
            opacity: 1, // Always fully opaque
          }}
          pointerEvents={isExpanded ? 'auto' : 'none'}
          className="flex-row items-center"
        >
          <View className="bg-gray-800 px-3 py-2 rounded-lg mr-2 shadow-lg">
            <Text className="text-white text-sm font-medium">Update</Text>
          </View>
          <Pressable
            onPress={handleUpdate}
            className="w-12 h-12 bg-green-600 rounded-full items-center justify-center shadow-lg"
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

      {/* Camera Update Button - appears when expanded (only if user can update) */}
      {/* Position: Center at -36px - BLUE for Camera */}
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
            opacity: 1, // Always fully opaque - NOT transparent
          }}
          pointerEvents={isExpanded ? 'auto' : 'none'}
          className="flex-row items-center"
        >
          <View className="bg-gray-800 px-3 py-2 rounded-lg mr-2 shadow-lg">
            <Text className="text-white text-sm font-medium">Camera</Text>
          </View>
          <Pressable
            onPress={handleCameraUpdate}
            className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center shadow-lg"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Ionicons name="camera" size={20} color="white" />
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

