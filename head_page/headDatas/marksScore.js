const supabaseHeadMarksSheet = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
let headMarksAssignments = [];
const alerMessageShow = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadHeadMarksSheetClasses();
  await loadHeadMarksSheetYears();

  document
    .getElementById("head-marks-sheet-class")
    ?.addEventListener("change", loadHeadMarksSheetSubjects);

  document
    .getElementById("head-marks-sheet-year")
    ?.addEventListener("change", loadHeadMarksSheetTerms);

  document
    .getElementById("head-load-marks-sheet-btn")
    ?.addEventListener("click", loadHeadMarksSheet);
});

/* =====================================
   LOAD CLASSES
===================================== */
async function loadHeadMarksSheetClasses() {
  const select = document.getElementById("head-marks-sheet-class");
  if (!select) return;

  const { data, error } = await supabaseHeadMarksSheet
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error.message);
    return;
  }

  select.innerHTML = `<option value="">Select Class</option>`;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name || "-";
    select.appendChild(option);
  });
}

/* =====================================
   LOAD SUBJECTS FOR SELECTED CLASS
===================================== */
async function loadHeadMarksSheetSubjects() {
  const classId = document.getElementById("head-marks-sheet-class")?.value || "";
  const subjectSelect = document.getElementById("head-marks-sheet-subject");

  if (!subjectSelect) return;

  subjectSelect.innerHTML = `<option value="">Select subject</option>`;

  if (!classId) return;

  /* a subject must stay selectable after its teacher leaves, so the list is
     the union of current assignments and subjects that have marks */
  const [assignments, marks] = await Promise.all([
    supabaseHeadMarksSheet
      .from("teacher_subject_assignments")
      .select("class_id, subject")
      .eq("class_id", classId),
    supabaseHeadMarksSheet
      .from("student_marks")
      .select("subject")
      .eq("class_id", classId)
  ]);

  if (assignments.error || marks.error) {
    console.error(
      "Error loading subjects:",
      assignments.error?.message || marks.error?.message
    );
    return;
  }

  headMarksAssignments = assignments.data || [];

  const uniqueSubjects = [
    ...new Set(
      [...headMarksAssignments, ...(marks.data || [])]
        .map((item) => item.subject)
        .filter(Boolean)
    )
  ].sort();

  uniqueSubjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
}

/* =====================================
   LOAD ACADEMIC YEARS
===================================== */
async function loadHeadMarksSheetYears() {
  const select = document.getElementById("head-marks-sheet-year");
  if (!select) return;

  const { data, error } = await supabaseHeadMarksSheet
    .from("academic_years")
    .select("id, year_name, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading academic years:", error.message);
    return;
  }

  select.innerHTML = `<option value="">Select Academic Year</option>`;

  (data || []).forEach((year) => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name || "-";
    if (year.is_active) option.selected = true;
    select.appendChild(option);
  });

  await loadHeadMarksSheetTerms();
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadHeadMarksSheetTerms() {
  const yearId = document.getElementById("head-marks-sheet-year")?.value || "";
  const termSelect = document.getElementById("head-marks-sheet-term");

  if (!termSelect) return;

  termSelect.innerHTML = `<option value="">Select Term</option>`;

  if (!yearId) return;

  const { data, error } = await supabaseHeadMarksSheet
    .from("terms")
    .select("id, name")
    .eq("academic_year_id", yearId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading terms:", error.message);
    return;
  }

  (data || []).forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name || "-";
    termSelect.appendChild(option);
  });
}

