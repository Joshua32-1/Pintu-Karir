/* PINTU Karir — application wiring.
 *
 * Replaces the three inline <script> blocks in the old hello.html plus the orphaned root
 * app.js (which the HTML never loaded). Every interaction that previously had no handler,
 * or threw on an undefined `$` / `modalBody`, is wired here.
 */

import { $, $$, esc, initials, go, onNavigate, openNav, closeNav, openModal, closeModal, modalError, withPending } from './ui.js';
import { configured } from './supabase.js';
import * as auth from './auth.js';
import {
  alumni, jobs, jobById, loadJobs, createJob, matchScore,
  applications, loadApplications, applyToJob, setApplicationStatus, hasApplied,
  network, messages, mentorship,
} from './data.js';

let activeChat = '';
let currentJobId = null;
let seenNotifications = Number(localStorage.getItem('pintuSeenNotifications') || 0);

const JOB_TYPES = ['Internship', 'Part-time', 'Freelance', 'Tutoring'];

/* ============================ rendering ============================ */

function jobCard(job, { list = false } = {}) {
  const score = matchScore(job, auth.state().profile);
  const skills = (job.skills ?? []).map((s) => `<span class="tag">${esc(s)}</span>`).join('');
  return `<article class="job" data-job="${esc(job.id)}">
    <div class="company">
      <span class="logo" style="background:${esc(job.accent || '#e9424f')}">${esc((job.company || '?')[0])}</span>
      <div><h3>${esc(job.title)}</h3><small>${esc(job.company)} &#10003;</small></div>
    </div>
    <div class="${list ? 'job-body' : ''}">
      <div class="meta">${esc(job.job_type)} &middot; ${esc(job.location)}</div>
      <div class="pay">${esc(job.pay)}</div>
      ${score ? `<span class="match">${score}% Match</span>` : ''}
      <div class="tags">${skills}</div>
    </div>
  </article>`;
}

function personCard(person, buttons) {
  const [ini, name, roleName, company, topics] = person;
  const tags = topics.split(' • ').map((t) => `<span class="tag">${esc(t)}</span>`).join('');
  return `<article class="person" data-person="${esc(name)}">
    <div class="person-top">
      <div class="avatar">${esc(ini)}</div>
      <div><h3>${esc(name)}</h3><p>${esc(roleName)} @ ${esc(company)}</p></div>
    </div>
    <div class="tags">${tags}</div>
    ${buttons}
  </article>`;
}

function renderHome() {
  const all = jobs();
  $('#recommend').innerHTML = all.length
    ? all.slice(0, 3).map((j) => jobCard(j)).join('')
    : `<p class="empty">${configured ? 'No opportunities posted yet.' : 'Connect Supabase to load opportunities.'}</p>`;

  // Category tiles were inert <div>s with fabricated counts (24/18/12/31 against 10 jobs).
  $('#categories').innerHTML = JOB_TYPES.map((type) => {
    const n = all.filter((j) => j.job_type === type).length;
    const icon = { Internship: '&#9635;', 'Part-time': '&#9719;', Freelance: '&#10022;', Tutoring: '&#9825;' }[type];
    return `<button class="cat" data-cat="${esc(type)}">${icon}<strong>${esc(type)}</strong>
      <small>${n} ${n === 1 ? 'opportunity' : 'opportunities'}</small></button>`;
  }).join('');

  $('#homeAlumni').innerHTML = alumni.slice(0, 3)
    .map((a) => personCard(a, `<button class="btn ghost block" style="margin-top:14px" data-mentor="${esc(a[1])}">Ask for mentorship</button>`))
    .join('');
}

