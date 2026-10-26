const supabaseHeadScoreSheet = window.supabaseClient;
const feedShow = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadHeadScoreSheetClasses();
  await loadHeadScoreSheetYears();

  document
    .getElementById("head-score-sheet-year")
    ?.addEventListener("change", loadHeadScoreSheetTerms);

  document
    .getElementById("head-load-score-sheet-btn")
    ?.addEventListener("click", loadHeadScoreSheet);
});

/* =====================================
   LOAD CLASSES
===================================== */
async function loadHeadScoreSheetClasses() {
  const select = document.getElementById("head-score-sheet-class");
  if (!select) return;

  const { data, error } = await supabaseHeadScoreSheet
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
    option.textContent = cls.class_name;
    select.appendChild(option);
  });
}

/* =====================================
   LOAD ACADEMIC YEARS
===================================== */
async function loadHeadScoreSheetYears() {
  const select = document.getElementById("head-score-sheet-year");
  if (!select) return;

  const { data, error } = await supabaseHeadScoreSheet
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
    option.textContent = year.year_name;

    if (year.is_active) option.selected = true;

    select.appendChild(option);
  });

  await loadHeadScoreSheetTerms();
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadHeadScoreSheetTerms() {
  const yearId = document.getElementById("head-score-sheet-year")?.value;
  const termSelect = document.getElementById("head-score-sheet-term");

  if (!termSelect) return;

  termSelect.innerHTML = `<option value="">Select Term</option>`;

  if (!yearId) return;

  const { data, error } = await supabaseHeadScoreSheet
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
    option.textContent = term.name;
    termSelect.appendChild(option);
  });
}

