/* Authentication and the signed-in profile.
 *
 * Replaces the localStorage "accounts" system in the old root app.js, which stored
 * passwords in cleartext, wrote the password into the session object, and let anyone
 * reset any account by typing its email address. None of that code ever ran — app.js
 * was never referenced by the HTML — but none of it should be carried forward either.
 */

import { supabase, configured } from './supabase.js';

let session = null;
let profile = null;
let resolved = false;

const subscribers = [];

/** Register a callback fired whenever the auth state settles or changes. */
export function onAuthChange(fn) {
  subscribers.push(fn);
  if (resolved) fn(state());
}

export function state() {
  return { session, profile, user: session?.user ?? null, signedIn: !!session, resolved };
}

export const isSignedIn = () => !!session;
export const role = () => profile?.role ?? null;
export const canPostJobs = () => ['Alumni', 'Employer'].includes(role());
export const canApply = () => role() === 'Student';

function emit() {
  resolved = true;
  const snapshot = state();
  subscribers.forEach((fn) => fn(snapshot));
}

async function loadProfile() {
  if (!session) { profile = null; return; }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) console.error('[auth] profile load failed:', error.message);
  profile = data ?? null;
}

/** Resolve the session once at boot, before the first paint of auth-dependent chrome. */
export async function init() {
  if (!configured) { emit(); return state(); }

  const { data } = await supabase.auth.getSession();
  session = data.session ?? null;
  await loadProfile();
  emit();

  supabase.auth.onAuthStateChange(async (_event, next) => {
    const changed = next?.user?.id !== session?.user?.id;
    session = next ?? null;
    if (changed || !next) await loadProfile();
    emit();
  });

  return state();
}

export async function signUp({ fullName, email, password, role: userRole }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the handle_new_user() trigger out of raw_user_meta_data to seed public.profiles.
    options: { data: { full_name: fullName, role: userRole } },
  });
  if (error) throw error;

  // With email confirmation disabled, signUp returns a live session.
  if (data.session) {
    session = data.session;
    await loadProfile();
    emit();
  }
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  session = data.session;
  await loadProfile();
  emit();
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  session = null;
  profile = null;
  emit();
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

/** Update the signed-in user's own profile row.
 *  `role` is deliberately not updatable — the database revokes that column from
 *  `authenticated`, so a Student cannot promote themselves to Employer to post jobs. */
export async function updateProfile(patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', session.user.id)
    .select()
    .single();
  if (error) throw error;
  profile = data;
  emit();
  return data;
}
