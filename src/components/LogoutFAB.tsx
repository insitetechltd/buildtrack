import React from "react";
import { Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";

export default function LogoutFAB() {
  const { logout } = useAuthStore();

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

  return (
    <Pressable
      onPress={handleLogout}
      className="absolute bottom-6 left-6 w-14 h-14 bg-red-600 rounded-full items-center justify-center shadow-lg"
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
  );
}

