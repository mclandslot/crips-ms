

const supabaseTerminalReports = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
let terminalStudents = [];
let terminalStudentRows = [];
let terminalSelectedClassId = "";
let terminalSelectedTermId = "";
let terminalSelectedAcademicYearId = "";
let terminalSelectedClassName = "";
let terminalSelectedTermName = "";
let terminalSelectedAcademicYearName = "";
let terminalCurrentTermData = null;
let terminalTotalStudents = 0;
/* uploaded by the staff themselves from their portal (My Signature) */
let terminalHeadSignatureUrl = "";
let terminalClassTeacherSignatureUrl = "";
const terminalFeedBack = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await initializeTerminalReportsUI();
});

async function initializeTerminalReportsUI() {
  const yearSelect = document.getElementById("academic-year-to-select-terminal-reports");
  const termSelect = document.getElementById("term-to-select-terminal-reports");
  const classSelect = document.getElementById("class-to-select-terminal-reports");
  const viewBtn = document.getElementById("generate-reports-cards-btn");
  const searchInput = document.getElementById("student-to-select-terminal-reports");
  const printBtn = document.getElementById("print-terminal-report-btn");

  await loadTerminalReportClasses();
  await loadTerminalReportAcademicYears();

  yearSelect?.addEventListener("change", async () => {
    terminalSelectedAcademicYearId = yearSelect.value || "";
    terminalSelectedAcademicYearName =
      yearSelect.options[yearSelect.selectedIndex]?.textContent?.trim() || "";
    terminalSelectedTermId = "";
    terminalSelectedTermName = "";
    await loadTermsForSelectedAcademicYear();
  });

  termSelect?.addEventListener("change", () => {
    terminalSelectedTermId = termSelect.value || "";
    terminalSelectedTermName =
      termSelect.options[termSelect.selectedIndex]?.textContent?.trim() || "";
  });

  classSelect?.addEventListener("change", () => {
    terminalSelectedClassId = classSelect.value || "";
    terminalSelectedClassName =
      classSelect.options[classSelect.selectedIndex]?.textContent?.trim() || "";
  });

  viewBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    await handleViewTerminalReports();
  });

  searchInput?.addEventListener("input", () => {
    renderAllTerminalReports();
  });

  printBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    printAllTerminalReports();
  });
}

/* =====================================
   HELPERS
===================================== */
function showTerminalFeedback(message, type = "error") {
  if (!terminalFeedBack) return;
  terminalFeedBack.classList.add("show-message", type);
  terminalFeedBack.innerHTML = message;

  setTimeout(() => {
    terminalFeedBack.classList.remove("show-message", "error", "success");
    terminalFeedBack.innerHTML = "";
  }, 3000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function formatPosition(num) {
  if (!num) return "-";

  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return `${num}ST`;
  if (j === 2 && k !== 12) return `${num}ND`;
  if (j === 3 && k !== 13) return `${num}RD`;
  return `${num}TH`;
}

function formatDisplayDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" }).toUpperCase();
  const year = date.getFullYear();

  let suffix = "TH";
  if (day % 10 === 1 && day % 100 !== 11) suffix = "ST";
  else if (day % 10 === 2 && day % 100 !== 12) suffix = "ND";
  else if (day % 10 === 3 && day % 100 !== 13) suffix = "RD";

  return `${day}${suffix} ${month}, ${year}`;
}

function createDenseRankMap(rows, valueGetter, keyGetter) {
  const sorted = [...rows].sort((a, b) => {
    const bv = Number(valueGetter(b)) || 0;
    const av = Number(valueGetter(a)) || 0;

    if (bv !== av) return bv - av;
    return String(keyGetter(a)).localeCompare(String(keyGetter(b)));
  });

  const rankMap = new Map();
  let currentRank = 0;
  let lastValue = null;

  sorted.forEach((row, index) => {
    const value = Number(valueGetter(row)) || 0;

    if (value !== lastValue) {
      currentRank = index + 1;
    }

    rankMap.set(keyGetter(row), currentRank);
    lastValue = value;
  });

  return rankMap;
}

/* =====================================
   LOAD CLASSES
===================================== */
async function loadTerminalReportClasses() {
  const select = document.getElementById("class-to-select-terminal-reports");
  if (!select) return;

  select.innerHTML = `<option value="">Loading class...</option>`;

  const { data, error } = await supabaseTerminalReports
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error.message);
    select.innerHTML = `<option value="">Failed to load class</option>`;
    return;
  }

  select.innerHTML = `<option value="">Select class</option>`;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name || "Unnamed Class";
    select.appendChild(option);
  });
}

