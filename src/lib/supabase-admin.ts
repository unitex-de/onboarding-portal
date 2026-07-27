import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

/**
 * Admin-Client mit Service-Role-Key – umgeht RLS.
 * NUR in serverseitigem Code verwenden (Server Functions, API-Routen),
 * NIEMALS im Client-Bundle importieren.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});