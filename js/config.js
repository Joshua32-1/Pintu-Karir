/* Supabase connection settings.
 *
 * The publishable ("anon") key is designed to be shipped in browser code — it identifies
 * the project, it does not grant access. Row Level Security is what actually protects the
 * data, and every table in this project has it enabled. The service_role key is secret and
 * is never used by this app and never belongs in this repo.
 *
 * There is no build step here, so these are plain committed constants rather than env vars.
 */
export const SUPABASE_URL = '__SUPABASE_URL__';
export const SUPABASE_PUBLISHABLE_KEY = '__SUPABASE_PUBLISHABLE_KEY__';

export const isConfigured = () =>
  !SUPABASE_URL.startsWith('__') && !SUPABASE_PUBLISHABLE_KEY.startsWith('__');