/* =====================================
   LOAD ACADEMIC YEARS
===================================== */
async function loadTerminalReportAcademicYears() {
  const select = document.getElementById("academic-year-to-select-terminal-reports");
  if (!select) return;

  select.innerHTML = `<option value="">Loading year...</option>`;

  const { data, error } = await supabaseTerminalReports
    .from("academic_years")
    .select("id, year_name, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading academic years:", error.message);
    select.innerHTML = `<option value="">Failed to load year</option>`;
    return;
  }

  select.innerHTML = `<option value="">Select year</option>`;

  (data || []).forEach((year) => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name || "Unnamed Year";
    if (year.is_active) option.selected = true;
    select.appendChild(option);
  });

  terminalSelectedAcademicYearId = select.value || "";
  terminalSelectedAcademicYearName =
    select.options[select.selectedIndex]?.textContent?.trim() || "";

  if (select.value) {
    await loadTermsForSelectedAcademicYear();
  }
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadTermsForSelectedAcademicYear() {
  const yearSelect = document.getElementById("academic-year-to-select-terminal-reports");
  const termSelect = document.getElementById("term-to-select-terminal-reports");

  if (!yearSelect || !termSelect) return;

  const academicYearId = yearSelect.value;

  termSelect.innerHTML = `<option value="">Loading term...</option>`;

  if (!academicYearId) {
    termSelect.innerHTML = `<option value="">Select term</option>`;
    terminalSelectedTermId = "";
    terminalSelectedTermName = "";
    return;
  }

  const { data, error } = await supabaseTerminalReports
    .from("terms")
    .select("id, name, academic_year_id, start_date, end_date, created_at")
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading terms:", error.message);
    termSelect.innerHTML = `<option value="">Failed to load term</option>`;
    return;
  }

  termSelect.innerHTML = `<option value="">Select term</option>`;

  (data || []).forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name || "Unnamed Term";
    option.dataset.startDate = term.start_date || "";
    option.dataset.endDate = term.end_date || "";
    termSelect.appendChild(option);
  });

  terminalSelectedTermId = "";
  terminalSelectedTermName = "";
}

/* =====================================
   GENERATE REPORTS
===================================== */
async function handleViewTerminalReports() {
  const classSelect = document.getElementById("class-to-select-terminal-reports");
  const termSelect = document.getElementById("term-to-select-terminal-reports");
  const yearSelect = document.getElementById("academic-year-to-select-terminal-reports");

  if (!classSelect || !termSelect || !yearSelect) return;

  terminalSelectedClassId = classSelect.value;
  terminalSelectedTermId = termSelect.value;
  terminalSelectedAcademicYearId = yearSelect.value;

  terminalSelectedClassName =
    classSelect.options[classSelect.selectedIndex]?.textContent?.trim() || "-";
  terminalSelectedTermName =
    termSelect.options[termSelect.selectedIndex]?.textContent?.trim() || "-";
  terminalSelectedAcademicYearName =
    yearSelect.options[yearSelect.selectedIndex]?.textContent?.trim() || "-";

  if (!terminalSelectedClassId) {
    showTerminalFeedback("Please select a class", "error");
    return;
  }

  if (!terminalSelectedTermId) {
    showTerminalFeedback("Please select a term", "error");
    return;
  }

  if (!terminalSelectedAcademicYearId) {
    showTerminalFeedback("Please select an academic year", "error");
    return;
  }

  await loadCurrentTermData();
  await loadReportSignatures();
  await loadStudentsForTerminalReports();
}

