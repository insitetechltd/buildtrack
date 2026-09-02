import { bakedProductionEnvironment, resolvePersistedDatabaseConfig } from "../databaseConfigResolve";

const baked = bakedProductionEnvironment(
  "https://jcnzjigxgkzhjsaekoqz.supabase.co",
  "prod-anon-key",
);

const staleDevProduction = {
  name: "production",
  url: "https://zusulknbhaumougqckec.supabase.co",
  anonKey: "dev-anon-key",
  description: "Production database",
};

describe("resolvePersistedDatabaseConfig", () => {
  it("release: ignores a persisted production URL from a prior daily-TF install", () => {
    const next = resolvePersistedDatabaseConfig(
      {
        activeEnvironment: "production",
        environments: { production: staleDevProduction },
      },
      baked,
      { allowCustomEndpoints: false },
    );
    expect(next.activeEnvironment).toBe("production");
    expect(next.environments.production.url).toBe(baked.url);
    expect(next.environments.production.anonKey).toBe(baked.anonKey);
  });

  it("release: ignores a persisted custom endpoint (Dev Admin leftover)", () => {
    const next = resolvePersistedDatabaseConfig(
      {
        activeEnvironment: "dev-custom",
        environments: {
          production: staleDevProduction,
          "dev-custom": {
            name: "dev-custom",
            url: "https://zusulknbhaumougqckec.supabase.co",
            anonKey: "dev-anon-key",
          },
        },
      },
      baked,
      { allowCustomEndpoints: false },
    );
    expect(next.activeEnvironment).toBe("production");
    expect(Object.keys(next.environments)).toEqual(["production"]);
    expect(next.environments.production.url).toBe(baked.url);
  });

  it("dev: rebakes production but keeps a custom active endpoint", () => {
    const custom = {
      name: "dev-custom",
      url: "https://zusulknbhaumougqckec.supabase.co",
      anonKey: "dev-anon-key",
    };
    const next = resolvePersistedDatabaseConfig(
      {
        activeEnvironment: "dev-custom",
        environments: { production: staleDevProduction, "dev-custom": custom },
      },
      baked,
      { allowCustomEndpoints: true },
    );
    expect(next.activeEnvironment).toBe("dev-custom");
    expect(next.environments.production.url).toBe(baked.url);
    expect(next.environments["dev-custom"]).toEqual(custom);
  });
});
