/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom audio transcription service that uses a custom API endpoint maintained by Vibecode.
You can use this function to transcribe audio files, and it will return the text of the audio file.
*/

/**
 * Transcribe an audio file
 * @param localAudioUri - The local URI of the audio file to transcribe. Obtained via the expo-av library.
 * @param language - Language code for transcription. Supports "en" (English), "zh" (Chinese/Cantonese), or "yue" (Cantonese). Defaults to "en".
 * @returns The text of the audio file
 */
export const transcribeAudio = async (localAudioUri: string, language: "en" | "zh" | "yue" = "en") => {
  try {
    // Create FormData for the audio file
    const formData = new FormData();
    formData.append("file", {
      uri: localAudioUri,
      type: "audio/m4a",
      name: "recording.m4a",
    } as any);
    formData.append("model", "gpt-4o-transcribe");
    
    // Map language codes: "yue" (Cantonese) and "zh" both map to "zh" for OpenAI
    // OpenAI's transcription API uses "zh" for Chinese (which includes Cantonese)
    const openAILanguage = language === "yue" ? "zh" : language;
    formData.append("language", openAILanguage);

    const OPENAI_API_KEY = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    // API call to OpenAI's gpt-4o-transcribe
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};
