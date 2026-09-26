const supabaseHeadTeacherTeachers = window.supabaseClient;

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadTeachersForHeadTeacher();

  document
    .getElementById("close-teachers-details")
    ?.addEventListener("click", closeOverlayTeacherDetails);
});

/* =====================================
   LOAD TEACHERS INTO TABLE
===================================== */
async function loadTeachersForHeadTeacher() {
  const tableBody = document.getElementById("teachers-details-tbody");

  if (!tableBody) {
    console.error("Table body not found: #teachers-details-tbody");
    return;
  }

  tableBody.innerHTML = `<tr><td colspan="8">Loading teachers...</td></tr>`;

  const { data, error } = await supabaseHeadTeacherTeachers
    .from("teachers")
    .select(`
      id,
      surname,
      first_name,
      gender,
      qualification,
      employed_date,
      phone,
      status,
      role
    `)
    .order("surname", { ascending: true });

  if (error) {
    console.error("Error loading teachers:", error.message);
    tableBody.innerHTML = `<tr><td colspan="8">Failed to load teachers</td></tr>`;
    return;
  }

  /* administrator accounts are not staff records, so they stay out of
     this table - head teachers are staff and are listed */
  const teachers = (data || []).filter(
    (teacher) => !window.isAdminRole(teacher.role)
  );

  if (teachers.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8">No teachers found</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";

  teachers.forEach((teacher, index) => {
    const row = document.createElement("tr");
    const fullName = `${teacher.surname || ""} ${teacher.first_name || ""}`.trim();

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(fullName || "-")}</td>
      <td>${escapeHtml(teacher.gender || "-")}</td>
      <td>${escapeHtml(teacher.qualification || "-")}</td>
      <td>${formatDate(teacher.employed_date)}</td>
      <td>${escapeHtml(teacher.phone || "-")}</td>
      <td>${escapeHtml(teacher.status || "-")}</td>
      <td>
        <button class="view-btn action-btn" onclick="viewTeacherDetails('${teacher.id}')">
          <i class="fa-solid fa-eye"></i>
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

/* =====================================
   VIEW TEACHER DETAILS IN MODAL
===================================== */
async function viewTeacherDetails(teacherId) {
  const { data: teacher, error } = await supabaseHeadTeacherTeachers
    .from("teachers")
    .select(`
      id,
      surname,
      first_name,
      dob,
      gender,
      marital_status,
      qualification,
      status,
      phone,
      email,
      address,
      role,
      employed_date,
      picture_url
    `)
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    console.error("Error loading teacher details:", error.message);
    alert("Failed to load teacher details.");
    return;
  }

  if (!teacher) {
    alert("Teacher not found.");
    return;
  }

  /* the table cannot open one, but an administrator's record is not a
     staff profile the head teacher should read either */
  if (window.isAdminRole(teacher.role)) {
    alert("Teacher not found.");
    return;
  }

  const fullName = `${teacher.surname || ""} ${teacher.first_name || ""}`.trim();
  const overlay = document.getElementById("teachers-details-overlay");
  const profileBox = document.querySelector("#teachers-details-overlay .profile-box-img");

  setText("detail-techer-full-name", fullName || "-");
  setText("detail-role-teacher", teacher.role || "-");
  setText("detail-teacher-status", teacher.status || "-");

  setText("detail-fullname-teacher", fullName || "-");
  setText("detail-dob-teacher", formatDate(teacher.dob));
  setText("detail-gender-teacher", teacher.gender || "-");
  setText("detail-employed-date", formatDate(teacher.employed_date));
  setText("detail-qualification-teacher", teacher.qualification || "-");
  setText("detail-status-teacher", teacher.status || "-");
  setText("detail-marital-status-teacher", teacher.marital_status || "-");

  setText("detail-teacher-phone", teacher.phone || "-");
  setText("detail-teacher-email", teacher.email || "-");
  setText("detail-address-teacher", teacher.address || "-");

//   if (profileBox) {
//     profileBox.innerHTML = teacher.picture_url
//       ? `<img src="${escapeHtml(teacher.picture_url)}" alt="teacher-picture" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
//       : `<img src="icons/Student-picture.JPG" alt="teacher-picture" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
//   }

  if (overlay) {
    overlay.style.display = "flex";
  }
}

/* =====================================
   CLOSE TEACHER DETAILS OVERLAY
===================================== */
function closeOverlayTeacherDetails() {
  const overlay = document.getElementById("teachers-details-overlay");
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