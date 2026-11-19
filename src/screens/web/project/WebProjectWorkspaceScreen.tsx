import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigate, useParams } from "react-router-dom";

import { WebFormCard } from "@/components/web/WebFormCard";
import type { ProjectStatus } from "@/types/buildtrack";
import { cn } from "@/utils/cn";
import {
  archiveCompanyProject,
  updateCompanyProject,
} from "@/web/data/projectMutations";
import {
  loadProjectWorkspace,
  type WebProjectWorkspaceDetail,
  type WebProjectWorkspaceKpis,
} from "@/web/data/projectWorkspace";

function statusToneClass(tone: WebProjectWorkspaceDetail["statusTone"]): string {
  switch (tone) {
    case "success":
      return "bg-green-50 text-green-600";
    case "info":
      return "bg-blue-50 text-blue-600";
    case "danger":
      return "bg-red-50 text-red-600";
    case "warning":
      return "bg-yellow-50 text-yellow-600";
    default:
      return "bg-gray-50 text-gray-600";
  }
}

function KpiCard({
  label,
  value,
  testID,
  onPress,
}: {
  label: string;
  value: number;
  testID: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className="mb-3 mr-3 min-w-[140px] flex-1 rounded-2xl border border-[#D6E9EE] bg-white p-4"
    >
      <Text className="text-[28px] font-bold text-[#07111E]">{value}</Text>
      <Text className="mt-1 text-[13px] font-semibold text-[#577783]">{label}</Text>
    </Pressable>
  );
}

