-- PINTU Karir — initial schema, RLS, and seed data.

create type public.user_role as enum ('Student', 'Alumni', 'Employer');

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text not null default '',
  role       public.user_role not null default 'Student',
  headline   text not null default '',
  university text not null default 'NTU',
  major      text not null default '',
  grad_year  text not null default '',
  bio        text not null default '',
  skills     text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- jobs

create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  company     text not null,
  job_type    text not null default 'Full-time',
  location    text not null default 'Remote',
  pay         text not null default 'Negotiable',
  skills      text[] not null default '{}',
  description text not null default '',
  accent      text not null default '#e9424f',
  posted_by   uuid references public.profiles(id) on delete set null, -- null = seeded listing
  created_at  timestamptz not null default now()
);

create index jobs_created_at_idx on public.jobs (created_at desc);
create index jobs_posted_by_idx  on public.jobs (posted_by);

-- ---------------------------------------------------------------- applications

create table public.applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  cover_letter text not null default '',
  status       text not null default 'Applied'
               check (status in ('Applied','Under review','Interview','Accepted','Rejected')),
  created_at   timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create index applications_applicant_idx on public.applications (applicant_id);
create index applications_job_idx       on public.applications (job_id);

-- ---------------------------------------------------------------- new-user trigger

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'role', '')::public.user_role,
      'Student'::public.user_role
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------- role helper
-- SECURITY DEFINER so policies can read a role without recursing through RLS.

create function public.auth_role()
returns public.user_role
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

-- ---------------------------------------------------------------- grants
-- `role` is deliberately excluded from the UPDATE grant: without this a Student could
-- promote themselves to Employer and gain permission to post jobs.

-- Supabase grants anon/authenticated broad privileges on new public tables by default,
-- so these must REVOKE before granting or the column-level grant constrains nothing.
revoke all on public.profiles     from anon, authenticated;
revoke all on public.jobs         from anon, authenticated;
revoke all on public.applications from anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant update (full_name, headline, university, major, grad_year, bio, skills)
  on public.profiles to authenticated;

grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;

-- applications are never readable by anonymous visitors
grant select, insert on public.applications to authenticated;
grant update (status) on public.applications to authenticated;

-- Both SECURITY DEFINER functions are otherwise exposed at /rest/v1/rpc/.
-- handle_new_user is a trigger function and must not be callable at all.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- auth_role is evaluated inside RLS policies with the caller's privileges, so
-- `authenticated` must keep EXECUTE. It only returns the caller's own role.
revoke all on function public.auth_role() from public, anon;
grant execute on function public.auth_role() to authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.profiles     enable row level security;
alter table public.jobs         enable row level security;
alter table public.applications enable row level security;

-- profiles: world-readable so alumni/applicant names render when signed out.
create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "users update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- jobs: public to read; only Alumni/Employer may create, and only as themselves.
create policy "jobs are viewable by everyone"
  on public.jobs for select
  using (true);

create policy "alumni and employers can post jobs"
  on public.jobs for insert
  to authenticated
  with check (
    (select auth.uid()) = posted_by
    and public.auth_role() in ('Alumni', 'Employer')
  );

create policy "owners can update their jobs"
  on public.jobs for update
  to authenticated
  using ((select auth.uid()) = posted_by)
  with check ((select auth.uid()) = posted_by);

create policy "owners can delete their jobs"
  on public.jobs for delete
  to authenticated
  using ((select auth.uid()) = posted_by);

-- applications: visible to the applicant and to the owner of the job applied to.
-- The subquery reads public.jobs, whose SELECT policy is `true` and never references
-- applications, so there is no recursive policy evaluation here.
create policy "applicants and job owners can view applications"
  on public.applications for select
  to authenticated
  using (
    (select auth.uid()) = applicant_id
    or exists (
      select 1 from public.jobs j
      where j.id = applications.job_id
        and j.posted_by = (select auth.uid())
    )
  );

create policy "students can apply"
  on public.applications for insert
  to authenticated
  with check (
    (select auth.uid()) = applicant_id
    and public.auth_role() = 'Student'
  );

create policy "job owners can move application status"
  on public.applications for update
  to authenticated
  using (
    exists (
      select 1 from public.jobs j
      where j.id = applications.job_id
        and j.posted_by = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------- seed
-- The ten listings the prototype hardcoded. posted_by is null (no owner).

insert into public.jobs (title, company, job_type, location, pay, skills, description, accent) values
  ('Marketing Intern','Northstar Labs','Internship','Remote • 15 hrs/week','$15–20/hr','{Marketing,"Social Media"}','Work with a friendly team on meaningful campaigns while building practical experience.','#d94d58'),
  ('Private Math Tutor','BrightPath Education','Tutoring','Singapore • 6 hrs/week','$30/hr','{Mathematics,Teaching}','Support secondary students one-on-one and build your teaching confidence.','#5b8e73'),
  ('Product Design Freelancer','Kite Studio','Freelance','Remote • Project based','$800/project','{Figma,"UX Research"}','Own a small product surface end to end, from research through to handoff.','#7865aa'),
  ('Software Engineering Intern','Fintech Foundry','Internship','Singapore • 20 hrs/week','$22/hr','{Python,React}','Ship real features alongside mentors, with weekly feedback and code review.','#4d83ad'),
  ('Social Media Freelancer','Mori Coffee','Freelance','Remote • Flexible','$400/month','{Content,TikTok}','Grow a warm local coffee brand across short-form video and community posts.','#b66f45'),
  ('Research Assistant','NTU Enterprise','Part-time','NTU • 10 hrs/week','$18/hr','{Research,Excel}','Support an active research team with data collection, cleaning and analysis.','#6c7f90'),
  ('Business Analyst Intern','Orbit Asia','Internship','Hybrid • 3 months','$20/hr','{Analytics,SQL}','Turn messy operational data into decisions the leadership team actually uses.','#c08b3e'),
  ('Graphic Design Freelancer','Lumen Events','Freelance','Remote • Flexible','$500/project','{Illustrator,Branding}','Design event identities end to end, from key visual to on-site collateral.','#b65e83'),
  ('Campus Brand Ambassador','Loop App','Part-time','NTU • 8 hrs/week','$16/hr','{Community,Events}','Represent the product on campus and run small events that grow the community.','#559b90'),
  ('English Conversation Partner','Lingua Club','Tutoring','Remote • 4 hrs/week','$22/hr','{English,Communication}','Run relaxed conversation sessions that build learners'' fluency and confidence.','#8b6a52');
