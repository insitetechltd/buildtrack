export interface DatabaseEnvironment {
  name: string;
  url: string;
  anonKey: string;
  description?: string;
}

export type PersistedDatabaseConfig = {
  activeEnvironment: string | null;
  environments: Record<string, DatabaseEnvironment>;
};

export function bakedProductionEnvironment(
  url = process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
): DatabaseEnvironment {
  return {
    name: "production",
    url,
    anonKey,
    description: "Production database",
  };
}

/**
 * AsyncStorage `buildtrack-database-config` used to persist the baked
 * EXPO_PUBLIC URL under the name "production". Daily TF (`dev` / preview)
 * therefore stored the DEV project. Installing a later `production` IPA
 * (same bundle id) rehydrated that DEV URL and overrode the binary.
 *
 * Release builds always use the IPA's EXPO_PUBLIC pair. Custom Dev Admin
 * endpoints stay Metro/__DEV__ only.
 */
export function resolvePersistedDatabaseConfig(
  persisted: PersistedDatabaseConfig | undefined,
  baked: DatabaseEnvironment,
  options: { allowCustomEndpoints: boolean },
): PersistedDatabaseConfig {
  if (!options.allowCustomEndpoints) {
    return {
      activeEnvironment: "production",
      environments: { production: baked },
    };
  }

  const custom: Record<string, DatabaseEnvironment> = {
    ...(persisted?.environments ?? {}),
  };
  delete custom.production;
  const active = persisted?.activeEnvironment;
  const activeOk = Boolean(active && active !== "production" && custom[active]);
  return {
    activeEnvironment: activeOk ? active! : "production",
    environments: { production: baked, ...custom },
  };
}
