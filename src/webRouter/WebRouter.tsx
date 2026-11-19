import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { WebAppShell } from "@/components/web/WebAppShell";
import { WebCompanyOverviewScreen } from "@/screens/web/company/WebCompanyOverviewScreen";
import { WebProjectsScreen } from "@/screens/web/company/WebProjectsScreen";
import { WebUsersScreen } from "@/screens/web/company/WebUsersScreen";
import { WebProjectTasksScreen } from "@/screens/web/project/WebProjectTasksScreen";
import { WebProjectTeamScreen } from "@/screens/web/project/WebProjectTeamScreen";
import { WebProjectWorkspaceScreen } from "@/screens/web/project/WebProjectWorkspaceScreen";
import { WebTaskCsvImportScreen } from "@/screens/web/project/WebTaskCsvImportScreen";
import { WebDeskScreen } from "@/screens/web/shared/WebDeskScreen";
import { WebLoginScreen } from "@/screens/web/shared/WebLoginScreen";
import { RequireAuth } from "./RequireAuth";

export function WebRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<WebLoginScreen />} />
        <Route
          element={
            <RequireAuth>
              <WebAppShell />
            </RequireAuth>
          }
        >
          <Route path="/desk" element={<WebDeskScreen />} />
          <Route
            path="/a/company"
            element={
              <RequireAuth companyAdminOnly>
                <WebCompanyOverviewScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/a/users"
            element={
              <RequireAuth companyAdminOnly>
                <WebUsersScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/a/projects"
            element={
              <RequireAuth companyAdminOnly>
                <WebProjectsScreen />
              </RequireAuth>
            }
          />
          <Route path="/p/:projectId/workspace" element={<WebProjectWorkspaceScreen />} />
          <Route path="/p/:projectId/tasks" element={<WebProjectTasksScreen />} />
          <Route path="/p/:projectId/tasks/import" element={<WebTaskCsvImportScreen />} />
          <Route path="/p/:projectId/team" element={<WebProjectTeamScreen />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
