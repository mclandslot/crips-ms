const supabaseTeacherNotices = window.supabaseClient;

/* =====================================
   TEACHER NOTIFICATION PANEL

   The bell always answers one question first: which term am I working
   in? That is set by the admin, so it is read straight from the active
   academic year rather than from anything cached on this page, and a
   realtime subscription redraws it the moment the admin changes it.
===================================== */
let noticeAcademicYear = null;
let noticeCurrentTerm = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadTeacherNotices();
  subscribeToTeacherNoticeChanges();
});

async function loadTeacherNotices() {
  const termEl = document.getElementById("teacher-current-term");
  if (!termEl) return;

  try {
    await loadNoticeYearAndTerm();
  } catch (err) {
    console.error("Error loading current term for notices:", err);
  }

  renderTermCard();
  renderNoticeList();
}

/* =====================================
   ACTIVE YEAR / TERM
===================================== */
async function loadNoticeYearAndTerm() {
  noticeAcademicYear = null;
  noticeCurrentTerm = null;

  const { data: activeYear, error: yearError } = await supabaseTeacherNotices
    .from("academic_years")
    .select("id, year_name, is_active")
    .eq("is_active", true)
    .maybeSingle();

  if (yearError) {
    console.error("Error loading active academic year:", yearError.message);
    return;
  }

  noticeAcademicYear = activeYear || null;
  if (!noticeAcademicYear) return;

  const today = new Date().toISOString().split("T")[0];

  /* the term covering today is the real answer. When the admin has set
     up a year but no term covers today - between terms, or dates not
     entered yet - the most recent term is shown instead of nothing */
  const { data: currentTerm, error: termError } = await supabaseTeacherNotices
    .from("terms")
    .select("id, name, start_date, end_date, created_at")
    .eq("academic_year_id", noticeAcademicYear.id)
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  if (termError) {
    console.error("Error loading current term:", termError.message);
  }

  if (currentTerm) {
    noticeCurrentTerm = currentTerm;
    return;
  }

  const { data: fallbackTerms } = await supabaseTeacherNotices
    .from("terms")
    .select("id, name, start_date, end_date, created_at")
    .eq("academic_year_id", noticeAcademicYear.id)
    .order("created_at", { ascending: false })
    .limit(1);

  noticeCurrentTerm = fallbackTerms?.[0] || null;
}

/* =====================================
   RENDER
===================================== */
function renderTermCard() {
  const card = document.getElementById("teacher-term-card");
  const termEl = document.getElementById("teacher-current-term");
  const yearEl = document.getElementById("teacher-current-year");
  const datesEl = document.getElementById("teacher-term-dates");

  if (!card || !termEl || !yearEl || !datesEl) return;

  if (!noticeAcademicYear || !noticeCurrentTerm) {
    card.classList.add("is-unset");
    termEl.textContent = "Not set yet";
    yearEl.textContent = noticeAcademicYear?.year_name || "";
    datesEl.textContent = "The administrator has not set the current term.";
    return;
  }

  card.classList.remove("is-unset");
  termEl.textContent = noticeCurrentTerm.name || "-";
  yearEl.textContent = noticeAcademicYear.year_name || "";

  const start = formatNoticeDate(noticeCurrentTerm.start_date);
  const end = formatNoticeDate(noticeCurrentTerm.end_date);

  datesEl.textContent = start && end ? `${start} - ${end}` : "";
}

function renderNoticeList() {
  const list = document.getElementById("teacher-notices-list");
  if (!list) return;

  const notices = [];

  if (!noticeAcademicYear) {
    notices.push({
      text: "No active academic year. Ask the administrator to set one.",
      tone: "warning"
    });
  } else if (!noticeCurrentTerm) {
    notices.push({
      text: "No term has been created for this academic year yet.",
      tone: "warning"
    });
  } else {
    const daysLeft = daysUntil(noticeCurrentTerm.end_date);

    if (daysLeft !== null && daysLeft < 0) {
      notices.push({
        text: "This term has ended. A new term has not been set yet.",
        tone: "warning"
      });
    } else if (daysLeft !== null && daysLeft <= 14) {
      notices.push({
        text: `Term ends in ${daysLeft} day(s) - make sure marks and attendance are up to date.`,
        tone: "warning"
      });
    }
  }

  list.innerHTML = "";

  notices.forEach((notice) => {
    const li = document.createElement("li");
    if (notice.tone === "info") li.className = "notice-info";
    li.textContent = notice.text;
    list.appendChild(li);
  });
}

/* =====================================
   REALTIME
   The admin sets the term on another page entirely, so this is the only
   thing that keeps the panel honest without a refresh.
===================================== */
function subscribeToTeacherNoticeChanges() {
  window.subscribeRealtime?.({
    name: "teacher-notices-live",
    tables: ["academic_years", "terms"],
    delay: 300,
    onChange: loadTeacherNotices
  });
}

/* =====================================
   HELPERS
===================================== */
function formatNoticeDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString();
}

function daysUntil(dateString) {
  if (!dateString) return null;

  const end = new Date(dateString);
  if (Number.isNaN(end.getTime())) return null;

  const today = new Date();

  /* compare dates, not moments, so a term ending today reads as 0 */
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.round((end - today) / 86400000);
}
