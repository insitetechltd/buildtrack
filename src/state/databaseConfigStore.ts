import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface DatabaseEnvironment {
  name: string;
  url: string;
  anonKey: string;
  description?: string;
}

interface DatabaseConfigState {
  activeEnvironment: string | null;
  environments: Record<string, DatabaseEnvironment>;
  supabaseClient: SupabaseClient | null;

  // Actions
  switchEnvironment: (envName: string) => Promise<void>;
  addEnvironment: (name: string, url: string, anonKey: string, description?: string) => void;
  removeEnvironment: (name: string) => void;
  getActiveClient: () => SupabaseClient | null;
  reinitializeClient: () => Promise<void>;
}

/**
 * Post M-SUPABASE-02a, anon SELECT on domain tables (e.g. companies) is correctly
 * denied. That is reachability proof, not a dead endpoint.
 */
export function isExpectedAnonAccessDenial(error: {
  code?: string;
  message?: string;
} | null | undefined): boolean {
  if (!error) {
    return false;
  }
  const message = (error.message || "").toLowerCase();
  return (
    error.code === "42501" ||
    error.code === "PGRST301" ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    (message.includes("jwt") && message.includes("denied"))
  );
}

function getSupabaseModule(): {
  supabase: SupabaseClient | null;
  getSupabaseClient?: () => SupabaseClient | null;
  setSupabaseClient?: (client: SupabaseClient | null) => void;
} {
  // Lazy require avoids circular init with src/api/supabase.ts
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../api/supabase");
}

function getGlobalSupabaseClient(): SupabaseClient | null {
  const mod = getSupabaseModule();
  return mod.getSupabaseClient?.() ?? mod.supabase ?? null;
}

function publishGlobalSupabaseClient(client: SupabaseClient): void {
  const mod = getSupabaseModule();
  if (mod.setSupabaseClient) {
    mod.setSupabaseClient(client);
  }
}

function buildClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "buildtrack-mobile",
      },
      fetch: (requestUrl, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        return fetch(requestUrl, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      },
    },
    db: {
      schema: "public",
    },
  });
}

/**
 * Prove URL + anon key reach Supabase without requiring privileged table reads.
 * Prefer auth.getSession (works for anon). Fall back: companies SELECT may be
 * RLS-denied — treat denial as connected.
 */
export async function assertSupabaseReachable(
  client: SupabaseClient,
  envName: string,
): Promise<void> {
  const { error: sessionError } = await client.auth.getSession();
  if (!sessionError) {
    return;
  }

  // Rare: some proxies fail auth routes but PostgREST is up — try a cheap probe.
  const { error: tableError } = await client.from("companies").select("id").limit(1);
  if (
    !tableError ||
    tableError.code === "PGRST116" ||
    isExpectedAnonAccessDenial(tableError)
  ) {
    return;
  }

  throw new Error(
    `Failed to connect to ${envName}: ${sessionError.message || tableError.message}`,
  );
}

function sameEndpoint(
  env: DatabaseEnvironment,
  client: SupabaseClient | null,
): boolean {
  if (!client) {
    return false;
  }
  const defaultUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const defaultKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
  // Production env is always the EXPO_PUBLIC pair; if that matches, keep the
  // process-wide client that already owns auth listeners + session.
  return env.url === defaultUrl && env.anonKey === defaultKey && Boolean(defaultUrl);
}

export const useDatabaseConfig = create<DatabaseConfigState>()(
  persist(
    (set, get) => ({
      activeEnvironment: null,
      environments: {
        // Default production environment (from .env)
        production: {
          name: "production",
          url: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
          anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
          description: "Production database",
        },
      },
      supabaseClient: null,

      switchEnvironment: async (envName: string) => {
        const { environments } = get();
        const env = environments[envName];

        if (!env) {
          throw new Error(`Environment "${envName}" not found`);
        }

        if (!env.url || !env.anonKey) {
          throw new Error(`Environment "${envName}" is not properly configured`);
        }

        const globalClient = getGlobalSupabaseClient();

        // Critical: do NOT replace the app-wide client when switching to the same
        // EXPO_PUBLIC endpoint. A fresh createClient() races AsyncStorage session
        // restore and briefly runs as anon → SQLSTATE 42501 on tasks/users/projects
        // after M-SUPABASE-02a REVOKE anon.
        if (sameEndpoint(env, globalClient) && globalClient) {
          await globalClient.auth.getSession();
          set({
            activeEnvironment: envName,
            supabaseClient: globalClient,
          });
          console.log(`✅ Bound to existing ${envName} Supabase client (session preserved)`);
          return;
        }

        const newClient = buildClient(env.url, env.anonKey);
        await assertSupabaseReachable(newClient, envName);
        // Ensure persisted JWT is attached before publishing (avoids anon 42501 race).
        await newClient.auth.getSession();

        set({
          activeEnvironment: envName,
          supabaseClient: newClient,
        });

        console.log(`✅ Switched to ${envName} environment`);
        publishGlobalSupabaseClient(newClient);
      },

      addEnvironment: (name: string, url: string, anonKey: string, description?: string) => {
        const { environments } = get();

        if (environments[name]) {
          throw new Error(`Environment "${name}" already exists`);
        }

        set({
          environments: {
            ...environments,
            [name]: {
              name,
              url,
              anonKey,
              description,
            },
          },
        });

        console.log(`✅ Added environment: ${name}`);
      },

      removeEnvironment: (name: string) => {
        const { environments, activeEnvironment } = get();

        if (name === "production") {
          throw new Error("Cannot remove production environment");
        }

        if (activeEnvironment === name) {
          throw new Error(
            "Cannot remove active environment. Switch to another environment first.",
          );
        }

        const { [name]: _removed, ...rest } = environments;

        set({ environments: rest });
        console.log(`✅ Removed environment: ${name}`);
      },

      getActiveClient: () => {
        return get().supabaseClient;
      },

      reinitializeClient: async () => {
        const { activeEnvironment, environments } = get();

        if (!activeEnvironment) {
          await get().switchEnvironment("production");
          return;
        }

        const env = environments[activeEnvironment];
        if (!env) {
          console.error(
            `Environment "${activeEnvironment}" not found, falling back to production`,
          );
          await get().switchEnvironment("production");
          return;
        }

        // Same-endpoint rehydrate: re-bind only, never swap global client.
        await get().switchEnvironment(activeEnvironment);
      },
    }),
    {
      name: "buildtrack-database-config",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeEnvironment: state.activeEnvironment,
        environments: state.environments,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log("🔄 DatabaseConfig rehydrated");
          state.reinitializeClient().catch((error) => {
            console.error("Failed to reinitialize Supabase client:", error);
          });
        }
      },
    },
  ),
);

// Initialize on first import — bind metadata only when possible; avoid client swap races.
setTimeout(() => {
  const store = useDatabaseConfig.getState();
  if (!store.activeEnvironment) {
    store.switchEnvironment("production").catch((error) => {
      console.error("Failed to initialize database config:", error);
    });
  }
}, 100);