function filteredJobs() {
  const q = ($('#search')?.value || '').toLowerCase().trim();
  const type = $('#filterType')?.value || 'All';
  const loc = $('#filterLocation')?.value || 'All';
  const extra = ($('#filterKeyword')?.value || '').toLowerCase().trim();

  return jobs().filter((j) => {
    const text = [j.title, j.company, j.job_type, j.location, j.pay, (j.skills || []).join(' '), j.description]
      .join(' ').toLowerCase();
    return (!q || text.includes(q))
      && (!extra || text.includes(extra))
      && (type === 'All' || j.job_type === type)
      && (loc === 'All' || (j.location || '').toLowerCase().includes(loc.toLowerCase()));
  });
}

function renderExplore() {
  const results = filteredJobs();
  $('#jobs').innerHTML = results.length
    ? results.map((j) => jobCard(j, { list: true })).join('')
    : '<div class="profile"><p class="empty">No opportunities match these filters.</p></div>';
  $('#resultCount').textContent = `${results.length} ${results.length === 1 ? 'opportunity' : 'opportunities'}`;
}

function renderMentorship(query = '') {
  const q = query.toLowerCase();
  $('#allAlumni').innerHTML = alumni
    .filter((a) => a.join(' ').toLowerCase().includes(q))
    .map((a) => personCard(a, `<button class="btn ghost block" style="margin-top:14px" data-mentor="${esc(a[1])}">Ask for mentorship</button>`))
    .join('') || '<p class="empty">No alumni match that search.</p>';
}

function renderNetwork(query = '') {
  const q = query.toLowerCase();
  $('#networkPeople').innerHTML = alumni
    .filter((a) => a.join(' ').toLowerCase().includes(q))
    .map((a) => {
      const s = network.state(a[1]);
      return personCard(a,
        `<button class="btn ${s === 'Connected' ? 'ghost' : 'red'} block" style="margin-top:14px" data-connect="${esc(a[1])}">${esc(s)}</button>`
        + (s === 'Connected' ? `<button class="btn ghost block" style="margin-top:6px" data-chat="${esc(a[1])}">Message</button>` : ''));
    }).join('') || '<p class="empty">No alumni match that search.</p>';

  const n = network.connected().length;
  $('#connectionCount').textContent = `${n} ${n === 1 ? 'connection' : 'connections'}`;
}

function renderMessages() {
  const names = network.connected();
  $('#conversationList').innerHTML = '<h3>Conversations</h3>' + (names.length
    ? names.map((n) => `<button class="btn ghost block" style="text-align:left;margin:4px 0" data-chat="${esc(n)}">${esc(n)}</button>`).join('')
    : '<p class="empty">Connect with alumni first.</p>');
  renderChat();
}

function renderChat() {
  const box = $('#chatWindow');
  if (!activeChat) { box.innerHTML = '<p class="empty">Choose a connected person to start chatting.</p>'; return; }
  if (network.state(activeChat) !== 'Connected') {
    box.innerHTML = '<p class="empty">You can only message connected users.</p>';
    return;
  }
  const thread = messages.thread(activeChat);
  box.innerHTML = `<h3>${esc(activeChat)}</h3>
    <div class="chat-scroll">${thread.length
      ? thread.map((m) => `<p style="background:${m.from === 'me' ? '#fff0f0' : '#f3f5f7'};padding:9px 12px;border-radius:10px;margin:7px 0;max-width:80%;${m.from === 'me' ? 'margin-left:auto' : ''}">${esc(m.text)}<small class="meta" style="display:block">${esc(m.time)}</small></p>`).join('')
      : `<p class="empty">Start a conversation with ${esc(activeChat)}.</p>`}</div>
    <div class="search" style="margin-bottom:0">
      <input id="messageInput" placeholder="Write a message...">
      <button class="btn red" id="sendMessage">Send</button>
    </div>`;
  const scroll = $('.chat-scroll', box);
  scroll.scrollTop = scroll.scrollHeight;
}

