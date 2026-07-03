export type ScreenMigrationCandidateId =
  | "DashboardScreen"
  | "TasksScreen"
  | "TaskDetailScreen"
  | "CreateTaskScreen"
  | "ProjectsScreen";

export type ScreenMigrationDimensionId =
  | "userTrafficWeighting"
  | "workflowCriticalityWeighting"
  | "componentReuseFactor"
  | "layoutInstabilityRisk"
  | "navigationCouplingRisk"
  | "selectorComplianceReadiness"
  | "regressionBlastRadius";

export interface ScreenMigrationDimensionScores {
  userTrafficWeighting: number;
  workflowCriticalityWeighting: number;
  componentReuseFactor: number;
  layoutInstabilityRisk: number;
  navigationCouplingRisk: number;
  selectorComplianceReadiness: number;
  regressionBlastRadius: number;
}

export interface ScreenMigrationInventoryEntry {
  screenId: ScreenMigrationCandidateId;
  repoPath: string;
  scores: ScreenMigrationDimensionScores;
}

export interface ScreenMigrationScoreBreakdown {
  screenId: ScreenMigrationCandidateId;
  weightedPositiveScore: number;
  weightedRiskPenalty: number;
  totalPriorityScore: number;
}

export const SCREEN_MIGRATION_DIMENSION_WEIGHTS: Record<
  ScreenMigrationDimensionId,
  number
> = {
  userTrafficWeighting: 5,
  workflowCriticalityWeighting: 5,
  componentReuseFactor: 4,
  layoutInstabilityRisk: 4,
  navigationCouplingRisk: 4,
  selectorComplianceReadiness: 3,
  regressionBlastRadius: 3,
};

export const SCREEN_MIGRATION_INVENTORY: Record<
  ScreenMigrationCandidateId,
  ScreenMigrationInventoryEntry
> = {
  DashboardScreen: {
    screenId: "DashboardScreen",
    repoPath: "src/screens/DashboardScreen.tsx",
    scores: {
      userTrafficWeighting: 5,
      workflowCriticalityWeighting: 5,
      componentReuseFactor: 5,
      layoutInstabilityRisk: 4,
      navigationCouplingRisk: 5,
      selectorComplianceReadiness: 4,
      regressionBlastRadius: 3,
    },
  },
  TasksScreen: {
    screenId: "TasksScreen",
    repoPath: "src/screens/TasksScreen.tsx",
    scores: {
      userTrafficWeighting: 5,
      workflowCriticalityWeighting: 5,
      componentReuseFactor: 5,
      layoutInstabilityRisk: 4,
      navigationCouplingRisk: 5,
      selectorComplianceReadiness: 5,
      regressionBlastRadius: 3,
    },
  },
  TaskDetailScreen: {
    screenId: "TaskDetailScreen",
    repoPath: "src/screens/TaskDetailScreen.tsx",
    scores: {
      userTrafficWeighting: 4,
      workflowCriticalityWeighting: 5,
      componentReuseFactor: 4,
      layoutInstabilityRisk: 4,
      navigationCouplingRisk: 5,
      selectorComplianceReadiness: 5,
      regressionBlastRadius: 3,
    },
  },
  CreateTaskScreen: {
    screenId: "CreateTaskScreen",
    repoPath: "src/screens/CreateTaskScreen.tsx",
    scores: {
      userTrafficWeighting: 4,
      workflowCriticalityWeighting: 5,
      componentReuseFactor: 4,
      layoutInstabilityRisk: 5,
      navigationCouplingRisk: 4,
      selectorComplianceReadiness: 3,
      regressionBlastRadius: 5,
    },
  },
  ProjectsScreen: {
    screenId: "ProjectsScreen",
    repoPath: "src/screens/ProjectsScreen.tsx",
    scores: {
      userTrafficWeighting: 3,
      workflowCriticalityWeighting: 4,
      componentReuseFactor: 3,
      layoutInstabilityRisk: 3,
      navigationCouplingRisk: 3,
      selectorComplianceReadiness: 4,
      regressionBlastRadius: 2,
    },
  },
};

export const WAVE_1_FOUNDATION_SCREEN_IDS: ScreenMigrationCandidateId[] = [
  "TasksScreen",
  "DashboardScreen",
  "TaskDetailScreen",
];

export function calculateScreenMigrationScore(
  entry: ScreenMigrationInventoryEntry
): ScreenMigrationScoreBreakdown {
  const positiveDimensions: Array<
    Exclude<ScreenMigrationDimensionId, "regressionBlastRadius">
  > = [
    "userTrafficWeighting",
    "workflowCriticalityWeighting",
    "componentReuseFactor",
    "layoutInstabilityRisk",
    "navigationCouplingRisk",
    "selectorComplianceReadiness",
  ];

  const weightedPositiveScore = positiveDimensions.reduce(
    (total, dimensionId) =>
      total +
      entry.scores[dimensionId] * SCREEN_MIGRATION_DIMENSION_WEIGHTS[dimensionId],
    0
  );

  const weightedRiskPenalty =
    entry.scores.regressionBlastRadius *
    SCREEN_MIGRATION_DIMENSION_WEIGHTS.regressionBlastRadius;

  return {
    screenId: entry.screenId,
    weightedPositiveScore,
    weightedRiskPenalty,
    totalPriorityScore: weightedPositiveScore - weightedRiskPenalty,
  };
}

export function getRankedScreenMigrationInventory(): ScreenMigrationScoreBreakdown[] {
  return Object.values(SCREEN_MIGRATION_INVENTORY)
    .map(calculateScreenMigrationScore)
    .sort((left, right) => right.totalPriorityScore - left.totalPriorityScore);
}
