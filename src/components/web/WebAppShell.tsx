import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "@/state/authStore";
import { canAccessCompanyAdmin } from "@/web/access";

type NavItem = { to: string; label: string };

export function WebAppShell() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const showCompany = canAccessCompanyAdmin(user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const deskNav: NavItem[] = [{ to: "/desk", label: "Desk" }];
  const companyNav: NavItem[] = [
    { to: "/a/company", label: "Overview" },
    { to: "/a/users", label: "Users" },
    { to: "/a/projects", label: "Projects" },
  ];

  const projectNav: NavItem[] = projectId
    ? [
        { to: `/p/${projectId}/workspace`, label: "Workspace" },
        { to: `/p/${projectId}/tasks`, label: "Tasks" },
        { to: `/p/${projectId}/team`, label: "Team" },
        { to: `/p/${projectId}/tasks/import`, label: "Import CSV" },
      ]
    : [];

  return (
    <View style={styles.root} testID="web-app-shell">
      <View style={styles.sidebar}>
        <Text style={styles.brand}>TASKR</Text>
        <Text style={styles.brandSub}>web desk · spike</Text>
        <View style={styles.group}>
          <Text style={styles.groupLabel}>HOME</Text>
          {deskNav.map((item) => (
            <SideLink
              key={item.to}
              item={item}
              active={location.pathname === item.to}
              onPress={() => navigate(item.to)}
            />
          ))}
        </View>
        {showCompany ? (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>COMPANY</Text>
            {companyNav.map((item) => (
              <SideLink
                key={item.to}
                item={item}
                active={location.pathname.startsWith(item.to)}
                onPress={() => navigate(item.to)}
              />
            ))}
          </View>
        ) : null}
        {projectNav.length > 0 ? (
          <View style={styles.group}>
            <Text style={styles.groupLabel}>PROJECT</Text>
            {projectNav.map((item) => (
              <SideLink
                key={item.to}
                item={item}
                active={location.pathname === item.to}
                onPress={() => navigate(item.to)}
              />
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <Text style={styles.footer}>localhost only</Text>
      </View>
      <View style={styles.main}>
        <View style={styles.topbar}>
          <Text style={styles.topTitle}>
            {user?.name ?? "User"}
            {showCompany ? " · CA" : ""}
          </Text>
          <Pressable
            testID="web-sign-out"
            onPress={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
        <View style={styles.canvas}>
          <Outlet />
        </View>
      </View>
    </View>
  );
}

function SideLink({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.navItem, active && styles.navItemActive]}
      testID={`web-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#E7F4F8",
  },
  sidebar: {
    width: 240,
    backgroundColor: "#08576E",
    paddingVertical: 22,
    paddingHorizontal: 14,
  },
  brand: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  brandSub: { color: "#7AB0BE", fontSize: 11, marginTop: 2, marginBottom: 18 },
  group: { marginBottom: 16 },
  groupLabel: {
    fontSize: 11,
    color: "#7AB0BE",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: { backgroundColor: "#12A8E0" },
  navText: { color: "#D6E9EE", fontSize: 14, fontWeight: "500" },
  navTextActive: { color: "#FFFFFF", fontWeight: "700" },
  footer: { color: "#7AB0BE", fontSize: 11, paddingHorizontal: 6 },
  main: { flex: 1, minWidth: 0 },
  topbar: {
    height: 56,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D6E9EE",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { fontSize: 14, fontWeight: "600", color: "#07111E" },
  signOut: { color: "#12A8E0", fontWeight: "600", fontSize: 13 },
  canvas: { flex: 1, padding: 24 },
});
