const supabaseMarksEnteringData = window.supabaseClient;

let teacherId = null;
let assignmentsData = [];
let marksLoadToken = 0;
const messageResponse = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabaseMarksEnteringData.auth.getUser();
  teacherId = data?.user?.id;

  await loadTeacherAssignments();

  document
    .getElementById("selected-class-assigned-option")
    ?.addEventListener("change", loadSubjectsForClass);

  document
    .getElementById("load-students-data-btn")
    ?.addEventListener("click", loadStudentsForMarks);
});

/* =====================================
   GET CURRENT TERM ID
===================================== */
async function getCurrentTermId() {
  const { data, error } = await supabaseMarksEnteringData
    .from("terms")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error(error.message);
    return null;
  }

  return data.id;
}

/* =====================================
   GRADE + REMARK FUNCTIONS
===================================== */
function getGrade(total) {
  if (total >= 90) return "A";
  if (total >= 80) return "B";
  if (total >= 70) return "C";
  if (total >= 60) return "D";
  if (total >= 50) return "E";
  return "F";
}

function getRemark(total) {
  if (total >= 90) return "EXCELLENT";
  if (total >= 80) return "VERY GOOD";
  if (total >= 70) return "GOOD";
  if (total >= 60) return "AVERAGE";
  if (total >= 50) return "WEAK PASS";
  return "FAIL";
}

/* =====================================
   LOAD TEACHER ASSIGNMENTS
===================================== */
async function loadTeacherAssignments() {
  const { data, error } = await supabaseMarksEnteringData
    .from("teacher_subject_assignments")
    .select(
      `
      class_id,
      subject,
      classes (class_name)
    `
    )
    .eq("teacher_id", teacherId);

  if (error) {
    console.error(error.message);
    return;
  }

  assignmentsData = data;

  // Populate classes
  const classSelect = document.getElementById("selected-class-assigned-option");

  const uniqueClasses = {};
  data.forEach((a) => {
    if (a.class_id) {
      uniqueClasses[a.class_id] = a.classes?.class_name;
    }
  });

  classSelect.innerHTML = `<option value="">Select Class</option>`;

  Object.entries(uniqueClasses).forEach(([id, name]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = name;
    classSelect.appendChild(option);
  });
}

/* =====================================
   LOAD SUBJECTS BASED ON CLASS
===================================== */
function loadSubjectsForClass() {
  const classId = document.getElementById(
    "selected-class-assigned-option"
  ).value;

  const subjectSelect = document.getElementById(
    "selected-subject-assigned-option"
  );

  subjectSelect.innerHTML = `<option value="">Select Subject</option>`;

  const subjects = assignmentsData
    .filter((a) => a.class_id === classId)
    .map((a) => a.subject);

  const uniqueSubjects = [...new Set(subjects)];

  uniqueSubjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
}

