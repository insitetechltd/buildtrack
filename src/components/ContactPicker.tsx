import React, { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: { number?: string }[];
  emails?: { email?: string }[];
}

interface ContactPickerProps {
  onSelectContact: (contact: { name: string; phone?: string; email?: string }) => void;
  onClose: () => void;
}

export default function ContactPicker({ onSelectContact, onClose }: ContactPickerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === "granted") {
        setHasPermission(true);
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        });

        if (data.length > 0) {
          setContacts(data as Contact[]);
        }
      } else {
        Alert.alert(
          "Permission Required",
          "Please enable contacts access in your device settings to use this feature."
        );
      }
      setLoading(false);
    })();
  }, []);

  const handleSelectContact = (contact: Contact) => {
    const phone = contact.phoneNumbers?.[0]?.number;
    const email = contact.emails?.[0]?.email;

    if (!phone && !email) {
      Alert.alert("No Contact Info", "This contact has no phone number or email address.");
      return;
    }

    onSelectContact({
      name: contact.name,
      phone: phone?.replace(/[^0-9+]/g, ""), // Clean phone number
      email: email,
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-600 mt-4">Loading contacts...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="people-outline" size={64} color="#9ca3af" />
        <Text className="text-gray-900 text-xl font-semibold mt-4 text-center">
          Contacts Permission Required
        </Text>
        <Text className="text-gray-600 text-center mt-2">
          Please enable contacts access in your device settings to select contacts.
        </Text>
        <Pressable onPress={onClose} className="mt-6 bg-blue-600 px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">Close</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleSelectContact(item)}
            className="bg-white border-b border-gray-100 px-6 py-4 flex-row items-center"
          >
            <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
              <Text className="text-blue-600 font-bold text-xl">
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900 text-lg">
                {item.name}
              </Text>
              {item.phoneNumbers?.[0]?.number && (
                <Text className="text-base text-gray-600 mt-0.5">
                  {item.phoneNumbers[0].number}
                </Text>
              )}
              {item.emails?.[0]?.email && (
                <Text className="text-base text-gray-600 mt-0.5">
                  {item.emails[0].email}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-xl font-medium mt-4">
              No contacts found
            </Text>
          </View>
        }
      />
    </View>
  );
}
