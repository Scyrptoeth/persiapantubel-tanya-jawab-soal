import { createClient } from "@supabase/supabase-js";

// Supabase is now disabled to support Privacy-First (Local-Only) architecture.
// All historical data is stored exclusively in the user's localStorage.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

/**
 * @deprecated Cloud sync is disabled. Use localStorage instead.
 */
export async function saveToTutorHistory(_params: any) {
  return null;
}

/**
 * @deprecated Cloud sync is disabled.
 */
export async function updateTutorHistory(_id: number, _metadata: any) {
  return;
}

/**
 * @deprecated Cloud sync is disabled.
 */
export async function fetchTutorHistory(_domain: string, _limit = 20) {
  return [];
}
