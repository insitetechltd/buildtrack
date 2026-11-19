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
import { useParams } from "react-router-dom";

import ActivityStyleRowCard from "@/components/cards/ActivityStyleRowCard";
import { WebFormCard } from "@/components/web/WebFormCard";
import { cn } from "@/utils/cn";
import {
  formatDueDate,
  loadProjectMeta,
  loadProjectTasks,
  type WebProjectTaskRow,
} from "@/web/data/projectTasks";
import { loadProjectTeam, type WebProjectMemberRow } from "@/web/data/projectTeam";
import { updateProjectTaskLight } from "@/web/data/taskMutations";
import {
  formatWebTaskStatusLabel,
  formatWebUpdatedLabel,
  isWebTaskOverdue,
  matchesWebStatusFilter,
  sortWebTasks,
  webStatusFilterChipLabel,
  type WebTasksSort,
  type WebTasksStatusFilter,
} from "@/web/tasks/webTaskPresentation";

const LIGHT_STATUS = [
  "new",
  "in_progress",
  "reviewing",
  "completed",
  "cancelled",
] as const;

const STATUS_OPTIONS: { id: WebTasksStatusFilter; label: string; tone?: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New", tone: "blue" },
  { id: "doing", label: "Active", tone: "orange" },
  { id: "review", label: "Review", tone: "purple" },
  { id: "overdue", label: "Overdue", tone: "red" },
];

const SORT_OPTIONS: { id: WebTasksSort; label: string }[] = [
  { id: "updated_desc", label: "Updated · Newest first" },
  { id: "due_asc", label: "Due date · Earliest first" },
];

function chipToneClasses(label: string) {
  if (label.includes("New")) {
    return { container: "border-[#BFDBFE] bg-[#EFF6FF]", text: "text-[#1D4ED8]" };
  }
  if (label.includes("Active")) {
    return { container: "border-[#FED7AA] bg-[#FFF7ED]", text: "text-[#C2410C]" };
  }
  if (label.includes("Review")) {
    return { container: "border-[#E9D5FF] bg-[#FAF5FF]", text: "text-[#7E22CE]" };
  }
  if (label.includes("Overdue")) {
    return { container: "border-[#FECACA] bg-[#FEF2F2]", text: "text-[#B91C1C]" };
  }
  return { container: "border-[#BFE9F0] bg-[#E6F5F8]", text: "text-[#08576E]" };
}

function optionToneSelected(tone?: string) {
  switch (tone) {
    case "blue":
      return "border-[#BFDBFE] bg-[#EFF6FF]";
    case "orange":
      return "border-[#FED7AA] bg-[#FFF7ED]";
    case "purple":
      return "border-[#E9D5FF] bg-[#FAF5FF]";
    case "red":
      return "border-[#FECACA] bg-[#FEF2F2]";
    default:
      return "border-[#07111E] bg-[#07111E]";
  }
}

function optionToneText(tone?: string, selected?: boolean) {
  if (!selected) return "text-[#07111E]";
  switch (tone) {
    case "blue":
      return "text-[#1D4ED8]";
    case "orange":
      return "text-[#C2410C]";
    case "purple":
      return "text-[#7E22CE]";
    case "red":
      return "text-[#B91C1C]";
    default:
      return "text-white";
  }
}