/* =====================================
   SIGNATURES

   Each member of staff uploads their own signature from their portal and
   it is stored on their teachers row. The head teacher's signs every
   report; the signature of the teacher assigned to the selected class
   signs that class's reports.
===================================== */
async function loadReportSignatures() {
  await Promise.all([
    loadHeadTeacherSignature(),
    loadClassTeacherSignature()
  ]);
}

/* teachers.role holds the raw value typed into the Add Teacher form
   ("Head Teacher"), so the match is made on the normalized spelling
   rather than in the query */
async function loadHeadTeacherSignature() {
  terminalHeadSignatureUrl = "";

  const { data, error } = await supabaseTerminalReports
    .from("teachers")
    .select("id, role, signature_url")
    .not("signature_url", "is", null);

  if (error) {
    /* an old database without the column must still print the report */
    console.error("Error loading head teacher signature:", error.message);
    return;
  }

  const headTeacher = (data || []).find((teacher) => {
    const role = String(teacher.role || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    return role === "head_teacher" || role === "headteacher";
  });

  terminalHeadSignatureUrl = headTeacher?.signature_url || "";
}

/* class_teachers holds one row per class, so the assigned teacher - and
   with them the signature that belongs on this class's cards - is a
   single lookup on the selected class */
async function loadClassTeacherSignature() {
  terminalClassTeacherSignatureUrl = "";

  if (!terminalSelectedClassId) return;

  const { data, error } = await supabaseTerminalReports
    .from("class_teachers")
    .select("class_id, teacher_id, teachers ( signature_url )")
    .eq("class_id", terminalSelectedClassId)
    .limit(1);

  if (error) {
    console.error("Error loading class teacher signature:", error.message);
    return;
  }

  terminalClassTeacherSignatureUrl = data?.[0]?.teachers?.signature_url || "";
}

/* =====================================
   LOAD CURRENT TERM
===================================== */
async function loadCurrentTermData() {
  terminalCurrentTermData = null;

  const { data: currentTerm, error: currentTermError } =
    await supabaseTerminalReports
      .from("terms")
      .select("id, name, academic_year_id, start_date, end_date, created_at")
      .eq("id", terminalSelectedTermId)
      .single();

  if (currentTermError) {
    console.error("Error loading current term:", currentTermError.message);
    return;
  }

  terminalCurrentTermData = currentTerm;
}

/* =====================================
   LOAD STUDENTS
===================================== */
async function loadStudentsForTerminalReports() {
  const totalEl =
    document.getElementById("show-total-student-in-class-text") ||
    document.getElementById("total-students-in-class");

  const classTitle = document.getElementById("class-choose-name-terminal-reports");

  if (classTitle) {
    classTitle.textContent = `${terminalSelectedClassName} report`;
  }

  const { data: students, error: studentsError } =
    await supabaseTerminalReports
      .from("students")
      .select("id, surname, first_name, gender, class_id, picture_url")
      .eq("class_id", terminalSelectedClassId)
      .order("surname", { ascending: true })
      .order("first_name", { ascending: true });

  if (studentsError) {
    console.error("Error loading students:", studentsError.message);
    showTerminalFeedback("Failed to load students", "error");

    if (totalEl) totalEl.textContent = "0";
    return;
  }

  terminalStudents = sortStudentsByName(students);
  terminalTotalStudents = terminalStudents.length;

  if (totalEl) {
    totalEl.textContent = terminalStudents.length;
  }

  if (!terminalStudents.length) {
    renderNoTerminalReports("No students found in the selected class.");
    return;
  }

  await buildTerminalStudentRows();
  renderAllTerminalReports();
}

/* =====================================
   BUILD REPORT DATA
===================================== */
async function buildTerminalStudentRows() {
  const termStart = terminalCurrentTermData?.start_date || "";
  const termEnd = terminalCurrentTermData?.end_date || "";

  const [
    marksResponse,
    remarksResponse,
    attendanceResponse,
    termSettingsResponse,
    reportSettingsResponse
  ] = await Promise.all([
    supabaseTerminalReports
      .from("student_marks")
      .select(`
        id,
        student_id,
        class_id,
        subject,
        term_id,
        marks,
        class_score,
        exam_score,
        grade,
        remark
      `)
      .eq("class_id", terminalSelectedClassId)
      .eq("term_id", terminalSelectedTermId),

    supabaseTerminalReports
      .from("class_teacher_remarks")
      .select(`
        student_id,
        class_id,
        term_id,
        conduct,
        attitude,
        interest,
        remark,
        promotion_class
      `)
      .eq("class_id", terminalSelectedClassId)
      .eq("term_id", terminalSelectedTermId),

    termStart && termEnd
      ? supabaseTerminalReports
      .from("attendance")
      .select("student_id, class_id, date, status, term_id, academic_year_id")
      .eq("class_id", terminalSelectedClassId)
      .eq("term_id", terminalSelectedTermId)
      .eq("academic_year_id", terminalSelectedAcademicYearId)
      : Promise.resolve({ data: [], error: null }),

    supabaseTerminalReports
      .from("term_days")
      .select("term_id, academic_year_id, total_days")
      .eq("term_id", terminalSelectedTermId)
      .eq("academic_year_id", terminalSelectedAcademicYearId)
      .limit(1),

    supabaseTerminalReports
      .from("report_settings")
      .select("vacation_date, next_term_date, term_id, academic_year_id")
      .eq("term_id", terminalSelectedTermId)
      .eq("academic_year_id", terminalSelectedAcademicYearId)
      .limit(1)
  ]);

  const { data: marks, error: marksError } = marksResponse;
  const { data: remarksData, error: remarksError } = remarksResponse;
  const { data: attendanceRows, error: attendanceError } = attendanceResponse;
  const { data: termSettingsRows, error: termSettingsError } = termSettingsResponse;
  const { data: reportSettingsRows, error: reportSettingsError } = reportSettingsResponse;

  if (marksError) {
    console.error("Error loading marks:", marksError.message);
    showTerminalFeedback("Failed to load marks", "error");
    return;
  }

  if (remarksError) {
    console.error("Error loading remarks:", remarksError.message);
  }

  if (attendanceError) {
    console.error("Error loading attendance:", attendanceError.message);
  }

  if (termSettingsError) {
    console.error("Error loading term settings:", termSettingsError.message);
  }

  if (reportSettingsError) {
    console.error("Error loading report settings:", reportSettingsError.message);
  }

  const vacationDate = reportSettingsRows?.[0]?.vacation_date || "";
  const nextTermDate = reportSettingsRows?.[0]?.next_term_date || "";

  /* subjects print in the school's report order; any subject not listed
     here follows after, alphabetically */
  const subjectDisplayNames = [
    "English Language",
    "Mathematics",
    "Science",
    "Religious And Moral Education",
    "Our World Our People",
    "Ghanaian Language",
    "History",
    "Computing",
    "French",
    "Creative Arts",
    "Reading"
  ];
  const subjectOrder = subjectDisplayNames.map(normalizeText);

  const subjectRank = (name) => {
    const index = subjectOrder.indexOf(normalizeText(name));
    return index === -1 ? subjectOrder.length : index;
  };

  /* one row per subject however its marks were spelled
     (e.g. "Religious and Moral Education" vs "Religious And Moral Education") */
  const subjectsByKey = new Map();

  (marks || []).forEach((item) => {
    const subjectName = String(item.subject || "").trim();
    const key = normalizeText(subjectName);
    if (!subjectName || subjectsByKey.has(key)) return;

    const rank = subjectOrder.indexOf(key);
    subjectsByKey.set(key, rank === -1 ? subjectName : subjectDisplayNames[rank]);
  });

  const allSubjects = [...subjectsByKey.values()].sort(
    (a, b) => subjectRank(a) - subjectRank(b) || a.localeCompare(b)
  );

  const remarksMap = new Map();
  (remarksData || []).forEach((item) => {
    remarksMap.set(item.student_id, {
      conduct: item.conduct || "",
      attitude: item.attitude || "",
      interest: item.interest || "",
      classRemark: item.remark || "",
      promotionClass: item.promotion_class
    });
  });

  const attendancePresentMap = new Map();
  const distinctAttendanceDates = new Set();
  const attendanceMarkedStudents = new Set();

  (attendanceRows || []).forEach((item) => {
    if (item.date) {
      distinctAttendanceDates.add(item.date);
    }

    if (item.student_id) {
      attendanceMarkedStudents.add(item.student_id);
    }

    const statusValue = normalizeText(item.status);
  
    const isPresent =
      statusValue === "present";
  
    if (isPresent && item.student_id) {
      attendancePresentMap.set(
        item.student_id,
        (attendancePresentMap.get(item.student_id) || 0) + 1
      );
    }
  });

  const configuredTotalDays =
    Number(termSettingsRows?.[0]?.total_days) || distinctAttendanceDates.size || 0;

  const subjectPositionMap = new Map();

  allSubjects.forEach((subjectName) => {
    const rowsForSubject = terminalStudents.map((student) => {
      const found = (marks || []).find(
        (mark) =>
          mark.student_id === student.id &&
          normalizeText(mark.subject) === normalizeText(subjectName)
      );

      const classScore = Number(found?.class_score || 0);
      const examScore = Number(found?.exam_score || 0);
      const totalScore =
        found?.marks !== null &&
        found?.marks !== undefined &&
        found?.marks !== ""
          ? Number(found.marks)
          : classScore + examScore;

      return {
        student_id: student.id,
        student_name: studentFullName(student),
        score: totalScore
      };
    });

    const rankMap = createDenseRankMap(
      rowsForSubject,
      (row) => row.score,
      (row) => row.student_id
    );

    rowsForSubject.forEach((row) => {
      subjectPositionMap.set(
        `${row.student_id}__${normalizeText(subjectName)}`,
        rankMap.get(row.student_id) || "-"
      );
    });
  });

  terminalStudentRows = terminalStudents.map((student, index) => {
    const fullName = studentFullName(student) || "-";

    const studentMarks = (marks || []).filter(
      (mark) => mark.student_id === student.id
    );

    const subjectRows = allSubjects.map((subjectName) => {
      const found = studentMarks.find(
        (mark) => normalizeText(mark.subject) === normalizeText(subjectName)
      );

      const subjectPosition =
        subjectPositionMap.get(
          `${student.id}__${normalizeText(subjectName)}`
        ) || "-";

      const classScore =
        found?.class_score !== null && found?.class_score !== undefined
          ? Number(found.class_score)
          : null;

      const examScore =
        found?.exam_score !== null && found?.exam_score !== undefined
          ? Number(found.exam_score)
          : null;

      const total =
        found?.marks !== null && found?.marks !== undefined && found?.marks !== ""
          ? Number(found.marks)
          : Number(found?.class_score || 0) + Number(found?.exam_score || 0);

      return {
        subject: subjectName,
        classScore,
        examScore,
        marks: found ? total : null,
        grade: found?.grade || "-",
        remark: found?.remark || "-",
        subjectPosition: subjectPosition === "-" ? "-" : formatPosition(subjectPosition)
      };
    });

    const validScores = subjectRows
      .map((item) => Number(item.marks))
      .filter((num) => !Number.isNaN(num));

    const total = validScores.reduce((sum, num) => sum + num, 0);
    const average = validScores.length
      ? (total / validScores.length).toFixed(2)
      : "0.00";

    return {
      student_id: student.id,
      student_name: fullName,
      picture_url: student.picture_url || "",
      rollNumber: index + 1,
      subjectRows,
      total,
      average,
      position: "-",
      /* attendance the class teacher never marked stays blank so the
         report prints dotted lines instead of a misleading 0 */
      attendancePresent: attendanceMarkedStudents.has(student.id)
        ? attendancePresentMap.get(student.id) || 0
        : "",
      attendanceTotal: attendanceMarkedStudents.has(student.id)
        ? configuredTotalDays
        : "",
      conduct: remarksMap.get(student.id)?.conduct || "",
      attitude: remarksMap.get(student.id)?.attitude || "",
      interest: remarksMap.get(student.id)?.interest || "",
      classRemark: remarksMap.get(student.id)?.classRemark || "",
      promotionClass: remarksMap.get(student.id)?.promotionClass || "",
      vacationDate: vacationDate,
      nextResumeDate: nextTermDate
    };
  });

  terminalStudentRows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.student_name.localeCompare(b.student_name);
  });

  let currentPosition = 0;
  let lastTotal = null;

  terminalStudentRows.forEach((row, index) => {
    if (row.total !== lastTotal) {
      currentPosition = index + 1;
    }

    row.position = currentPosition;
    lastTotal = row.total;
    row.rollNumber = index + 1;
  });
}

