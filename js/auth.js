// Client for the optional PHP+MySQL backend under /api. The app works fully
// offline on localStorage without this backend; when it's deployed and the
// user logs in, Store (see store.js) mirrors every local write to the server
// in the background ("write-behind") so data is shared instead of trapped in
// one browser. See README.md for the deployment story.

const API_BASE = "api";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Lỗi máy chủ (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function login(username, password) {
  const data = await apiFetch("/auth_login.php", { method: "POST", body: JSON.stringify({ username, password }) });
  return data.user;
}

export async function logout() {
  try { await apiFetch("/auth_logout.php", { method: "POST" }); } catch (e) { /* ignore */ }
}

// Distinguishes "no /api backend deployed here at all" (e.g. the standalone
// file or a plain static host) from "backend deployed but nobody logged in
// yet" — the app only shows a login gate in the latter case, so the same
// code keeps working with zero setup wherever /api isn't present.
export async function checkSession() {
  try {
    const res = await fetch(`${API_BASE}/auth_me.php`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return { backendAvailable: false, user: null };
    const data = await res.json().catch(() => null);
    if (!data) return { backendAvailable: false, user: null };
    return { backendAvailable: true, user: data.user || null };
  } catch (e) {
    return { backendAvailable: false, user: null };
  }
}

export async function pullAllFromServer() {
  const [clients, contracts, quotes, settings] = await Promise.all([
    apiFetch("/clients.php"),
    apiFetch("/contracts.php"),
    apiFetch("/quotes.php"),
    apiFetch("/settings.php"),
  ]);
  return {
    clients: clients.items || [],
    contracts: contracts.items || [],
    quotes: quotes.items || [],
    settings: settings.settings || {},
  };
}

export async function listUsers() { return (await apiFetch("/users.php")).items; }
export async function createUser(payload) { return (await apiFetch("/users.php", { method: "POST", body: JSON.stringify(payload) })).item; }
export async function updateUserAccount(id, payload) { return apiFetch(`/users.php?id=${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }); }
export async function deleteUserAccount(id) { return apiFetch(`/users.php?id=${encodeURIComponent(id)}`, { method: "DELETE" }); }

/* ---------------- Write-behind sync used by store.js ---------------- */

let syncEnabled = false;
let onSyncError = null;

export function enableSync(errorHandler) { syncEnabled = true; onSyncError = errorHandler || null; }
export function disableSync() { syncEnabled = false; onSyncError = null; }

function reportError(resource, action) {
  if (onSyncError) onSyncError(resource, action);
}

export function syncCreate(resource, item) {
  if (!syncEnabled) return;
  apiFetch(`/${resource}.php`, { method: "POST", body: JSON.stringify(item) }).catch(() => reportError(resource, "create"));
}
export function syncUpdate(resource, id, item) {
  if (!syncEnabled) return;
  apiFetch(`/${resource}.php?id=${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(item) }).catch(() => reportError(resource, "update"));
}
export function syncDelete(resource, id) {
  if (!syncEnabled) return;
  apiFetch(`/${resource}.php?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => reportError(resource, "delete"));
}
export function syncSettings(settings) {
  if (!syncEnabled) return;
  apiFetch("/settings.php", { method: "PUT", body: JSON.stringify(settings) }).catch(() => reportError("settings", "update"));
}
