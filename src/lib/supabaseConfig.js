export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

if (!config.supabaseUrl || !config.supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}
