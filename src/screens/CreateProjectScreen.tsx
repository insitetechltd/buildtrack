import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import StandardHeader from "../components/StandardHeader";
import ProjectForm from "../components/ProjectForm";
import {
  useCreateProjectViewAdapter,
  type CreateProjectViewAdapterProps,
} from "../ui/viewAdapters/useCreateProjectViewAdapter";

type CreateProjectScreenProps = CreateProjectViewAdapterProps;

export default function CreateProjectScreen({ onNavigateBack }: CreateProjectScreenProps) {
  const { output, actions } = useCreateProjectViewAdapter({ onNavigateBack });

  if (!output.readiness.hasUsableData) {
    return null;
  }

  if (!output.access.isAllowed) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-gray-500 text-center">
            {output.access.deniedMessage || "Access denied."}
          </Text>
          <Pressable onPress={actions.cancel} className="mt-4 px-4 py-2 bg-blue-600 rounded-lg">
            <Text className="text-white font-medium">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <StandardHeader
        title={output.headerTitle}
        showBackButton={true}
        onBackPress={actions.cancel}
      />

      {output.companyBanner ? (
        <View className="mx-4 mt-4 rounded-xl overflow-hidden border border-gray-200 bg-white">
          <View
            className="px-4 py-3"
            style={{ backgroundColor: output.companyBanner.backgroundColor }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: output.companyBanner.textColor }}
            >
              {output.companyBanner.text || "Company banner active"}
            </Text>
          </View>
        </View>
      ) : output.headerSubtitle ? (
        <View className="mx-4 mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <Text className="text-sm text-gray-600">{output.headerSubtitle}</Text>
        </View>
      ) : null}

      <ProjectForm
        mode="create"
        onSubmit={(formData) =>
          output.canSubmit ? actions.submitProject(formData) : Promise.resolve()
        }
        onCancel={actions.cancel}
        submitButtonText={output.submitButtonText}
        isSubmitting={output.isSubmitting}
      />
    </SafeAreaView>
  );
}