function renderApplications() {
  const { user, profile } = auth.state();
  const mine = user ? applications().filter((a) => a.applicant_id === user.id) : [];
  $('#appCount').textContent = `${mine.length} total`;
  $('#apps').innerHTML = mine.length
    ? mine.map((a) => `<div class="application">
        <span class="logo" style="background:${esc(a.job?.accent || '#e9424f')}">${esc((a.job?.company || '?')[0])}</span>
        <div><b>${esc(a.job?.title || 'Opportunity')}</b>
          <div class="meta">${esc(a.job?.company || '')} &middot; Applied ${new Date(a.created_at).toLocaleDateString()}</div></div>
        <span class="status">${esc(a.status)}</span></div>`).join('')
    : `<p class="empty">${auth.isSignedIn() ? 'No applications yet. Explore opportunities to get started.' : 'Sign in to track your applications.'}</p>`;

  // Employers/alumni see applications to jobs they posted, and can move the status.
  const inbox = $('#employerInbox');
  if (!auth.canPostJobs()) { inbox.innerHTML = ''; return; }
  const received = applications().filter((a) => a.applicant_id !== user?.id);
  inbox.innerHTML = `<div class="section-head"><h2>Applications received</h2>
      <span class="meta">${received.length} total</span></div>
    <div class="timeline">${received.length
      ? received.map((a) => `<div class="application">
          <span class="avatar">${esc(initials(a.applicant?.full_name))}</span>
          <div><b>${esc(a.applicant?.full_name || 'Applicant')}</b>
            <div class="meta">${esc(a.job?.title || '')} &middot; ${new Date(a.created_at).toLocaleDateString()}</div>
            ${a.cover_letter ? `<p class="meta">${esc(a.cover_letter)}</p>` : ''}</div>
          <select class="status-select" data-app="${esc(a.id)}" style="margin-left:auto">
            ${['Applied', 'Under review', 'Interview', 'Accepted', 'Rejected']
              .map((s) => `<option${s === a.status ? ' selected' : ''}>${s}</option>`).join('')}
          </select></div>`).join('')
      : '<p class="empty">No one has applied to your postings yet.</p>'}</div>`;
}

function renderProfile() {
  const { profile } = auth.state();
  const card = $('#profileCard');
  if (!profile) {
    card.innerHTML = '<p class="empty">Sign in to view and edit your profile.</p>';
    return;
  }
  // Completeness is computed from what's actually filled in, not the hardcoded 80%
  // the prototype used — and the bar is rebuilt here rather than destroyed by innerHTML.
  const fields = ['full_name', 'headline', 'university', 'major', 'grad_year', 'bio'];
  const filled = fields.filter((f) => String(profile[f] || '').trim()).length
    + ((profile.skills || []).length ? 1 : 0);
  const pct = Math.round((filled / (fields.length + 1)) * 100);

  card.innerHTML = `<div class="welcome">
      <div class="avatar" style="width:65px;height:65px;font-size:20px">${esc(initials(profile.full_name))}</div>
      <div><h2 style="margin:0">${esc(profile.full_name || 'Unnamed')}</h2>
        <p class="meta">${esc(profile.headline || 'No headline yet')}<br>
          ${esc(profile.major || '—')} &middot; ${esc(profile.university || '—')}
          ${profile.grad_year ? `&middot; Class of ${esc(profile.grad_year)}` : ''}
          &middot; <b>${esc(profile.role)}</b></p></div>
    </div>
    <div class="section-head"><h3>Profile completeness</h3><b>${pct}%</b></div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    ${pct < 100 ? '<p class="meta">Add your remaining details to improve job matching.</p>' : ''}
    <div class="section-head"><h3>About</h3></div>
    <p>${esc(profile.bio || 'No bio yet.')}</p>
    <div class="tags">${(profile.skills || []).map((s) => `<span class="tag">${esc(s)}</span>`).join('') || '<span class="empty">No skills added yet.</span>'}</div>`;
}

