import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export const useDatabaseConfig = create<DatabaseConfigState>()(
  persist(
    (set, get) => ({
      activeEnvironment: null,
      environments: {
        // Default production environment (from .env)
        production: {
          name: 'production',
          url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
          anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          description: 'Production database',
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

        // Create new Supabase client
        const newClient = createClient(env.url, env.anonKey, {
          auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
          global: {
            headers: {
              'x-client-info': 'buildtrack-mobile',
            },
            fetch: (url, options = {}) => {
              // Add timeout to all requests (10 seconds)
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);
              
              return fetch(url, {
                ...options,
                signal: controller.signal,
              }).finally(() => clearTimeout(timeoutId));
            },
          },
          db: {
            schema: 'public',
          },
        });

        // Test connection
        try {
          const { error } = await newClient.from('companies').select('id').limit(1);
          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is ok
            throw error;
          }
        } catch (error: any) {
          throw new Error(`Failed to connect to ${envName}: ${error.message}`);
        }

        set({
          activeEnvironment: envName,
          supabaseClient: newClient,
        });

        console.log(`✅ Switched to ${envName} environment`);

        // Update global supabase instance (for backward compatibility)
        // This requires modifying src/api/supabase.ts to export a mutable reference
        const supabaseModule = require('../api/supabase');
        if (supabaseModule.setSupabaseClient) {
          supabaseModule.setSupabaseClient(newClient);
        }
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
        
        if (name === 'production') {
          throw new Error('Cannot remove production environment');
        }

        if (activeEnvironment === name) {
          throw new Error('Cannot remove active environment. Switch to another environment first.');
        }

        const { [name]: removed, ...rest } = environments;
        
        set({ environments: rest });
        console.log(`✅ Removed environment: ${name}`);
      },

      getActiveClient: () => {
        return get().supabaseClient;
      },

      reinitializeClient: async () => {
        const { activeEnvironment, environments } = get();
        
        if (!activeEnvironment) {
          // Initialize with production by default
          await get().switchEnvironment('production');
          return;
        }

        const env = environments[activeEnvironment];
        if (!env) {
          console.error(`Environment "${activeEnvironment}" not found, falling back to production`);
          await get().switchEnvironment('production');
          return;
        }

        // Recreate client
        const newClient = createClient(env.url, env.anonKey, {
          auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
          global: {
            headers: {
              'x-client-info': 'buildtrack-mobile',
            },
            fetch: (url, options = {}) => {
              // Add timeout to all requests (10 seconds)
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);
              
              return fetch(url, {
                ...options,
                signal: controller.signal,
              }).finally(() => clearTimeout(timeoutId));
            },
          },
          db: {
            schema: 'public',
          },
        });

        set({ supabaseClient: newClient });
        
        // Update global supabase instance
        const supabaseModule = require('../api/supabase');
        if (supabaseModule.setSupabaseClient) {
          supabaseModule.setSupabaseClient(newClient);
        }
      },
    }),
    {
      name: 'buildtrack-database-config',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeEnvironment: state.activeEnvironment,
        environments: state.environments,
        // Don't persist the client itself
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('🔄 DatabaseConfig rehydrated');
          // Reinitialize client after rehydration
          state.reinitializeClient().catch((error) => {
            console.error('Failed to reinitialize Supabase client:', error);
          });
        }
      },
    }
  )
);

// Initialize on first import
setTimeout(() => {
  const store = useDatabaseConfig.getState();
  if (!store.activeEnvironment) {
    store.switchEnvironment('production').catch((error) => {
      console.error('Failed to initialize database config:', error);
    });
  }
}, 100);

