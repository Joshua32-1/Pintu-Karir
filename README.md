# PINTU Karir

A student career marketplace prototype for NTU Singapore — job discovery, alumni
mentorship, and a LinkedIn-style network with messaging.

Plain HTML, CSS and ES modules. **No build step, no npm, no framework.**
Accounts and opportunities are backed by [Supabase](https://supabase.com).

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works. It must be served over HTTP rather than opened as a
`file://` URL, because the app loads ES modules.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor. It creates the
   `profiles`, `jobs` and `applications` tables, the `handle_new_user` trigger,
   all row-level-security policies, and seeds ten opportunities.
3. Under **Authentication → Providers → Email**, turn *Confirm email* **off** so
   sign-up signs the user straight in.
4. Under **Authentication → URL Configuration**, add `http://localhost:8000` to
   the redirect allow-list.
5. Put your project URL and publishable key into `js/config.js`.

The publishable (anon) key belongs in client code — it identifies the project and
grants no access on its own. Row-level security is what protects the data. The
`service_role` key is secret and is not used by this app.

## Accounts

Sign-up asks for an account type, which decides what you can do:

| Role | Can do |
|---|---|
| **Student** | Apply to opportunities, track application status |
| **Alumni** / **Employer** | Post opportunities, review applicants, move their status |

Account type is enforced in the database, not just the UI — the `role` column is
excluded from the `authenticated` update grant, so an account cannot promote itself.

## Layout

```
index.html                     markup for every view
styles.css                     the design system
js/config.js                   Supabase URL + publishable key
js/supabase.js                 shared client (loaded from esm.sh)
js/auth.js                     sign up / in / out, session, profile
js/data.js                     jobs + applications (Supabase); network + chat (localStorage)
js/ui.js                       DOM helpers, routing, modal
js/app.js                      rendering and event wiring
supabase/migrations/           schema, policies, seed data
```

Connections, messages and mentorship requests are still browser-local, behind the
same function-shaped API in `js/data.js` so they can move to Postgres later.