function renderHeader() {
  const { profile, signedIn } = auth.state();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';
  $('#headerGreeting').textContent = signedIn ? greeting : 'Welcome';
  $('#headerName').textContent = signedIn ? (profile?.full_name || 'Member') : 'Guest';
  $('#headerAvatar').textContent = signedIn ? initials(profile?.full_name) : '?';
  $('#authButton').textContent = signedIn ? 'Log out' : 'Sign in';
  $('#postJobButton').hidden = !auth.canPostJobs();
  document.documentElement.dataset.auth = signedIn ? 'in' : 'out';
}

/* ============================ notifications ============================ */

function notificationItems() {
  const { user } = auth.state();
  if (!user) return [];
  return applications()
    .filter((a) => a.applicant_id === user.id && a.status !== 'Applied')
    .map((a) => ({
      text: `${a.job?.title || 'Your application'} moved to “${a.status}”`,
      at: new Date(a.created_at).toLocaleDateString(),
    }));
}

function renderNotifications() {
  const items = notificationItems();
  $('#notifDot').hidden = items.length <= seenNotifications;
  $('#notifPanel').innerHTML = items.length
    ? `<h3 style="margin:0 0 8px">Notifications</h3>` + items.map((i) => `<div class="notif-item">${esc(i.text)}<div class="meta">${esc(i.at)}</div></div>`).join('')
    : '<p class="empty">Nothing new right now.</p>';
}

/* ============================ modals ============================ */

function authModal(tab = 'in') {
  const signin = `
    <label>Email</label><input id="email" type="email" autocomplete="email">
    <label>Password</label><input id="password" type="password" autocomplete="current-password">
    <button class="btn red block" id="doSignIn" style="margin-top:14px">Sign in</button>
    <button class="link" id="doForgot" style="margin-top:12px">Forgot password?</button>`;
  const signup = `
    <label>Full name</label><input id="fullName" autocomplete="name">
    <label>Email</label><input id="email" type="email" autocomplete="email">
    <label>Password</label><input id="password" type="password" autocomplete="new-password">
    <label>I am a</label>
    <select id="role"><option>Student</option><option>Alumni</option><option>Employer</option></select>
    <p class="form-note">Students apply to opportunities. Alumni and Employers can post them.</p>
    <button class="btn red block" id="doSignUp" style="margin-top:14px">Create account</button>`;

  openModal(`<h2>Welcome to PINTU Karir</h2>
    <div class="auth-tabs">
      <button class="chip ${tab === 'in' ? 'active' : ''}" id="tabIn">Sign in</button>
      <button class="chip ${tab === 'up' ? 'active' : ''}" id="tabUp">Sign up</button>
    </div>
    <div id="authForm">${tab === 'in' ? signin : signup}</div>`);

  $('#tabIn').onclick = () => authModal('in');
  $('#tabUp').onclick = () => authModal('up');

  const button = $('#doSignIn') || $('#doSignUp');
  const submit = async () => {
    const email = $('#email').value.trim();
    const password = $('#password').value;
    if (!email || !password) return modalError('Email and password are required.');
    try {
      if (tab === 'in') {
        await withPending(button, 'Signing in…', () => auth.signIn({ email, password }));
      } else {
        const fullName = $('#fullName').value.trim();
        if (!fullName) return modalError('Please enter your full name.');
        if (password.length < 6) return modalError('Password must be at least 6 characters.');
        await withPending(button, 'Creating account…', () => auth.signUp({
          fullName, email, password, role: $('#role').value,
        }));
      }
      closeModal();
      await refreshRemote();
    } catch (err) {
      modalError(err.message || 'Something went wrong. Please try again.');
    }
  };

  button.onclick = submit;
  $('#password').onkeydown = (e) => { if (e.key === 'Enter') submit(); };

  if ($('#doForgot')) $('#doForgot').onclick = async () => {
    const email = $('#email').value.trim();
    if (!email) return modalError('Enter your email above first, then click Forgot password.');
    try {
      await auth.resetPassword(email);
      modalError('If that account exists, a reset link is on its way.');
    } catch (err) { modalError(err.message); }
  };
}

