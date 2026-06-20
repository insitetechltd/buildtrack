import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueryMeta {
  key: string;
  hasHydratedData: boolean;
  hasFetchedOnce: boolean;
  isInitialLoading: boolean;
  isBackgroundRefreshing: boolean;
  isManualRefreshing: boolean;
  lastFetchedAt: number | null;
  lastSuccessfulFetchAt: number | null;
  staleAt: number | null;
  expiresAt: number | null;
  error: string | null;
  emptyStateResolved: boolean;
}

export interface RequestCacheEnvelope<T = unknown> {
  key: string;
  data?: T;
  lastFetchedAt: number | null;
  lastSuccessfulFetchAt: number | null;
  staleAt: number | null;
  expiresAt: number | null;
  error: string | null;
  inFlight: boolean;
  source: 'cache' | 'network' | 'inflight' | null;
  version: number;
}

export interface SingleFlightRequestOptions {
  staleMs: number;
  ttlMs: number;
  forceRefresh?: boolean;
  now?: number;
}

export interface SingleFlightRequestResult<T> {
  data: T;
  source: 'cache' | 'network' | 'inflight';
  envelope: RequestCacheEnvelope<T>;
}

const requestCacheRegistry = new Map<string, RequestCacheEnvelope<unknown>>();
const inFlightRequestRegistry = new Map<string, Promise<SingleFlightRequestResult<unknown>>>();

function createEmptyRequestCacheEnvelope<T>(key: string): RequestCacheEnvelope<T> {
  return {
    key,
    lastFetchedAt: null,
    lastSuccessfulFetchAt: null,
    staleAt: null,
    expiresAt: null,
    error: null,
    inFlight: false,
    source: null,
    version: 0,
  };
}

export function buildResourceKey(...segments: Array<string | number | null | undefined | false>): string {
  return segments
    .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== false)
    .map(segment => String(segment).trim())
    .filter(segment => segment.length > 0)
    .join(':');
}

export function createQueryMeta(key: string, overrides: Partial<QueryMeta> = {}): QueryMeta {
  return {
    key,
    hasHydratedData: false,
    hasFetchedOnce: false,
    isInitialLoading: false,
    isBackgroundRefreshing: false,
    isManualRefreshing: false,
    lastFetchedAt: null,
    lastSuccessfulFetchAt: null,
    staleAt: null,
    expiresAt: null,
    error: null,
    emptyStateResolved: false,
    ...overrides,
  };
}

export function getRequestCacheEnvelope<T>(key: string): RequestCacheEnvelope<T> | null {
  const envelope = requestCacheRegistry.get(key);

  if (!envelope) {
    return null;
  }

  return {
    ...envelope,
  } as RequestCacheEnvelope<T>;
}

export function isRequestCacheFresh(key: string, now = Date.now()): boolean {
  const envelope = requestCacheRegistry.get(key);
  return Boolean(
    envelope &&
      envelope.data !== undefined &&
      envelope.staleAt !== null &&
      envelope.staleAt > now
  );
}

export function isRequestCacheExpired(key: string, now = Date.now()): boolean {
  const envelope = requestCacheRegistry.get(key);
  return Boolean(
    envelope &&
      envelope.expiresAt !== null &&
      envelope.expiresAt <= now
  );
}

export function upsertRequestCacheEnvelope<T>(
  key: string,
  partial: Partial<RequestCacheEnvelope<T>>
): RequestCacheEnvelope<T> {
  const current = (requestCacheRegistry.get(key) as RequestCacheEnvelope<T> | undefined) || createEmptyRequestCacheEnvelope<T>(key);
  const next: RequestCacheEnvelope<T> = {
    ...current,
    ...partial,
    key,
  };

  requestCacheRegistry.set(key, next as RequestCacheEnvelope<unknown>);
  return next;
}

export function invalidateResourceKeys(resourceKeys: string[]): void {
  const now = Date.now();

  resourceKeys.forEach((resourceKey) => {
    const current = requestCacheRegistry.get(resourceKey);

    if (!current) {
      return;
    }

    requestCacheRegistry.set(resourceKey, {
      ...current,
      staleAt: now - 1,
      expiresAt: now - 1,
      source: current.source,
      inFlight: false,
    });
  });
}

export function clearRequestCoordinator(): void {
  requestCacheRegistry.clear();
  inFlightRequestRegistry.clear();
}

