import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import ReportsOverviewHero from "../components/reports/ReportsOverviewHero";
import type {
  ReportsStatisticCard,
  ReportsVisibleTaskRow,
} from "../ui/contracts/viewAdapters";
import { useReportsViewAdapter } from "../ui/viewAdapters/useReportsViewAdapter";
import StandardHeader from "../components/StandardHeader";
import ScreenSection from "../components/ui/ScreenSection";
import { cn } from "../utils/cn";
import { useTranslation } from "../utils/useTranslation";

interface ReportsScreenProps {
  onNavigateBack: () => void;
}

function getStatusStyles(statusTone: ReportsVisibleTaskRow["statusTone"]): string {
  switch (statusTone) {
    case "success":
      return "bg-green-100 text-green-700";
    case "info":
      return "bg-blue-100 text-blue-700";
    case "danger":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function StatCard({ card }: { card: ReportsStatisticCard }) {
  return (
    <View className={cn("flex-1 p-4 rounded-xl mr-3 mb-3", card.color)}>
      <View className="flex-row items-center justify-between mb-2">
        <Ionicons name={card.icon as any} size={20} color="#6b7280" />
        <Text className={cn("text-2xl font-bold", card.textColor)}>{card.value}</Text>
      </View>
      <Text className="text-base text-gray-600">{card.label}</Text>
    </View>
  );
}

function TaskRow({ row }: { row: ReportsVisibleTaskRow }) {
  return (
    <View className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="font-medium text-gray-900 flex-1" numberOfLines={1}>
          {row.title}
        </Text>
        <Text className={cn("text-sm px-2 py-1 rounded capitalize", getStatusStyles(row.statusTone))}>
          {row.statusLabel}
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-500">{row.dueDateLabel}</Text>
        <Text className="text-sm text-gray-500">{row.completionLabel}</Text>
      </View>
    </View>
  );
}

export default function ReportsScreen({ onNavigateBack }: ReportsScreenProps) {
  const t = useTranslation();
  const { output, actions } = useReportsViewAdapter();
  const heroSummaryLabel = `${output.totalVisibleTaskCount} ${t.tasks.tasksPlural} in the current preview`;
  const heroDateRangeLabel = `${output.dateRange.fromLabel} • ${output.dateRange.toLabel}`;

  if (!output.readiness.hasUsableData) {
    return null;
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Standard Header */}
      <StandardHeader 
        title={t.nav.reports}
        showBackButton={true}
        onBackPress={onNavigateBack}
        rightElement={
          <Pressable
            onPress={actions.generateReportSummary}
            className="px-4 py-2 bg-blue-600 rounded-lg"
          >
            <Text className="text-white font-medium">{t.common.done}</Text>
          </Pressable>
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="py-4">
          <ReportsOverviewHero
            title={t.nav.reports}
            summaryLabel={heroSummaryLabel}
            dateRangeLabel={heroDateRangeLabel}
          />

          <ScreenSection
            title={t.reports.reportConfiguration}
            subtitle="Set the report type and reporting window before generating a summary."
          >
            <View className="rounded-2xl border border-gray-200 bg-white p-4">
              <View className="mb-4">
                <Text className="mb-2 text-base font-medium text-gray-700">
                  {t.reports.reportType}
                </Text>
                <View className="flex-row space-x-2">
                  {output.reportTypeOptions
                    .filter((option) => option.isVisible)
                    .map((option) => (
                      <Pressable
                        key={option.id}
                        onPress={() => actions.selectReportType(option.value)}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2",
                          option.isSelected
                            ? "border-blue-300 bg-blue-50"
                            : "border-gray-300 bg-gray-50",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-center font-medium",
                            option.isSelected ? "text-blue-700" : "text-gray-700",
                          )}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              </View>

              <View>
                <Text className="mb-2 text-base font-medium text-gray-700">
                  {t.reports.dateRange}
                </Text>
                <View className="flex-row space-x-2">
                  <Pressable
                    onPress={actions.openFromDatePicker}
                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2"
                  >
                    <Text className="text-center text-gray-900">{output.dateRange.fromLabel}</Text>
                  </Pressable>
                  <Pressable
                    onPress={actions.openToDatePicker}
                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2"
                  >
                    <Text className="text-center text-gray-900">{output.dateRange.toLabel}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScreenSection>

          <ScreenSection
            title={t.reports.statisticsOverview}
            subtitle="Review the aggregate outcomes for the selected report settings."
          >
            <View className="rounded-2xl border border-gray-200 bg-white p-4">
              <View className="flex-row flex-wrap -mr-3">
                {output.statisticsCards.map((card) => (
                  <StatCard key={card.id} card={card} />
                ))}
              </View>
            </View>
          </ScreenSection>

          <ScreenSection
            title={t.reports.taskPreview}
            subtitle={`${output.totalVisibleTaskCount} ${t.tasks.tasksPlural} currently visible`}
            className="mb-0"
          >
            <View className="rounded-2xl border border-gray-200 bg-white p-4">
              {output.visibleTaskRows.length > 0 ? (
                <View>
                  {output.visibleTaskRows.map((row) => (
                    <TaskRow key={row.id} row={row} />
                  ))}
                  {output.hiddenTaskCount > 0 && (
                    <Text className="mt-2 text-center text-base text-gray-500">
                      + {output.hiddenTaskCount} {t.reports.moreTasksInReport}
                    </Text>
                  )}
                </View>
              ) : (
                <View className="items-center py-8">
                  <Ionicons name="document-outline" size={48} color="#d1d5db" />
                  <Text className="mt-2 text-gray-500">{t.reports.noTasksFound}</Text>
                  <Text className="mt-1 text-center text-base text-gray-400">
                    {t.reports.adjustDateRange}
                  </Text>
                </View>
              )}
            </View>
          </ScreenSection>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {output.dateRange.isShowingFromPicker && (
        <DateTimePicker
          value={output.dateRange.from}
          mode="date"
          display="default"
          maximumDate={output.dateRange.to}
          onChange={(_event, selectedDate) => actions.setFromDate(selectedDate)}
        />
      )}

      {output.dateRange.isShowingToPicker && (
        <DateTimePicker
          value={output.dateRange.to}
          mode="date"
          display="default"
          minimumDate={output.dateRange.from}
          maximumDate={new Date()}
          onChange={(_event, selectedDate) => actions.setToDate(selectedDate)}
        />
      )}
    </SafeAreaView>
  );
}
