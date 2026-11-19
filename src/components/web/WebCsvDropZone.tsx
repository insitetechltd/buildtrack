import React, { useCallback, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  onFileText: (text: string, fileName: string) => void;
  onError?: (message: string) => void;
  testID?: string;
};

/**
 * Web-only CSV file drop + click-to-browse.
 * Uses DOM drag events on the RN-web host node.
 */
export function WebCsvDropZone({ onFileText, onError, testID }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const readFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      const name = file.name || "upload.csv";
      if (!/\.csv$/i.test(name) && file.type && !file.type.includes("csv") && file.type !== "text/plain") {
        onError?.("Please choose a .csv file");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        if (!text.trim()) {
          onError?.("That file is empty");
          return;
        }
        onFileText(text.replace(/^\uFEFF/, ""), name);
      };
      reader.onerror = () => onError?.("Could not read that file");
      reader.readAsText(file);
    },
    [onError, onFileText],
  );

  if (Platform.OS !== "web") {
    return (
      <View style={styles.box} testID={testID}>
        <Text style={styles.hint}>CSV upload is available on web.</Text>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      // RN-web forwards DOM drag events on web
      {...({
        onDragEnter: (e: { preventDefault: () => void; stopPropagation: () => void }) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(true);
        },
        onDragOver: (e: { preventDefault: () => void; stopPropagation: () => void }) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(true);
        },
        onDragLeave: (e: { preventDefault: () => void; stopPropagation: () => void }) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        },
        onDrop: (e: {
          preventDefault: () => void;
          stopPropagation: () => void;
          dataTransfer?: { files?: FileList };
        }) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          readFile(e.dataTransfer?.files?.[0]);
        },
      } as Record<string, unknown>)}
      style={[styles.box, dragging ? styles.boxActive : null]}
    >
      <Text style={styles.title}>
        {dragging ? "Drop CSV to upload" : "Drag & drop your CSV here"}
      </Text>
      <Text style={styles.hint}>or</Text>
      <Pressable
        testID={testID ? `${testID}__browse` : undefined}
        onPress={() => inputRef.current?.click()}
        style={styles.browse}
      >
        <Text style={styles.browseText}>Choose file</Text>
      </Pressable>
      {/* Hidden native file input — web only */}
      {React.createElement("input", {
        ref: inputRef,
        type: "file",
        accept: ".csv,text/csv",
        style: { display: "none" },
        "data-testid": testID ? `${testID}__input` : undefined,
        onChange: (e: { target: { files?: FileList | null } }) => {
          readFile(e.target.files?.[0]);
          if (inputRef.current) inputRef.current.value = "";
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#BFE9F0",
    borderRadius: 14,
    backgroundColor: "#F8FCFD",
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  boxActive: {
    borderColor: "#0D6E87",
    backgroundColor: "#E7F4F8",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#07111E",
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: "#577783",
    marginBottom: 8,
  },
  browse: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#0D6E87",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  browseText: {
    color: "#0D6E87",
    fontWeight: "700",
    fontSize: 13,
  },
});
