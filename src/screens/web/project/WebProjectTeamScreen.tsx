import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useParams } from "react-router-dom";

import { useAuthStore } from "@/state/authStore";
import { loadCompanyUsers, type WebCompanyUserRow } from "@/web/data/companyDesk";
import { loadProjectMeta } from "@/web/data/projectTasks";
import {
  addProjectMember,
  loadProjectTeam,
  removeProjectMember,
  setProjectAdmin,
  type WebProjectMemberRow,
} from "@/web/data/projectTeam";
import { isEligibleProjectAdminCandidate } from "@/ui/contracts/projectMembership";
import type { User } from "@/types/buildtrack";

export function WebProjectTeamScreen() {
  const { projectId = "" } = useParams();
  const authUser = useAuthStore((s) => s.user);
  const companyId = authUser?.companyId ?? "";
  const [projectName, setProjectName] = useState<string | null>(null);
  const [members, setMembers] = useState<WebProjectMemberRow[]>([]);
  const [companyUsers, setCompanyUsers] = useState<WebCompanyUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [meta, team, users] = await Promise.all([
      loadProjectMeta(projectId),
      loadProjectTeam(projectId),
      loadCompanyUsers(companyId),
    ]);
    setProjectName(meta.name);
    setMembers(team.members);
    setCompanyUsers(users.users);
    setError(meta.error || team.error || users.error);
    setLoading(false);
  }, [projectId, companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onRosterIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members],
  );

  const addable = useMemo(
    () =>
      companyUsers.filter(
        (u) => u.isActive && !u.isPending && !onRosterIds.has(u.id),
      ),
    [companyUsers, onRosterIds],
  );

  const run = async (id: string, fn: () => Promise<{ error: string | null }>) => {
    setBusyId(id);
    setError(null);
    const result = await fn();
    if (result.error) setError(result.error);
    await reload();
    setBusyId(null);
  };

  return (
    <View testID="web-project-team" className="flex-1">
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="mb-1 text-[22px] font-bold text-[#07111E]">Team</Text>
          <Text className="text-[13px] text-[#577783]">
            {projectName ?? "Project"} · {members.length} on roster
          </Text>
        </View>
        <Pressable
          testID="web-project-team__add_open"
          onPress={() => setShowAdd((v) => !v)}
          className="rounded-full bg-[#0D6E87] px-4 py-2.5"
        >
          <Text className="text-sm font-bold text-white">
            {showAdd ? "Close" : "Add member"}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text testID="web-project-team-error" className="mb-2 text-[#DC2626]">
          {error}
        </Text>
      ) : null}

      {showAdd ? (
        <View
          testID="web-project-team__add_panel"
          className="mb-3 rounded-xl border border-[#D6E9EE] bg-white p-3"
        >
          <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#577783]">
            Company people not on this job
          </Text>
          {addable.length === 0 ? (
            <Text className="text-[13px] text-[#577783]">Everyone eligible is already on the roster.</Text>
          ) : (
            addable.map((u) => (
              <View
                key={u.id}
                className="mb-2 flex-row items-center justify-between rounded-lg border border-[#E7F4F8] px-3 py-2"
              >
                <View className="min-w-0 flex-1 pr-2">
                  <Text className="font-semibold text-[#07111E]">{u.name}</Text>
                  <Text className="text-[12px] text-[#577783]">{u.email || u.id}</Text>
                </View>
                <Pressable
                  testID={`web-project-team__add_${u.id}`}
                  disabled={busyId === u.id}
                  onPress={() =>
                    void run(u.id, () =>
                      addProjectMember({
                        projectId,
                        userId: u.id,
                        assignedBy: authUser?.id || "",
                        asProjectAdmin: false,
                      }),
                    )
                  }
                  className="rounded-full border border-[#0D6E87] px-3 py-1.5"
                >
                  <Text className="text-xs font-bold text-[#0D6E87]">Add</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#12A8E0" />
      ) : (
        <ScrollView testID="web-project-team__list" className="flex-1">
          {members.map((m) => {
            const candidate = {
              id: m.userId,
              name: m.name,
              systemPermission: m.systemPermission,
            } as User;
            const canCrown = isEligibleProjectAdminCandidate(candidate);
            return (
              <View
                key={m.userId}
                testID={`web-project-team-row-${m.userId}`}
                className="mb-2 flex-row items-center rounded-xl border border-[#D6E9EE] bg-white px-4 py-3"
              >
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-semibold text-[#07111E]">{m.name}</Text>
                  <Text className="text-[12px] text-[#577783]">{m.email || m.userId}</Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Text
                    className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                      m.isProjectAdmin
                        ? "bg-[#FEF3C7] text-[#92400E]"
                        : "bg-[#E7F4F8] text-[#08576E]"
                    }`}
                  >
                    {m.isProjectAdmin ? "PA" : "Member"}
                  </Text>
                  {canCrown ? (
                    <Pressable
                      testID={`web-project-team__pa_${m.userId}`}
                      disabled={busyId === m.userId}
                      onPress={() =>
                        void run(m.userId, () =>
                          setProjectAdmin({
                            projectId,
                            userId: m.userId,
                            asProjectAdmin: !m.isProjectAdmin,
                          }),
                        )
                      }
                      className="rounded-full border border-[#D6E9EE] px-3 py-1.5"
                    >
                      <Text className="text-[11px] font-bold text-[#07111E]">
                        {m.isProjectAdmin ? "Make member" : "Make PA"}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    testID={`web-project-team__remove_${m.userId}`}
                    disabled={busyId === m.userId}
                    onPress={() =>
                      void run(m.userId, () =>
                        removeProjectMember({ projectId, userId: m.userId }),
                      )
                    }
                    className="rounded-full border border-[#FECACA] px-3 py-1.5"
                  >
                    <Text className="text-[11px] font-bold text-[#B91C1C]">Remove</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          <View className="h-8" />
        </ScrollView>
      )}
    </View>
  );
}
