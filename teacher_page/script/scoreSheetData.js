const supabaseScoreSheet = window.supabaseClient;

// let teacherId = null;
// let assignmentsData = [];

const scoreFeedBack = document.getElementById("form-feedback");

/* =========================
   GET LOGGED-IN TEACHER
========================= */
async function getLoggedInTeacher() {
  const { data: { user }, error } = await supabaseScoreSheet.auth.getUser();

  if (error || !user) {
    console.error("No logged in user", error);
    return;
  }

  teacherId = user.id;
  console.log("Teacher ID:", teacherId);
}

/* =========================
   INIT LOAD
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  await getLoggedInTeacher();
  await loadScoreSheetAssignments();

  document
    .getElementById("class-to-view-marks-score")
    ?.addEventListener("change", loadScoreSheetSubjects);

  document
    .getElementById("view-marks-score-sheet-btn")
    ?.addEventListener("click", loadScoreSheet);
});

/* =========================
   GET CURRENT TERM
   Uses active academic year + latest term in that year
========================= */
async function getCurrentTerm() {
  const { data: activeYear, error: activeYearError } = await supabaseScoreSheet
    .from("academic_years")
    .select("id, year_name")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (activeYearError) {
    console.error("Error fetching active academic year:", activeYearError.message);
    return null;
  }

  if (!activeYear) {
    console.warn("No active academic year found");
    return null;
  }

  const { data: terms, error: termsError } = await supabaseScoreSheet
    .from("terms")
    .select("id, name, academic_year_id, created_at")
    .eq("academic_year_id", activeYear.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (termsError) {
    console.error("Error fetching current term:", termsError.message);
    return null;
  }

  if (!terms || terms.length === 0) {
    console.warn("No term found for active academic year");
    return null;
  }

  return {
    id: terms[0].id,
    name: terms[0].name,
    academic_year: activeYear.year_name
  };
}

/* =====================================
   LOAD TEACHER ASSIGNMENTS (FOR SCORE SHEET)
===================================== */
async function loadScoreSheetAssignments() {
  const { data, error } = await supabaseScoreSheet
    .from("teacher_subject_assignments")
    .select(`
      class_id,
      subject,
      classes (class_name)
    `)
    .eq("teacher_id", teacherId);

  if (error) {
    console.error(error.message);
    return;
  }

  assignmentsData = data || [];

  console.log("Assignments Loaded:", assignmentsData);

  const classSelect = document.getElementById("class-to-view-marks-score");
  if (!classSelect) return;

  const uniqueClasses = {};

  assignmentsData.forEach(a => {
    if (a.class_id) {
      uniqueClasses[a.class_id] = a.classes?.class_name;
    }
  });

  classSelect.innerHTML = `<option value="">Select Class</option>`;

  Object.entries(uniqueClasses).forEach(([id, name]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = name || "Unknown Class";
    classSelect.appendChild(option);
  });

  loadScoreSheetSubjects();
}

/* =====================================
   LOAD SUBJECTS BASED ON SELECTED CLASS
===================================== */
function loadScoreSheetSubjects() {
  const classId = document.getElementById("class-to-view-marks-score")?.value || "";
  const subjectSelect = document.getElementById("subject-to-view-marks-score");

  if (!subjectSelect) return;

  subjectSelect.innerHTML = `<option value="">Select Subject</option>`;

  let subjects = [];

  if (!classId) {
    subjects = assignmentsData.map(a => a.subject);
  } else {
    subjects = assignmentsData
      .filter(a => a.class_id === classId)
      .map(a => a.subject);
  }

  const uniqueSubjects = [...new Set(subjects)];

  uniqueSubjects.forEach(subject => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
}

/* =========================
   LOAD SCORE SHEET
========================= */
async function loadScoreSheet() {
  const classSelect = document.getElementById("class-to-view-marks-score");
  const subjectSelect = document.getElementById("subject-to-view-marks-score");

  if (!classSelect || !subjectSelect) return;

  const classId = classSelect.value;
  const subject = subjectSelect.value;

  if (!classId || !subject) {
    // alert("Select class and subject");
    scoreFeedBack.classList.add("show-message", "error");
    scoreFeedBack.innerHTML = "Select class and subject";
    setTimeout(()=>{
      scoreFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  document.getElementById("score-sheet-section-show").style.display = "block";

  document.getElementById("class-selected-name").textContent =
    classSelect.selectedOptions[0]?.text || "-";

  document.getElementById("subject-selected-name").textContent =
    subjectSelect.selectedOptions[0]?.text || "-";

  const termData = await getCurrentTerm();

  if (!termData) {
    // alert("⚠️ No current active term found. Please set the active academic year and term.");
    scoreFeedBack.classList.add("show-message", "error");
    scoreFeedBack.innerHTML = "Set active term";
    setTimeout(()=>{
      scoreFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  document.getElementById("term-name").textContent =
    `${termData.name} (${termData.academic_year})`;

  const termId = termData.id;

  const { data, error } = await supabaseScoreSheet
    .from("student_marks")
    .select(`
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
    .eq("term_id", termId);

  if (error) {
    console.error(error.message);
    // alert("Error loading score sheet");
    scoreFeedBack.classList.add("show-message", "error");
    scoreFeedBack.innerHTML = "Error loading score";
    setTimeout(()=>{
      scoreFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  const tbody = document.getElementById("score-sheet-table-body");
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No marks found for the current term</td></tr>`;
    return;
  }

  function formatPosition(pos) {
    if (pos % 100 >= 11 && pos % 100 <= 13) return pos + "TH";
    if (pos % 10 === 1) return pos + "ST";
    if (pos % 10 === 2) return pos + "ND";
    if (pos % 10 === 3) return pos + "RD";
    return pos + "TH";
  }

  // 1. rank by marks to assign each student a position
  data.sort((a, b) => (b.marks || 0) - (a.marks || 0));

  let lastScore = null;
  let currentPosition = 0;

  data.forEach((item, index) => {
    const score = Number(item.marks || 0);

    if (score !== lastScore) {
      currentPosition = index + 1;
      lastScore = score;
    }

    item.position = currentPosition;
  });

  // 2. display males A → Z, then females A → Z. Positions are already on
  //    each row from step 1, so reordering here does not disturb them.
  const orderedRows = sortStudentsByName(data, (row) => row.students);

  tbody.innerHTML = "";

  orderedRows.forEach((item, index) => {
    const score = Number(item.marks || 0);

    const fullName = studentFullName(item.students);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td data-label="S/N" class="col-sn">${index + 1}</td>
      <td data-label="Student Name" class="col-name">${fullName || "-"}</td>
      <td data-label="Class Score">${item.class_score || 0}</td>
      <td data-label="Exams Score">${item.exam_score || 0}</td>
      <td data-label="Total (100%)" class="col-total"><strong>${score}</strong></td>
      <td data-label="Position" class="col-position"><span class="pos-pill">${formatPosition(item.position)}</span></td>
    `;

    tbody.appendChild(row);
  });
}