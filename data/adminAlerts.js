const supabaseAdminAlerts = window.supabaseClient;

/* =====================================
   ADMIN NOTIFICATION PANEL
   Mirrors the head teacher alert list: the bell in the dashboard
   header opens #alert-notification, this fills #admin-alerts-list.
===================================== */
let adminAlertsCurrentAcademicYear = null;
let adminAlertsCurrentTerm = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadAdminAlerts();
  subscribeToAdminAlertChanges();
});

/* =====================================
   REALTIME
   Anything the alerts are derived from redraws them, so the bell count
   drops the moment a teacher enters marks - no page refresh.
===================================== */
function subscribeToAdminAlertChanges() {
  window.subscribeRealtime?.({
    name: "admin-alerts-live",
    tables: ["student_marks", "terms", "academic_years", "classes"],
    delay: 400,
    onChange: loadAdminAlerts
  });
}

async function loadAdminAlerts() {
  const list = document.getElementById("admin-alerts-list");
  if (!list) return;

  try {
    await loadAdminAlertsYearAndTerm();
  } catch (error) {
    console.error("Error resolving current year/term for alerts:", error);
  }

  const alerts = [];

  if (adminAlertsCurrentTerm) {
    const { data: classes, error: classesError } = await supabaseAdminAlerts
      .from("classes")
      .select("id, class_name");

    if (classesError) {
      console.error("Error loading classes for alerts:", classesError.message);
    }

    const { data: marks, error: marksError } = await supabaseAdminAlerts
      .from("student_marks")
      .select("class_id")
      .eq("term_id", adminAlertsCurrentTerm.id);

    if (marksError) {
      console.error("Error loading marks for alerts:", marksError.message);
    }

    const classIdsWithMarks = [
      ...new Set((marks || []).map((m) => m.class_id).filter(Boolean))
    ];

    /* the Complete/Completed row holds graduated pupils, so it never
       needs marks and must not raise an alert */
    adminExcludeCompletedClasses(classes).forEach((cls) => {
      if (!classIdsWithMarks.includes(cls.id)) {
        alerts.push(`Marks not entered for ${cls.class_name}`);
      }
    });
  }

  if (!adminAlertsCurrentTerm || !adminAlertsCurrentAcademicYear) {
    alerts.push("Current term or academic year is not set.");
  }

  renderAdminAlerts(alerts);
}

function renderAdminAlerts(alerts) {
  const list = document.getElementById("admin-alerts-list");
  const counter = document.getElementById("admin-alert-count");
  if (!list) return;

  if (!alerts.length) {
    list.innerHTML = `<li class="alert-empty">No alerts yet.</li>`;
  } else {
    list.innerHTML = alerts
      .map((alert) => `<li>${escapeAdminAlertHtml(alert)}</li>`)
      .join("");
  }

  if (counter) {
    counter.textContent = alerts.length > 9 ? "9+" : String(alerts.length);
    counter.classList.toggle("has-alerts", alerts.length > 0);
  }
}

/* =====================================
   CURRENT YEAR / TERM
===================================== */
async function loadAdminAlertsYearAndTerm() {
  const { data: activeYear, error: yearError } = await supabaseAdminAlerts
    .from("academic_years")
    .select("id, year_name, is_active")
    .eq("is_active", true)
    .maybeSingle();

  if (yearError) {
    console.error("Error loading active academic year:", yearError.message);
    return;
  }

  adminAlertsCurrentAcademicYear = activeYear || null;
  if (!adminAlertsCurrentAcademicYear) return;

  const today = new Date().toISOString().split("T")[0];

  const { data: currentTerm, error: termError } = await supabaseAdminAlerts
    .from("terms")
    .select("id, name, academic_year_id, start_date, end_date, created_at")
    .eq("academic_year_id", adminAlertsCurrentAcademicYear.id)
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  if (termError) {
    console.error("Error loading current term:", termError.message);
  }

  if (currentTerm) {
    adminAlertsCurrentTerm = currentTerm;
    return;
  }

  const { data: fallbackTerms, error: fallbackError } = await supabaseAdminAlerts
    .from("terms")
    .select("id, name, academic_year_id, start_date, end_date, created_at")
    .eq("academic_year_id", adminAlertsCurrentAcademicYear.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (fallbackError) {
    console.error("Error loading fallback term:", fallbackError.message);
  }

  adminAlertsCurrentTerm = fallbackTerms?.[0] || null;
}

/* =====================================
   HELPERS
===================================== */
/* the Complete/Completed row parks graduated pupils - it is not a
   real class, so it must never raise a "marks not entered" alert */
function adminIsCompletedClassName(className) {
  const value = String(className || "").trim().toLowerCase();
  return value === "complete" || value === "completed";
}

function adminExcludeCompletedClasses(classes) {
  return (classes || []).filter((cls) => !adminIsCompletedClassName(cls.class_name));
}

function escapeAdminAlertHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
