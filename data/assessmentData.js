const supabaseAssessmentSheet = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
let assessmentClasses = [];
let assessmentTerms = [];
let assessmentAssignments = [];
let assessmentAcademicYearText = "";

const assessFeedback = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await initializeAssessmentSheetUI();
});

async function initializeAssessmentSheetUI() {
  await loadAssessmentSheetClasses();
  await loadAssessmentSheetTerms();

  document
    .getElementById("assessment-sheet-class")
    ?.addEventListener("change", loadAssessmentSubjectsForSelectedClass);

  document
    .getElementById("load-assessment-sheet-btn")
    ?.addEventListener("click", handleLoadAssessmentSheet);

  document
    .getElementById("print-assessemt-sheet-btn")
    ?.addEventListener("click", printAssessmentSheet);
}

/* =====================================
   HELPERS
===================================== */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function setAssessmentText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "-";
}

function getTeacherDisplayName(assignment) {
  const teacherObj =
    assignment?.teachers ||
    assignment?.teacher ||
    assignment?.teachers_data ||
    null;

  if (teacherObj) {
    const surname = teacherObj.surname || "";
    const firstName = teacherObj.first_name || "";
    const fullName = `${surname} ${firstName}`.trim();
    if (fullName) return fullName;
  }

  return assignment?.teacher_name || "-";
}

