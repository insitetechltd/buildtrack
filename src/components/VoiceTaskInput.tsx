/*
 * Voice Task Input Component
 * Provides voice recording interface for task creation/updates
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// Temporarily disabled due to CMake build issues with expo-av
// import { Audio } from "expo-av";
import { useTranslation } from "../utils/useTranslation";
import { cn } from "../utils/cn";

export type Language = "en" | "zh" | "yue";

interface VoiceTaskInputProps {
  onTranscriptionComplete: (text: string, language: Language) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  defaultLanguage?: Language;
}

export default function VoiceTaskInput({
  onTranscriptionComplete,
  onError,
  disabled = false,
  defaultLanguage = "en",
}: VoiceTaskInputProps) {
  const t = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  // Temporarily disabled due to CMake build issues with expo-av
  const [recording, setRecording] = useState<any>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request audio permissions on mount
  // Temporarily disabled due to CMake build issues with expo-av
  useEffect(() => {
    // (async () => {
    //   try {
    //     const { status } = await Audio.requestPermissionsAsync();
    //     if (status !== "granted") {
    //       Alert.alert(
    //         t.voiceInput.permissionDenied,
    //         t.voiceInput.microphonePermissionRequired
    //       );
    //     }
    //   } catch (error) {
    //     console.error("Error requesting audio permissions:", error);
    //   }
    // })();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Temporarily disabled due to CMake build issues with expo-av
      // if (recording) {
      //   stopRecording();
      // }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [recording]);

  const startRecording = async () => {
    // Temporarily disabled due to CMake build issues with expo-av
    Alert.alert(
      t.voiceInput.error || "Feature Unavailable",
      "Voice input is temporarily disabled due to build configuration issues. Please use text input instead."
    );
    return;
    
    // try {
    //   // Request permissions again (in case they were denied)
    //   const { status } = await Audio.requestPermissionsAsync();
    //   if (status !== "granted") {
    //     Alert.alert(
    //       t.voiceInput.permissionDenied,
    //       t.voiceInput.microphonePermissionRequired
    //     );
    //     return;
    //   }

    //   // Configure audio mode
    //   await Audio.setAudioModeAsync({
    //     allowsRecordingIOS: true,
    //     playsInSilentModeIOS: true,
    //   });

    //   // Start recording
    //   const { recording: newRecording } = await Audio.Recording.createAsync(
    //     Audio.RecordingOptionsPresets.HIGH_QUALITY
    //   );

    //   setRecording(newRecording);
    //   setIsRecording(true);
    //   setRecordingDuration(0);

    //   // Start duration timer
    //   durationIntervalRef.current = setInterval(() => {
    //     setRecordingDuration((prev) => prev + 1);
    //   }, 1000);
    // } catch (error) {
    //   console.error("Failed to start recording:", error);
    //   const errorMessage =
    //     error instanceof Error
    //       ? error.message
    //       : t.voiceInput.failedToStartRecording;
    //   onError?.(errorMessage);
    //   Alert.alert(t.voiceInput.error, errorMessage);
    // }
  };

  const stopRecording = async () => {
    // Temporarily disabled due to CMake build issues with expo-av
    return;
    
    // if (!recording) return;

    // try {
    //   setIsRecording(false);
    //   if (durationIntervalRef.current) {
    //     clearInterval(durationIntervalRef.current);
    //     durationIntervalRef.current = null;
    //   }

    //   await recording.stopAndUnloadAsync();
    //   const uri = recording.getURI();

    //   if (!uri) {
    //     throw new Error("No recording URI available");
    //   }

    //   // Reset recording state
    //   setRecording(null);
    //   setRecordingDuration(0);

    //   // Pass the audio URI to parent for transcription
    //   onTranscriptionComplete(uri, language);
    // } catch (error) {
    //   console.error("Failed to stop recording:", error);
    //   const errorMessage =
    //     error instanceof Error
    //       ? error.message
    //       : t.voiceInput.failedToStopRecording;
    //   onError?.(errorMessage);
    //   Alert.alert(t.voiceInput.error, errorMessage);
    // }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleLanguage = () => {
    // Cycle through: en -> zh -> yue -> en
    const languages: Language[] = ["en", "zh", "yue"];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex]);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getLanguageLabel = (lang: Language): string => {
    switch (lang) {
      case "en":
        return "English";
      case "zh":
        return "中文";
      case "yue":
        return "粵語";
      default:
        return "English";
    }
  };

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-semibold text-gray-700">
          {t.voiceInput.title}
        </Text>
        <Pressable
          onPress={toggleLanguage}
          disabled={disabled || isRecording}
          className={cn(
            "px-3 py-1 rounded-md border",
            disabled || isRecording
              ? "bg-gray-100 border-gray-300"
              : "bg-white border-gray-300 active:bg-gray-50"
          )}
        >
          <Text className="text-sm text-gray-700">{getLanguageLabel(language)}</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={toggleRecording}
          disabled={disabled}
          className={cn(
            "flex-row items-center justify-center px-4 py-3 rounded-lg",
            isRecording
              ? "bg-red-500 active:bg-red-600"
              : "bg-blue-500 active:bg-blue-600",
            disabled && "opacity-50"
          )}
        >
          {isRecording ? (
            <>
              <Ionicons name="stop-circle" size={24} color="white" />
              <Text className="text-white font-semibold ml-2">
                {t.voiceInput.stopRecording}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="mic" size={24} color="white" />
              <Text className="text-white font-semibold ml-2">
                {t.voiceInput.startRecording}
              </Text>
            </>
          )}
        </Pressable>

        {isRecording && (
          <View className="flex-1 flex-row items-center">
            <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
            <Text className="text-gray-600 font-mono">
              {formatDuration(recordingDuration)}
            </Text>
          </View>
        )}
      </View>

      {isRecording && (
        <Text className="text-sm text-gray-500 mt-2">
          {t.voiceInput.recordingHint}
        </Text>
      )}
    </View>
  );
}