function applyModal(job) {
  if (!auth.isSignedIn()) return authModal('in');
  if (!auth.canApply()) {
    return openModal(`<h2>Students only</h2><p class="meta">Your account is registered as
      <b>${esc(auth.role())}</b>. Only Student accounts can apply to opportunities.</p>`);
  }
  const { user } = auth.state();
  if (hasApplied(job.id, user.id)) {
    return openModal(`<h2>Already applied</h2><p class="meta">You've already applied to
      ${esc(job.title)} at ${esc(job.company)}.</p>`);
  }

  openModal(`<h2>Apply to this opportunity</h2>
    <p class="meta">${esc(job.title)} &middot; ${esc(job.company)}. Your profile will be shared with the employer.</p>
    <label>Cover letter / message</label>
    <textarea id="cover" placeholder="Tell them why you're a great fit..."></textarea>
    <button class="btn red block" id="doApply" style="margin-top:10px">Submit application</button>`);

  $('#doApply').onclick = async () => {
    try {
      await withPending($('#doApply'), 'Submitting…', () => applyToJob({
        jobId: job.id, applicantId: user.id, coverLetter: $('#cover').value.trim(),
      }));
      closeModal();
      renderApplications();
      renderNotifications();
      go('applications');
    } catch (err) {
      modalError(err.code === '23505'
        ? 'You have already applied to this opportunity.'
        : err.message || 'Could not submit your application.');
    }
  };
}

function postJobModal() {
  if (!auth.isSignedIn()) return authModal('in');
  if (!auth.canPostJobs()) {
    return openModal(`<h2>Not available</h2><p class="meta">Only Alumni and Employer accounts
      can post opportunities. Your account is a ${esc(auth.role())} account.</p>`);
  }
  openModal(`<h2>Post an opportunity</h2>
    <label>Job title</label><input id="jTitle">
    <label>Company</label><input id="jCompany">
    <label>Job type</label>
    <select id="jType"><option>Internship</option><option>Part-time</option><option>Full-time</option><option>Freelance</option><option>Tutoring</option></select>
    <label>Location</label><input id="jLocation" placeholder="Remote, Singapore, Hybrid, NTU">
    <label>Pay</label><input id="jPay" placeholder="$20/hr">
    <label>Skills (comma separated)</label><input id="jSkills" placeholder="Python, React">
    <label>Description</label><textarea id="jDesc"></textarea>
    <button class="btn red block" id="doPost" style="margin-top:10px">Publish opportunity</button>`);

  $('#doPost').onclick = async () => {
    const title = $('#jTitle').value.trim();
    const company = $('#jCompany').value.trim();
    const description = $('#jDesc').value.trim();
    if (!title || !company || !description) {
      return modalError('Job title, company and description are required.');
    }
    try {
      await withPending($('#doPost'), 'Publishing…', () => createJob({
        title, company,
        job_type: $('#jType').value,
        location: $('#jLocation').value.trim() || 'Remote',
        pay: $('#jPay').value.trim() || 'Negotiable',
        skills: $('#jSkills').value.split(',').map((s) => s.trim()).filter(Boolean),
        description,
        posted_by: auth.state().user.id,
      }));
      closeModal();
      renderHome(); renderExplore();
      go('explore');
    } catch (err) {
      modalError(err.message || 'Could not publish this opportunity.');
    }
  };
}