/* =====================================
   LOAD CLASSES
===================================== */
async function loadAssessmentSheetClasses() {
  const classSelect = document.getElementById("assessment-sheet-class");
  if (!classSelect) return;

  classSelect.innerHTML = `<option value="">Loading classes...</option>`;

  const { data, error } = await supabaseAssessmentSheet
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error.message);
    classSelect.innerHTML = `<option value="">Failed to load classes</option>`;
    return;
  }

  assessmentClasses = data || [];

  classSelect.innerHTML = `<option value="">Select class</option>`;

  assessmentClasses.forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name || "Unnamed Class";
    classSelect.appendChild(option);
  });
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadAssessmentSheetTerms() {
  const termSelect = document.getElementById("assessment-sheet-term");
  if (!termSelect) return;

  termSelect.innerHTML = `<option value="">Loading terms...</option>`;

  const { data, error } = await supabaseAssessmentSheet
    .from("terms")
    .select(`
      id,
      name,
      academic_year_id,
      academic_years (
        id,
        year_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading terms:", error.message);
    termSelect.innerHTML = `<option value="">Failed to load terms</option>`;
    return;
  }

  assessmentTerms = data || [];

  termSelect.innerHTML = `<option value="">Select term</option>`;

  assessmentTerms.forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name || "Unnamed Term";
    option.dataset.termName = term.name || "";
    option.dataset.academicYear =
      term.academic_years?.year_name || "";
    termSelect.appendChild(option);
  });
}

/* =====================================
   LOAD SUBJECTS FOR SELECTED CLASS
===================================== */
async function loadAssessmentSubjectsForSelectedClass() {
  const classSelect = document.getElementById("assessment-sheet-class");
  const subjectSelect = document.getElementById("assessment-sheet-subject");

  if (!classSelect || !subjectSelect) return;

  const classId = classSelect.value;

  subjectSelect.innerHTML = `<option value="">Loading subjects...</option>`;

  if (!classId) {
    subjectSelect.innerHTML = `<option value="">Select subject</option>`;
    return;
  }

  /* Assignments carry the teacher for the sheet header; marks say what was
     actually recorded. Both are needed, or a subject disappears from this
     list as soon as its teacher leaves or is reassigned. */
  const [assignments, marks] = await Promise.all([
    supabaseAssessmentSheet
      .from("teacher_subject_assignments")
      .select(`
        id,
        class_id,
        subject,
        teacher_id,
        teachers (
          surname,
          first_name
        )
      `)
      .eq("class_id", classId)
      .order("subject", { ascending: true }),
    supabaseAssessmentSheet
      .from("student_marks")
      .select("subject")
      .eq("class_id", classId)
  ]);

  if (assignments.error || marks.error) {
    console.error(
      "Error loading assigned subjects:",
      assignments.error?.message || marks.error?.message
    );
    subjectSelect.innerHTML = `<option value="">Failed to load subjects</option>`;
    return;
  }

  assessmentAssignments = assignments.data || [];

  const uniqueSubjectsMap = new Map();

  assessmentAssignments.forEach((item) => {
    const subjectName = String(item.subject || "").trim();
    if (!subjectName) return;

    const key = normalizeText(subjectName);
    if (!uniqueSubjectsMap.has(key)) {
      uniqueSubjectsMap.set(key, item);
    }
  });

  /* subjects with marks but no current assignment - the header teacher
     falls back to "-" for these */
  (marks.data || []).forEach((row) => {
    const subjectName = String(row.subject || "").trim();
    if (!subjectName) return;

    const key = normalizeText(subjectName);
    if (!uniqueSubjectsMap.has(key)) {
      uniqueSubjectsMap.set(key, { class_id: classId, subject: subjectName });
    }
  });

  /* re-sorted because the marks-only subjects were appended after the
     assignment rows the query had already ordered */
  const uniqueSubjects = [...uniqueSubjectsMap.values()].sort((a, b) =>
    String(a.subject || "").localeCompare(String(b.subject || ""))
  );

  subjectSelect.innerHTML = `<option value="">Select subject</option>`;

  uniqueSubjects.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.subject;
    option.textContent = item.subject;
    subjectSelect.appendChild(option);
  });
}

/* =====================================
   LOAD ASSESSMENT SHEET
===================================== */
async function handleLoadAssessmentSheet() {
  const classSelect = document.getElementById("assessment-sheet-class");
  const subjectSelect = document.getElementById("assessment-sheet-subject");
  const termSelect = document.getElementById("assessment-sheet-term");
  const tableBody = document.getElementById("assessment-sheet-table-body");
  const container = document.querySelector(".assessement-sheet-container");

  if (!classSelect || !subjectSelect || !termSelect || !tableBody || !container) {
    return;
  }

  const classId = classSelect.value;
  const subjectName = subjectSelect.value;
  const termId = termSelect.value;

  if (!classId) {
    // alert("Please select a class.");
    assessFeedback.classList.add("show-message", "error");
    assessFeedback.innerHTML = "Please select a class";
    setTimeout(()=>{
         assessFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (!subjectName) {
     assessFeedback.classList.add("show-message", "error");
    assessFeedback.innerHTML = "Please select a subject";
    setTimeout(()=>{
         assessFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (!termId) {
      assessFeedback.classList.add("show-message", "error");
    assessFeedback.innerHTML = "Please select term";
    setTimeout(()=>{
         assessFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  tableBody.innerHTML = `
    <tr>
      <td colspan="5">Loading assessment sheet...</td>
    </tr>
  `;

  container.style.display = "block";

  const selectedClassText =
    classSelect.options[classSelect.selectedIndex]?.textContent?.trim() || "-";
  const selectedSubjectText =
    subjectSelect.options[subjectSelect.selectedIndex]?.textContent?.trim() || "-";
  const selectedTermOption = termSelect.options[termSelect.selectedIndex];
  const selectedTermText =
    selectedTermOption?.dataset?.termName ||
    selectedTermOption?.textContent?.trim() ||
    "-";

  assessmentAcademicYearText =
    selectedTermOption?.dataset?.academicYear || "-";

  const matchedAssignment = assessmentAssignments.find(
    (item) =>
      item.class_id === classId &&
      normalizeText(item.subject) === normalizeText(subjectName)
  );

  const teacherName = getTeacherDisplayName(matchedAssignment);

  setAssessmentText("assessment-sheet-teacher", teacherName);
  setAssessmentText("assessment-sheet-academic-year", assessmentAcademicYearText);
  setAssessmentText("assessment-sheet-term-text", selectedTermText);
  setAssessmentText("assement-sheet-class-text", selectedClassText);
  setAssessmentText("assement-sheet-subject-text", selectedSubjectText);

  const { data: students, error: studentsError } = await supabaseAssessmentSheet
    .from("students")
    .select("id, surname, first_name, gender")
    .eq("class_id", classId)
    .order("surname", { ascending: true })
    .order("first_name", { ascending: true });

  if (studentsError) {
    console.error("Error loading students:", studentsError.message);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">Failed to load students.</td>
      </tr>
    `;
    return;
  }

  const sortedStudents = sortStudentsByName(students);

  if (!sortedStudents.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">No students found in the selected class.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = sortedStudents
    .map((student, index) => {
      const fullName = studentFullName(student) || "-";

      return `
        <tr>
          <td>${index + 1}</td>
          <td class="left-text">${escapeHtml(fullName)}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    })
    .join("");
}

/* =====================================
   PRINT
===================================== */
function printAssessmentSheet() {
  const printArea = document.getElementById("assessement-sheet-print-area");
  if (!printArea) return;

  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups to print.");
    return;
  }

  /* The print window is a blank document, so admin.css never loads there and
     relative URLs have no base to resolve against. Clone the print area and
     rewrite every image src to its absolute form (the .src property is already
     resolved) before serialising. */
  const sourceImages = printArea.querySelectorAll("img");
  const printClone = printArea.cloneNode(true);
  printClone.querySelectorAll("img").forEach((img, i) => {
    if (sourceImages[i]) img.setAttribute("src", sourceImages[i].src);
  });

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Assessment Sheet</title>
        <style>
          @page {
            size: portrait;
            margin: 12mm;
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: Arial, sans-serif;
            padding: 0;
            color: #000;
          }

          /* --- header: same layout as the terminal report --- */
          /* the logo sits beside the school details, not at the page edge */
          .terminal-card-header-details {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
            margin-bottom: 1rem;
          }

          /* the three title lines sit tight together */
          .school-details-middle {
            display: flex;
            flex-direction: column;
            gap: .1rem;
            text-align: center;
            padding: 0 1rem;
          }

          .school-details-middle h2 { font-size: 1.8rem;
          display: none; }
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

          /* the two meta columns sit together near the centre */
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
          #assement-sheet-subject-text {
            text-transform: uppercase;
          }

          .score-sheet-table-content {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            table-layout: fixed;
          }

          .score-sheet-table-content th,
          .score-sheet-table-content td {
            border: 1px solid #000;
            padding: 5px 4px;
            font-size: 12px;
            text-align: center;
            word-wrap: break-word;
          }

          .score-sheet-table-content th {
            background: #fff;
            font-size: 12px;
            line-height: 1.25;
          }

          /* student name needs the room; the score columns are narrow */
          .score-sheet-table-content th:nth-child(1),
          .score-sheet-table-content td:nth-child(1) { width: 4%; }
          .score-sheet-table-content th:nth-child(2),
          .score-sheet-table-content td:nth-child(2) { width: 50%; text-align: left; }

          .left-text {
            text-align: left !important;
          }

          /* keep rows whole across page breaks and repeat the header */
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }

          @media print {
            body {
              margin: 0;
              padding: 0;
            }
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
     zero-height image and the letterhead prints misaligned. */
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
    printWindow.close();
  });
}