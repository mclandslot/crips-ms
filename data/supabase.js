

// const { createClient } = supabase;

// window.supabaseClient = createClient(
//   "https://yvmuqqfdtkzyyeyesrlk.supabase.co",
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bXVxcWZkdGt6eXlleWVzcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTY5MjcsImV4cCI6MjA4NzU5MjkyN30.4JZqH_KzrsTtaP35aL0fW_wtvJl9-DlC84NzcQhtJto"
// );


const supabaseUrl = "https://yvmuqqfdtkzyyeyesrlk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bXVxcWZkdGt6eXlleWVzcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTY5MjcsImV4cCI6MjA4NzU5MjkyN30.4JZqH_KzrsTtaP35aL0fW_wtvJl9-DlC84NzcQhtJto";

/* This file lives in <app>/data/, so the app root is one level up. Every
   redirect goes through appUrl() so it lands on the right page whether the
   app is served from a domain root or from a sub-folder. */
const appRootUrl = new URL("../", document.currentScript?.src || window.location.href);

window.appUrl = function (path) {
  return new URL(path, appRootUrl).href;
};

/* supabase-js keeps the signed-in session in localStorage under this key */
const supabaseAuthStorageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;

function hasStoredSession() {
  try {
    return Boolean(window.localStorage.getItem(supabaseAuthStorageKey));
  } catch {
    /* storage blocked: let the async guards decide */
    return true;
  }
}

/* Portal pages must not run a single query without a session: send a
   signed-out visitor to the login page before the data scripts start
   firing requests that can only fail. The guards in each portal still do
   the full role/active check once the session is verified. */
const isPortalPage = /\/(admin_page|head_page|teacher_page)\//.test(
  window.location.pathname
);

if (isPortalPage && !hasStoredSession()) {
  window.location.replace(window.appUrl("index.html"));
}

if (typeof supabase === "undefined" || !supabase?.createClient) {
  /* the CDN script failed (offline, blocked) - every page depends on it */
  console.error("Supabase library failed to load");
  window.supabaseClient = null;
  document.addEventListener("DOMContentLoaded", () => {
    const message = document.createElement("div");
    message.setAttribute("role", "alert");
    message.style.cssText =
      "position:fixed;inset:auto 16px 16px 16px;z-index:99999;padding:12px 16px;" +
      "border-radius:8px;background:#b42318;color:#fff;font:14px system-ui,sans-serif;" +
      "text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.2)";
    message.textContent =
      "Unable to connect. Check your internet connection and reload the page.";
    document.body.appendChild(message);
  });
} else {
  window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
}

/* Shared role tests. teachers.role holds the raw value typed into the Add
   Teacher form ("Administrator", "Head Teacher") while profiles.role holds
   the mapped one ("admin", "head_teacher"), so both spellings must match. */
function normalizeRoleValue(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/* administrators are not staff records: hidden from the teachers table */
window.isAdminRole = function (role) {
  const value = normalizeRoleValue(role);

  return (
    value === "admin" ||
    value === "administrator" ||
    value === "system_admin"
  );
};

/* head teachers are listed as staff, but like admins they do not take a
   class or a subject, so they are not offered for assignment */
window.isNonTeachingRole = function (role) {
  const value = normalizeRoleValue(role);

  return (
    window.isAdminRole(role) ||
    value === "head_teacher" ||
    value === "headteacher"
  );
};

/* which portal a profile role opens; null for a role no portal accepts.
   The login redirect and every page guard use this one mapping, so a role
   the login sends somewhere is always one that page lets in. */
window.portalForRole = function (role) {
  const value = normalizeRoleValue(role);

  if (window.isAdminRole(role)) return "admin_page";
  if (value === "head_teacher" || value === "headteacher") return "head_page";
  if (value === "teacher") return "teacher_page";
  return null;
};


















// const SUPABASE_URL = "https://yvmuqqfdtkzyyeyesrlk.supabase.co";
// const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bXVxcWZkdGt6eXlleWVzcmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTY5MjcsImV4cCI6MjA4NzU5MjkyN30.4JZqH_KzrsTtaP35aL0fW_wtvJl9-DlC84NzcQhtJto";

// window.supabaseClient = supabase.createClient(
//   SUPABASE_URL,
//   SUPABASE_ANON_KEY
// );


// CRIGPSIS2026

