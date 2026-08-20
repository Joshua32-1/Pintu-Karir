/* Shared DOM helpers.
 *
 * The original prototype called `$('#search')` etc. but never defined `$` and never
 * loaded jQuery, so the very first call threw a ReferenceError and aborted the initial
 * render — which is why Home, Explore and Mentorship all painted empty. Defining it
 * once here fixes every one of those call sites. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* Job titles, company names and profile fields are user-supplied now that they come from
 * the database, so everything interpolated into innerHTML has to be escaped. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/* ---- view routing (same .view/.active mechanism as the prototype) ---- */

const listeners = [];
export function onNavigate(fn) { listeners.push(fn); }

export function go(page) {
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === page));
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.page === page));
  closeNav();
  window.scrollTo(0, 0);
  listeners.forEach((fn) => fn(page));
}

export function currentPage() {
  return $('.view.active')?.id || 'home';
}

/* ---- mobile nav drawer (the hamburger had no handler at all) ---- */

export function openNav() { $('#sidebar')?.classList.add('open'); $('#navScrim').hidden = false; }
export function closeNav() { $('#sidebar')?.classList.remove('open'); const s = $('#navScrim'); if (s) s.hidden = true; }

/* ---- modal ----
 * One modal, one open/close pair. The prototype redefined openApply/submitApply/openMentor
 * across three separate <script> blocks, each silently clobbering the last. */

export function openModal(html) {
  const body = $('#modalBody');
  if (!body) return;
  body.innerHTML = html;
  $('#modal').classList.add('open');
}

export function closeModal() {
  $('#modal')?.classList.remove('open');
}

export function modalError(message) {
  const body = $('#modalBody');
  if (!body) return;
  let box = $('.form-error', body);
  if (!box) {
    box = document.createElement('div');
    box.className = 'form-error';
    body.querySelector('h2')?.insertAdjacentElement('afterend', box);
  }
  box.textContent = message;
}

/* Disable a submit button while an async action is in flight so double-clicks
 * can't fire two inserts. */
export async function withPending(button, label, fn) {
  if (!button) return fn();
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}