/* =====================================
   RENDER ALL REPORTS
===================================== */
function renderAllTerminalReports() {
  const container = document.getElementById("all-terminal-reports-container");
  const searchInput = document.getElementById("student-to-select-terminal-reports");

  if (!container) return;

  const searchValue = normalizeText(searchInput?.value || "");
  let rowsToRender = [...terminalStudentRows];

  if (searchValue) {
    rowsToRender = rowsToRender.filter((item) =>
      normalizeText(item.student_name).includes(searchValue)
    );
  }

  if (!rowsToRender.length) {
    renderNoTerminalReports("No matching student report found.");
    return;
  }

  /* a field the class teacher left empty prints as a dotted line to be
     filled in by hand, like the unsigned signature lines */
  const remarkOrDots = (value, dots) => {
    const text = String(value ?? "").trim();
    return text ? escapeHtml(text) : ".".repeat(dots);
  };

  /* an uploaded signature replaces the dotted line it would be signed on */
  const classTeacherSignatureMarkup = terminalClassTeacherSignatureUrl
    ? `<img src="${escapeHtml(terminalClassTeacherSignatureUrl)}" alt="class teacher signature" class="signature-img">`
    : `<h4>................................................</h4>`;

  const headSignatureMarkup = terminalHeadSignatureUrl
    ? `<img src="${escapeHtml(terminalHeadSignatureUrl)}" alt="head teacher signature" class="signature-img">`
    : `<h4>.................................................</h4>`;

  container.innerHTML = rowsToRender
    .map((studentRow) => {
      const subjectTableRows = studentRow.subjectRows.length
        ? studentRow.subjectRows
            .map((item) => {
              return `
                <tr>
                  <td class="left-text">${escapeHtml(item.subject)}</td>
                  <td>${item.classScore ?? "-"}</td>
                  <td>${item.examScore ?? "-"}</td>
                  <td>${item.marks ?? "-"}</td>
                  <td>${item.subjectPosition}</td>
                  <td>${escapeHtml(item.grade)}</td>
                  <td>${escapeHtml(item.remark)}</td>
                </tr>
              `;
            })
            .join("")
        : `
          <tr>
            <td colspan="7">No subjects/marks found for this student.</td>
          </tr>
        `;

      return `
        <div class="assessment-table-container terminal-report-print-card">
          <div class="terminal-card-header-details">
            <img src="icons/CRIG-LOGO1.png" alt="logo" class="school-img">
            <div class="school-details-middle">
              <h2>MINISTRY OF EDUCATION</h2>
              <h3>CRIG PRIMARY SCHOOL</h3>
              <h5>COCOA RESEARCH INSTITUTE OF GHANA, NEW TAFO-AKIM</h5>
              <h5>PHONE: 0503263420</h5>
              <h4 class="dark-over">TERMINAL REPORT</h4>
            </div>
            <div class="student-profile-img"></div>
          </div>

          <div class="class-in-information">
            <div class="box-left-in-class">
              <h4>NAME: <span>${escapeHtml(studentRow.student_name)}</span></h4>
              <h4>ACADEMIC YEAR: <span>${escapeHtml(terminalSelectedAcademicYearName)}</span></h4>
              <h4>TERM: <span>${escapeHtml(terminalSelectedTermName)}</span></h4>
              <h4>CLASS: <span>${escapeHtml(terminalSelectedClassName)}</span></h4>
              <h4>NUMBER ON ROLL: <span>${terminalTotalStudents}</span></h4>
            </div>

            <div class="box-left-in-class">
              <h4>AVERAGE SCORE: <span>${studentRow.average}</span></h4>
              <h4>TOTAL SCORE: <span>${studentRow.total}</span></h4>
              <h4>POSITION IN CLASS: <span>${formatPosition(studentRow.position)}</span></h4>
              <h4>DATE OF VACATION: <span>${formatDisplayDate(studentRow.vacationDate)}</span></h4>
              <h4>NEXT TERM BEGINS: <span>${studentRow.nextResumeDate ? formatDisplayDate(studentRow.nextResumeDate) : "-"}</span></h4>
            </div>
          </div>

          <div class="grade-term-report-table">
            <table class="report-table">
              <thead>
                <tr>
                  <th class="left-text">SUBJECT</th>
                  <th>CLASS SCORE (50%)</th>
                  <th>EXAMS SCORE (50%)</th>
                  <th>TOTAL SCORE (100%)</th>
                  <th>POSITION</th>
                  <th>GRADE</th>
                  <th>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                ${subjectTableRows}
              </tbody>
            </table>
          </div>

          <div class="over-all-remarks-card">
            <div class="flex-h4-text">
              <h4>ATTENDANCE: <span>${remarkOrDots(studentRow.attendancePresent, 10)}</span></h4>
              <h4>OUT OF: <span>${remarkOrDots(studentRow.attendanceTotal, 10)}</span></h4>
              <h4>PROMOTED TO: <span>${remarkOrDots(studentRow.promotionClass, 50)}</span></h4>
            </div>

            <h4>CONDUCT: <span>${remarkOrDots(studentRow.conduct, 159)}</span></h4>
            <h4>ATTITUDE: <span>${remarkOrDots(studentRow.attitude, 159)}</span></h4>
            <h4>INTEREST: <span>${remarkOrDots(studentRow.interest, 159)}</span></h4>
            <h4>CLASS TEACHER'S REMARKS: <span>${remarkOrDots(studentRow.classRemark, 120)}</span></h4>
          </div>

          <div class="grade-box-flex">
            <div class="signature-flex">
              <div class="signature-card">
                ${classTeacherSignatureMarkup}
                <h4>CLASS TEACHER'S SIGNATURE</h4>
              </div>
              <div class="signature-card">
                ${headSignatureMarkup}
                <h4>HEAD TEACHER'S SIGNATURE</h4>
              </div>
            </div>

            <div class="grades-card-flex">
              <div class="card-grade">
                <h5>0 - 49 FAIL</h5>
                <h5>70 - 79 GOOD</h5>
              </div>

              <div class="card-grade">
                <h5>50 - 59 WEAK PASS</h5>
                <h5>80 - 89 VERY GOOD</h5>
              </div>

              <div class="card-grade">
                <h5>60 - 69 AVERAGE</h5>
                <h5>90 - 100 EXCELLENT</h5>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderNoTerminalReports(message) {
  const container = document.getElementById("all-terminal-reports-container");
  if (!container) return;

  container.innerHTML = `
    <div class="assessment-table-container terminal-report-print-card">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/* =====================================
   PRINT
===================================== */
function printAllTerminalReports() {
  window.print();
}

/* =====================================
   PRINT
===================================== */
/* =====================================
   PRINT (A4 FORMAT)
===================================== */
function printAllTerminalReports() {
  const container = document.getElementById("all-terminal-reports-container");

  if (!container || !container.innerHTML.trim()) {
    alert("No report cards loaded to print.");
    return;
  }

  /* The print window is a blank page, so a relative src such as
     "../CRIG-LOGO1.png" has nothing reliable to resolve against. img.src
     is the absolute URL the browser already resolved for the on-screen
     cards, so it points at the logo wherever the app is hosted (domain
     root or a sub-folder), and the same goes for signature images. */
  const printable = container.cloneNode(true);
  const liveImages = container.querySelectorAll("img");

  printable.querySelectorAll("img").forEach((img, index) => {
    const resolved = liveImages[index]?.src;
    if (resolved) img.setAttribute("src", resolved);
  });

  const printableHtml = printable.innerHTML;

  const printWindow = window.open("", "_blank", "width=1200,height=900");

  if (!printWindow) {
    alert("Unable to open print window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Terminal Reports</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 10px;
            color: #000;
             -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .terminal-card-header-details{
           display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 2rem;
          }

          .school-details-middle{
            display: flex;
            flex-direction: column;
            gap: .3rem;
            text-align: center;
            padding: 0 1rem;
          }

            .school-details-middle h2{
              font-size: 1.8rem;
          }
          .school-details-middle h3{
          font-size: 1.5rem;
          }
          .school-details-middle h4{
          font-size: 1.3rem;
          background-color: #000;
          }

          .school-img{
            width: 100px;
            height: 100px;
            display: block;
        }

          .terminal-report-print-card {
            page-break-after: always;
            width: 100%;
            box-sizing: border-box;
          }

          .class-in-information{
             display: flex;
            gap: 1.5rem;
            align-items: center;
            justify-content: space-between;
            margin-block: 1rem;
            padding: 0 1.5rem;
          }

          /* a long name ("ACHEAMPONG OWOAHENE MARY ASEDA") runs onto a
             second line, so each column needs to own its width and each
             line needs room to sit under the one before it */
          .class-in-information .box-left-in-class{
            flex: 1 1 0;
            min-width: 0;
          }

          .class-in-information h4{
          font-size: 13px;
          line-height: 1.45;
          margin: 4px 0;
          overflow-wrap: break-word;
          }

            .dark-over{
    color: #ffffff;
    background-color: #000;
    padding: .3rem;
    width: 200px;
    display: block;
    margin-inline: auto;
    border-radius: 5px;
    border: 1px solid #ccc;
}
.student-profile-img{
     width: 100px;
     height: 120px;  
     border: 1px solid #ccc;
     overflow: hidden;
}
.student-profile-img img{
    width: 100%;
    object-fit: cover;
}

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }

          .grades-card-flex{
          padding: .5rem 1rem;
          border: 1px solid #242323;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 2rem;
          }

          th, td {
            border: 1px solid #000;
            padding: 5px;
            font-size: 12px;
            text-align: center;
          }

          .left-text {
            text-align: left;
          }

          /* the subject column takes the room it needs so long names like
             "Religious And Moral Education" stay on one line */
          .report-table th:first-child,
          .report-table td:first-child {
            width: 20%;
            white-space: nowrap;
            padding-left: 8px;
          }

          h2, h3, h4, h5, p {
            margin: 1px 0;
          }

.flex-h4-text{
    position:relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 7px;
    margin-top: 20px;
}



.flex-h4-text span{
    margin-left: 20px;
}

    .over-all-remarks-card h4{
    margin-bottom: .5rem;
        font-size: 13px;
}
        .over-all-remarks-card{
        margin-top: 12px;
        }
.signature-flex{
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: center;
    margin-top: 2.8rem;
}
.signature-flex h4{
    font-size: 13px;
}
/* the head teacher's uploaded signature sits where the dotted line was,
   so the label under it must not move between signed and unsigned cards */
.signature-img{
    display: block;
    width: 160px;
    height: 45px;
    object-fit: contain;
    margin: 0 auto;
}
    .over-all-remarks-card h4{
    margin-left: 20px;
    margin-bottom: 8px;
    }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        </style>
      </head>

      <body>
        ${printableHtml}
      </body>
      
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  /* the logo and the head teacher's signature are still downloading when
     the document closes, and a print fired now leaves blank boxes */
  waitForPrintImages(printWindow).then(() => {
    printWindow.print();
  });
}

/* resolves once every image in the print window has loaded (or failed),
   and after 5s regardless so a broken link never blocks printing */
function waitForPrintImages(printWindow, timeout = 5000) {
  return new Promise((resolve) => {
    const images = Array.from(printWindow.document.images || []);
    const pending = images.filter((img) => !img.complete);

    if (!pending.length) {
      resolve();
      return;
    }

    let remaining = pending.length;
    let settled = false;

    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const onSettled = () => {
      remaining -= 1;
      if (remaining <= 0) done();
    };

    pending.forEach((img) => {
      img.addEventListener("load", onSettled, { once: true });
      img.addEventListener("error", onSettled, { once: true });
    });

    setTimeout(done, timeout);
  });
}

