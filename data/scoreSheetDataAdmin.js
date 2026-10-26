const supabaseAdminScoreSheet = window.supabaseClient;

// the loaded sheet, A → Z with positions; the table shows one page of it
let scoreSheetRows = [];
let scoreSheetPager = null;

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadClassesForScoreSheet();
  loadTermsForScoreSheet();

  scoreSheetPager = window.createTablePager({
    mountId: "scoreSheetPager",
    noun: "student",
    pageSize: 50,
    onChange: renderScoreSheetPage
  });

  document
    .getElementById("score-sheet-class")
    ?.addEventListener("change", loadSubjectsForSelectedClass);

  document
    .getElementById("load-score-sheet-btn")
    ?.addEventListener("click", loadScoreSheetData);

  document
    .getElementById("print-score-sheet-btn")
    ?.addEventListener("click", printScoreSheet);
});

/* =====================================
   HELPERS
===================================== */
function formatPosition(pos) {
  if (!pos) return "-";

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

/* =====================================
   LOAD CLASSES
===================================== */
async function loadClassesForScoreSheet() {
  const select = document.getElementById("score-sheet-class");
  if (!select) return;

  const { data, error } = await supabaseAdminScoreSheet
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error(error.message);
    return;
  }

  select.innerHTML = `<option value="">Select Class</option>`;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name;
    select.appendChild(option);
  });

  const subjectSelect = document.getElementById("score-sheet-subject");
  if (subjectSelect) {
    subjectSelect.innerHTML = `<option value="">Select Subject</option>`;
  }
}

/* =====================================
   LOAD SUBJECTS FOR SELECTED CLASS
===================================== */
async function loadSubjectsForSelectedClass() {
  const classId = document.getElementById("score-sheet-class")?.value;
  const subjectSelect = document.getElementById("score-sheet-subject");

  if (!subjectSelect) return;

  subjectSelect.innerHTML = `<option value="">Loading subjects...</option>`;

  if (!classId) {
    subjectSelect.innerHTML = `<option value="">Select Subject</option>`;
    return;
  }

  /* Assignments say who teaches what now; marks say what was actually
     recorded. A subject must stay selectable after its teacher leaves or is
     reassigned, so the list is the union of both. */
  const [assignments, marks] = await Promise.all([
    supabaseAdminScoreSheet
      .from("teacher_subject_assignments")
      .select("subject")
      .eq("class_id", classId),
    supabaseAdminScoreSheet
      .from("student_marks")
      .select("subject")
      .eq("class_id", classId)
  ]);

  if (assignments.error || marks.error) {
    console.error(assignments.error?.message || marks.error?.message);
    subjectSelect.innerHTML = `<option value="">Error loading subjects</option>`;
    return;
  }

  const uniqueSubjects = [
    ...new Set(
      [...(assignments.data || []), ...(marks.data || [])]
        .map((s) => s.subject)
        .filter(Boolean)
    )
  ].sort();

  subjectSelect.innerHTML = `<option value="">Select Subject</option>`;

  uniqueSubjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
}

/* =====================================
   LOAD ACADEMIC YEARS + TERMS
   the term list follows the picked year
===================================== */
async function loadTermsForScoreSheet() {
  await window.termRoster.bindYearTermSelects("score-sheet-year", "score-sheet-term");
}

