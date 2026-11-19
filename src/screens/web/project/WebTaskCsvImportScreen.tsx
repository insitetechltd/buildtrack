import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useParams } from "react-router-dom";

import { WebCsvDropZone } from "@/components/web/WebCsvDropZone";
import { useAuthStore } from "@/state/authStore";
import {
  WEB_TASK_CSV_COLUMN_HELP,
  countCsvValidity,
  downloadTaskCsvTemplate,
  parseTaskCsvText,
  patchCsvDraft,
  type WebTaskCsvDraft,
} from "@/web/csv/taskCsv";
import { loadProjectMeta } from "@/web/data/projectTasks";
import { loadProjectTeam } from "@/web/data/projectTeam";
import { createProjectTaskFromCsv } from "@/web/data/taskMutations";

export function WebTaskCsvImportScreen() {
  const { projectId = "" } = useParams();
  const authUser = useAuthStore((s) => s.user);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<WebTaskCsvDraft[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [roster, setRoster] = useState<{ id: string; name: string; email: string | null }[]>(
    [],
  );

  const reloadRoster = useCallback(async () => {
    setLoading(true);
    const [meta, team] = await Promise.all([
      loadProjectMeta(projectId),
      loadProjectTeam(projectId),
    ]);
    setProjectName(meta.name);
    setRoster(
      team.members.map((m) => ({ id: m.userId, name: m.name, email: m.email })),
    );
    setRosterError(meta.error || team.error);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void reloadRoster();
  }, [reloadRoster]);

  const validity = useMemo(() => countCsvValidity(drafts), [drafts]);

  const applyCsvText = useCallback(
    (text: string, name?: string) => {
      setCsvText(text);
      setFileName(name || null);
      setImportMsg(null);
      const result = parseTaskCsvText(text, roster);
      setParseError(result.error);
      setDrafts(result.drafts);
      setEditingIndex(null);
    },
    [roster],
  );

  const runParse = () => {
    applyCsvText(csvText, fileName || undefined);
  };

  const importValid = async () => {
    const good = drafts.filter((d) => d.ok && d.assigneeUserId);
    if (good.length === 0) {
      setImportMsg("No valid rows to import");
      return;
    }
    setImporting(true);
    setImportMsg(null);
    let ok = 0;
    let fail = 0;
    for (const row of good) {
      const result = await createProjectTaskFromCsv({
        projectId,
        assignedBy: authUser?.id || "",
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        dueDate: row.dueDate,
        primaryAssigneeId: row.assigneeUserId!,
        tags: row.tags,
      });
      if (result.error) fail += 1;
      else ok += 1;
    }
    setImporting(false);
    setImportMsg(`Imported ${ok} task(s)${fail ? ` · ${fail} failed` : ""}`);
  };

  const editing = editingIndex != null ? drafts[editingIndex] : null;

  return (
    <View testID="web-task-csv-import" className="flex-1">
      <Text className="mb-1 text-[22px] font-bold text-[#07111E]">Import tasks (CSV)</Text>
      <Text className="mb-3 text-[13px] text-[#577783]">
        {projectName ?? "Project"} · ≤200 rows · no photos · assignee must already be on
        this project
      </Text>

      {loading ? (
        <ActivityIndicator color="#12A8E0" />
      ) : (
        <ScrollView className="flex-1">
          {rosterError ? (
            <Text className="mb-2 text-[#DC2626]">{rosterError}</Text>
          ) : null}

          <View className="mb-3 rounded-xl border border-[#D6E9EE] bg-white p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm font-bold text-[#07111E]">1. Download template</Text>
              <Pressable
                testID="web-task-csv__download_template"
                onPress={() => downloadTaskCsvTemplate()}
                className="rounded-full bg-[#0D6E87] px-4 py-2"
              >
                <Text className="text-xs font-bold text-white">Download CSV template</Text>
              </Pressable>
            </View>
            <Text className="mb-2 text-[13px] text-[#577783]">
              Open in Excel / Numbers / Sheets. Keep the header row. Replace the example
              row with your tasks.
            </Text>
            {WEB_TASK_CSV_COLUMN_HELP.map((col) => (
              <Text key={col.key} className="mb-0.5 text-[12px] text-[#577783]">
                <Text className="font-bold text-[#08576E]">{col.key}</Text>
                {" — "}
                {col.help}
              </Text>
            ))}
          </View>

          <Text className="mb-2 text-sm font-bold text-[#07111E]">2. Upload filled CSV</Text>
          <WebCsvDropZone
            testID="web-task-csv__dropzone"
            onFileText={(text, name) => applyCsvText(text, name)}
            onError={(message) => {
              setParseError(message);
              setDrafts([]);
            }}
          />
          {fileName ? (
            <Text testID="web-task-csv__filename" className="mb-2 text-[12px] text-[#08576E]">
              Loaded: {fileName}
            </Text>
          ) : null}

          <Text className="mb-1 text-xs font-semibold text-[#577783]">
            Or paste CSV text
          </Text>
          <TextInput
            testID="web-task-csv__textarea"
            value={csvText}
            onChangeText={(t) => {
              setCsvText(t);
              setFileName(null);
            }}
            multiline
            placeholder="Paste CSV here…"
            placeholderTextColor="#9CA3AF"
            className="mb-3 min-h-[100px] rounded-xl border border-[#D6E9EE] bg-white p-3 text-[13px] text-[#07111E]"
            style={{ textAlignVertical: "top" }}
          />

          <View className="mb-3 flex-row" style={{ gap: 8 }}>
            <Pressable
              testID="web-task-csv__parse"
              onPress={runParse}
              className="rounded-full bg-[#0D6E87] px-4 py-2.5"
            >
              <Text className="text-sm font-bold text-white">Review</Text>
            </Pressable>
            <Pressable
              testID="web-task-csv__import"
              disabled={importing || validity.good === 0}
              onPress={() => void importValid()}
              className="rounded-full border border-[#0D6E87] px-4 py-2.5"
            >
              <Text className="text-sm font-bold text-[#0D6E87]">
                {importing ? "Importing…" : `Import valid (${validity.good})`}
              </Text>
            </Pressable>
          </View>
          {parseError ? (
            <Text testID="web-task-csv-error" className="mb-2 text-[#DC2626]">
              {parseError}
            </Text>
          ) : null}
          {importMsg ? (
            <Text testID="web-task-csv-import-msg" className="mb-2 text-[#047857]">
              {importMsg}
            </Text>
          ) : null}

          {drafts.length > 0 ? (
            <Text className="mb-2 text-[13px] text-[#577783]">
              {validity.good} good · {validity.bad} bad
            </Text>
          ) : null}

          {drafts.map((draft, index) => (
            <Pressable
              key={`row-${draft.rowIndex}`}
              testID={`web-task-csv-row-${draft.rowIndex}`}
              onPress={() => setEditingIndex(index)}
              className={`mb-2 rounded-xl border px-3 py-3 ${
                draft.ok
                  ? "border-[#A7F3D0] bg-[#ECFDF5]"
                  : "border-[#FECACA] bg-[#FEF2F2]"
              }`}
            >
              <Text className="font-semibold text-[#07111E]">
                #{draft.rowIndex} {draft.title || "(no title)"} ·{" "}
                {draft.ok ? "good" : "bad"}
              </Text>
              <Text className="mt-1 text-[12px] text-[#577783]">
                {draft.assigneeRaw || "—"} · {draft.status}
                {!draft.ok ? ` · ${draft.errors.join("; ")}` : ""}
              </Text>
            </Pressable>
          ))}

          {editing && editingIndex != null ? (
            <View
              testID="web-task-csv__fix"
              className="mb-6 mt-2 rounded-xl border border-[#D6E9EE] bg-white p-3"
            >
              <Text className="mb-2 text-sm font-bold text-[#07111E]">
                Fix row #{editing.rowIndex}
              </Text>
              {(
                [
                  ["title", editing.title],
                  ["description", editing.description],
                  ["assigneeRaw", editing.assigneeRaw],
                  ["status", editing.status],
                ] as const
              ).map(([key, value]) => (
                <TextInput
                  key={key}
                  testID={`web-task-csv__fix_${key}`}
                  value={value}
                  onChangeText={(v) => {
                    setDrafts((prev) =>
                      prev.map((d, i) =>
                        i === editingIndex
                          ? patchCsvDraft(d, { [key]: v }, roster)
                          : d,
                      ),
                    );
                  }}
                  className="mb-2 rounded-lg border border-[#D6E9EE] px-3 py-2 text-[13px]"
                  placeholder={key}
                />
              ))}
              <Pressable
                testID="web-task-csv__fix_done"
                onPress={() => setEditingIndex(null)}
                className="self-end rounded-full bg-[#07111E] px-4 py-2"
              >
                <Text className="text-xs font-bold text-white">Done</Text>
              </Pressable>
            </View>
          ) : null}
          <View className="h-10" />
        </ScrollView>
      )}
    </View>
  );
}