/* =====================================
   LOAD STUDENTS + SHOW MARKS UI
===================================== */
async function loadStudentsForMarks() {
  const classId = document.getElementById(
    "selected-class-assigned-option"
  ).value;

  const subject = document.getElementById(
    "selected-subject-assigned-option"
  ).value;

  if (!classId || !subject) {
    messageResponse.classList.add("show-message", "error");
    messageResponse.innerHTML =
      '<i class="fa-solid fa-circle-xmark"> </i> Select class and subject';
    setTimeout(
      () => messageResponse.classList.remove("show-message", "error"),
      3000
    );
    return;
  }

  /* a second click (or a new class/subject) supersedes the load in flight */
  const loadToken = ++marksLoadToken;

  const marksContainer = document.querySelector(".marks-container");
  marksContainer.style.display = "block";

  const className =
    document.getElementById("selected-class-assigned-option").selectedOptions[0]
      .text;
  document.getElementById("marks-selected-class-name").textContent = className;
  document.getElementById("selected-subject").textContent = subject;
  document.getElementById("total-student-show-text").textContent = "";

  const tbody = document.getElementById("marks-entering-data");
  tbody.innerHTML = `<tr><td colspan="6">Loading students...</td></tr>`;

  /* the student list and the term don't depend on each other */
  const [{ data: studentRows, error }, termId] = await Promise.all([
    supabaseMarksEnteringData
      .from("students")
      .select("id, surname, first_name, gender")
      .eq("class_id", classId)
      .order("surname", { ascending: true }),
    getCurrentTermId()
  ]);

  if (loadToken !== marksLoadToken) return;

  if (error) {
    console.error(error.message);
    tbody.innerHTML = `<tr><td colspan="6">Failed to load students.</td></tr>`;
    return;
  }

  const data = sortStudentsByName(studentRows);

  document.getElementById("total-student-show-text").textContent = `${data.length} Students`;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6">No students found in this class.</td></tr>`;
    return;
  }

  /* names go up straight away; saved scores are filled in below from
     one marks query for the whole class instead of one per student */
  tbody.innerHTML = "";
  const rowsByStudent = new Map();

  data.forEach((student, index) => {
    const marksRow = buildMarksRow(student, index, classId, subject, termId);
    rowsByStudent.set(student.id, marksRow);
    tbody.appendChild(marksRow.row);
  });

  setupLiveTotalCalculation();

  const { data: existingMarks, error: marksError } = await supabaseMarksEnteringData
    .from("student_marks")
    .select("id, student_id, class_score, exam_score")
    .eq("class_id", classId)
    .eq("subject", subject)
    .eq("term_id", termId);

  if (loadToken !== marksLoadToken) return;

  if (marksError) {
    console.error(marksError.message);
  }

  const marksByStudent = new Map(
    (existingMarks || []).map((mark) => [mark.student_id, mark])
  );

  rowsByStudent.forEach((marksRow, studentId) => {
    marksRow.applyExisting(marksByStudent.get(studentId) || null);
  });
}

