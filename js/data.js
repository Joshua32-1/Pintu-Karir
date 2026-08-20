/* Data access.
 *
 * Jobs, applications and profiles come from Supabase. Alumni, connections, messages and
 * mentorship requests remain browser-local for now (a deliberate scoping decision) but are
 * kept behind the same function-shaped API so they can move to Postgres without touching
 * the UI layer.
 */

import { supabase, configured } from './supabase.js';

/* ---------------- localStorage helpers (unchanged prototype behaviour) ---------------- */

export const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};

/* ---------------- alumni (static seed data) ---------------- */

export const alumni = [
  ['ML', 'Maya Lim', 'Product Manager', 'Google', 'Product strategy • Tech career'],
  ['JP', 'Jason Phua', 'Software Engineer', 'Grab', 'Engineering • Interviews'],
  ['SN', 'Sofia Ng', 'Marketing Lead', 'Shopee', 'Growth • Brand strategy'],
  ['AR', 'Aditya Rao', 'Business Analyst', 'McKinsey', 'Consulting • Case prep'],
  ['EL', 'Evan Lee', 'Founder', 'Kopi Labs', 'Startups • Fundraising'],
  ['SC', 'Sarah Chua', 'UX Designer', 'Apple', 'Design • Portfolio'],
  ['DH', 'Danish Hassan', 'Data Scientist', 'ByteDance', 'Data • Career switch'],
  ['NT', 'Nadia Tan', 'HR Manager', 'Sea Group', 'CV review • Hiring'],
];

/* ---------------- jobs ---------------- */

let jobCache = [];
export const jobs = () => jobCache;
export const jobById = (id) => jobCache.find((j) => j.id === id) || null;

export async function loadJobs() {
  if (!configured) { jobCache = []; return jobCache; }
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('[data] loadJobs:', error.message); return jobCache; }
  jobCache = data ?? [];
  return jobCache;
}

export async function createJob(job) {
  const { data, error } = await supabase.from('jobs').insert(job).select().single();
  if (error) throw error;
  jobCache.unshift(data);
  return data;
}

/** Fake "% Match" in the prototype was hardcoded per job. Derive it instead from the
 *  overlap between the viewer's skills and the job's, so it means something. Returns null
 *  when signed out or when the profile has no skills yet. */
export function matchScore(job, profile) {
  const mine = (profile?.skills ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean);
  if (!mine.length) return null;
  const theirs = (job.skills ?? []).map((s) => s.toLowerCase().trim());
  if (!theirs.length) return null;
  const hits = theirs.filter((s) => mine.some((m) => m.includes(s) || s.includes(m))).length;
  return Math.round(40 + (hits / theirs.length) * 55);
}

/* ---------------- applications ---------------- */

let appCache = [];
export const applications = () => appCache;

export async function loadApplications() {
  if (!configured) { appCache = []; return appCache; }
  const { data, error } = await supabase
    .from('applications')
    .select('*, job:jobs(*), applicant:profiles(id, full_name)')
    .order('created_at', { ascending: false });
  // RLS returns only rows the viewer may see: their own, plus applications to jobs they posted.
  if (error) { console.error('[data] loadApplications:', error.message); return appCache; }
  appCache = data ?? [];
  return appCache;
}

export async function applyToJob({ jobId, applicantId, coverLetter }) {
  const { data, error } = await supabase
    .from('applications')
    .insert({ job_id: jobId, applicant_id: applicantId, cover_letter: coverLetter })
    .select('*, job:jobs(*)')
    .single();
  if (error) throw error;
  appCache.unshift(data);
  return data;
}

export async function setApplicationStatus(id, status) {
  const { data, error } = await supabase
    .from('applications').update({ status }).eq('id', id).select('*, job:jobs(*), applicant:profiles(id, full_name)').single();
  if (error) throw error;
  appCache = appCache.map((a) => (a.id === id ? data : a));
  return data;
}

export const hasApplied = (jobId, userId) =>
  appCache.some((a) => a.job_id === jobId && a.applicant_id === userId);

/* ---------------- network, messages, mentorship (browser-local) ---------------- */

export const network = {
  all: () => store.get('pintuConnections', {}),
  state: (name) => store.get('pintuConnections', {})[name] || 'Connect',
  set(name, value) {
    const all = store.get('pintuConnections', {});
    all[name] = value;
    store.set('pintuConnections', all);
  },
  connected: () => Object.entries(store.get('pintuConnections', {}))
    .filter(([, v]) => v === 'Connected').map(([k]) => k),
};

export const messages = {
  all: () => store.get('pintuMessages', {}),
  thread: (name) => store.get('pintuMessages', {})[name] || [],
  push(name, message) {
    const all = store.get('pintuMessages', {});
    (all[name] ||= []).push(message);
    store.set('pintuMessages', all);
  },
};

export const mentorship = {
  all: () => store.get('pintuMentorships', []),
  add(request) {
    const all = store.get('pintuMentorships', []);
    all.push(request);
    store.set('pintuMentorships', all);
  },
};
