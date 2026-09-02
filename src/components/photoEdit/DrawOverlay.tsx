import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Polyline } from "react-native-svg";
import { runOnJS } from "react-native-reanimated";

import { getContainedImageLayout, resolveImageDimensions } from "../../utils/photoPreviewEdit";
import {
  DRAW_COLORS,
  DRAW_SCREEN_STROKE_WIDTH,
  mapScreenPointToSource,
  mapSourcePointToScreen,
  pointsToSvgPolyline,
  screenStrokeWidthToSource,
  type DrawColor,
  type DrawPoint,
  type DrawStroke,
} from "../../utils/photoPreviewDraw";

type DrawOverlayProps = {
  uri: string;
  containerWidth: number;
  containerHeight: number;
  color: DrawColor;
  strokes: DrawStroke[];
  onCommitStroke: (stroke: DrawStroke) => void;
  disabled?: boolean;
};

export function DrawOverlay({
  uri,
  containerWidth,
  containerHeight,
  color,
  strokes,
  onCommitStroke,
  disabled = false,
}: DrawOverlayProps) {
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [activePoints, setActivePoints] = useState<DrawPoint[]>([]);
  const activePointsRef = useRef<DrawPoint[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSourceSize(null);
    setLoadError(false);
    activePointsRef.current = [];
    setActivePoints([]);

    resolveImageDimensions(uri)
      .then((size) => {
        if (!cancelled) {
          setSourceSize(size);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("[DrawOverlay] Failed to get image size for", uri, error);
          setLoadError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const imageLayout = useMemo(() => {
    if (!sourceSize) {
      return null;
    }
    return getContainedImageLayout(
      containerWidth,
      containerHeight,
      sourceSize.width,
      sourceSize.height,
    );
  }, [containerWidth, containerHeight, sourceSize]);

  const sourceStrokeWidth = useMemo(() => {
    if (!imageLayout || !sourceSize) {
      return DRAW_SCREEN_STROKE_WIDTH;
    }
    return screenStrokeWidthToSource(
      DRAW_SCREEN_STROKE_WIDTH,
      imageLayout,
      sourceSize.width,
    );
  }, [imageLayout, sourceSize]);

  const appendPoint = useCallback(
    (screenX: number, screenY: number) => {
      if (!imageLayout || !sourceSize || disabled) {
        return;
      }
      const mapped = mapScreenPointToSource(
        screenX,
        screenY,
        imageLayout,
        sourceSize.width,
        sourceSize.height,
      );
      if (!mapped) {
        return;
      }
      const next = [...activePointsRef.current, mapped];
      activePointsRef.current = next;
      setActivePoints(next);
    },
    [disabled, imageLayout, sourceSize],
  );

  const finishStroke = useCallback(() => {
    const points = activePointsRef.current;
    activePointsRef.current = [];
    setActivePoints([]);
    // Commit outside any setState updater — calling parent setState from an
    // updater triggers "Cannot update PhotoSelectionScreen while rendering DrawOverlay".
    if (!disabled && points.length >= 1) {
      onCommitStroke({
        color,
        width: sourceStrokeWidth,
        points,
      });
    }
  }, [color, disabled, onCommitStroke, sourceStrokeWidth]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(Boolean(imageLayout) && !disabled && !loadError)
        .minDistance(0)
        .onBegin((event) => {
          runOnJS(appendPoint)(event.x, event.y);
        })
        .onChange((event) => {
          runOnJS(appendPoint)(event.x, event.y);
        })
        .onFinalize(() => {
          runOnJS(finishStroke)();
        }),
    [appendPoint, disabled, finishStroke, imageLayout, loadError],
  );

  const screenStrokes = useMemo(() => {
    if (!imageLayout || !sourceSize) {
      return [] as Array<{
        color: string;
        width: number;
        points: string;
        dot?: { x: number; y: number; r: number };
      }>;
    }
    const toScreen = (stroke: DrawStroke) => {
      const screenPts = stroke.points.map((point) =>
        mapSourcePointToScreen(
          point,
          imageLayout,
          sourceSize.width,
          sourceSize.height,
        ),
      );
      return {
        color: stroke.color,
        width: DRAW_SCREEN_STROKE_WIDTH,
        points: pointsToSvgPolyline(screenPts),
        dot:
          screenPts.length === 1
            ? {
                x: screenPts[0].x,
                y: screenPts[0].y,
                r: DRAW_SCREEN_STROKE_WIDTH / 2,
              }
            : undefined,
      };
    };
    const committed = strokes.map(toScreen);
    if (activePoints.length > 0) {
      const activeScreenPts = activePoints.map((point) =>
        mapSourcePointToScreen(
          point,
          imageLayout,
          sourceSize.width,
          sourceSize.height,
        ),
      );
      committed.push({
        color,
        width: DRAW_SCREEN_STROKE_WIDTH,
        points: pointsToSvgPolyline(activeScreenPts),
        dot:
          activeScreenPts.length === 1
            ? {
                x: activeScreenPts[0].x,
                y: activeScreenPts[0].y,
                r: DRAW_SCREEN_STROKE_WIDTH / 2,
              }
            : undefined,
      });
    }
    return committed;
  }, [activePoints, color, imageLayout, sourceSize, strokes]);

  if (!sourceSize && !loadError) {
    return (
      <View
        testID="photo-selection__draw_overlay"
        style={StyleSheet.absoluteFill}
        className="items-center justify-center"
        pointerEvents="none"
      >
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (loadError || !imageLayout) {
    return (
      <View
        testID="photo-selection__draw_overlay"
        style={StyleSheet.absoluteFill}
        className="items-center justify-center bg-black/70"
        pointerEvents="none"
      >
        <Text className="text-white text-center px-6">Could not load image size</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={pan}>
      <View
        testID="photo-selection__draw_overlay"
        style={StyleSheet.absoluteFill}
        collapsable={false}
      >
        <Svg width={containerWidth} height={containerHeight} style={StyleSheet.absoluteFill}>
          {screenStrokes.map((stroke, index) =>
            stroke.dot ? (
              <Circle
                key={`stroke-${index}`}
                cx={stroke.dot.x}
                cy={stroke.dot.y}
                r={stroke.dot.r}
                fill={stroke.color}
              />
            ) : (
              <Polyline
                key={`stroke-${index}`}
                points={stroke.points}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ),
          )}
        </Svg>
      </View>
    </GestureDetector>
  );
}

export { DRAW_COLORS };
