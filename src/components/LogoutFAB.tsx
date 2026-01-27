import React from "react";
import { Pressable, Alert, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useNavigation } from "@react-navigation/native";

export default function LogoutFAB() {
  const { logout } = useAuthStore();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
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

  const handleDashboard = () => {
    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.navigate("Dashboard");
    }
  };

  return (
    <View className="absolute bottom-6 left-6 items-start" style={{ zIndex: 1000 }}>
      {/* Dashboard Button */}
      <View className="flex-row items-center mb-3">
        <View className="bg-gray-800 px-3 py-2 rounded-lg mr-2 shadow-lg">
          <Text className="text-white text-base font-medium mr-2">Dashboard</Text>
        </View>
        <Pressable
          onPress={handleDashboard}
          className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Ionicons name="home" size={20} color="white" />
        </Pressable>
      </View>

      {/* Logout Button */}
      <Pressable
        onPress={handleLogout}
        className="w-14 h-14 bg-red-600 rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <Ionicons name="log-out-outline" size={24} color="white" />
      </Pressable>
    </View>
  );
}

