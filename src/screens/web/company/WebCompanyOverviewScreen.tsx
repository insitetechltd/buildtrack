import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigate } from "react-router-dom";

import { WebKpiSection, WebKpiTile } from "@/components/web/WebKpiCards";
import { useAuthStore } from "@/state/authStore";
import {
  loadCompanyOverview,
  type WebCompanyOverview,
} from "@/web/data/companyOverview";

export function WebCompanyOverviewScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [overview, setOverview] = useState<WebCompanyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user?.companyId) {
      setOverview(null);
      setError("No company on this account");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await loadCompanyOverview({ companyId: user.companyId });
    setOverview(result.overview);
    setError(result.error);
    setLoading(false);
  }, [user?.companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <ScrollView testID="web-company-overview" className="flex-1">
      <Text className="mb-1 text-[22px] font-bold text-[#07111E]">Company</Text>
      <Text className="mb-4 text-[13px] text-[#577783]">
        Account overview · CA only
      </Text>

      {loading ? (
        <ActivityIndicator color="#12A8E0" style={{ marginTop: 24 }} />
      ) : error ? (
        <Text testID="web-company-overview-error" className="text-[#DC2626]">
          {error}
        </Text>
      ) : overview ? (
        <>
          <View className="mb-5 rounded-2xl border border-[#D6E9EE] bg-white px-5 py-4">
            <Text className="text-[12px] font-semibold uppercase tracking-wide text-[#497080]">
              Company
            </Text>
            <Text
              testID="web-company-overview__name"
              className="mt-1 text-[24px] font-bold text-[#07111E]"
            >
              {overview.companyName}
            </Text>
            <Text className="mt-1 text-[13px] text-[#577783]">
              {overview.kpis.seats} seats · {overview.kpis.projectsOnGoing}{" "}
              on-going projects · {overview.kpis.openTasks} open tasks
            </Text>
          </View>

          <WebKpiSection
            testID="web-company-overview__users"
            title="Users"
            subtitle="Past 7 days — active authored activity; idle seats are quiet; pending = invite not accepted"
          >
            <WebKpiTile
              testID="web-company-users-active"
              label="Active"
              value={overview.users.active}
              tone="success"
            />
            <WebKpiTile
              testID="web-company-users-idle"
              label="Idle"
              value={overview.users.idle}
              tone="muted"
            />
            <WebKpiTile
              testID="web-company-users-pending"
              label="Pending"
              value={overview.users.pending}
            />
            <WebKpiTile
              testID="web-company-users-total"
              label="Seats"
              value={overview.users.total}
            />
          </WebKpiSection>

          <WebKpiSection
            testID="web-company-overview__projects"
            title="Projects"
            subtitle="Active = on-going · Idle = planning · Closed = completed or cancelled"
          >
            <WebKpiTile
              testID="web-company-projects-active"
              label="Active"
              value={overview.projects.active}
              tone="success"
            />
            <WebKpiTile
              testID="web-company-projects-idle"
              label="Idle"
              value={overview.projects.idle}
              tone="muted"
            />
            <WebKpiTile
              testID="web-company-projects-closed"
              label="Closed"
              value={overview.projects.closed}
            />
            <WebKpiTile
              testID="web-company-projects-total"
              label="Total"
              value={overview.projects.total}
            />
          </WebKpiSection>

          <WebKpiSection
            testID="web-company-overview__tasks-week"
            title="Tasks · past week"
            subtitle="Tasks created or updated in the last 7 days"
          >
            <WebKpiTile
              testID="web-company-week-active"
              label="Active"
              value={overview.tasksPastWeek.active}
            />
            <WebKpiTile
              testID="web-company-week-closed"
              label="Closed"
              value={overview.tasksPastWeek.closed}
              tone="success"
            />
            <WebKpiTile
              testID="web-company-week-overdue"
              label="Overdue"
              value={overview.tasksPastWeek.overdue}
              tone={overview.tasksPastWeek.overdue > 0 ? "danger" : "default"}
            />
            <WebKpiTile
              testID="web-company-week-touched"
              label="Touched"
              value={overview.tasksPastWeek.touched}
              hint="created or updated"
            />
          </WebKpiSection>

          <WebKpiSection
            testID="web-company-overview__kpis"
            title="Company KPIs"
          >
            <WebKpiTile
              testID="web-company-kpi-open"
              label="Open tasks"
              value={overview.kpis.openTasks}
            />
            <WebKpiTile
              testID="web-company-kpi-overdue"
              label="Overdue (open)"
              value={overview.kpis.overdueOpen}
              tone={overview.kpis.overdueOpen > 0 ? "danger" : "default"}
            />
            <WebKpiTile
              testID="web-company-kpi-completion"
              label="Completion"
              value={
                overview.kpis.completionRatePct == null
                  ? "—"
                  : `${overview.kpis.completionRatePct}%`
              }
              hint="closed / all tasks"
            />
          </WebKpiSection>

          <View className="mb-6 flex-row flex-wrap" style={{ gap: 16 }}>
            <Pressable
              testID="web-company-overview__goto_users"
              onPress={() => navigate("/a/users")}
            >
              <Text className="text-[13px] font-semibold text-[#12A8E0]">
                Manage users →
              </Text>
            </Pressable>
            <Pressable
              testID="web-company-overview__goto_projects"
              onPress={() => navigate("/a/projects")}
            >
              <Text className="text-[13px] font-semibold text-[#12A8E0]">
                Manage projects →
              </Text>
            </Pressable>
            <Pressable
              testID="web-company-overview__goto_desk"
              onPress={() => navigate("/desk")}
            >
              <Text className="text-[13px] font-semibold text-[#12A8E0]">
                Open desk →
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
      <View className="h-8" />
    </ScrollView>
  );
}
