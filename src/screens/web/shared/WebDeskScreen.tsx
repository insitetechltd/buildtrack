import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigate } from "react-router-dom";

import { WebKpiSection, WebKpiTile } from "@/components/web/WebKpiCards";
import { useAuthStore } from "@/state/authStore";
import { canAccessCompanyAdmin, webSeatBand } from "@/web/access";
import {
  loadDeskOverview,
  type WebDeskOverview,
} from "@/web/data/deskOverview";

export function WebDeskScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isCA = canAccessCompanyAdmin(user);
  const seat = webSeatBand(user);
  const [overview, setOverview] = useState<WebDeskOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setOverview(null);
      setError("Not signed in");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await loadDeskOverview({
      userId: user.id,
      companyId: user.companyId,
      isCompanyAdmin: isCA,
    });
    setOverview(result.overview);
    setError(result.error);
    setLoading(false);
  }, [user?.id, user?.companyId, isCA]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const seatLabel =
    seat === "ca" ? "Company admin" : seat === "pm" ? "PM" : "Worker";

  return (
    <ScrollView testID="web-desk" className="flex-1">
      <Text className="mb-1 text-[22px] font-bold text-[#07111E]">Desk</Text>
      <Text className="mb-4 text-[13px] text-[#577783]">
        {user?.name || "You"} · {seatLabel} · project overview
      </Text>

      {loading ? (
        <ActivityIndicator color="#12A8E0" style={{ marginTop: 24 }} />
      ) : error ? (
        <Text testID="web-desk-error" className="text-[#DC2626]">
          {error}
        </Text>
      ) : overview ? (
        <>
          <WebKpiSection
            testID="web-desk-totals"
            title="Across your projects"
            subtitle="Task buckets: active = in motion · idle = queued · closed = done · overdue = past due (open)"
          >
            <WebKpiTile
              testID="web-desk-total-projects"
              label="Projects"
              value={overview.totals.projectCount}
            />
            <WebKpiTile
              testID="web-desk-total-active"
              label="Active tasks"
              value={overview.totals.tasks.active}
            />
            <WebKpiTile
              testID="web-desk-total-idle"
              label="Idle tasks"
              value={overview.totals.tasks.idle}
              tone="muted"
            />
            <WebKpiTile
              testID="web-desk-total-closed"
              label="Closed tasks"
              value={overview.totals.tasks.closed}
              tone="success"
            />
            <WebKpiTile
              testID="web-desk-total-overdue"
              label="Overdue"
              value={overview.totals.tasks.overdue}
              tone={overview.totals.tasks.overdue > 0 ? "danger" : "default"}
            />
            <WebKpiTile
              testID="web-desk-total-members-active"
              label="Users active"
              value={overview.totals.membersActive}
              hint="activity in 7d"
            />
            <WebKpiTile
              testID="web-desk-total-members-idle"
              label="Users idle"
              value={overview.totals.membersIdle}
              tone="muted"
              hint="no activity in 7d"
            />
          </WebKpiSection>

          <Text className="mb-3 text-[13px] font-bold uppercase tracking-wide text-[#497080]">
            Projects
          </Text>

          {overview.projects.length === 0 ? (
            <View className="mb-4 rounded-2xl border border-dashed border-[#A8D3E0] bg-white px-4 py-5">
              <Text className="text-[14px] leading-5 text-[#577783]">
                No projects assigned yet. Ask a company admin to add you to a
                project team.
              </Text>
            </View>
          ) : (
            <View className="mb-4" style={{ gap: 12 }}>
              {overview.projects.map((project) => (
                <Pressable
                  key={project.id}
                  testID={`web-desk-project-${project.id}`}
                  onPress={() => navigate(`/p/${project.id}/workspace`)}
                  className="rounded-2xl border border-[#D6E9EE] bg-white px-4 py-4"
                >
                  <View className="mb-1 flex-row items-start justify-between">
                    <View className="mr-3 min-w-0 flex-1">
                      <Text className="text-[17px] font-bold text-[#07111E]">
                        {project.name}
                      </Text>
                      <Text className="mt-0.5 text-[12px] text-[#577783]">
                        {project.statusLabel}
                        {project.location ? ` · ${project.location}` : ""}
                        {project.isProjectAdmin ? " · Project admin" : ""}
                      </Text>
                    </View>
                    <Text className="text-[12px] font-semibold text-[#12A8E0]">
                      Open →
                    </Text>
                  </View>

                  <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                    <MiniStat
                      label="Active"
                      value={project.tasks.active}
                      testID={`web-desk-project-${project.id}-active`}
                    />
                    <MiniStat
                      label="Idle"
                      value={project.tasks.idle}
                      testID={`web-desk-project-${project.id}-idle`}
                    />
                    <MiniStat
                      label="Closed"
                      value={project.tasks.closed}
                      testID={`web-desk-project-${project.id}-closed`}
                    />
                    <MiniStat
                      label="Overdue"
                      value={project.tasks.overdue}
                      danger={project.tasks.overdue > 0}
                      testID={`web-desk-project-${project.id}-overdue`}
                    />
                    <MiniStat
                      label="Users active"
                      value={project.members.active}
                      testID={`web-desk-project-${project.id}-users-active`}
                    />
                    <MiniStat
                      label="Users idle"
                      value={project.members.idle}
                      testID={`web-desk-project-${project.id}-users-idle`}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}
      <View className="h-8" />
    </ScrollView>
  );
}

function MiniStat({
  label,
  value,
  danger,
  testID,
}: {
  label: string;
  value: number;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      className={`min-w-[88px] rounded-xl border px-3 py-2 ${
        danger
          ? "border-[#FECACA] bg-[#FEF2F2]"
          : "border-[#E7F4F8] bg-[#F8FCFF]"
      }`}
    >
      <Text
        className={`text-[18px] font-bold ${
          danger ? "text-[#B91C1C]" : "text-[#07111E]"
        }`}
      >
        {value}
      </Text>
      <Text className="text-[11px] font-semibold text-[#577783]">{label}</Text>
    </View>
  );
}