export async function runSingleFlightRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: SingleFlightRequestOptions
): Promise<SingleFlightRequestResult<T>> {
  const now = options.now ?? Date.now();
  const existingEnvelope = getRequestCacheEnvelope<T>(key);

  if (!options.forceRefresh && existingEnvelope?.data !== undefined && isRequestCacheFresh(key, now)) {
    const envelope = upsertRequestCacheEnvelope<T>(key, {
      inFlight: false,
      source: 'cache',
    });

    return {
      data: existingEnvelope.data,
      source: 'cache',
      envelope,
    };
  }

  const inFlight = inFlightRequestRegistry.get(key) as Promise<SingleFlightRequestResult<T>> | undefined;

  if (inFlight) {
    return inFlight.then((result) => ({
      data: result.data,
      source: 'inflight',
      envelope: {
        ...result.envelope,
        source: 'inflight',
      },
    }));
  }

  upsertRequestCacheEnvelope<T>(key, {
    lastFetchedAt: now,
    staleAt: now + options.staleMs,
    expiresAt: now + options.ttlMs,
    error: null,
    inFlight: true,
    source: 'network',
  });

  const requestPromise = (async () => {
    try {
      const data = await fetcher();
      const completedAt = Date.now();
      const currentEnvelope = getRequestCacheEnvelope<T>(key);
      const envelope = upsertRequestCacheEnvelope<T>(key, {
        data,
        lastFetchedAt: now,
        lastSuccessfulFetchAt: completedAt,
        staleAt: now + options.staleMs,
        expiresAt: now + options.ttlMs,
        error: null,
        inFlight: false,
        source: 'network',
        version: (currentEnvelope?.version ?? 0) + 1,
      });

      return {
        data,
        source: 'network' as const,
        envelope,
      };
    } catch (error: any) {
      upsertRequestCacheEnvelope<T>(key, {
        lastFetchedAt: now,
        staleAt: now + options.staleMs,
        expiresAt: now + options.ttlMs,
        error: error?.message || String(error),
        inFlight: false,
        source: 'network',
      });
      throw error;
    } finally {
      inFlightRequestRegistry.delete(key);
    }
  })();

  inFlightRequestRegistry.set(
    key,
    requestPromise as Promise<SingleFlightRequestResult<unknown>>
  );

  return requestPromise;
}

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Missing Supabase configuration!\n' +
    'Please add these to your .env file:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...\n\n' +
    'Get these from: https://supabase.com/dashboard → Your Project → Settings → API\n' +
    'App will run in offline mode until configured.'
  );
}

// Create Supabase client (only if environment variables are available)
let _supabaseClient = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage for session persistence
    storage: AsyncStorage,
    
    // Auto refresh tokens
    autoRefreshToken: true,
    
    // Persist session across app restarts
    persistSession: true,
    
    // Don't detect session in URL (not needed for mobile)
    detectSessionInUrl: false,
  },
  
  // Global fetch options for better performance
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
  
  // Database options for better performance
  db: {
    schema: 'public',
  },
  
  // Real-time options (optional)
  realtime: {
    // Enable presence and broadcast features
    params: {
      eventsPerSecond: 10,
    },
  },
}) : null;

// Export mutable reference for backward compatibility
export let supabase = _supabaseClient;

if (supabase) {
  supabase.auth.onAuthStateChange(async (event) => {
    try {
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('👤 User signed out');
      } else if (event === 'USER_UPDATED') {
        console.log('👤 User updated');
      }
    } catch (error: any) {
      if (error?.message?.includes('Invalid Refresh Token') ||
          error?.message?.includes('Refresh Token Not Found')) {
        console.log('🔴 Invalid refresh token - clearing session');
        try {
          await AsyncStorage.removeItem('supabase.auth.token');
          await AsyncStorage.removeItem('sb-' + supabaseUrl?.split('//')[1]?.split('.')[0] + '-auth-token');
        } catch (storageError) {
          console.error('Error clearing auth storage:', storageError);
        }
      } else {
        console.error('Auth state change error:', error);
      }
    }
  });
}

/**
 * Set a new Supabase client (for environment switching)
 * @param newClient - New Supabase client instance
 */
export function setSupabaseClient(newClient: SupabaseClient | null) {
  _supabaseClient = newClient;
  // @ts-ignore - We need to reassign the exported const
  supabase = newClient;
  console.log('✅ Supabase client updated');
}

/**
 * Get the current active Supabase client
 * @returns Current Supabase client or null
 */
export function getSupabaseClient(): SupabaseClient | null {
  return _supabaseClient;
}

// Helper function to check connection
export async function checkSupabaseConnection() {
  // If Supabase client is not available, return false
  if (!supabase) {
    console.log('⚠️ Supabase not configured - running in offline mode');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase connected successfully!');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

// Helper function to check if Supabase is experiencing issues
export async function checkSupabaseHealth() {
  if (!supabase) return false;
  
  try {
    // Try a simple query to check health
    const { data, error } = await supabase
      .from('user_project_assignments')
      .select('id')
      .limit(1);
    
    if (error) {
      console.warn('⚠️ Supabase health check failed:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️ Supabase health check error:', error);
    return false;
  }
}

// Helper types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          type: string;
          description: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          logo: string | null;
          tax_id: string | null;
          license_number: string | null;
          insurance_expiry: string | null;
          banner: any | null;
          created_at: string;
          created_by: string | null;
          is_active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      // Add other tables here as needed
    };
  };
};

// Export typed client
export type TypedSupabaseClient = ReturnType<typeof createClient<Database>>;
