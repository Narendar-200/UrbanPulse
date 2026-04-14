import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[UrbanPulse backend] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Set them in backend/.env for full API functionality."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    })
  : null;