function MetaRow({
  icon,
  label,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  testID?: string;
}) {
  return (
    <View className="mb-2 mr-4 min-w-[140px] flex-1 flex-row items-center">
      <Ionicons name={icon} size={14} color="#6b7280" />
      <Text testID={testID} className="ml-1 flex-1 text-sm text-gray-500" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function WebProjectWorkspaceScreen() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<WebProjectWorkspaceKpis | null>(null);
  const [detail, setDetail] = useState<WebProjectWorkspaceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [clientName, setClientName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadProjectWorkspace(projectId);
    setKpis(result.kpis);
    setDetail(result.detail);
    setError(result.error);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openEdit = () => {
    if (!detail) return;
    setName(detail.name);
    setDescription(detail.description || "");
    setLocation(detail.location || "");
    setClientName(detail.clientName || "");
    setStatus(detail.status);
    setFormError(null);
    setEditing(true);
  };

  const saveEdit = async () => {
    setBusy(true);
    setFormError(null);
    const result = await updateCompanyProject(projectId, {
      name,
      description,
      location,
      clientName,
      status,
    });
    setBusy(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setEditing(false);
    await reload();
  };

  const archive = async () => {
    setBusy(true);
    setFormError(null);
    const result = await archiveCompanyProject(projectId);
    setBusy(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setEditing(false);
    await reload();
  };

  return (
    <ScrollView testID="web-project-workspace" className="flex-1">
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="mb-1 text-[22px] font-bold text-[#07111E]">Workspace</Text>
          <Text className="text-[13px] text-[#577783]">
            {detail?.name ?? kpis?.projectName ?? "Project"} · health + details
          </Text>
        </View>
        {detail ? (
          <Pressable
            testID="web-workspace__edit"
            onPress={openEdit}
            className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50"
          >
            <Ionicons name="pencil" size={16} color="#3b82f6" />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#12A8E0" />
      ) : error ? (
        <Text testID="web-project-workspace-error" className="text-[#DC2626]">
          {error}
        </Text>
      ) : (
        <>
          {editing ? (
            <WebFormCard
              testID="web-workspace__editor"
              title="Edit project"
              fields={[
                { key: "name", label: "Name", value: name, placeholder: "Project name" },
                {
                  key: "description",
                  label: "Description",
                  value: description,
                  multiline: true,
                },
                { key: "location", label: "Location", value: location },
                { key: "clientName", label: "Client", value: clientName },
              ]}
              onChange={(key, value) => {
                if (key === "name") setName(value);
                if (key === "description") setDescription(value);
                if (key === "location") setLocation(value);
                if (key === "clientName") setClientName(value);
              }}
              extra={
                <View className="mb-2">
                  <Text className="mb-2 text-xs font-semibold text-[#577783]">Status</Text>
                  <View className="mb-2 flex-row flex-wrap" style={{ gap: 8 }}>
                    {(
                      ["planning", "active", "completed", "cancelled"] as ProjectStatus[]
                    ).map((s) => (
                      <Pressable
                        key={s}
                        testID={`web-workspace__status_${s}`}
                        onPress={() => setStatus(s)}
                        className={`rounded-full border px-3 py-1.5 ${
                          status === s
                            ? "border-[#07111E] bg-[#07111E]"
                            : "border-[#D6E9EE] bg-white"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            status === s ? "text-white" : "text-[#07111E]"
                          }`}
                        >
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    testID="web-workspace__archive"
                    onPress={() => void archive()}
                    className="mb-2 self-start rounded-full border border-[#FECACA] px-3 py-1.5"
                  >
                    <Text className="text-xs font-bold text-[#B91C1C]">
                      Archive (set cancelled)
                    </Text>
                  </Pressable>
                </View>
              }
              onCancel={() => setEditing(false)}
              onSubmit={() => void saveEdit()}
              busy={busy}
              error={formError}
              submitLabel="Save"
            />
          ) : null}

          {detail ? (
            <View
              testID="web-workspace__meta"
              className="mb-4 rounded-xl border border-[#D6E9EE] bg-white p-4"
            >
              <View className="mb-3 flex-row items-start justify-between">
                <View className="min-w-0 flex-1 pr-3">
                  <Text className="mb-1 text-xl font-bold text-gray-900" numberOfLines={2}>
                    {detail.name}
                  </Text>
                  <Text className="text-base text-gray-600" numberOfLines={3}>
                    {detail.description || "No description"}
                  </Text>
                </View>
                <View
                  className={cn(
                    "rounded-full px-3 py-1",
                    statusToneClass(detail.statusTone),
                  )}
                >
                  <Text className="text-sm font-medium">{detail.statusLabel}</Text>
                </View>
              </View>

              {detail.leadPmName ? (
                <View className="mb-3 flex-row items-center rounded-lg border border-purple-200 bg-purple-50 px-2 py-1">
                  <Ionicons name="star" size={12} color="#7c3aed" />
                  <Text className="ml-1 text-sm font-medium text-purple-700">
                    Lead PM: {detail.leadPmName}
                  </Text>
                </View>
              ) : null}

              <View className="mb-1 flex-row flex-wrap">
                <MetaRow
                  icon="location-outline"
                  label={detail.location || "No location"}
                  testID="web-workspace__meta_location"
                />
                <MetaRow
                  icon="people-outline"
                  label={`${detail.memberCountLabel} · ${detail.taskCountLabel}`}
                  testID="web-workspace__meta_counts"
                />
              </View>
              <View className="mb-1 flex-row flex-wrap">
                <MetaRow
                  icon="business-outline"
                  label={detail.clientName || "—"}
                  testID="web-workspace__meta_client"
                />
                <MetaRow
                  icon="calendar-outline"
                  label={detail.startDateLabel}
                  testID="web-workspace__meta_start"
                />
              </View>
              {detail.budgetLabel || detail.createdByName ? (
                <View className="mt-1 flex-row flex-wrap">
                  {detail.budgetLabel ? (
                    <MetaRow icon="cash-outline" label={detail.budgetLabel} />
                  ) : null}
                  {detail.createdByName ? (
                    <MetaRow
                      icon="person-outline"
                      label={`Created by ${detail.createdByName}`}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {kpis ? (
            <View className="flex-row flex-wrap">
              <KpiCard
                testID="web-workspace-kpi-open"
                label="Open tasks"
                value={kpis.openTasks}
                onPress={() => navigate(`/p/${projectId}/tasks`)}
              />
              <KpiCard
                testID="web-workspace-kpi-doing"
                label="Active"
                value={kpis.doing}
                onPress={() => navigate(`/p/${projectId}/tasks`)}
              />
              <KpiCard
                testID="web-workspace-kpi-review"
                label="In review"
                value={kpis.inReview}
                onPress={() => navigate(`/p/${projectId}/tasks`)}
              />
              <KpiCard
                testID="web-workspace-kpi-overdue"
                label="Overdue"
                value={kpis.overdue}
                onPress={() => navigate(`/p/${projectId}/tasks`)}
              />
              <KpiCard
                testID="web-workspace-kpi-members"
                label="Team members"
                value={kpis.members}
                onPress={() => navigate(`/p/${projectId}/team`)}
              />
              <KpiCard
                testID="web-workspace-kpi-pa"
                label="Project admins"
                value={kpis.projectAdmins}
                onPress={() => navigate(`/p/${projectId}/team`)}
              />
            </View>
          ) : null}
        </>
      )}
      <View className="h-8" />
    </ScrollView>
  );
}
