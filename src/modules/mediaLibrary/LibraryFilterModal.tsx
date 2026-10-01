import React from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LibraryFilterState } from "./libraryAlbumConstants";

type LibraryFilterModalProps = {
  visible: boolean;
  filterState: LibraryFilterState;
  onClose: () => void;
  onApply: (filterState: LibraryFilterState) => void;
  testIdPrefix?: string;
  accentColor?: string;
};

export function LibraryFilterModal({
  visible,
  filterState,
  onClose,
  onApply,
  testIdPrefix = "library-filter",
  accentColor = "#2563EB",
}: LibraryFilterModalProps) {
  const [workingSortOrder, setWorkingSortOrder] = React.useState(filterState.sortOrder);
  const [workingTimeFilter, setWorkingTimeFilter] = React.useState(filterState.timeFilter);

  React.useEffect(() => {
    if (visible) {
      setWorkingSortOrder(filterState.sortOrder);
      setWorkingTimeFilter(filterState.timeFilter);
    }
  }, [visible, filterState]);

  const handleApply = () => {
    onApply({
      sortOrder: workingSortOrder,
      timeFilter: workingTimeFilter,
    });
    onClose();
  };

  const handleReset = () => {
    setWorkingSortOrder("descending");
    setWorkingTimeFilter("all");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        testID={`${testIdPrefix}__backdrop`}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable
          testID={`${testIdPrefix}__content`}
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: 20,
            paddingBottom: 40,
            paddingHorizontal: 16,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
              Filter Photos
            </Text>
            <Pressable
              testID={`${testIdPrefix}__close`}
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#f3f4f6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color="#111827" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Sort Order Section */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#6b7280",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Sort Order
              </Text>
              <Pressable
                testID={`${testIdPrefix}__sort_descending`}
                onPress={() => setWorkingSortOrder("descending")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor:
                    workingSortOrder === "descending" ? "#f3f4f6" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: workingSortOrder === "descending" ? "600" : "400",
                    color: "#111827",
                  }}
                >
                  Newest First
                </Text>
                {workingSortOrder === "descending" && (
                  <Ionicons name="checkmark" size={20} color={accentColor} />
                )}
              </Pressable>
              <Pressable
                testID={`${testIdPrefix}__sort_ascending`}
                onPress={() => setWorkingSortOrder("ascending")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor:
                    workingSortOrder === "ascending" ? "#f3f4f6" : "transparent",
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: workingSortOrder === "ascending" ? "600" : "400",
                    color: "#111827",
                  }}
                >
                  Oldest First
                </Text>
                {workingSortOrder === "ascending" && (
                  <Ionicons name="checkmark" size={20} color={accentColor} />
                )}
              </Pressable>
            </View>

            {/* Time Filter Section */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#6b7280",
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Time Range
              </Text>
              <Pressable
                testID={`${testIdPrefix}__time_all`}
                onPress={() => setWorkingTimeFilter("all")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor:
                    workingTimeFilter === "all" ? "#f3f4f6" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: workingTimeFilter === "all" ? "600" : "400",
                    color: "#111827",
                  }}
                >
                  All Photos
                </Text>
                {workingTimeFilter === "all" && (
                  <Ionicons name="checkmark" size={20} color={accentColor} />
                )}
              </Pressable>
              <Pressable
                testID={`${testIdPrefix}__time_lastWeek`}
                onPress={() => setWorkingTimeFilter("lastWeek")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor:
                    workingTimeFilter === "lastWeek" ? "#f3f4f6" : "transparent",
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: workingTimeFilter === "lastWeek" ? "600" : "400",
                    color: "#111827",
                  }}
                >
                  Last Week
                </Text>
                {workingTimeFilter === "lastWeek" && (
                  <Ionicons name="checkmark" size={20} color={accentColor} />
                )}
              </Pressable>
              <Pressable
                testID={`${testIdPrefix}__time_lastMonth`}
                onPress={() => setWorkingTimeFilter("lastMonth")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor:
                    workingTimeFilter === "lastMonth" ? "#f3f4f6" : "transparent",
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: workingTimeFilter === "lastMonth" ? "600" : "400",
                    color: "#111827",
                  }}
                >
                  Last Month
                </Text>
                {workingTimeFilter === "lastMonth" && (
                  <Ionicons name="checkmark" size={20} color={accentColor} />
                )}
              </Pressable>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 8,
            }}
          >
            <Pressable
              testID={`${testIdPrefix}__reset`}
              onPress={handleReset}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: "#f3f4f6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151" }}>
                Reset
              </Text>
            </Pressable>
            <Pressable
              testID={`${testIdPrefix}__apply`}
              onPress={handleApply}
              style={{
                flex: 2,
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: accentColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>
                Apply Filters
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
