import React from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Modal,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { LibraryAlbumChoice } from "./libraryAlbumConstants";

type LibraryAlbumPickerModalProps = {
  visible: boolean;
  albums: LibraryAlbumChoice[];
  selectedAlbumId: string;
  onClose: () => void;
  onSelectAlbum: (albumId: string) => void;
  testIdPrefix: string;
  accentColor?: string;
};

export function LibraryAlbumPickerModal({
  visible,
  albums,
  selectedAlbumId,
  onClose,
  onSelectAlbum,
  testIdPrefix,
  accentColor = "#08576E",
}: LibraryAlbumPickerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.albumModal, { paddingTop: insets.top + 8 }]}>
        <View style={styles.albumModalHeader}>
          <Text style={styles.albumModalTitle}>Choose album</Text>
          <Pressable
            testID={`${testIdPrefix}__album_picker_close`}
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color={accentColor} />
          </Pressable>
        </View>
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => {
            const active = item.id === selectedAlbumId;
            return (
              <Pressable
                testID={`${testIdPrefix}__album_row`}
                onPress={() => onSelectAlbum(item.id)}
                style={[
                  styles.albumRowItem,
                  active && { backgroundColor: "#F0F7FA" },
                ]}
              >
                <View style={styles.albumRowText}>
                  <Text
                    style={[
                      styles.albumRowTitle,
                      active && { color: accentColor, fontWeight: "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {item.assetCount > 0 ? (
                    <Text style={styles.albumRowCount}>
                      {item.assetCount} photos
                    </Text>
                  ) : null}
                </View>
                {active ? (
                  <Ionicons name="checkmark" size={22} color={accentColor} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  albumModal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  albumModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  albumModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  albumRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  albumRowText: {
    flex: 1,
    paddingRight: 12,
  },
  albumRowTitle: {
    fontSize: 16,
    color: "#10222B",
    fontWeight: "500",
  },
  albumRowCount: {
    marginTop: 2,
    fontSize: 12,
    color: "#888",
  },
});
