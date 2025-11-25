import React, { useState, useRef } from "react";
import { View, Pressable, Animated, Text, PanResponder, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TaskDetailUtilityFABProps {
  onEdit: () => void;
  onCreateSubTask?: () => void;
  onCancel?: () => void;
  canEdit: boolean;
  canCreateSubTask?: boolean;
  canCancel?: boolean;
}

export default function TaskDetailUtilityFAB({ onEdit, onCreateSubTask, onCancel, canEdit, canCreateSubTask, canCancel }: TaskDetailUtilityFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim1 = useRef(new Animated.Value(0)).current; // Edit
  const scaleAnim2 = useRef(new Animated.Value(0)).current; // Sub-task
  const scaleAnim3 = useRef(new Animated.Value(0)).current; // Cancel
  
  // Position state for draggable FAB
  // Initialize to bottom-right (original position: bottom-6 right-6 = 24px from edges)
  const FAB_SIZE = 56; // w-14 h-14 = 56px
  const MARGIN = 24; // 6 * 4 = 24px
  const initialX = SCREEN_WIDTH - FAB_SIZE - MARGIN;
  const initialY = SCREEN_HEIGHT - FAB_SIZE - MARGIN;
  
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [fabPosition, setFabPosition] = useState({ x: initialX, y: initialY });
  const isDragging = useRef(false);

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
    // Only toggle if not dragging
    if (!isDragging.current) {
      toggleExpand();
    }
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

  const handleEdit = () => {
    if (!canEdit) return;
    collapseImmediately();
    setTimeout(() => onEdit(), 200);
  };

  const handleCreateSubTask = () => {
    if (!canCreateSubTask) return;
    collapseImmediately();
    if (onCreateSubTask) {
      setTimeout(() => onCreateSubTask(), 200);
    }
  };

  const handleCancel = () => {
    if (!canCancel || !onCancel) return;
    collapseImmediately();
    setTimeout(() => onCancel(), 200);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // PanResponder for dragging the FAB
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Only start dragging if it's a long press or significant movement
        // This allows tap to still work for expanding
        return false;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Start dragging if user moves more than 10 pixels
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 || Math.abs(dy) > 10;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        // Collapse menu if expanded while dragging
        if (isExpanded) {
          toggleExpand();
        }
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({
          x: gestureState.dx,
          y: gestureState.dy,
        });
      },
      onPanResponderRelease: (evt, gestureState) => {
        isDragging.current = false;
        pan.flattenOffset();
        
        // Get current position
        const currentX = fabPosition.x + gestureState.dx;
        const currentY = fabPosition.y + gestureState.dy;
        
        // Snap to nearest edge
        let finalX = currentX;
        let finalY = currentY;
        
        // Snap horizontally to left or right edge
        if (currentX < SCREEN_WIDTH / 2) {
          finalX = MARGIN;
        } else {
          finalX = SCREEN_WIDTH - FAB_SIZE - MARGIN;
        }
        
        // Keep within vertical bounds (accounting for safe areas)
        const safeAreaTop = 44; // Approximate safe area top
        const safeAreaBottom = 34; // Approximate safe area bottom
        if (finalY < safeAreaTop) {
          finalY = safeAreaTop;
        } else if (finalY > SCREEN_HEIGHT - FAB_SIZE - safeAreaBottom - MARGIN) {
          finalY = SCREEN_HEIGHT - FAB_SIZE - safeAreaBottom - MARGIN;
        }
        
        // Calculate the delta from current position
        const deltaX = finalX - fabPosition.x;
        const deltaY = finalY - fabPosition.y;
        
        // Animate to final position
        Animated.spring(pan, {
          toValue: { x: deltaX, y: deltaY },
          useNativeDriver: true,
          friction: 8,
        }).start(() => {
          // Update position state after animation
          setFabPosition({ x: finalX, y: finalY });
          pan.setValue({ x: 0, y: 0 });
        });
      },
    })
  ).current;

  return (
    <>
      {/* Full-screen backdrop - tap to close when expanded */}
      {isExpanded && (
        <Pressable
          onPress={toggleExpand}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
        />
      )}
      
      <Animated.View 
        className="absolute items-end" 
        style={{ 
          zIndex: 1000,
          left: fabPosition.x,
          top: fabPosition.y,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        }}
        {...panResponder.panHandlers}
      >
        {/* Cancel Task Button */}
        {/* Position: -108px - RED/GRAY for Cancel */}
        {onCancel && (
          <Animated.View
            style={{
              transform: [
                { scale: scaleAnim3 },
                { translateY: scaleAnim3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -108]
                })}
              ],
              opacity: 1,
            }}
            pointerEvents={isExpanded ? 'auto' : 'none'}
            className="flex-row items-center"
          >
            <View className={`px-3 py-2 rounded-lg mr-2 shadow-lg ${canCancel ? 'bg-gray-800' : 'bg-gray-600'}`}>
              <Text className={`text-base font-medium ${canCancel ? 'text-white' : 'text-gray-300'}`}>Cancel Task</Text>
            </View>
            <Pressable
              onPress={handleCancel}
              disabled={!canCancel}
              className={`w-12 h-12 rounded-full items-center justify-center shadow-lg ${canCancel ? 'bg-red-600' : 'bg-gray-400'}`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: canCancel ? 0.25 : 0.1,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <Ionicons name="close-circle-outline" size={20} color="white" style={{ opacity: canCancel ? 1 : 0.5 }} />
            </Pressable>
          </Animated.View>
        )}

        {/* Edit Task Button */}
        {/* Position: -72px - YELLOW for Edit */}
        <Animated.View
        style={{
          transform: [
            { scale: scaleAnim1 },
            { translateY: scaleAnim1.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -72]
            })}
          ],
          opacity: 1,
        }}
        pointerEvents={isExpanded ? 'auto' : 'none'}
        className="flex-row items-center"
      >
        <View className={`px-3 py-2 rounded-lg mr-2 shadow-lg ${canEdit ? 'bg-gray-800' : 'bg-gray-600'}`}>
          <Text className={`text-base font-medium ${canEdit ? 'text-white' : 'text-gray-300'}`}>Edit Task Detail</Text>
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

      {/* Add Sub-Task Button */}
      {/* Position: -36px - ORANGE for Add Sub-Task */}
      {onCreateSubTask && (
        <Animated.View
          style={{
            transform: [
              { scale: scaleAnim2 },
              { translateY: scaleAnim2.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -36]
              })}
            ],
            opacity: 1,
          }}
          pointerEvents={isExpanded ? 'auto' : 'none'}
          className="flex-row items-center"
        >
          <View className={`px-3 py-2 rounded-lg mr-2 shadow-lg ${canCreateSubTask ? 'bg-gray-800' : 'bg-gray-600'}`}>
            <Text className={`text-base font-medium ${canCreateSubTask ? 'text-white' : 'text-gray-300'}`}>Add Sub-task</Text>
          </View>
          <Pressable
            onPress={handleCreateSubTask}
            disabled={!canCreateSubTask}
            className={`w-12 h-12 rounded-full items-center justify-center shadow-lg ${canCreateSubTask ? 'bg-orange-500' : 'bg-gray-400'}`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: canCreateSubTask ? 0.25 : 0.1,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" style={{ opacity: canCreateSubTask ? 1 : 0.5 }} />
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
    </Animated.View>
    </>
  );
}
