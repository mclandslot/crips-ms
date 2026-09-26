const supabaseClassTeacherReport = window.supabaseClient;

let loggedInTeacherId = null;
let assignedClassId = null;
let assignedClassName = "";
let selectedTermId = null;
let selectedTermName = "";
let selectedAcademicYear = "";
let classTeacherReportSubjects = [];
let classTeacherReportRows = [];
let selectedStudentIdForRemark = null;
const reportsRemarksResponse = document.getElementById("form-feedback");

document.addEventListener("DOMContentLoaded", async () => {
  await getLoggedInTeacherAndAssignedClass();
  await loadCurrentTermForClassTeacher();
  await loadAssignedClassTeacherReport();
  setupClassTeacherRemarkModal();

  document
    .getElementById("print-class-report-btn")
    ?.addEventListener("click", () => window.print());
});

/* =====================================
   HELPERS
===================================== */
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

/* A mark row stores the total in `marks`, but fall back to the class + exam
   split when that column was never filled in. */
function resolveTotalMark(markRow) {
  if (!markRow) return null;

  if (
    markRow.marks !== null &&
    markRow.marks !== undefined &&
    markRow.marks !== ""
  ) {
    return Number(markRow.marks);
  }

  return Number(markRow.class_score || 0) + Number(markRow.exam_score || 0);
}

/* Dense ranking: equal scores share a position, and the next distinct score
   resumes at its ordinal index (1, 2, 2, 4 ...). */
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
   GET LOGGED-IN TEACHER + ASSIGNED CLASS
===================================== */
async function getLoggedInTeacherAndAssignedClass() {
  try {
    const {
      data: { user },
      error: userError
    } = await supabaseClassTeacherReport.auth.getUser();

    if (userError || !user) {
      throw new Error("User not logged in");
    }

    const { data: teacherData, error: teacherError } =
      await supabaseClassTeacherReport
        .from("teachers")
        .select("id, email")
        .eq("email", user.email)
        .single();

    if (teacherError || !teacherData) {
      throw new Error("Teacher record not found");
    }

    loggedInTeacherId = teacherData.id;

    const { data: assignedData, error: assignedError } =
      await supabaseClassTeacherReport
        .from("class_teachers")
        .select(`
          id,
          teacher_id,
          class_id,
          classes (
            id,
            class_name
          )
        `)
        .eq("teacher_id", teacherData.id)
        .single();

    if (assignedError || !assignedData) {
      throw new Error("No class assigned to this class teacher");
    }

    assignedClassId = assignedData.class_id;
    assignedClassName = assignedData.classes?.class_name || "-";
  } catch (error) {
    console.error("Error getting class teacher/class:", error.message);
  }
}

/* =====================================
   LOAD CURRENT TERM
===================================== */
async function loadCurrentTermForClassTeacher() {
  try {
    const { data: termData, error: termError } =
      await supabaseClassTeacherReport
        .from("terms")
        .select("id, name, academic_year_id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (termError || !termData) {
      throw new Error("Current term not found");
    }

    selectedTermId = termData.id;
    selectedTermName = termData.name || "-";

    let yearName = "-";

    if (termData.academic_year_id) {
      const { data: yearData, error: yearError } =
        await supabaseClassTeacherReport
          .from("academic_years")
          .select("id, year_name")
          .eq("id", termData.academic_year_id)
          .single();

      if (!yearError && yearData) {
        yearName = yearData.year_name || "-";
      }
    }

    selectedAcademicYear = yearName;

    const classNameEl = document.getElementById("assigned-class-report-name");
    const termEl = document.getElementById("assigned-class-report-term");
    const yearEl = document.getElementById("assigned-class-report-year");

    if (classNameEl) classNameEl.textContent = assignedClassName || "-";
    if (termEl) termEl.textContent = selectedTermName || "-";
    if (yearEl) yearEl.textContent = selectedAcademicYear || "-";
  } catch (error) {
    console.error("Error loading current term:", error.message);
  }
}

