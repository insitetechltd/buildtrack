import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
