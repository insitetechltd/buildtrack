import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigate } from "react-router-dom";

import { WebFormCard } from "@/components/web/WebFormCard";
import { ProjectsScreenFilterChips } from "@/screens/projects/ProjectsScreenFilterChips";
import { ProjectsScreenProjectCard } from "@/screens/projects/ProjectsScreenProjectCard";
import { useAuthStore } from "@/state/authStore";
import type { ProjectStatus } from "@/types/buildtrack";
import type { ProjectsScreenFilterOption } from "@/ui/contracts/viewAdapters";
import {
  loadCompanyProjects,
  type WebCompanyProjectRow,
} from "@/web/data/companyDesk";
import { createCompanyProject } from "@/web/data/projectMutations";
import {
  filterWebProjects,
  toProjectsScreenItem,
  type WebProjectsStatusFilter,
} from "@/web/projects/webProjectPresentation";

export function WebProjectsScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId ?? "";
  const [rows, setRows] = useState<WebCompanyProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WebProjectsStatusFilter>("all");
  const [creating, setCreating] = useState(false);
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
    const result = await loadCompanyProjects(companyId);
    setRows(result.projects);
    setError(result.error);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(
    () => filterWebProjects(rows, searchQuery, statusFilter),
    [rows, searchQuery, statusFilter],
  );

  const filterOptions: ProjectsScreenFilterOption[] = useMemo(
    () =>
      (
        [
          ["all", "All"],
          ["active", "On-going"],
          ["planning", "Planning"],
          ["completed", "Completed"],
          ["cancelled", "Cancelled"],
        ] as const
      ).map(([value, label]) => ({
        id: `web-projects-filter:${value}`,
        value: value as ProjectStatus | "all",
        label,
        isSelected: statusFilter === value,
      })),
    [statusFilter],
  );

  const projectItems = useMemo(
    () => visible.map((project) => toProjectsScreenItem(project, { canEdit: false })),
    [visible],
  );

  const openCreate = () => {
    setCreating(true);
    setName("");
    setDescription("");
    setLocation("");
    setClientName("");
    setStatus("active");
    setFormError(null);
  };

  const submitCreate = async () => {
    setBusy(true);
    setFormError(null);
    const result = await createCompanyProject({
      companyId,
      createdBy: user?.id || "",
      name,
      description,
      location,
      clientName,
      status,
    });
    setBusy(false);
    if (result.error || !result.id) {
      setFormError(result.error || "Create failed");
      return;
    }
    setCreating(false);
    await reload();
    navigate(`/p/${result.id}/workspace`);
  };

  return (
    <View testID="web-projects" className="flex-1">
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="mb-1 text-[22px] font-bold text-[#07111E]">Projects</Text>
          <Text className="mb-1 text-[13px] text-[#577783]">
            {visible.length} shown
            {visible.length !== rows.length ? ` of ${rows.length}` : ""} · open a card for
            Workspace (edit there)
          </Text>
        </View>
        <Pressable
          testID="web-projects__create_open"
          onPress={openCreate}
          className="rounded-full bg-[#0D6E87] px-4 py-2.5"
        >
          <Text className="text-sm font-bold text-white">New project</Text>
        </Pressable>
      </View>

      {creating ? (
        <WebFormCard
          testID="web-projects__editor"
          title="Create project"
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
                {(["planning", "active", "completed", "cancelled"] as ProjectStatus[]).map(
                  (s) => (
                    <Pressable
                      key={s}
                      testID={`web-projects__status_${s}`}
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
                  ),
                )}
              </View>
            </View>
          }
          onCancel={() => setCreating(false)}
          onSubmit={() => void submitCreate()}
          busy={busy}
          error={formError}
          submitLabel="Create"
        />
      ) : null}

      <View className="mb-3 rounded-xl border border-[#D6E9EE] bg-white px-3 py-2">
        <View className="flex-row items-center">
          <Ionicons name="search-outline" size={20} color="#6b7280" />
          <TextInput
            testID="web-projects__search"
            className="ml-2 flex-1 py-2 text-[15px] text-[#07111E]"
            placeholder="Search projects"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Text
            testID="web-projects__search_count"
            className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-medium text-slate-700"
          >
            {visible.length}
          </Text>
        </View>
      </View>

      <View className="-mx-1 mb-2 overflow-hidden rounded-xl border border-[#D6E9EE] bg-white">
        <ProjectsScreenFilterChips
          options={filterOptions}
          onSelect={(value) => setStatusFilter(value)}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#12A8E0" />
      ) : error ? (
        <Text testID="web-projects-error" className="mt-3 text-[#DC2626]">
          {error}
        </Text>
      ) : (
        <ScrollView testID="web-projects__list" className="flex-1" showsVerticalScrollIndicator>
          {projectItems.length === 0 ? (
            <Text className="mt-3 text-[#577783]">No projects match these filters.</Text>
          ) : (
            projectItems.map((project) => (
              <View key={project.projectId} testID={`web-project-row-${project.projectId}`}>
                <ProjectsScreenProjectCard
                  project={project}
                  leadPmLabel="Lead PM"
                  createdByLabelPrefix="Created by"
                  onPress={(id) => navigate(`/p/${id}/workspace`)}
                  onEdit={() => {
                    /* Edit lives on Workspace */
                  }}
                />
              </View>
            ))
          )}
          <View className="h-8" />
        </ScrollView>
      )}

      <Pressable
        testID="web-projects__goto_users"
        onPress={() => navigate("/a/users")}
        className="mt-1 self-start"
      >
        <Text className="text-[13px] font-semibold text-[#12A8E0]">Company users →</Text>
      </Pressable>
    </View>
  );
}