/* =====================================
   LOAD REPORT
===================================== */
async function loadAssignedClassTeacherReport() {
  const container = document.getElementById("teacher-report-cards");

  if (!container) return;

  if (!assignedClassId || !selectedTermId) {
    container.innerHTML = `
      <p class="teacher-report-empty">
        No assigned class or current term found.
      </p>
    `;
    return;
  }

  container.innerHTML = `
    <p class="teacher-report-empty">Loading class report...</p>
  `;

  try {
    /* 1. LOAD STUDENTS */
    const { data: studentRows, error: studentsError } =
      await supabaseClassTeacherReport
        .from("students")
        .select("id, surname, first_name, gender, class_id")
        .eq("class_id", assignedClassId)
        .order("surname", { ascending: true })
        .order("first_name", { ascending: true });

    if (studentsError) throw studentsError;

    const students = sortStudentsByName(studentRows);

    /* 2. LOAD ASSIGNED SUBJECTS */
    const { data: subjectRows, error: subjectError } =
      await supabaseClassTeacherReport
        .from("teacher_subject_assignments")
        .select("id, class_id, subject")
        .eq("class_id", assignedClassId)
        .order("subject", { ascending: true });

    if (subjectError) throw subjectError;

    const subjectMap = new Map();

    (subjectRows || []).forEach((row) => {
      const name = String(row.subject || "").trim();
      if (!name) return;

      const key = normalizeText(name);
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          id: key,
          key,
          name
        });
      }
    });

    /* 3. LOAD MARKS */
    const { data: marks, error: marksError } =
      await supabaseClassTeacherReport
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
        .eq("class_id", assignedClassId)
        .eq("term_id", selectedTermId);

    if (marksError) throw marksError;

    (marks || []).forEach((row) => {
      const name = String(row.subject || "").trim();
      if (!name) return;

      const key = normalizeText(name);
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          id: key,
          key,
          name
        });
      }
    });

    classTeacherReportSubjects = [...subjectMap.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    /* keep the full mark record — the per-subject table needs the class /
       exam split, the grade and the subject remark, not just the total */
    const marksMap = new Map();

    (marks || []).forEach((row) => {
      const subjectKey = normalizeText(row.subject);
      const key = `${row.student_id}__${subjectKey}`;

      marksMap.set(key, row);
    });

    /* 4. LOAD SAVED CLASS TEACHER REMARKS */
    const { data: savedRemarks, error: remarksError } =
      await supabaseClassTeacherReport
        .from("class_teacher_remarks")
        .select(`
          student_id,
          class_id,
          term_id,
          teacher_id,
          remark,
          conduct,
          attitude,
          promotion_class,
          interest
        `)
        .eq("class_id", assignedClassId)
        .eq("term_id", selectedTermId);

    if (remarksError) {
      console.error(
        "Error loading class teacher remarks:",
        remarksError.message
      );
    }

    const remarksMap = new Map();

    (savedRemarks || []).forEach((item) => {
      remarksMap.set(item.student_id, {
        remark: item.remark || "",
        conduct: item.conduct || "",
        attitude: item.attitude || "",
        promotion_class: item.promotion_class || "",
        interest: item.interest || ""
      });
    });

    /* 5. RANK EACH SUBJECT ACROSS THE CLASS
       "Position on Subject" compares every student's total for that one
       subject, so it has to be worked out per subject before the rows. */
    const subjectPositionMap = new Map();

    classTeacherReportSubjects.forEach((subject) => {
      const subjectScores = (students || []).map((student) => {
        const found = marksMap.get(`${student.id}__${subject.key}`);

        return {
          student_id: student.id,
          score: resolveTotalMark(found)
        };
      });

      const rankMap = createDenseRankMap(
        subjectScores,
        (item) => item.score,
        (item) => item.student_id
      );

      subjectScores.forEach((item) => {
        subjectPositionMap.set(
          `${item.student_id}__${subject.key}`,
          rankMap.get(item.student_id) || "-"
        );
      });
    });

    /* 6. BUILD REPORT ROWS */
    classTeacherReportRows = (students || []).map((student) => {
      const fullName = studentFullName(student) || "-";

      const savedRemark = remarksMap.get(student.id) || {};

      const subjectRows = classTeacherReportSubjects.map((subject) => {
        const found = marksMap.get(`${student.id}__${subject.key}`);
        const position = subjectPositionMap.get(`${student.id}__${subject.key}`);

        return {
          subject: subject.name,
          classScore:
            found?.class_score !== null && found?.class_score !== undefined
              ? Number(found.class_score)
              : null,
          examScore:
            found?.exam_score !== null && found?.exam_score !== undefined
              ? Number(found.exam_score)
              : null,
          totalMark: found ? resolveTotalMark(found) : null,
          grade: found?.grade || "-",
          remark: found?.remark || "-",
          subjectPosition:
            position && position !== "-" ? formatPosition(position) : "-"
        };
      });

      /* average is over subjects that actually have marks, so an unmarked
         subject does not drag the student's average down */
      const scoredTotals = subjectRows
        .filter((item) => item.totalMark !== null && item.totalMark !== undefined)
        .map((item) => Number(item.totalMark))
        .filter((num) => !Number.isNaN(num));

      const overallTotal = scoredTotals.reduce((sum, num) => sum + num, 0);

      return {
        student_id: student.id,
        student_name: fullName,
        subjectRows,
        overallTotal,
        average: scoredTotals.length
          ? (overallTotal / scoredTotals.length).toFixed(2)
          : "0.00",
        classPosition: "-",
        classTeacherRemark: savedRemark.remark || "",
        conduct: savedRemark.conduct || "",
        attitude: savedRemark.attitude || "",
        interest: savedRemark.interest || "",
        promotion_class: savedRemark.promotion_class || "",
      };
    });

    classTeacherReportRows.sort((a, b) => {
      if (b.overallTotal !== a.overallTotal) return b.overallTotal - a.overallTotal;
      return a.student_name.localeCompare(b.student_name);
    });

    let currentPosition = 0;
    let lastOverall = null;

    classTeacherReportRows.forEach((row, index) => {
      if (row.overallTotal !== lastOverall) {
        currentPosition = index + 1;
      }
      row.classPosition = formatPosition(currentPosition);
      lastOverall = row.overallTotal;
    });

    renderAssignedClassTeacherReport();
  } catch (error) {
    console.error("Error loading report:", error.message);
    container.innerHTML = `
      <p class="teacher-report-empty">Failed to load class report.</p>
    `;
  }
}
/* =====================================
   RENDER REPORT
===================================== */
function renderAssignedClassTeacherReport() {
  const container = document.getElementById("teacher-report-cards");

  if (!container) return;

  if (!classTeacherReportRows.length) {
    container.innerHTML = `
      <p class="teacher-report-empty">No student report found.</p>
    `;
    return;
  }

  container.innerHTML = classTeacherReportRows
    .map(
      (row) => `
      <article class="student-report-card">
        <div class="student-report-head">
          <div class="student-report-summary">
            <h4 class="student-report-name">${escapeHtml(row.student_name)}</h4>
            <p><strong>Overall Total Mark:</strong> ${row.overallTotal}</p>
            <p><strong>Average:</strong> ${row.average}</p>
            <p><strong>Position in Class:</strong> ${row.classPosition}</p>
          </div>

          <div class="student-report-remark">
            <p class="student-report-remark-own">
              <strong>Your Remark:</strong>
              ${escapeHtml(row.classTeacherRemark || "-")}
            </p>

            <button
              class="remark-btn"
              type="button"
              onclick="openClassTeacherRemarkModal('${row.student_id}')"
            >
              ${
                row.classTeacherRemark || row.conduct || row.attitude || row.interest
                  ? "Update Remark"
                  : "Add Remark"
              }
            </button>
          </div>
        </div>

        <div class="student-report-table-wrap">
          <table class="student-report-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Class Score</th>
                <th>Exam Score</th>
                <th>Total Mark</th>
                <th>Grade</th>
                <th>Remark</th>
                <th>Position on Subject</th>
              </tr>
            </thead>
            <tbody>
              ${row.subjectRows
                .map(
                  (subjectRow) => `
                <tr>
                  <td data-label="Subject">${escapeHtml(subjectRow.subject)}</td>
                  <td data-label="Class Score">${subjectRow.classScore ?? "-"}</td>
                  <td data-label="Exam Score">${subjectRow.examScore ?? "-"}</td>
                  <td data-label="Total Mark">${subjectRow.totalMark ?? "-"}</td>
                  <td data-label="Grade">${escapeHtml(subjectRow.grade)}</td>
                  <td data-label="Remark">${escapeHtml(subjectRow.remark)}</td>
                  <td data-label="Position on Subject">${subjectRow.subjectPosition}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </article>
    `
    )
    .join("");
}

/* =====================================
   REMARK MODAL
===================================== */
function setupClassTeacherRemarkModal() {
  const modal = document.getElementById("class-remark-modal");
  const closeBtn = document.getElementById("close-class-remark-modal");
  const saveBtn = document.getElementById("save-class-remark-btn");

  closeBtn?.addEventListener("click", closeClassTeacherRemarkModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeClassTeacherRemarkModal();
    }
  });

  saveBtn?.addEventListener("click", saveClassTeacherRemark);
}

function openClassTeacherRemarkModal(studentId) {
  selectedStudentIdForRemark = studentId;

  const row = classTeacherReportRows.find((item) => item.student_id === studentId);
  if (!row) return;

  const modal = document.getElementById("class-remark-modal");
  const studentNameEl = document.getElementById("remark-student-name");
  const overallEl = document.getElementById("remark-student-overall");
  const positionEl = document.getElementById("remark-student-position");
  const conductEl = document.getElementById("selected-conduct");
  const attitudeEl = document.getElementById("selected-attitude");
  const interestEl = document.getElementById("selected-interest");
    const promotionClassEl = document.getElementById("selected-promotion-class");
  const textarea = document.getElementById("class-teacher-remark-text");

  if (studentNameEl) studentNameEl.textContent = row.student_name;
  if (overallEl) overallEl.textContent = row.overallTotal;
  if (positionEl) positionEl.textContent = row.classPosition;
  if (conductEl) conductEl.value = row.conduct || "";
  if (attitudeEl) attitudeEl.value = row.attitude || "";
  if (interestEl) interestEl.value = row.interest || "";
  if(promotionClassEl) promotionClassEl.value = row.promotion_class || "";
  if (textarea) textarea.value = row.classTeacherRemark || "";

  modal?.classList.add("active");
}

function closeClassTeacherRemarkModal() {
  const modal = document.getElementById("class-remark-modal");
  const conductEl = document.getElementById("selected-conduct");
  const attitudeEl = document.getElementById("selected-attitude");
  const interestEl = document.getElementById("selected-interest");
   const promotionClassEl = document.getElementById("selected-promotion-class");
  const textarea = document.getElementById("class-teacher-remark-text");

  modal?.classList.remove("active");

  if (conductEl) conductEl.value = "";
  if (attitudeEl) attitudeEl.value = "";
  if (interestEl) interestEl.value = "";
  if (textarea) textarea.value = "";
  if (promotionClassEl) {
  promotionClassEl.value = "";
}

  selectedStudentIdForRemark = null;
}

async function saveClassTeacherRemark() {
  const conductEl = document.getElementById("selected-conduct");
  const attitudeEl = document.getElementById("selected-attitude");
  const interestEl = document.getElementById("selected-interest");
  const textarea = document.getElementById("class-teacher-remark-text");
   const promotionClassEl = document.getElementById("selected-promotion-class");

  /* typed now, not picked - uppercase keeps the report matching the
     values saved back when these were dropdowns */
  const conduct = conductEl?.value.trim().toUpperCase() || "";
  const attitude = attitudeEl?.value.trim().toUpperCase() || "";
  const interest = interestEl?.value.trim().toUpperCase() || "";
  const remark = textarea?.value.trim() || "";
  const promotion_class =
  promotionClassEl && promotionClassEl.value
    ? promotionClassEl.value.trim()
    : "";

  if (!selectedStudentIdForRemark) return;

  if (!loggedInTeacherId) {
    // alert("Teacher not found. Please log in again.");
    reportsRemarksResponse.classList.add("show-message", "error");
    reportsRemarksResponse.innerHTML = "please sign in";
    setTimeout(()=>{
      reportsRemarksResponse.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  try {
    const row = classTeacherReportRows.find(
      (item) => item.student_id === selectedStudentIdForRemark
    );

    if (!row) return;

    const payload = {
      student_id: selectedStudentIdForRemark,
      class_id: assignedClassId,
      term_id: selectedTermId,
      teacher_id: loggedInTeacherId,
      conduct,
      attitude,
      interest,
      remark,
      promotion_class
    };

    const { error } = await supabaseClassTeacherReport
      .from("class_teacher_remarks")
      .upsert(payload, {
        onConflict: "student_id,class_id,term_id"
      });

    if (error) throw error;

    row.classTeacherRemark = remark;
    row.conduct = conduct;
    row.attitude = attitude;
    row.interest = interest;
    row.promotion_class = promotion_class;

    renderAssignedClassTeacherReport();
    // alert("✅ Remark saved successfully");
    reportsRemarksResponse.classList.add("show-message", "success");
    reportsRemarksResponse.innerHTML = "Remark saved";
    setTimeout(()=>{
      reportsRemarksResponse.classList.remove("show-message", "success");
    }, 3000);
    closeClassTeacherRemarkModal();
  } catch (error) {
    console.error("Error saving remark:", error.message);
    // alert(error.message || "Failed to save remark");
    reportsRemarksResponse.classList.add("show-message", "error");
    reportsRemarksResponse.innerHTML = "Failed to save";
    setTimeout(()=>{
      reportsRemarksResponse.classList.remove("show-message", "error");
    }, 3000);
  }
}