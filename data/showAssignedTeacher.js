const supabaseAssignedTeacherClass = window.supabaseClient;

let editId = null;

/* ================================
   LOAD ASSIGNED TEACHERS
================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadAssignedTeachers();

  const updateBtn = document.getElementById("assigned-teacher-btn-update");
  if (updateBtn) {
    updateBtn.addEventListener("click", updateAssignment);
  }
});

function escapeAssignedHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadAssignedTeachers() {
  const tableBody = document.getElementById("assigned-Table-Body");

  if (!tableBody) return;

  tableBody.innerHTML = `<tr class="assign-empty-row"><td colspan="3">Loading...</td></tr>`;

  const { data, error } = await supabaseAssignedTeacherClass
    .from("class_teachers")
    .select(`
      id,
      teacher_id,
      class_id,
      teachers (first_name, surname),
      classes (class_name)
    `);

  if (error) {
    console.error("Load Error:", error.message);
    tableBody.innerHTML = `<tr class="assign-empty-row"><td colspan="3">Failed to load assigned class teachers</td></tr>`;
    return;
  }

  /* A → Z by teacher, then by class */
  const rows = (data || [])
    .map((item) => ({
      id: item.id,
      teacher_id: item.teacher_id,
      class_id: item.class_id,
      teacher: item.teachers
        ? `${item.teachers.surname || ""} ${item.teachers.first_name || ""}`.trim() || "N/A"
        : "N/A",
      className: item.classes?.class_name || "N/A"
    }))
    .sort((a, b) => {
      const byTeacher = a.teacher.localeCompare(b.teacher, undefined, {
        sensitivity: "base"
      });
      if (byTeacher !== 0) return byTeacher;

      return a.className.localeCompare(b.className, undefined, {
        sensitivity: "base",
        numeric: true
      });
    });

  if (!rows.length) {
    tableBody.innerHTML = `<tr class="assign-empty-row"><td colspan="3">No class teachers assigned</td></tr>`;
    return;
  }

  tableBody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td data-label="Teacher Name" class="cell-teacher">${escapeAssignedHtml(row.teacher)}</td>
        <td data-label="Class Assigned">${escapeAssignedHtml(row.className)}</td>
        <td data-label="Action" class="cell-assign-actions">
          <button
            type="button"
            class="edit-btn"
            title="Edit assignment"
            aria-label="Edit assignment"
            onclick="editAssignment('${row.id}', '${row.teacher_id}', '${row.class_id}')"
          >
            <i class="fa-solid fa-pen-to-square"></i>Edit
          </button>
          <button
            type="button"
            class="delete-btn"
            title="Remove assignment"
            aria-label="Remove assignment"
            onclick="deleteAssignment('${row.id}')"
          >
            <i class="fa-solid fa-trash"></i>Delete
          </button>
        </td>
      </tr>
    `
    )
    .join("");
}


/* ================================
   DELETE
================================ */
async function deleteAssignment(id) {
  const confirmDelete = await confirmAction({
    title: "Remove class teacher?",
    message: "This teacher will no longer be assigned to the class.",
    confirmText: "Remove assignment",
    tone: "danger"
  });

  if (!confirmDelete) return;

  const { error } = await supabaseAssignedTeacherClass
    .from("class_teachers")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete Error:", error.message);
    return;
  }

  loadAssignedTeachers();
}


/* ================================
   EDIT (SHOW OVERLAY + FILL FORM)
================================ */
function editAssignment(id, teacherId, classId) {
  editId = id;

  const overlay = document.getElementById("update-assigned-class-teacher");

  if (overlay) {
    overlay.style.display = "flex"; // show overlay
  }

  // Fill update form fields
  const teacherSelect = document.getElementById("teachers-assign-update");
  const classSelect = document.getElementById("student-assign-Class-update");

  if (teacherSelect) teacherSelect.value = teacherId;
  if (classSelect) classSelect.value = classId;
}


/* ================================
   UPDATE FUNCTION
================================ */
async function updateAssignment(e) {
  e.preventDefault();

  const teacherId = document.getElementById("teachers-assign-update").value;
  const classId = document.getElementById("student-assign-Class-update").value;

  if (!teacherId || !classId) {
    alert("Please select teacher and class");
    return;
  }

  const { error } = await supabaseAssignedTeacherClass
    .from("class_teachers")
    .update({
      teacher_id: teacherId,
      class_id: classId
    })
    .eq("id", editId);

  if (error) {
    console.error("Update Error:", error.message);
    return;
  }

  alert("Assignment updated successfully");

  // Hide overlay
  document.getElementById("update-assigned-class-teacher").style.display = "none";

  editId = null;

  loadAssignedTeachers();
}

async function loadRegisteredTeachers() {

  const mainSelect = document.getElementById("teachers-registered-list");
  const updateSelect = document.getElementById("teachers-assign-update");

  const { data, error } = await supabaseAssignedTeacherClass
    .from("teachers")
    .select("id, surname, first_name, role")
    .order("surname", { ascending: true });

  if (error) {
    console.error("Error loading teachers:", error);
    return;
  }

  const defaultOption = `<option value="" disabled selected>Select Teacher</option>`;

  if (mainSelect) mainSelect.innerHTML = defaultOption;
  if (updateSelect) updateSelect.innerHTML = defaultOption;

  /* administrators are not assignable staff */
  (data || []).filter(teacher => !window.isNonTeachingRole(teacher.role)).forEach(teacher => {
    const name = `${teacher.surname} ${teacher.first_name}`;

    const option1 = document.createElement("option");
    option1.value = teacher.id;
    option1.textContent = name;

    const option2 = option1.cloneNode(true);

    if (mainSelect) mainSelect.appendChild(option1);
    if (updateSelect) updateSelect.appendChild(option2);
  });
}

async function loadClasses() {

  const mainSelect = document.getElementById("class-select");
  const updateSelect = document.getElementById("student-assign-Class-update");

  const { data, error } = await supabaseAssignedTeacherClass
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error);
    return;
  }

  const defaultOption = `<option value="" disabled selected>Select Class</option>`;

  if (mainSelect) mainSelect.innerHTML = defaultOption;
  if (updateSelect) updateSelect.innerHTML = defaultOption;

  data.forEach(cls => {
    const option1 = document.createElement("option");
    option1.value = cls.id;
    option1.textContent = cls.class_name;

    const option2 = option1.cloneNode(true);

    if (mainSelect) mainSelect.appendChild(option1);
    if (updateSelect) updateSelect.appendChild(option2);
  });
}

document.addEventListener("DOMContentLoaded", async () => {

  // ✅ Load dropdown data FIRST (VERY IMPORTANT)
  await loadRegisteredTeachers();
  await loadClasses();

  // ✅ Then load table
  await loadAssignedTeachers();

  // ✅ Bind update button
  const updateBtn = document.getElementById("assigned-teacher-btn-update");
  if (updateBtn) {
    updateBtn.addEventListener("click", updateAssignment);
  }

});




/* ================================
   CANCEL FUNCTION
================================ */
function closeUpdateOverlay() {
  document.getElementById("update-assigned-class-teacher").style.display = "none";
  editId = null;
}

window.addEventListener("click", (e) => {
  const overlay = document.getElementById("update-assigned-class-teacher");
  if (e.target === overlay) {
    overlay.style.display = "none";
  }
});