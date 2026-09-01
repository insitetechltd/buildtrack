import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { CameraView } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";

import {
  peekWarmLibraryThumbUri,
} from "../../utils/libraryWarmPrefetch";
import { startLibraryCapturePrefetch } from "../../utils/libraryCapturePrefetch";
import {
  peekCameraPermission,
  ensureCameraPermissionChecked,
  requestCameraPermission,
} from "../../utils/cameraPermission";
import { probeCameraAvailable } from "./cameraAvailability";
import { enqueueCameraDraftPin } from "./cameraDraftPinQueue";
import { useCaptureSessionHost } from "./CaptureSessionHostContext";
import { useCaptureSessionStore } from "./sessionDraftStore";
import {
  cameraZoomAfterPinch,
  cameraZoomPreset,
  isCameraZoom1x,
} from "./cameraZoom";

function newSessionId(): string {
  return `cam_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function CaptureSessionCameraScreen() {
  const insets = useSafeAreaInsets();
  const { onCancel, goToHybridLibrary } = useCaptureSessionHost();
  const cameraRef = useRef<CameraView>(null);
  const isCapturingRef = useRef(false);
  const autoOpenedLibraryRef = useRef(false);
  const [permission, setPermission] = useState(peekCameraPermission);
  const [isCapturing, setIsCapturing] = useState(false);
  const [libraryThumbUri, setLibraryThumbUri] = useState<string | null>(null);
  const [cameraNativeError, setCameraNativeError] = useState<string | null>(null);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [zoom, setZoom] = useState(0);
  const zoomRef = useRef(0);
  const pinchStartRef = useRef(0);

  const photos = useCaptureSessionStore((s) => s.photos);
  const selectAllSessionCamera = useCaptureSessionStore(
    (s) => s.selectAllSessionCamera,
  );

  const sessionCount = photos.filter((p) => p.source === "camera").length;

  const openLibraryOnly = useCallback(() => {
    goToHybridLibrary();
  }, [goToHybridLibrary]);

  const skipToLibraryOnce = useCallback(() => {
    if (autoOpenedLibraryRef.current) {
      return;
    }
    autoOpenedLibraryRef.current = true;
    goToHybridLibrary();
  }, [goToHybridLibrary]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await probeCameraAvailable();
      if (cancelled || available) {
        return;
      }
      setCameraUnavailable(true);
      skipToLibraryOnce();
    })();
    return () => {
      cancelled = true;
    };
  }, [skipToLibraryOnce]);

  useEffect(() => {
    void ensureCameraPermissionChecked().then(setPermission);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        startLibraryCapturePrefetch();
        if (cancelled) return;

        const warmUri = peekWarmLibraryThumbUri();
        if (warmUri) {
          setLibraryThumbUri(warmUri);
          return;
        }

        const current = await MediaLibrary.getPermissionsAsync();
        if (!current.granted || cancelled) return;

        const page = await MediaLibrary.getAssetsAsync({
          first: 1,
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });
        if (!cancelled && page.assets[0]?.uri) {
          setLibraryThumbUri(page.assets[0].uri);
        }
      } catch {
        // Peek is optional — camera still works without library access.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleShutter = useCallback(async () => {
    if (!cameraRef.current || isCapturingRef.current) {
      return;
    }
    const store = useCaptureSessionStore.getState();
    if (store.photos.length >= store.selectionLimit) {
      Alert.alert(
        "Limit reached",
        `You can select up to ${store.selectionLimit} photos.`,
      );
      return;
    }
    isCapturingRef.current = true;
    setIsCapturing(true);
    try {
      const shot = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (!shot?.uri) {
        throw new Error("No image from camera");
      }
      const id = newSessionId();
      const fileName = `capture_${id}.jpg`;
      const added = useCaptureSessionStore.getState().addCameraPhoto({
        id,
        uri: shot.uri,
        fileName,
      });
      if (!added) {
        return;
      }
      enqueueCameraDraftPin({
        id,
        sourceUri: shot.uri,
        fileName,
      });
    } catch (error) {
      console.warn("[CaptureSession] shutter failed", error);
      Alert.alert("Camera", "Could not take photo. Try again.");
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  }, []);

  const handleDone = useCallback(() => {
    if (isCapturingRef.current) {
      return;
    }
    selectAllSessionCamera();
    goToHybridLibrary();
  }, [goToHybridLibrary, selectAllSessionCamera]);

  const handleLibraryPeek = useCallback(() => {
    if (isCapturingRef.current) {
      return;
    }
    goToHybridLibrary();
  }, [goToHybridLibrary]);

  const handleRequestCamera = useCallback(async () => {
    const next = await requestCameraPermission();
    setPermission(next);
  }, []);

  const applyZoom = useCallback((next: number) => {
    zoomRef.current = next;
    setZoom(next);
  }, []);

  const beginPinchZoom = useCallback(() => {
    pinchStartRef.current = zoomRef.current;
  }, []);

  const updatePinchZoom = useCallback((scale: number) => {
    applyZoom(cameraZoomAfterPinch(pinchStartRef.current, scale));
  }, [applyZoom]);

  const pinchZoom = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          runOnJS(beginPinchZoom)();
        })
        .onUpdate((event) => {
          runOnJS(updatePinchZoom)(event.scale);
        }),
    [beginPinchZoom, updatePinchZoom],
  );

  if (cameraNativeError || cameraUnavailable) {
    return (
      <View
        style={[
          styles.centered,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Text style={styles.permTitle}>
          {cameraUnavailable ? "No camera on this device" : "Camera module unavailable"}
        </Text>
        <Text style={styles.permBody}>
          {cameraUnavailable
            ? "Use the photo library to attach jobsite photos."
            : cameraNativeError}
        </Text>
        <Pressable
          testID="capture-session__open_library_fallback"
          onPress={openLibraryOnly}
          style={styles.permButton}
        >
          <Text style={styles.permButtonText}>Choose from library</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.cancelLink}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (permission && !permission.granted) {
    return (
      <View
        style={[
          styles.centered,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permBody}>
          Allow camera to capture jobsite photos in this module.
        </Text>
        <Pressable
          testID="capture-session__request_camera"
          onPress={() => {
            void handleRequestCamera();
          }}
          style={styles.permButton}
        >
          <Text style={styles.permButtonText}>Allow Camera</Text>
        </Pressable>
        <Pressable
          testID="capture-session__open_library_fallback"
          onPress={openLibraryOnly}
          style={styles.permButtonSecondary}
        >
          <Text style={styles.permButtonSecondaryText}>Choose from library</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.cancelLink}>
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  const cameraReady = Boolean(permission?.granted);

  return (
    <View style={styles.root} testID="capture-session__camera">
      {cameraReady ? (
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        mode="picture"
        zoom={zoom}
        onMountError={(event) => {
          const message =
            event?.message ||
            "CameraView failed to mount. Native rebuild may be required.";
          console.error("[CaptureSession] CameraView onMountError", message);
          setCameraNativeError(message);
          skipToLibraryOnce();
        }}
      />
      ) : null}

      {cameraReady ? (
        <GestureDetector gesture={pinchZoom}>
          <View
            testID="capture-session__zoom_surface"
            collapsable={false}
            style={[
              styles.zoomSurface,
              {
                top: insets.top + 56,
                bottom: insets.bottom + 156,
              },
            ]}
          />
        </GestureDetector>
      ) : null}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          testID="capture-session__cancel"
          onPress={onCancel}
          hitSlop={12}
          style={styles.iconHit}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>
          {sessionCount > 0 ? `${sessionCount} taken` : "Camera"}
        </Text>
        <Pressable
          testID="capture-session__done"
          onPress={handleDone}
          disabled={isCapturing}
          hitSlop={12}
          style={[styles.doneHit, isCapturing && styles.shutterDisabled]}
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      {sessionCount > 0 ? (
        <View style={[styles.sessionStrip, { bottom: insets.bottom + 156 }]}>
          {photos
            .filter((p) => p.source === "camera")
            .slice(-6)
            .map((p) => (
              <ExpoImage
                key={`${p.id}:${p.uri}`}
                source={{ uri: p.uri }}
                recyclingKey={`${p.id}:${p.uri}`}
                cachePolicy="memory-disk"
                contentFit="cover"
                transition={0}
                style={styles.sessionThumb}
              />
            ))}
        </View>
      ) : null}

      {cameraReady ? (
        <View
          style={[styles.zoomPills, { bottom: insets.bottom + 100 }]}
          pointerEvents="box-none"
        >
          <Pressable
            testID="capture-session__zoom_1x"
            onPress={() => applyZoom(cameraZoomPreset("1x"))}
            disabled={isCapturing}
            style={[
              styles.zoomPill,
              isCameraZoom1x(zoom) && styles.zoomPillActive,
              isCapturing && styles.shutterDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Zoom 1x"
          >
            <Text
              style={[
                styles.zoomPillText,
                isCameraZoom1x(zoom) && styles.zoomPillTextActive,
              ]}
            >
              1×
            </Text>
          </Pressable>
          <Pressable
            testID="capture-session__zoom_2x"
            onPress={() => applyZoom(cameraZoomPreset("2x"))}
            disabled={isCapturing}
            style={[
              styles.zoomPill,
              !isCameraZoom1x(zoom) && styles.zoomPillActive,
              isCapturing && styles.shutterDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Zoom 2x"
          >
            <Text
              style={[
                styles.zoomPillText,
                !isCameraZoom1x(zoom) && styles.zoomPillTextActive,
              ]}
            >
              2×
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <Pressable
          testID="capture-session__library_peek"
          onPress={handleLibraryPeek}
          disabled={isCapturing}
          style={[styles.libraryPeek, isCapturing && styles.shutterDisabled]}
          accessibilityLabel="Choose from library"
        >
          {libraryThumbUri ? (
            <Image
              source={{ uri: libraryThumbUri }}
              resizeMode="cover"
              style={styles.libraryThumb}
            />
          ) : (
            <View style={[styles.libraryThumb, styles.libraryThumbEmpty]}>
              <Ionicons name="images-outline" size={22} color="#fff" />
            </View>
          )}
        </Pressable>

        <Pressable
          testID="capture-session__shutter"
          onPress={handleShutter}
          disabled={isCapturing || !cameraReady}
          style={[styles.shutterOuter, (isCapturing || !cameraReady) && styles.shutterDisabled]}
        >
          <View style={styles.shutterInner} />
        </Pressable>

        <View style={styles.libraryPeekSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  permTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  permBody: {
    color: "#ccc",
    textAlign: "center",
    marginBottom: 20,
  },
  permButton: {
    backgroundColor: "#08576E",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  permButtonSecondary: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  permButtonSecondaryText: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelLink: {
    marginTop: 16,
  },
  cancelLinkText: {
    color: "#aaa",
  },
  zoomSurface: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
  },
  zoomPills: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    zIndex: 2,
  },
  zoomPill: {
    minWidth: 52,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomPillActive: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "#fff",
  },
  zoomPillText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  zoomPillTextActive: {
    color: "#111",
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 2,
  },
  iconHit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  doneHit: {
    minWidth: 44,
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  doneText: {
    color: "#7DD3E8",
    fontSize: 17,
    fontWeight: "700",
  },
  sessionStrip: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
    zIndex: 2,
  },
  sessionThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    zIndex: 2,
  },
  libraryPeek: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
  },
  libraryThumb: {
    width: "100%",
    height: "100%",
  },
  libraryThumbEmpty: {
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  libraryPeekSpacer: {
    width: 56,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#fff",
  },
  shutterDisabled: {
    opacity: 0.5,
  },
});