/* =====================================
   LOAD MARKS SHEET
===================================== */
async function loadHeadMarksSheet() {
  const classSelect = document.getElementById("head-marks-sheet-class");
  const subjectSelect = document.getElementById("head-marks-sheet-subject");
  const yearSelect = document.getElementById("head-marks-sheet-year");
  const termSelect = document.getElementById("head-marks-sheet-term");
  const container = document.getElementById("head-marks-sheet-container");

  if (!classSelect || !subjectSelect || !yearSelect || !termSelect || !container) {
    console.error("Required marks sheet elements not found");
    return;
  }

  const classId = classSelect.value;
  const subject = subjectSelect.value;
  const yearId = yearSelect.value;
  const termId = termSelect.value;

  if (!classId || !subject || !yearId || !termId) {
    // alert("Select class, subject, academic year and term");
    alerMessageShow.classList.add("show-message", "error");
    alerMessageShow.innerHTML = "pick class,subject,term & year";
    setTimeout(()=>{
         alerMessageShow.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  container.innerHTML = `<p>Loading marks sheet...</p>`;

  const [{ data: classData }, { data: yearData }, { data: termData }] = await Promise.all([
    supabaseHeadMarksSheet
      .from("classes")
      .select("id, class_name")
      .eq("id", classId)
      .maybeSingle(),
    supabaseHeadMarksSheet
      .from("academic_years")
      .select("id, year_name")
      .eq("id", yearId)
      .maybeSingle(),
    supabaseHeadMarksSheet
      .from("terms")
      .select("id, name")
      .eq("id", termId)
      .maybeSingle()
  ]);

  const { data, error } = await supabaseHeadMarksSheet
    .from("student_marks")
    .select(`
      id,
      student_id,
      class_score,
      exam_score,
      marks,
      grade,
      remark,
      students (
        surname,
        first_name
      )
    `)
    .eq("class_id", classId)
    .eq("subject", subject)
    .eq("term_id", termId)
    .order("marks", { ascending: false });

  if (error) {
    console.error("Error loading marks sheet:", error.message);
    container.innerHTML = `<p>Failed to load marks sheet.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p>No marks score loaded.</p>`;
    return;
  }

  const rows = [...data].map((item) => ({
    ...item,
    totalScore: Number(item.marks || 0),
    position: "-"
  }));

  rows.sort((a, b) => b.totalScore - a.totalScore);

  let lastScore = null;
  let currentPosition = 0;

  rows.forEach((row, index) => {
    if (row.totalScore !== lastScore) {
      currentPosition = index + 1;
      lastScore = row.totalScore;
    }
    row.position = formatPosition(currentPosition);
  });

  const totals = rows.map((row) => row.totalScore);
  const averageScore = totals.length
    ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(2)
    : "0.00";

  const highestScore = totals.length ? Math.max(...totals) : 0;
  const lowestScore = totals.length ? Math.min(...totals) : 0;

  const bodyRows = rows
    .map((row, index) => {
      const fullName = studentFullName(row.students) || "-";

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(fullName)}</td>
          <td>${row.class_score ?? 0}</td>
          <td>${row.exam_score ?? 0}</td>
          <td>${row.totalScore}</td>
          <td>${escapeHtml(row.grade || "-")}</td>
          <td>${escapeHtml(row.remark || "-")}</td>
          <td>${row.position}</td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="head-marks-sheet-print-area">
      <div class="sheet-header">
        <h2>SCORE SHEET</h2>
        <div class="online-headers-names">
        <p><strong>CLASS:</strong> ${escapeHtml(classData?.class_name || "-")}</p>
        <p><strong>SUBJECT:</strong> ${escapeHtml(subject)}</p>
        <p><strong>ACADEMIC YEAR:</strong> ${escapeHtml(yearData?.year_name || "-")}</p>
        <p><strong>TERM:</strong> ${escapeHtml(termData?.name || "-")}</p>
        </div>
      </div>

      <div class="sheet-summary">
        <p><strong>TOTAL STUDENTS:</strong> ${rows.length}</p>
        <p><strong>AVERAGE SCORE:</strong> ${averageScore}</p>
        <p><strong>HIGHEST SCORE:</strong> ${highestScore}</p>
        <p><strong>LOWEST SCORE:</strong> ${lowestScore}</p>
      </div>

      <table class="student-details-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Student Name</th>
            <th>Class Score</th>
            <th>Exam Score</th>
            <th>Total</th>
            <th>Grade</th>
            <th>Remark</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
}

/* =====================================
   HELPERS
===================================== */
function formatPosition(pos) {
  if (pos % 100 >= 11 && pos % 100 <= 13) return `${pos}TH`;
  if (pos % 10 === 1) return `${pos}ST`;
  if (pos % 10 === 2) return `${pos}ND`;
  if (pos % 10 === 3) return `${pos}RD`;
  return `${pos}TH`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}