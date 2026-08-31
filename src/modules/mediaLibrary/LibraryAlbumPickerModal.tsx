import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { LibraryAlbumChoice } from "./libraryAlbumConstants";
import { filterLibraryAlbums } from "./libraryAlbumSearch";

type LibraryAlbumPickerModalProps = {
  visible: boolean;
  albums: LibraryAlbumChoice[];
  selectedAlbumId: string;
  onClose: () => void;
  onSelectAlbum: (albumId: string) => void;
  testIdPrefix: string;
  accentColor?: string;
};

export function LibraryAlbumPickerSheet({
  albums,
  selectedAlbumId,
  onClose,
  onSelectAlbum,
  testIdPrefix,
  accentColor = "#08576E",
  query,
  onQueryChange,
}: {
  albums: LibraryAlbumChoice[];
  selectedAlbumId: string;
  onClose: () => void;
  onSelectAlbum: (albumId: string) => void;
  testIdPrefix: string;
  accentColor?: string;
  query: string;
  onQueryChange: (next: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const visibleAlbums = useMemo(
    () => filterLibraryAlbums(albums, query),
    [albums, query],
  );

  return (
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
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#6b7280" />
        <TextInput
          testID={`${testIdPrefix}__album_search`}
          style={styles.searchInput}
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search albums"
          placeholderTextColor="#9ca3af"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={visibleAlbums}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          <Text style={styles.emptySearch}>No matching albums</Text>
        }
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
  );
}

export function LibraryAlbumPickerModal({
  visible,
  albums,
  selectedAlbumId,
  onClose,
  onSelectAlbum,
  testIdPrefix,
  accentColor = "#08576E",
}: LibraryAlbumPickerModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) {
      setQuery("");
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LibraryAlbumPickerSheet
        albums={albums}
        selectedAlbumId={selectedAlbumId}
        onClose={onClose}
        onSelectAlbum={onSelectAlbum}
        testIdPrefix={testIdPrefix}
        accentColor={accentColor}
        query={query}
        onQueryChange={setQuery}
      />
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    fontSize: 16,
    color: "#10222B",
  },
  emptySearch: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
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
