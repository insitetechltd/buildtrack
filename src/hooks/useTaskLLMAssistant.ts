/*
 * React Hook for LLM Task Assistant
 * Manages LLM interaction flow for task creation and updates
 */

import { useState, useCallback } from "react";
import { transcribeAudio } from "../api/transcribe-audio";
import { extractTaskFromText, TaskSuggestion } from "../api/task-llm-service";
import { Task } from "../types/buildtrack";

export interface UseTaskLLMAssistantResult {
  suggestTaskFromText: (text: string, context?: Task) => Promise<TaskSuggestion | null>;
  suggestTaskFromVoice: (audioUri: string, language: "en" | "zh" | "yue", context?: Task) => Promise<TaskSuggestion | null>;
  isLoading: boolean;
  error: string | null;
  lastSuggestion: TaskSuggestion | null;
  clearError: () => void;
  clearSuggestion: () => void;
}

/**
 * Hook for managing LLM task assistant interactions
 */
export function useTaskLLMAssistant(): UseTaskLLMAssistantResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuggestion, setLastSuggestion] = useState<TaskSuggestion | null>(null);

  /**
   * Process text input and extract task information
   */
  const suggestTaskFromText = useCallback(
    async (text: string, context?: Task): Promise<TaskSuggestion | null> => {
      if (!text || text.trim().length === 0) {
        setError("Please provide some text input");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const suggestion = await extractTaskFromText(text.trim(), context);
        setLastSuggestion(suggestion);
        return suggestion;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to process text input";
        console.error("Task LLM assistant error:", err);
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Process voice input: transcribe audio then extract task information
   */
  const suggestTaskFromVoice = useCallback(
    async (
      audioUri: string,
      language: "en" | "zh" | "yue" = "en",
      context?: Task
    ): Promise<TaskSuggestion | null> => {
      if (!audioUri) {
        setError("No audio file provided");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Transcribe audio to text
        console.log(`🎤 Transcribing audio (language: ${language})...`);
        const transcribedText = await transcribeAudio(audioUri, language);
        console.log(`📝 Transcribed text: ${transcribedText}`);

        if (!transcribedText || transcribedText.trim().length === 0) {
          setError("Could not transcribe audio. Please try again.");
          return null;
        }

        // Step 2: Extract task information from transcribed text
        console.log(`🤖 Extracting task information...`);
        const suggestion = await extractTaskFromText(transcribedText.trim(), context);
        setLastSuggestion(suggestion);
        return suggestion;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to process voice input";
        console.error("Voice task assistant error:", err);
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuggestion = useCallback(() => {
    setLastSuggestion(null);
  }, []);

  return {
    suggestTaskFromText,
    suggestTaskFromVoice,
    isLoading,
    error,
    lastSuggestion,
    clearError,
    clearSuggestion,
  };
}