/* =====================================
   LOAD SCORE SHEET
===================================== */
async function loadHeadScoreSheet() {
  const classId = document.getElementById("head-score-sheet-class")?.value;
  const yearId = document.getElementById("head-score-sheet-year")?.value;
  const termId = document.getElementById("head-score-sheet-term")?.value;

  if (!classId || !yearId || !termId) {
    // alert("Select class, academic year and term");
    feedShow.classList.add("show-message", "error");
    feedShow.innerHTML = "Select class, year & term";
    setTimeout(()=>{
      feedShow.classList.remove("show-message", "error");
    },4000);
    return;
  }

  const container = document.getElementById("head-score-sheet-container");
  if (!container) {
    console.error("Score sheet container not found");
    return;
  }

  container.innerHTML = `<p>Loading broadsheet...</p>`;

  const [{ data: classData }, { data: yearData }, { data: termData }] = await Promise.all([
    supabaseHeadScoreSheet
      .from("classes")
      .select("id, class_name")
      .eq("id", classId)
      .maybeSingle(),
    supabaseHeadScoreSheet
      .from("academic_years")
      .select("id, year_name")
      .eq("id", yearId)
      .maybeSingle(),
    supabaseHeadScoreSheet
      .from("terms")
      .select("id, name")
      .eq("id", termId)
      .maybeSingle()
  ]);

  // the class as it stood in the selected term, not after promotion
  let students = [];
  let studentsError = null;

  try {
    students = await window.termRoster.loadTermStudents({
      classId,
      termId,
      academicYearId: yearId,
      select: "id, surname, first_name, gender",
      includeCurrent: (query) => query.not("status", "ilike", "Complete")
    });
  } catch (error) {
    studentsError = error;
  }

  if (studentsError) {
    console.error("Error loading students:", studentsError.message);
    container.innerHTML = `<p>Failed to load students.</p>`;
    return;
  }

  const { data: marks, error: marksError } = await supabaseHeadScoreSheet
    .from("student_marks")
    .select("student_id, subject, marks")
    .eq("class_id", classId)
    .eq("term_id", termId);

  if (marksError) {
    console.error("Error loading marks:", marksError.message);
    container.innerHTML = `<p>Failed to load broadsheet.</p>`;
    return;
  }

  if (!students || students.length === 0) {
    container.innerHTML = `<p>No students found.</p>`;
    return;
  }

  const subjects = [...new Set((marks || []).map((m) => m.subject).filter(Boolean))].sort();

  const rows = students.map((student) => {
    const studentMarks = (marks || []).filter((m) => m.student_id === student.id);
    const total = studentMarks.reduce((sum, m) => sum + Number(m.marks || 0), 0);
    const average = studentMarks.length ? (total / studentMarks.length).toFixed(2) : "0.00";

    return {
      student,
      name: studentFullName(student),
      studentMarks,
      total,
      average,
      position: "-"
    };
  });

  /* the sheet is arranged by position: highest total first, and students
     on the same total share a position and are listed A → Z */
  rows.sort(
    (a, b) => b.total - a.total || compareStudentsByName(a.student, b.student)
  );

  let lastTotal = null;
  let currentPosition = 0;

  rows.forEach((row, index) => {
    if (row.total !== lastTotal) {
      currentPosition = index + 1;
      lastTotal = row.total;
    }
    row.position = formatPosition(currentPosition);
  });

  const totals = rows.map((r) => r.total);
  const classAverage = totals.length
    ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(2)
    : "0.00";
  const highestTotal = totals.length ? Math.max(...totals) : 0;
  const lowestTotal = totals.length ? Math.min(...totals) : 0;

  const headerSubjects = subjects.map((s) => `<th>${escapeHtml(s)}</th>`).join("");

  container.innerHTML = `
    <div class="head-score-sheet-print-area">
      <div class="sheet-header">
        <h2>CLASS BROADSHEET</h2>
      <div class="online-headers-names">
        <p><strong>CLASS:</strong> ${escapeHtml(classData?.class_name || "-")}</p>
        <p><strong>ACADEMIC YEAR:</strong> ${escapeHtml(yearData?.year_name || "-")}</p>
        <p><strong>TERM:</strong> ${escapeHtml(termData?.name || "-")}</p>
      </div>
      </div>

      <div class="sheet-summary">
        <p><strong>TOTAL STUDENT:</strong> ${rows.length}</p>
        <p><strong>CLASS AVERAGE:</strong> ${classAverage}</p>
        <p><strong>HIGHEST TOTAL:</strong> ${highestTotal}</p>
        <p><strong>LOWEST TOTAL:</strong> ${lowestTotal}</p>
      </div>

      <table class="student-details-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Student</th>
            ${headerSubjects}
            <th>Total</th>
            <th>Average</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody id="head-score-sheet-body"></tbody>
      </table>

      <div id="headScoreSheetPager"></div>
    </div>
  `;

  /* the whole class is ranked above; the table shows one page of it.
     The pager is made fresh because its mount was just redrawn. */
  const tbody = document.getElementById("head-score-sheet-body");

  const renderPage = () => {
    const page = pager.slice(rows);

    tbody.innerHTML =
      headScoreSheetRowsHtml(page.rows, page.offset, subjects) ||
      `<tr><td colspan="${subjects.length + 5}">No broadsheet data found.</td></tr>`;
  };

  const pager = window.createTablePager({
    mountId: "headScoreSheetPager",
    noun: "student",
    pageSize: 50,
    onChange: renderPage
  });

  renderPage();
}

/* numbered by place in the whole class, not in the page */
function headScoreSheetRowsHtml(rows, offset, subjects) {
  return rows.map((row, index) => {
    const subjectCells = subjects.map((subject) => {
      const found = row.studentMarks.find((m) => m.subject === subject);
      return `<td>${found?.marks ?? "-"}</td>`;
    }).join("");

    return `
      <tr>
        <td>${offset + index + 1}</td>
        <td>${escapeHtml(row.name)}</td>
        ${subjectCells}
        <td>${row.total}</td>
        <td>${row.average}</td>
        <td>${row.position}</td>
      </tr>
    `;
  }).join("");
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}