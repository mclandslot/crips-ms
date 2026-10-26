

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
  enableAutoPagination(window.supabaseClient);
}

/* Supabase returns at most 1000 rows per request (the API's max-rows
   setting), so a list such as a term's marks or attendance would silently
   come back cut short. Every plain list read is fetched in pages of
   PAGE_SIZE with .range() and the pages are joined, so callers keep using
   `const { data } = await query` and always get every row.
   Left alone: .single()/.maybeSingle(), .limit()/.range() set by the
   caller, head/count-only requests, csv/explain output and writes. */
const PAGE_SIZE = 1000;

function enableAutoPagination(client) {
  /* the builder classes are not exported by the CDN bundle, so reach the
     one that owns then() through a throwaway (never sent) query */
  let proto = Object.getPrototypeOf(client.from("students").select("id"));
  while (proto && !Object.prototype.hasOwnProperty.call(proto, "then")) {
    proto = Object.getPrototypeOf(proto);
  }
  if (!proto) {
    /* a supabase-js upgrade moved its internals: lists would stop at 1000
       rows again, so say so loudly instead of failing silently */
    console.warn("Auto-pagination is OFF: lists may stop at " + PAGE_SIZE + " rows");
    return;
  }
  if (proto.__autoPaginated) return;

  const originalThen = proto.then;

  proto.then = function (onFulfilled, onRejected) {
    if (!shouldPaginate(this)) {
      return originalThen.call(this, onFulfilled, onRejected);
    }
    return fetchAllPages(this, originalThen).then(onFulfilled, onRejected);
  };

  proto.__autoPaginated = true;
}

function readHeader(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) || "";
  return headers[name] || headers[name.toLowerCase()] || "";
}

function shouldPaginate(builder) {
  if (builder.method !== "GET" || !(builder.url instanceof URL)) return false;
  if (builder.isMaybeSingle) return false;

  const params = builder.url.searchParams;
  if (params.has("limit") || params.has("offset")) return false;

  const accept = readHeader(builder.headers, "Accept");
  if (/vnd\.pgrst\.(object|plan)|text\/csv/.test(accept)) return false;

  return true;
}

function runOnce(builder, originalThen) {
  return new Promise((resolve, reject) => {
    originalThen.call(builder, resolve, reject);
  });
}

async function fetchAllPages(builder, originalThen) {
  const params = builder.url.searchParams;
  const originalOrder = params.get("order");
  let tieBreakAdded = false;
  let tieBreakTried = false;

  try {
    let rows = [];
    let firstResponse = null;

    for (let from = 0; ; from += PAGE_SIZE) {
      params.set("offset", String(from));
      params.set("limit", String(PAGE_SIZE));

      const response = await runOnce(builder, originalThen);

      /* an error, or an rpc that returns a single value, goes back as is */
      if (response.error || !Array.isArray(response.data)) {
        if (tieBreakAdded && from === 0 && response.error) {
          /* table has no id column: page without the tie-break */
          restoreOrder(params, originalOrder);
          tieBreakAdded = false;
          rows = [];
          firstResponse = null;
          from = -PAGE_SIZE;
          continue;
        }
        return response;
      }

      /* more than one page: rows must come back in a fixed order or
         offset paging can skip or repeat rows, so order by id as a
         tie-break and start again from the first page */
      if (
        from === 0 &&
        !tieBreakTried &&
        response.data.length === PAGE_SIZE &&
        !/(^|,)id\./.test(originalOrder || "")
      ) {
        params.set("order", originalOrder ? `${originalOrder},id.asc` : "id.asc");
        tieBreakAdded = true;
        tieBreakTried = true;
        from = -PAGE_SIZE;
        continue;
      }

      if (!firstResponse) firstResponse = response;
      rows = rows.concat(response.data);

      if (response.data.length < PAGE_SIZE) break;
    }

    return { ...firstResponse, data: rows };
  } finally {
    /* leave the builder as the caller built it */
    params.delete("offset");
    params.delete("limit");
    restoreOrder(params, originalOrder);
  }
}

function restoreOrder(params, originalOrder) {
  if (originalOrder === null) params.delete("order");
  else params.set("order", originalOrder);
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