/* =====================================
   BUILD ONE STUDENT ROW

   The row shows locked while the saved marks are fetched;
   applyExisting() then fills the scores and sets Save/Update + Edit.
===================================== */
function buildMarksRow(student, index, classId, subject, termId) {
  const fullName = studentFullName(student);

  const row = document.createElement("tr");

  row.innerHTML = `
    <td data-label="Roll No">${index + 1}</td>

    <td class="student" data-label="Student">${fullName}</td>

    <td data-label="Class Score">
      <span class="score-field">
        <input type="number" class="score class-score" value="0" min="0" max="50" disabled>
        <span>/ 50</span>
      </span>
    </td>

    <td data-label="Exam Score">
      <span class="score-field">
        <input type="number" class="score exam-score" value="0" min="0" max="50" disabled>
        <span>/ 50</span>
      </span>
    </td>

    <td data-label="Total">
      <strong class="total">0</strong> <span>/ 100</span>
    </td>

    <td class="marks-actions">
      <button class="save-marks-btn view-btn" disabled>Loading...</button>

      <button class="edit-btn">
        <i class="fa-solid fa-pen-to-square"></i> Edit
      </button>
    </td>
  `;

  const classInput = row.querySelector(".class-score");
  const examInput = row.querySelector(".exam-score");
  const totalDisplay = row.querySelector(".total");

  const saveBtn = row.querySelector(".save-marks-btn");
  const editBtn = row.querySelector(".edit-btn");

  editBtn.style.display = "none";

  function applyExisting(existing) {
    const classScoreVal = existing?.class_score || 0;
    const examScoreVal = existing?.exam_score || 0;

    classInput.value = classScoreVal;
    examInput.value = examScoreVal;
    totalDisplay.textContent = classScoreVal + examScoreVal;

    saveBtn.disabled = false;
    saveBtn.textContent = existing ? "Update" : "Save";

    // if marks already exist, lock input by default
    const locked = Boolean(existing);
    classInput.disabled = locked;
    examInput.disabled = locked;
    editBtn.style.display = locked ? "inline-block" : "none";
  }

  function validateAndUpdate() {
    let c = Number(classInput.value) || 0;
    let e = Number(examInput.value) || 0;

    if (c > 50) {
      messageResponse.classList.add("show-message", "error");
      messageResponse.innerHTML =
        '<i class="fa-solid fa-circle-xmark"> </i> Class score cannot exceed 50%';
      setTimeout(
        () => messageResponse.classList.remove("show-message", "error"),
        3000
      );
      c = 50;
      classInput.value = 50;
    }

    if (e > 50) {
      messageResponse.classList.add("show-message", "error");
      messageResponse.innerHTML =
        '<i class="fa-solid fa-circle-xmark"> </i> Exam score cannot exceed 50%';
      setTimeout(
        () => messageResponse.classList.remove("show-message", "error"),
        3000
      );
      e = 50;
      examInput.value = 50;
    }

    const total = c + e;

    totalDisplay.textContent = total;
  }

  classInput.addEventListener("input", validateAndUpdate);
  examInput.addEventListener("input", validateAndUpdate);

  /* =====================================
     EDIT BUTTON FUNCTION
  ===================================== */
  editBtn.addEventListener("click", () => {
    classInput.disabled = false;
    examInput.disabled = false;

    classInput.focus();

    messageResponse.classList.add("show-message", "success");
    messageResponse.innerHTML =
      '<i class="fa-solid fa-circle-check"></i> You can now edit marks';
    setTimeout(
      () => messageResponse.classList.remove("show-message", "success"),
      2500
    );
  });

  /* =====================================
     SAVE / UPDATE BUTTON FUNCTION
  ===================================== */
  saveBtn.addEventListener("click", async () => {
    const classScore = Number(classInput.value) || 0;
    const examScore = Number(examInput.value) || 0;

    if (classScore > 50 || examScore > 50) {
      messageResponse.classList.add("show-message", "error");
      messageResponse.innerHTML =
        '<i class="fa-solid fa-circle-xmark"> </i> Score cannot exceed 50%';
      setTimeout(
        () => messageResponse.classList.remove("show-message", "error"),
        3000
      );
      return;
    }

    const total = classScore + examScore;

    const { error } = await supabaseMarksEnteringData
      .from("student_marks")
      .upsert(
        {
          student_id: student.id,
          class_id: classId,
          subject: subject,
          teacher_id: teacherId,
          term_id: termId,
          class_score: classScore,
          exam_score: examScore,
          marks: total,
          grade: getGrade(total),
          remark: getRemark(total),
        },
        { onConflict: "student_id,class_id,subject,term_id" }
      );

    if (error) {
      console.error(error.message);
      messageResponse.classList.add("show-message", "error");
      messageResponse.innerHTML =
        '<i class="fa-solid fa-circle-xmark"> </i> Error saving marks';
      setTimeout(
        () => messageResponse.classList.remove("show-message", "error"),
        3000
      );
      return;
    }

    // lock inputs again after saving
    classInput.disabled = true;
    examInput.disabled = true;
    editBtn.style.display = "inline-block";
    saveBtn.textContent = "Update";

    messageResponse.classList.add("show-message", "success");
    messageResponse.innerHTML =
      '<i class="fa-solid fa-circle-check"> </i> Marks saved successfully';
    setTimeout(
      () => messageResponse.classList.remove("show-message", "success"),
      3000
    );
  });

  return { row, applyExisting };
}

/* =====================================
   AUTO CALCULATE TOTAL
===================================== */
function setupLiveTotalCalculation() {
  const rows = document.querySelectorAll("#marks-entering-data tr");

  rows.forEach((row) => {
    const classInput = row.querySelector(".class-score");
    const examInput = row.querySelector(".exam-score");
    const totalDisplay = row.querySelector(".total");

    function updateTotal() {
      const classScore = Number(classInput.value) || 0;
      const examScore = Number(examInput.value) || 0;

      const total = classScore + examScore;

      totalDisplay.textContent = total;
    }

    classInput.addEventListener("input", updateTotal);
    examInput.addEventListener("input", updateTotal);
  });
}