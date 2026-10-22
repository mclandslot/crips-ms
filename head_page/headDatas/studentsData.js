const supabaseHeadTeacherStudents = window.supabaseClient;

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadClassesForStudentView();

  document
    .getElementById("view-students-btn")
    ?.addEventListener("click", loadStudentsByClass);

  document
    .getElementById("close-student-details")
    ?.addEventListener("click", closeOverlay);
});

const studentFeedShow = document.getElementById("form-feedback");

/* =====================================
   LOAD CLASSES INTO DROPDOWN
===================================== */
async function loadClassesForStudentView() {
  const select = document.getElementById("view-class-info");

  if (!select) {
    console.error("Class dropdown not found: #view-class-info");
    return;
  }

  select.innerHTML = `<option value="">Loading classes...</option>`;

  const { data, error } = await supabaseHeadTeacherStudents
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error.message);
    select.innerHTML = `<option value="">Failed to load classes</option>`;
    return;
  }

  select.innerHTML = `<option value="">Select Class</option>`;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name || "Unknown Class";
    select.appendChild(option);
  });
}

/* =====================================
   LOAD STUDENTS BY SELECTED CLASS
===================================== */
async function loadStudentsByClass() {
  const classSelect = document.getElementById("view-class-info");
  const tableBody = document.getElementById("student-details-tbody");

  if (!classSelect || !tableBody) {
    console.error("Required elements not found");
    return;
  }

  const classId = classSelect.value;

  if (!classId) {
    // alert("Please select a class.");
    studentFeedShow.classList.add("show-message", "error");
    studentFeedShow.innerHTML = "Please select class";
    setTimeout(()=>{
 studentFeedShow.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  tableBody.innerHTML = `<tr><td colspan="9">Loading students...</td></tr>`;

  const { data, error } = await supabaseHeadTeacherStudents
    .from("students")
    .select(`
      id,
      admission_number,
      admission_date,
      surname,
      first_name,
      date_of_birth,
      gender,
      section,
      status,
      class_id,
      classes!students_class_id_fkey (
        class_name
      )
    `)
    .eq("class_id", classId)
    .order("surname", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error loading students:", error.message);
    tableBody.innerHTML = `<tr><td colspan="9">Failed to load students.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9">No class student loaded.</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";

  sortStudentsByName(data).forEach((student) => {
    const row = document.createElement("tr");
    const fullName = studentFullName(student);

    row.innerHTML = `
      <td>${escapeHtml(student.admission_number || "-")}</td>
      <td>${formatDate(student.admission_date)}</td>
      <td>${escapeHtml(fullName || "-")}</td>
      <td>${formatDate(student.date_of_birth)}</td>
      <td>${escapeHtml(student.gender || "-")}</td>
      <td>${escapeHtml(student.classes?.class_name || "-")}</td>
      <td>${escapeHtml(student.section || "-")}</td>
      <td>${escapeHtml(student.status || "-")}</td>
      <td>
        <button class="view-btn action-btn" onclick="viewStudentInfo('${student.id}')">
          <i class="fa-solid fa-eye"></i>
        </button>
      </td>
    `;

    row.dataset.search =
      `${fullName} ${student.admission_number || ""}`.toLowerCase();

    tableBody.appendChild(row);
  });

  // keep the current search applied when another class is loaded
  filterStudentDetailsRows();
}

/* =====================================
   SEARCH STUDENTS BY NAME / ADMISSION NO
===================================== */
function filterStudentDetailsRows() {
  const tableBody = document.getElementById("student-details-tbody");
  const input = document.getElementById("student-details-search");
  if (!tableBody || !input) return;

  const query = input.value.trim().toLowerCase();
  let visible = 0;
  let searchable = 0;

  tableBody.querySelectorAll("tr").forEach((row) => {
    if (row.dataset.search === undefined) return; // message rows
    searchable++;

    const match = row.dataset.search.includes(query);
    row.style.display = match ? "" : "none";
    if (match) visible++;
  });

  tableBody.querySelector(".student-no-match")?.remove();

  if (query && searchable && visible === 0) {
    const noMatch = document.createElement("tr");
    noMatch.className = "student-no-match";
    noMatch.innerHTML = `<td colspan="9">No student matches your search.</td>`;
    tableBody.appendChild(noMatch);
  }
}

document
  .getElementById("student-details-search")
  ?.addEventListener("input", filterStudentDetailsRows);

/* =====================================
   VIEW STUDENT IN MODAL
===================================== */
async function viewStudentInfo(studentId) {
  const { data: student, error: studentError } = await supabaseHeadTeacherStudents
    .from("students")
    .select(`
      id,
      admission_number,
      admission_date,
      surname,
      first_name,
      date_of_birth,
      gender,
      section,
      status,
      picture_url,
      class_id,
      classes!students_class_id_fkey (
        class_name
      )
    `)
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    console.error("Error loading student details:", studentError.message);
    alert("Failed to load student details.");
    return;
  }

  if (!student) {
    alert("Student not found.");
    return;
  }

  const { data: parentData, error: parentError } = await supabaseHeadTeacherStudents
    .from("parents")
    .select(`
      full_name,
      relationship,
      phone,
      address,
      staff_type
    `)
    .eq("student_id", studentId)
    .maybeSingle();

  if (parentError) {
    console.error("Error loading parent details:", parentError.message);
  }

  const fullName = studentFullName(student);
  const className = student.classes?.class_name || "-";
  const status = student.status || "-";
  const pictureUrl = student.picture_url || "";

  const overlay = document.getElementById("students-details-overlay");
  const profileBox = document.querySelector(
    "#students-details-overlay .profile-box-img"
  );

  setText("detail-full-name", fullName || "-");
  setText("detail-class", className);
  setText("detail-status", status);

  setText("detail-admission-number", student.admission_number || "-");
  setText("detail-fullname-persona", fullName || "-");
  setText("detail-dob", formatDate(student.date_of_birth));
  setText("detail-gender", student.gender || "-");
  setText("detail-admission-date", formatDate(student.admission_date));
  setText("detail-class-personal", className);
  setText("detail-section", student.section || "-");
  setText("detail-status-personal", status);

  setText("detail-parent-name", parentData?.full_name || "-");
  setText("detail-relationship", parentData?.relationship || "-");
  setText("detail-phone", parentData?.phone || "-");
  setText("detail-address", parentData?.address || "-");
  setText("detail-staff-type", parentData?.staff_type || "-");

  if (profileBox) {
    // initials show until the picture loads, and stay if there is no
    // picture or it fails to load
    const initials =
      `${(student.surname || " ")[0]}${(student.first_name || " ")[0]}`
        .trim()
        .toUpperCase();

    profileBox.innerHTML = `<span class="profile-box-initials">${escapeHtml(initials || "?")}</span>`;

    if (pictureUrl) {
      const img = document.createElement("img");
      img.src = pictureUrl;
      img.alt = fullName || "student picture";
      img.onload = () => {
        // a quicker click on another student may have replaced this one
        if (profileBox.dataset.studentId !== String(student.id)) return;
        profileBox.innerHTML = "";
        profileBox.appendChild(img);
      };
    }

    profileBox.dataset.studentId = student.id;
  }

  if (overlay) {
    overlay.style.display = "flex";
  }
}

/* =====================================
   CLOSE MODAL
===================================== */
function closeOverlay() {
  const overlay = document.getElementById("students-details-overlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

/* =====================================
   HELPERS
===================================== */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "-";
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