function profileModal() {
  const { profile } = auth.state();
  if (!profile) return authModal('in');
  openModal(`<form id="profileForm">
    <h2>Edit profile</h2>
    <p class="form-note">Keep these details current to improve your job matches and make your profile easier to discover.</p>
    <label>Full name <span aria-hidden="true">*</span></label><input id="pName" required maxlength="80" autocomplete="name" value="${esc(profile.full_name)}">
    <label>Headline</label><input id="pHeadline" maxlength="120" placeholder="e.g. UX Design student seeking internships" value="${esc(profile.headline)}">
    <label>University</label><input id="pUni" maxlength="120" value="${esc(profile.university)}">
    <label>Major</label><input id="pMajor" maxlength="120" value="${esc(profile.major)}">
    <label>Graduation year</label><input id="pYear" inputmode="numeric" maxlength="4" placeholder="e.g. 2027" value="${esc(profile.grad_year)}">
    <label>About you</label><textarea id="pBio" maxlength="600" placeholder="Share a little about your goals, experience, and what you are looking for.">${esc(profile.bio)}</textarea>
    <label>Skills <small class="meta">Separate each skill with a comma</small></label><input id="pSkills" maxlength="300" placeholder="e.g. Figma, User Research, HTML" value="${esc((profile.skills || []).join(', '))}">
    <p class="form-note">Account type is ${esc(profile.role)} and cannot be changed here.</p>
    <div class="modal-actions"><button class="btn ghost" type="button" id="cancelProfile">Cancel</button><button class="btn red" type="submit" id="doSaveProfile">Save changes</button></div>
  </form>`);

  $('#cancelProfile').onclick = closeModal;
  $('#profileForm').onsubmit = async (event) => {
    event.preventDefault();
    const fullName = $('#pName').value.trim();
    const gradYear = $('#pYear').value.trim();
    const skills = [...new Set($('#pSkills').value.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 20);
    if (!fullName) return modalError('Please enter your full name.');
    if (gradYear && !/^(19|20)\d{2}$/.test(gradYear)) return modalError('Please enter a valid four-digit graduation year.');
    try {
      await withPending($('#doSaveProfile'), 'Saving…', () => auth.updateProfile({
        full_name: fullName,
        headline: $('#pHeadline').value.trim(),
        university: $('#pUni').value.trim(),
        major: $('#pMajor').value.trim(),
        grad_year: gradYear,
        bio: $('#pBio').value.trim(),
        skills,
      }));
      renderHeader();
      renderProfile();
      closeModal();
      showProfileSaved();
    } catch (err) { modalError(err.message || 'Could not save your profile.'); }
  };
}

function showProfileSaved() {
  const card = $('#profileCard');
  const notice = document.createElement('p');
  notice.className = 'profile-saved';
  notice.setAttribute('role', 'status');
  notice.textContent = '✓ Profile updated successfully';
  card.prepend(notice);
  setTimeout(() => notice.remove(), 3500);
}

function mentorModal(name) {
  if (!auth.isSignedIn()) return authModal('in');
  openModal(`<h2>Request mentorship</h2>
    <p class="meta">Ask an alumnus for guidance and choose a topic.</p>
    <label>Alumni</label><input id="mName" value="${esc(name)}" readonly>
    <label>Career topic</label>
    <select id="mTopic">${['Career advice', 'CV review', 'Interview preparation', 'Industry insights', 'Internship advice', 'Career transition'].map((t) => `<option>${t}</option>`).join('')}</select>
    <label>Message</label><textarea id="mMessage" placeholder="Tell them what you'd like help with..."></textarea>
    <label>Preferred meeting time</label><input id="mTime" type="datetime-local">
    <button class="btn red block" id="doMentor" style="margin-top:10px">Send request</button>`);

  $('#doMentor').onclick = () => {
    if (!$('#mMessage').value.trim() || !$('#mTime').value) {
      return modalError('Please add a message and a preferred meeting time.');
    }
    mentorship.add({
      student: auth.state().profile?.full_name, alumni: name,
      topic: $('#mTopic').value, message: $('#mMessage').value.trim(),
      time: $('#mTime').value, status: 'Pending', created: new Date().toISOString(),
    });
    openModal(`<h2>Request sent</h2><p class="meta">${esc(name)} will get back to you soon.</p>`);
  };
}

function jobDetail(id) {
  const job = jobById(id);
  if (!job) return;
  currentJobId = id;
  const score = matchScore(job, auth.state().profile);
  $('#detailContent').innerHTML = `<div class="company">
      <span class="logo" style="background:${esc(job.accent || '#e9424f')}">${esc((job.company || '?')[0])}</span>
      <div><h1 style="font-size:20px;margin:0 0 4px">${esc(job.title)}</h1>
        <div class="meta">${esc(job.company)} &middot; Verified employer &#10003;</div></div>
    </div>
    <div class="pay">${esc(job.pay)}</div>
    <p class="meta">${esc(job.job_type)} &middot; ${esc(job.location)}</p>
    ${score ? `<span class="match">${score}% Match</span>` : ''}
    <div class="section-head"><h3>About the opportunity</h3></div>
    <p>${esc(job.description)}</p>
    <div class="section-head"><h3>Skills</h3></div>
    <div class="tags">${(job.skills || []).map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>
    <button class="btn red block" style="margin-top:24px" id="applyNow">Apply now</button>`;
  $('#applyNow').onclick = () => applyModal(job);
  go('detail');
}

/* ============================ wiring ============================ */

function wire() {
  // Nav + any element carrying data-go
  $$('#nav button').forEach((b) => { b.onclick = () => go(b.dataset.page); });
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-go]');
    if (target) go(target.dataset.go);
  });

  // Hamburger — previously decoration with zero handlers.
  $('#menuToggle').onclick = openNav;
  $('#navScrim').onclick = closeNav;

  // Modal close
  $('#modalClose').onclick = closeModal;
  $('#modal').onclick = (e) => { if (e.target.id === 'modal') closeModal(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeNav(); } });

  // Auth button
  $('#authButton').onclick = async () => {
    if (auth.isSignedIn()) { await auth.signOut(); await refreshRemote(); }
    else authModal('in');
  };
  $('#postJobButton').onclick = postJobModal;
  $('#editProfileButton').onclick = profileModal;

  // Notification bell — previously had no handler at all.
  $('#notifButton').onclick = () => {
    const panel = $('#notifPanel');
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      seenNotifications = notificationItems().length;
      localStorage.setItem('pintuSeenNotifications', String(seenNotifications));
      $('#notifDot').hidden = true;
    }
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notif-wrap')) $('#notifPanel').hidden = true;
  });

  // Explore: search, chips, filter drawer
  $('#search').oninput = renderExplore;
  $('#filterButton').onclick = () => {
    const panel = $('#advancedFilters');
    panel.hidden = !panel.hidden;
    $('#filterButton').classList.toggle('ghost', !panel.hidden);
  };
  $('#closeFilters').onclick = () => { $('#advancedFilters').hidden = true; };
  ['filterType', 'filterLocation', 'filterKeyword'].forEach((id) => {
    $('#' + id).addEventListener('input', () => {
      const type = $('#filterType').value;
      $$('#typeChips .chip').forEach((c) => c.classList.toggle('active', c.dataset.type === type));
      renderExplore();
    });
  });
  $$('#typeChips .chip').forEach((chip) => {
    chip.onclick = () => {
      $$('#typeChips .chip').forEach((c) => c.classList.toggle('active', c === chip));
      $('#filterType').value = chip.dataset.type;
      renderExplore();
    };
  });
  $('#clearFilters').onclick = () => {
    $('#search').value = '';
    $('#filterType').value = 'All';
    $('#filterLocation').value = 'All';
    $('#filterKeyword').value = '';
    $$('#typeChips .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    renderExplore();
  };

  $('#mentorSearch').oninput = (e) => renderMentorship(e.target.value);
  $('#networkSearch').oninput = (e) => renderNetwork(e.target.value);

  // Delegated handlers for everything rendered from data.
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-job]');
    const cat = e.target.closest('[data-cat]');
    const mentor = e.target.closest('[data-mentor]');
    const connect = e.target.closest('[data-connect]');
    const chat = e.target.closest('[data-chat]');

    if (cat) {
      $('#filterType').value = cat.dataset.cat;
      $$('#typeChips .chip').forEach((c) => c.classList.toggle('active', c.dataset.type === cat.dataset.cat));
      renderExplore();
      go('explore');
      return;
    }
    if (mentor) { e.stopPropagation(); mentorModal(mentor.dataset.mentor); return; }
    if (connect) {
      e.stopPropagation();
      const name = connect.dataset.connect;
      const next = { Connect: 'Pending', Pending: 'Connected', Connected: 'Connect' }[network.state(name)];
      network.set(name, next);
      renderNetwork($('#networkSearch').value);
      renderMessages();
      return;
    }
    if (chat) {
      e.stopPropagation();
      activeChat = chat.dataset.chat;
      go('messages');
      renderMessages();
      return;
    }
    if (card) jobDetail(card.dataset.job);
  });

  // Chat send (delegated — the input is re-rendered constantly)
  document.addEventListener('click', (e) => {
    if (e.target.id !== 'sendMessage') return;
    sendMessage();
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.id === 'messageInput' && e.key === 'Enter') sendMessage();
  });

  // Employer moves an application's status
  document.addEventListener('change', async (e) => {
    if (!e.target.classList.contains('status-select')) return;
    try {
      await setApplicationStatus(e.target.dataset.app, e.target.value);
      renderApplications();
      renderNotifications();
    } catch (err) { console.error('[app] status update failed:', err.message); }
  });

  onNavigate((page) => {
    if (page === 'network') renderNetwork($('#networkSearch').value);
    if (page === 'messages') renderMessages();
    if (page === 'applications') renderApplications();
    if (page === 'profile') renderProfile();
  });
}