/* =====================================
   LOAD SCORE SHEET DATA
===================================== */
async function loadScoreSheetData() {
  const classId = document.getElementById("score-sheet-class")?.value;
  const subject = document.getElementById("score-sheet-subject")?.value;
  const termSelect = document.getElementById("score-sheet-term");
  const termId = termSelect?.value;
  const academicYearId = document.getElementById("score-sheet-year")?.value;

  if (!classId || !subject || !academicYearId || !termId) {
    alert("Please select Class, Subject, Academic Year and Term");
    return;
  }

  const tbody = document.getElementById("score-sheet-table-body");
  const headerClassText = document.getElementById("score-sheet-class-text");
  const headerSubjectText = document.getElementById("score-sheet-subject-text");
  const headerTermText = document.getElementById("score-sheet-term-text");
  const summaryText = document.getElementById("score-sheet-summary");
  const teacherText = document.getElementById("score-sheet-teacher");
  const academicYearText = document.getElementById("score-sheet-academic-year");

  if (!tbody) return;

  // the old sheet's pager goes until the new one is in
  scoreSheetRows = [];
  scoreSheetPager?.slice(scoreSheetRows);

  tbody.innerHTML = `<tr><td colspan="6">Loading score sheet...</td></tr>`;

  /* =====================================
     ACADEMIC YEAR
     the year the selected term belongs to, not the newest one
  ===================================== */
  const academicYear =
    termSelect.options[termSelect.selectedIndex]?.dataset.academicYear || "N/A";

  /* the labels live in the markup now, so these carry the value only */
  if (academicYearText) {
    academicYearText.textContent = academicYear || "-";
  }

  /* =====================================
     GET CLASS NAME
  ===================================== */
  const { data: classData } = await supabaseAdminScoreSheet
    .from("classes")
    .select("class_name")
    .eq("id", classId)
    .single();

  /* =====================================
     GET TERM NAME
  ===================================== */
  const { data: termData } = await supabaseAdminScoreSheet
    .from("terms")
    .select("name")
    .eq("id", termId)
    .single();

  if (headerClassText) {
    headerClassText.textContent = classData?.class_name || "-";
  }

  if (headerSubjectText) {
    headerSubjectText.textContent = subject || "-";
  }

  if (headerTermText) {
    headerTermText.textContent = termData?.name || "-";
  }

  

  

  /* =====================================
     GET TEACHER
     who taught the subject in that term (term_staff.sql); today's
     assignment only for a term with no copy
  ===================================== */
  let teacherName = "N/A";

  const termStaff = await window.termRoster.loadTermStaff({ termId, classId });

  if (termStaff) {
    const subjectKey = String(subject || "").trim().toLowerCase();
    const termTeacher = termStaff.subjects.find(
      (row) => String(row.subject || "").trim().toLowerCase() === subjectKey
    );

    teacherName = termTeacher?.teacher_name || "N/A";
  } else {
    const { data: assignmentData, error: assignmentError } =
      await supabaseAdminScoreSheet
        .from("teacher_subject_assignments")
        .select(`
          teacher_id,
          teachers (surname, first_name)
        `)
        .eq("class_id", classId)
        .eq("subject", subject)
        .limit(1)
        .maybeSingle();

    if (assignmentError) {
      console.error("Teacher Assignment Error:", assignmentError.message);
    }

    if (assignmentData?.teachers) {
      teacherName = `${assignmentData.teachers.surname} ${assignmentData.teachers.first_name}`;
    }
  }

  if (teacherText) {
    teacherText.textContent = teacherName;
  }

  /* =====================================
     LOAD MARKS
  ===================================== */
  const { data, error } = await supabaseAdminScoreSheet
    .from("student_marks")
    .select(`
      id,
      student_id,
      class_score,
      exam_score,
      marks,
      students (
        surname,
        first_name,
        gender
      )
    `)
    .eq("class_id", classId)
    .eq("subject", subject)
    .eq("term_id", termId)
    .order("marks", { ascending: false });

  if (error) {
    console.error(error.message);
    tbody.innerHTML = `<tr><td colspan="6">Error loading score sheet</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No marks found for this term</td></tr>`;
    return;
  }

  /* =====================================
     SUMMARY
  ===================================== */
  const totals = data.map((d) => Number(d.marks || 0));
  const highest = Math.max(...totals);
  const lowest = Math.min(...totals);
  const sum = totals.reduce((a, b) => a + b, 0);
  const average = (sum / totals.length).toFixed(2);

  if (summaryText) {
    summaryText.innerHTML = `
      <strong>Total Students:</strong> ${totals.length} |
      <strong>Average:</strong> ${average} |
      <strong>Highest:</strong> ${highest} |
      <strong>Lowest:</strong> ${lowest}
    `;
  }

  /* =====================================
     RANKING WITH TIES
     positions are worked out on the score order,
     then the sheet itself is listed A → Z by name
  ===================================== */
  const rows = data.map((row) => ({
    row,
    name: studentFullName(row.students),
    score: Number(row.marks || 0),
    position: "-"
  }));

  const ranked = [...rows].sort((a, b) => b.score - a.score);

  let lastScore = null;
  let position = 0;

  ranked.forEach((item, index) => {
    if (item.score !== lastScore) {
      position = index + 1;
      lastScore = item.score;
    }

    item.position = formatPosition(position);
  });

  scoreSheetRows = sortStudentsByName(rows, (item) => item.row.students);

  // a newly loaded class/subject/term starts on page 1
  scoreSheetPager?.reset();
  renderScoreSheetPage();

  const container = document.querySelector(".score-sheet-container");
  if (container) {
    container.style.display = "block";
  }
}

