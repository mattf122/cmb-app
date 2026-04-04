// ─────────────────────────────────────────────────────────────────────────────
// CMB OneDrive Integration  ·  onedrive.js
// Requires MSAL.js loaded before this file (see index.html)
// ─────────────────────────────────────────────────────────────────────────────

const OD_CONFIG = {
  clientId: "YOUR_AZURE_CLIENT_ID",         // ← paste your Application (client) ID here
  authority: "https://login.microsoftonline.com/consumers",
  redirectUri: "https://cmbsitevisit.netlify.app"
};

const OD_SCOPES    = ["Files.ReadWrite", "User.Read"];
const OD_FOLDER    = "CMB Site Visits";     // top-level folder in the rep's OneDrive

let _msalApp    = null;
let _odAccount  = null;

// ── Initialise MSAL on page load ─────────────────────────────────────────────
async function odInit() {
  if (!window.msal) { console.warn("MSAL.js not loaded — OneDrive disabled"); return; }

  _msalApp = new msal.PublicClientApplication({
    auth: OD_CONFIG,
    cache: { cacheLocation: "localStorage", storeAuthStateInCookie: true }
  });
  await _msalApp.initialize();

  // Handle post-redirect auth (important for mobile browsers that block popups)
  try {
    const resp = await _msalApp.handleRedirectPromise();
    if (resp?.account) {
      _odAccount = resp.account;
      _msalApp.setActiveAccount(resp.account);
    }
  } catch(e) { console.warn("MSAL redirect promise:", e); }

  // Restore existing silent session
  const accounts = _msalApp.getAllAccounts();
  if (accounts.length > 0 && !_odAccount) {
    _odAccount = accounts[0];
    _msalApp.setActiveAccount(_odAccount);
  }

  odRenderStatusBar();
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
function odIsLoggedIn() { return !!_odAccount; }

async function odLogin() {
  if (!_msalApp) return;
  try {
    const result = await _msalApp.loginPopup({ scopes: OD_SCOPES });
    _odAccount = result.account;
    _msalApp.setActiveAccount(_odAccount);
    odRenderStatusBar();
    showODToast("☁ Connected to OneDrive as " + _odAccount.name, "success");
  } catch(e) {
    if (e.errorCode !== "user_cancelled")
      showODToast("OneDrive login failed: " + (e.message || e), "error");
  }
}

async function odLogout() {
  if (!_msalApp || !_odAccount) return;
  try {
    await _msalApp.logoutPopup({ account: _odAccount });
  } catch(e) { /* ignore */ }
  _odAccount = null;
  odRenderStatusBar();
}

async function odGetToken() {
  if (!_msalApp || !_odAccount) return null;
  try {
    const r = await _msalApp.acquireTokenSilent({ scopes: OD_SCOPES, account: _odAccount });
    return r.accessToken;
  } catch(e) {
    // Silent failed — try interactive popup
    try {
      const r = await _msalApp.acquireTokenPopup({ scopes: OD_SCOPES });
      return r.accessToken;
    } catch(e2) { console.error("Token acquisition failed:", e2); return null; }
  }
}

// ── Microsoft Graph helpers ──────────────────────────────────────────────────
const GRAPH = "https://graph.microsoft.com/v1.0";

async function gFetch(token, method, path, body = null) {
  const opts = {
    method,
    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
  };
  if (body) opts.body = typeof body === "string" ? body : JSON.stringify(body);
  const res = await fetch(GRAPH + path, opts);
  if (!res.ok) throw new Error(`Graph ${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function gPut(token, path, content, contentType = "application/octet-stream") {
  const res = await fetch(GRAPH + path, {
    method: "PUT",
    headers: { "Authorization": "Bearer " + token, "Content-Type": contentType },
    body: content
  });
  if (!res.ok) throw new Error(`Graph PUT ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Folder helpers ───────────────────────────────────────────────────────────
function odSanitize(str) {
  return (str || "Unknown")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\.+$/, "")
    .substring(0, 60)
    .trim() || "Unknown";
}

function odFolderPath(data) {
  const year  = new Date().getFullYear();
  const name  = odSanitize(data.clientName    || "Unnamed Client");
  const addr  = odSanitize(data.projectAddress || "No Address");
  return `${OD_FOLDER}/${year}/${name} — ${addr}`;
}

// Create a folder if it doesn't exist (conflict-safe)
async function odMkdir(token, parentPath, folderName) {
  try {
    await gFetch(token, "GET", `/me/drive/root:/${parentPath}/${encodeURIComponent(folderName)}`);
  } catch(e) {
    if (!e.message.includes("404") && !e.message.includes("itemNotFound")) throw e;
    // 404 → create it
    const parentEndpoint = parentPath
      ? `/me/drive/root:/${parentPath}:/children`
      : `/me/drive/root/children`;
    try {
      await gFetch(token, "POST", parentEndpoint, {
        name: folderName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "skip"
      });
    } catch(e2) {
      if (!e2.message.includes("nameAlreadyExists")) throw e2;
    }
  }
}

async function odEnsureFolderPath(token, folderPath) {
  const parts = folderPath.split("/");
  let built = "";
  for (const part of parts) {
    await odMkdir(token, built || undefined, part);
    built = built ? built + "/" + part : part;
  }
}

// ── Main sync ────────────────────────────────────────────────────────────────
/**
 * Sync the current visit (appData) to OneDrive.
 * @param {Object}  data        - appData snapshot
 * @param {boolean} showAlert   - show toast/alert feedback
 * @param {boolean} promptLogin - offer login if not connected
 */
async function syncToOneDrive(data, showAlert = true, promptLogin = true) {
  // Gate: must be logged in
  if (!odIsLoggedIn()) {
    if (!promptLogin) return false;
    if (!confirm("Connect to OneDrive to save this visit?\n\nClick OK to sign in.")) return false;
    await odLogin();
    if (!odIsLoggedIn()) return false;
  }

  const token = await odGetToken();
  if (!token) {
    if (showAlert) showODToast("OneDrive: could not get access token — please sign in again.", "error");
    return false;
  }

  const folderPath = odFolderPath(data);
  const syncBtn    = document.getElementById("od-sync-btn");
  if (syncBtn) { syncBtn.disabled = true; syncBtn.textContent = "☁ Syncing…"; }

  try {
    // 1. Ensure nested folder structure exists
    await odEnsureFolderPath(token, folderPath);

    // 2. Build a lean JSON snapshot (strip large base64 images)
    const snapshot = JSON.parse(JSON.stringify(data));
    snapshot.zones = (snapshot.zones || []).map(z => ({
      ...z,
      photosBefore: (z.photosBefore || []).map((_, i) => `[photo ${i + 1} — not synced]`),
      photosInspo:  (z.photosInspo  || []).map((_, i) => `[photo ${i + 1} — not synced]`),
      docs:         (z.docs         || []).map(d => ({ ...d, dataUrl: null }))
    }));
    snapshot._syncedAt  = new Date().toISOString();
    snapshot._syncedBy  = _odAccount?.name || "unknown";
    snapshot._appVersion = "CMB Site Visit App";

    // 3. Upload visit.json
    const jsonPath = `/me/drive/root:/${folderPath}/visit.json:/content`;
    await gPut(token, jsonPath, JSON.stringify(snapshot, null, 2), "application/json");

    // 4. Mark synced in localStorage (for status badges in visits modal)
    odMarkSynced(data, folderPath);
    odRenderStatusBar();

    if (showAlert) showODToast(`☁ Saved to OneDrive\n📁 ${folderPath}`, "success");
    return true;

  } catch(e) {
    console.error("OneDrive sync failed:", e);
    if (showAlert) showODToast("OneDrive sync failed: " + e.message, "error");
    return false;
  } finally {
    if (syncBtn) { syncBtn.disabled = false; syncBtn.textContent = "☁ Sync to OneDrive"; }
  }
}

// Called silently from fullSave() — only runs if user is already connected
async function odAutoSyncIfLoggedIn() {
  if (!odIsLoggedIn()) return;
  await syncToOneDrive(appData, false, false);
}

// ── Sync-state tracking ──────────────────────────────────────────────────────
const OD_SYNC_KEY = "cmb_od_synced";

function odSyncId(data) {
  return ([data.clientName, data.projectAddress].filter(Boolean).join("|")) || "unnamed";
}

function odMarkSynced(data, folderPath) {
  try {
    const map = JSON.parse(localStorage.getItem(OD_SYNC_KEY) || "{}");
    map[odSyncId(data)] = { at: new Date().toISOString(), folder: folderPath };
    localStorage.setItem(OD_SYNC_KEY, JSON.stringify(map));
  } catch(e) {}
}

function odGetLastSync(data) {
  try {
    const map  = JSON.parse(localStorage.getItem(OD_SYNC_KEY) || "{}");
    return map[odSyncId(data)] || null;   // { at, folder } or null
  } catch(e) { return null; }
}

// ── UI components ────────────────────────────────────────────────────────────

// Renders the ☁ login/status bar into #od-status-bar (injected by app into header)
function odRenderStatusBar() {
  const el = document.getElementById("od-status-bar");
  if (!el) return;
  if (odIsLoggedIn()) {
    el.innerHTML = `
      <span style="font-size:11px;color:#7ec87e;letter-spacing:.5px;">
        ☁ OneDrive: ${escOD(_odAccount.name)}
      </span>
      <button
        onclick="odLogout()"
        style="font-size:10px;padding:2px 8px;background:transparent;border:1px solid var(--stone-light);
               color:var(--stone-light);border-radius:4px;cursor:pointer;margin-left:6px;">
        Sign out
      </button>`;
  } else {
    el.innerHTML = `
      <button
        onclick="odLogin()"
        style="font-size:11px;padding:3px 10px;background:transparent;border:1px solid rgba(184,115,51,.5);
               color:var(--copper);border-radius:4px;cursor:pointer;">
        ☁ Connect OneDrive
      </button>`;
  }
}

// Small inline sync-status badge used inside renderReview export card
function odSyncBadge() {
  const info = odGetLastSync(appData);
  if (!info) {
    return `<span id="od-sync-badge" style="font-size:11px;color:var(--stone-light);">☁ Not yet synced to OneDrive</span>`;
  }
  const when = new Date(info.at).toLocaleString();
  return `<span id="od-sync-badge" style="font-size:11px;color:#7ec87e;">☁ Synced ${when}</span>`;
}

// ── Toast notification ───────────────────────────────────────────────────────
function showODToast(msg, type = "info") {
  // Remove existing toast
  const existing = document.getElementById("od-toast");
  if (existing) existing.remove();

  const colors = { success: "#2d6a4f", error: "#8b2020", info: "#b87333" };
  const toast = document.createElement("div");
  toast.id = "od-toast";
  toast.textContent = msg;
  Object.assign(toast.style, {
    position:     "fixed",
    bottom:       "24px",
    left:         "50%",
    transform:    "translateX(-50%)",
    background:   colors[type] || colors.info,
    color:        "white",
    padding:      "12px 20px",
    borderRadius: "8px",
    fontSize:     "13px",
    zIndex:       "9999",
    maxWidth:     "90vw",
    whiteSpace:   "pre-line",
    boxShadow:    "0 4px 16px rgba(0,0,0,.4)",
    textAlign:    "center"
  });
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
}

// Small escape helper (no dep on main app's esc())
function escOD(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// Boot
window.addEventListener("load", odInit);