function sendMessage() {
  const input = $('#messageInput');
  // The prototype's sendMessage never guarded activeChat and threw when none was selected.
  if (!input || !input.value.trim() || !activeChat) return;
  const text = input.value.trim();
  const now = () => new Date().toLocaleString();
  messages.push(activeChat, { from: 'me', text, time: now() });
  input.value = '';
  renderChat();

  setTimeout(() => {
    const lower = text.toLowerCase();
    let reply = 'Thanks for reaching out! Happy to share what I learned and help where I can.';
    if (lower.includes('cv') || lower.includes('resume')) reply = 'Absolutely — tailor your summary to the role and lead with measurable results.';
    else if (lower.includes('interview')) reply = 'For interviews, prepare two or three clear project stories and tie each to the role.';
    else if (lower.includes('product')) reply = 'Product is a great area. Start with how user research, prioritisation and metrics connect.';
    else if (/\b(hi|hello|hey)\b/.test(lower)) reply = 'Hi! Great to hear from you. What would you like to learn more about?';
    messages.push(activeChat, { from: 'them', text: reply, time: now() });
    renderChat();
  }, 700);
}

/* ============================ boot ============================ */

async function refreshRemote() {
  await Promise.all([loadJobs(), auth.isSignedIn() ? loadApplications() : Promise.resolve()]);
  renderHome();
  renderExplore();
  renderApplications();
  renderProfile();
  renderNotifications();
}

async function boot() {
  wire();
  renderMentorship();
  renderNetwork();
  renderMessages();

  if (!configured) {
    document.documentElement.dataset.auth = 'out';
    renderHeader();
    $('#recommend').innerHTML = '<p class="empty">Supabase is not configured yet — add your project URL and publishable key to <code>js/config.js</code>.</p>';
    $('#jobs').innerHTML = '<div class="profile"><p class="empty">Supabase is not configured yet. See <code>js/config.js</code>.</p></div>';
    return;
  }

  // Resolve the session before painting auth-dependent chrome, so there's no
  // flash of signed-out UI on reload.
  auth.onAuthChange(() => { renderHeader(); renderProfile(); renderApplications(); });
  await auth.init();
  await refreshRemote();
}

boot();