/* =====================================
   TABLE PAGES
   only the current page is drawn; printing uses every row
===================================== */
function renderScoreSheetPage() {
  const tbody = document.getElementById("score-sheet-table-body");
  if (!tbody) return;

  const page = scoreSheetPager
    ? scoreSheetPager.slice(scoreSheetRows)
    : { rows: scoreSheetRows, offset: 0 };

  tbody.innerHTML = scoreSheetRowsHtml(page.rows, page.offset);
}

/* numbered by place in the whole sheet, not in the page */
function scoreSheetRowsHtml(items, offset = 0) {
  return items
    .map(({ row, name, position }, index) => `
      <tr>
        <td>${offset + index + 1}</td>
        <td>${escapeHtml(name)}</td>
        <td>${row.class_score ?? 0}</td>
        <td>${row.exam_score ?? 0}</td>
        <td>${row.marks ?? 0}</td>
        <td>${position}</td>
      </tr>
    `)
    .join("");
}

/* =====================================
   PRINT SCORE SHEET (A4)
===================================== */
function printScoreSheet() {
  const printArea = document.getElementById("score-sheet-print-area");

  if (!printArea || !printArea.innerHTML.trim()) {
    alert("No score sheet loaded to print.");
    return;
  }

  const printWindow = window.open("", "_blank", "width=1000,height=800");

  if (!printWindow) {
    alert("Unable to open print window.");
    return;
  }

  /* The print window is a blank document, so admin.css never loads there and
     relative URLs have no base to resolve against. Clone the print area and
     rewrite every image src to its absolute form (the .src property is already
     resolved) before serialising. */
  const sourceImages = printArea.querySelectorAll("img");
  const printClone = printArea.cloneNode(true);

  /* the screen shows one page; the printout gets every student */
  const printBody = printClone.querySelector("#score-sheet-table-body");
  if (printBody && scoreSheetRows.length) {
    printBody.innerHTML = scoreSheetRowsHtml(scoreSheetRows);
  }
  printClone.querySelector(".table-pager")?.remove();
  printClone.querySelectorAll("img").forEach((img, i) => {
    if (sourceImages[i]) img.setAttribute("src", sourceImages[i].src);
  });

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Score Sheet</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #000;
            padding: 12px;
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .score-sheet-container,
          #score-sheet-print-area {
            width: 100%;
          }

          h1, h2, h3, h4, h5, p {
            margin: 4px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }

          th, td {
            border: 1px solid #000;
            padding: 6px;
            font-size: 12px;
            text-align: center;
          }

          th {
            background: #fff;
          }

          /* the name needs the room; the score columns are narrow */
          table { table-layout: fixed; }

          th:nth-child(1), td:nth-child(1) { width: 4%; }
          th:nth-child(2), td:nth-child(2) { width: 50%; text-align: left; }

          .text-center {
            text-align: center;
          }

          .text-right {
            text-align: right;
          }

          /* --- header: same layout as the assessment sheet --- */
          .terminal-card-header-details {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
            margin-bottom: 1rem;
          }

          /* the three title lines sit tight together; the blanket
             "h1..p { margin: 4px 0 }" above would otherwise space them */
          .school-details-middle {
            display: flex;
            flex-direction: column;
            gap: .1rem;
            text-align: center;
            padding: 0 1rem;
          }

          .school-details-middle h2,
          .school-details-middle h3,
          .school-details-middle h4 { margin: 0; }

          .school-details-middle h2 { font-size: 1.8rem; }
          .school-details-middle h3 { font-size: 1.5rem; }
          .school-details-middle h4 { font-size: 1.3rem; }

          /* the source PNG is 1056x992, so it MUST be constrained here or it
             prints at natural size and swallows the page */
          .school-img {
            width: 100px;
            height: 100px;
            object-fit: contain;
            display: block;
            flex-shrink: 0;
          }

          .sheet-logo-balance {
            width: 100px;
            flex-shrink: 0;
          }

          .class-in-information {
            display: flex;
            gap: 5rem;
            align-items: flex-start;
            justify-content: center;
            margin-block: 1rem;
            padding: 0 1.5rem;
          }

          .class-in-information h4 { font-size: 15px; }

          .box-left-in-class h4 {
            font-size: 15px;
            margin-bottom: .3rem;
          }

          /* the subject comes back from the database in mixed case */
          #score-sheet-subject-text {
            text-transform: uppercase;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        </style>
      </head>
      <body>
        ${printClone.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();

  /* Wait for the logo to finish decoding, otherwise print() can fire against a
     zero-height image and the header prints misaligned. */
  const images = Array.from(printWindow.document.images);
  Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
    )
  ).then(() => {
    printWindow.focus();
    printWindow.print();
  });
}