export function WebProjectTasksScreen() {
  const { projectId = "" } = useParams();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [rows, setRows] = useState<WebProjectTaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WebTasksStatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<WebTasksSort>("updated_desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stagedStatus, setStagedStatus] = useState<WebTasksStatusFilter>("all");
  const [stagedSort, setStagedSort] = useState<WebTasksSort>("updated_desc");
  const [members, setMembers] = useState<WebProjectMemberRow[]>([]);
  const [editing, setEditing] = useState<WebProjectTaskRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("new");
  const [editDue, setEditDue] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [meta, list, team] = await Promise.all([
      loadProjectMeta(projectId),
      loadProjectTasks(projectId),
      loadProjectTeam(projectId),
    ]);
    setProjectName(meta.name);
    setRows(list.tasks);
    setMembers(team.members);
    setError(meta.error || list.error || team.error);
    setLoading(false);
  }, [projectId]);

  const openEdit = (task: WebProjectTaskRow) => {
    setEditing(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditStatus(task.status);
    setEditDue(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setEditAssigneeId(task.primaryAssigneeId);
    setEditTags(task.tags.join(", "));
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditBusy(true);
    setEditError(null);
    const dueDate = editDue.trim()
      ? new Date(`${editDue.trim()}T12:00:00`).toISOString()
      : null;
    const result = await updateProjectTaskLight(editing.id, {
      title: editTitle,
      description: editDescription,
      status: editStatus,
      dueDate,
      primaryAssigneeId: editAssigneeId,
      tags: editTags
        .split(/[|,]/)
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setEditBusy(false);
    if (result.error) {
      setEditError(result.error);
      return;
    }
    setEditing(null);
    await reload();
  };

  useEffect(() => {
    void reload();
  }, [reload]);

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = rows.filter((task) => {
      if (!matchesWebStatusFilter(task, statusFilter)) return false;
      if (!q) return true;
      const hay = `${task.title} ${task.description ?? ""} ${task.primaryAssigneeName ?? ""} ${task.status}`.toLowerCase();
      return hay.includes(q);
    });
    return sortWebTasks(filtered, sortOrder);
  }, [rows, searchQuery, statusFilter, sortOrder]);

  const activeChipLabel = webStatusFilterChipLabel(statusFilter);
  const filterActiveCount = statusFilter === "all" ? 0 : 1;

  const openFilters = () => {
    setStagedStatus(statusFilter);
    setStagedSort(sortOrder);
    setFiltersOpen(true);
  };

  return (
    <View testID="web-project-tasks" className="flex-1">
      <Text className="mb-1 text-[22px] font-bold text-[#07111E]">Tasks</Text>
      <Text className="mb-3 text-[13px] text-[#577783]">
        {projectName ?? "Project"} · {visibleRows.length} shown
        {visibleRows.length !== rows.length ? ` of ${rows.length}` : ""} · tap a
        row to light-edit
      </Text>

      {editing ? (
        <WebFormCard
          testID="web-project-tasks__edit"
          title="Edit task"
          fields={[
            { key: "title", label: "Title", value: editTitle },
            {
              key: "description",
              label: "Description",
              value: editDescription,
              multiline: true,
            },
            {
              key: "due",
              label: "Due (YYYY-MM-DD)",
              value: editDue,
              placeholder: "2026-10-20",
            },
            {
              key: "tags",
              label: "Tags (comma-separated)",
              value: editTags,
            },
          ]}
          onChange={(key, value) => {
            if (key === "title") setEditTitle(value);
            if (key === "description") setEditDescription(value);
            if (key === "due") setEditDue(value);
            if (key === "tags") setEditTags(value);
          }}
          extra={
            <View className="mb-2">
              <Text className="mb-2 text-xs font-semibold text-[#577783]">Status</Text>
              <View className="mb-3 flex-row flex-wrap" style={{ gap: 8 }}>
                {LIGHT_STATUS.map((s) => (
                  <Pressable
                    key={s}
                    testID={`web-project-tasks__edit_status_${s}`}
                    onPress={() => setEditStatus(s)}
                    className={cn(
                      "rounded-full border px-3 py-1.5",
                      editStatus === s
                        ? "border-[#07111E] bg-[#07111E]"
                        : "border-[#D6E9EE] bg-white",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-bold",
                        editStatus === s ? "text-white" : "text-[#07111E]",
                      )}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-2 text-xs font-semibold text-[#577783]">Assignee</Text>
              <View className="mb-2 flex-row flex-wrap" style={{ gap: 8 }}>
                {members.map((m) => (
                  <Pressable
                    key={m.userId}
                    testID={`web-project-tasks__edit_assignee_${m.userId}`}
                    onPress={() => setEditAssigneeId(m.userId)}
                    className={cn(
                      "rounded-full border px-3 py-1.5",
                      editAssigneeId === m.userId
                        ? "border-[#0D6E87] bg-[#0D6E87]"
                        : "border-[#D6E9EE] bg-white",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-bold",
                        editAssigneeId === m.userId ? "text-white" : "text-[#07111E]",
                      )}
                    >
                      {m.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          onCancel={() => setEditing(null)}
          onSubmit={() => void saveEdit()}
          busy={editBusy}
          error={editError}
          submitLabel="Save task"
        />
      ) : null}

      <View
        testID="web-project-tasks__search_section"
        className={cn("pb-2", activeChipLabel ? "pb-3" : "pb-1")}
      >
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View
            testID="web-project-tasks__search_wrapper"
            className="min-h-[48px] flex-1 flex-row items-center rounded-2xl border border-slate-300 bg-white px-3"
          >
            <TextInput
              testID="web-project-tasks__search"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tasks"
              placeholderTextColor="#94A3B8"
              className="flex-1 py-3 text-[15px] text-[#07111E]"
              autoCorrect={false}
              autoCapitalize="none"
            />
            <Text
              testID="web-project-tasks__search_count"
              className="rounded-full bg-slate-100 px-3 py-1 font-mono text-base font-medium text-slate-700"
            >
              {visibleRows.length}
            </Text>
          </View>

          <Pressable
            testID="web-project-tasks__filters_button"
            onPress={openFilters}
            className={cn(
              "relative flex-row items-center rounded-full border px-4 py-3",
              filterActiveCount > 0
                ? "border-[#0D6E87] bg-[#0D6E87]"
                : "border-slate-300 bg-white",
            )}
            style={{ gap: 8 }}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={filterActiveCount > 0 ? "#F8FCFF" : "#07111E"}
            />
            <Text
              className={cn(
                "text-sm font-semibold",
                filterActiveCount > 0 ? "text-white" : "text-[#07111E]",
              )}
            >
              Filters
            </Text>
            {filterActiveCount > 0 ? (
              <View className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-[#07111E] px-1.5 py-0.5">
                <Text className="text-center text-[11px] font-bold text-white">
                  {filterActiveCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {activeChipLabel ? (
          <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
            <Pressable
              testID="web-project-tasks__chip_remove_status"
              onPress={() => setStatusFilter("all")}
              className={cn(
                "flex-row items-center rounded-full border px-3.5 py-2",
                chipToneClasses(activeChipLabel).container,
              )}
              style={{ gap: 8 }}
            >
              <Text className={cn("text-[12.5px] font-semibold", chipToneClasses(activeChipLabel).text)}>
                {activeChipLabel}
              </Text>
              <Text className={cn("text-[12px] font-bold", chipToneClasses(activeChipLabel).text)}>
                X
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {filtersOpen ? (
        <View
          testID="web-project-tasks__filters_panel"
          className="mb-3 rounded-2xl border border-[#D6E9EE] bg-white p-4"
        >
          <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#577783]">
            Status
          </Text>
          <View className="mb-4 flex-row flex-wrap" style={{ gap: 8 }}>
            {STATUS_OPTIONS.map((opt) => {
              const selected = stagedStatus === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`web-project-tasks__filter_status_${opt.id}`}
                  onPress={() => setStagedStatus(opt.id)}
                  className={cn(
                    "rounded-full border px-4 py-2.5",
                    selected ? optionToneSelected(opt.tone) : "border-slate-200 bg-white",
                  )}
                >
                  <Text className={cn("text-sm font-semibold", optionToneText(opt.tone, selected))}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#577783]">
            Sort
          </Text>
          <View className="mb-4 flex-row flex-wrap" style={{ gap: 8 }}>
            {SORT_OPTIONS.map((opt) => {
              const selected = stagedSort === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`web-project-tasks__filter_sort_${opt.id}`}
                  onPress={() => setStagedSort(opt.id)}
                  className={cn(
                    "rounded-full border px-4 py-2.5",
                    selected ? "border-[#07111E] bg-[#07111E]" : "border-slate-200 bg-white",
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-semibold",
                      selected ? "text-white" : "text-[#07111E]",
                    )}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row justify-end" style={{ gap: 10 }}>
            <Pressable
              testID="web-project-tasks__filters_reset"
              onPress={() => {
                setStagedStatus("all");
                setStagedSort("updated_desc");
              }}
              className="rounded-full border border-slate-300 px-4 py-2.5"
            >
              <Text className="text-sm font-semibold text-[#07111E]">Reset</Text>
            </Pressable>
            <Pressable
              testID="web-project-tasks__filters_apply"
              onPress={() => {
                setStatusFilter(stagedStatus);
                setSortOrder(stagedSort);
                setFiltersOpen(false);
              }}
              className="rounded-full bg-[#0D6E87] px-4 py-2.5"
            >
              <Text className="text-sm font-semibold text-white">Apply</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#12A8E0" />
      ) : error ? (
        <Text testID="web-project-tasks-error" className="mt-3 text-[#DC2626]">
          {error}
        </Text>
      ) : (
        <ScrollView
          testID="web-project-tasks__list"
          className="flex-1"
          showsVerticalScrollIndicator
        >
          {visibleRows.length === 0 ? (
            <Text className="mt-3 text-[#577783]">No tasks match these filters.</Text>
          ) : (
            visibleRows.map((task) => {
              const overdue = isWebTaskOverdue(task);
              const contextLine = [
                task.primaryAssigneeName || "Unassigned",
                formatDueDate(task.dueDate),
                `${task.completionPercentage}%`,
              ].join(" · ");
              return (
                <View
                  key={task.id}
                  testID={`web-task-row-${task.id}`}
                  className={cn(
                    "mb-3",
                    task.nestingLevel === 1 ? "ml-6" : "",
                    task.nestingLevel >= 2 ? "ml-10" : "",
                  )}
                >
                  <ActivityStyleRowCard
                    testID={`web-project-tasks__row_${task.id}`}
                    variant="task"
                    title={task.title}
                    subtitle={contextLine}
                    metaLabel={formatWebUpdatedLabel(task.updatedAt)}
                    badgeLabel={formatWebTaskStatusLabel(task.status)}
                    imageUri={task.photoUris[0]}
                    imageUris={task.photoUris}
                    onPress={() => openEdit(task)}
                    topLeftMarker={
                      overdue ? (
                        <View className="rounded-full bg-red-500 px-3 py-1.5">
                          <Text className="text-sm font-semibold text-white">Overdue</Text>
                        </View>
                      ) : task.nestingLevel > 0 ? (
                        <View className="rounded-full bg-[#08576E]/90 px-2.5 py-1 shadow-sm">
                          <Text className="text-xs font-semibold text-white">
                            {task.nestingLevel >= 2 ? "Subtask L2" : "Subtask"}
                          </Text>
                        </View>
                      ) : undefined
                    }
                  />
                </View>
              );
            })
          )}
          <View className="h-10" />
        </ScrollView>
      )}
    </View>
  );
}
