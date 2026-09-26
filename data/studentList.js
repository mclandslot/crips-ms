// Student Management System with Supabase

const supabaseStudentsDataList = window.supabaseClient;

let editingStudentId = null;
let isSubmitting = false;


// ─────────────────────────────────────
// Initialize App
// ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  loadStudents();
  loadStudentStats();
loadStudentsPerClass();
createClassChart();
loadClassStudents()
loadFilterClasses();
// createGenderChart();
  // loadStudentStatusStats();
  // loadNewStudentsThisYear();

  const table = document.getElementById("studentsTableBody");
  if (table) table.addEventListener("click", handleTableActionClick);

  const form = document.getElementById("studentForm");
  if (form) form.addEventListener("submit", handleStudentSubmit);

  subscribeToStudentChanges();

});


// ─────────────────────────────────────
// Realtime
// The table, the dashboard counters and the class chart all redraw when
// students change, so a pupil added or removed anywhere shows up here
// without reloading the page.
// ─────────────────────────────────────
function subscribeToStudentChanges() {

  window.subscribeRealtime?.({
    name: "admin-students-live",
    // classes is watched too: the table and the chart print class names
    tables: ["students", "classes"],
    delay: 350,
    onChange: refreshStudentViews
  });

}

async function refreshStudentViews() {

  // a live redraw must not throw away the filter the admin is using, so
  // the filtered query is re-run instead of the full list
  const selectedClass = document.getElementById("filter-class")?.value || "";
  const searchName = document.getElementById("search-by-name")?.value.trim() || "";

  if (selectedClass || searchName) {
    await filterStudents();
  } else {
    await loadStudents();
  }

  await loadStudentStats();
  await loadStudentsPerClass();
  await createClassChart();

}

// ─────────────────────────────────────
// Animate Counter
// ─────────────────────────────────────
function animateCounter(elementId, target) {

  const element = document.getElementById(elementId);
  if (!element) return;

  const value = Number(target) || 0;

  // realtime re-runs the stats on every student change: without this the
  // counters would drop to 0 and count back up each time
  if (element.textContent === String(value)) return;

  let current = 0;

  const increment = Math.ceil(value / 50) || 1;

  const timer = setInterval(() => {

    current += increment;

    if (current >= value) {
      current = value;
      clearInterval(timer);
    }

    element.textContent = current;

  }, 30);

}



// ─────────────────────────────────────
// Student Row Markup
// shared by loadStudents() and renderStudentsTable()
// data-label drives the mobile card layout
// ─────────────────────────────────────
function escapeStudentHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statusPill(status) {
  const value = (status || "").trim();
  if (!value) return `<span class="status-pill status-unknown">-</span>`;

  const tone = value.toLowerCase();
  return `<span class="status-pill status-${escapeStudentHtml(tone)}">${escapeStudentHtml(value)}</span>`;
}

function studentRowHtml(student) {
  const fullName = studentFullName(student) || "-";

  const cell = (label, value, className = "") =>
    `<td data-label="${label}"${className ? ` class="${className}"` : ""}>${escapeStudentHtml(value || "-")}</td>`;

  return `
    ${cell("Admission No.", student.admission_number, "cell-admission")}
    ${cell("Admission Date", student.admission_date)}
    ${cell("Full Name", fullName, "cell-name")}
    ${cell("Date of Birth", student.date_of_birth)}
    ${cell("Gender", student.gender)}
    ${cell("Class", student.classes?.class_name)}
    ${cell("Section", student.section)}
    <td data-label="Status">${statusPill(student.status)}</td>

    <td data-label="Action" class="cell-actions">
      <button class="view-btn action-btn" data-id="${student.id}" title="View details" aria-label="View details">
      <i class="fa-solid fa-eye"></i></button>

      <button class="edit-btn action-btn" data-id="${student.id}" title="Edit student" aria-label="Edit student">
      <i class="fa-solid fa-pen-to-square"></i></button>

      <button class="delete-btn action-btn" data-id="${student.id}" title="Delete student" aria-label="Delete student">
      <i class="fa-solid fa-trash"></i></button>
    </td>
  `;
}

function emptyStudentsRow(message) {
  return `<tr class="students-empty-row"><td colspan="9">${escapeStudentHtml(message)}</td></tr>`;
}


// ─────────────────────────────────────
// Load Students
// ─────────────────────────────────────
async function loadStudents() {

  try {

    const { data, error } = await supabaseStudentsDataList
      .from("students")
      .select(`
  *,
  classes!students_class_id_fkey (
    class_name
  ),
 
`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const tbody = document.getElementById("studentsTableBody");
    tbody.innerHTML = "";

    if (!data.length) {
      tbody.innerHTML = emptyStudentsRow("No students found");
      return;
    }

    sortStudentsByName(data).forEach(student => {

      const tr = document.createElement("tr");
      tr.innerHTML = studentRowHtml(student);
      tbody.appendChild(tr);

    });

  } catch (err) {
    console.error("Load students error:", err);
  }

}


// ─────────────────────────────────────
// Table Button Handler
// ─────────────────────────────────────
function handleTableActionClick(e) {

  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;

  if (btn.classList.contains("view-btn")) viewStudent(id);
  if (btn.classList.contains("edit-btn")) editStudent(id);
  if (btn.classList.contains("delete-btn")) deleteStudent(id);

}


// ─────────────────────────────────────
// Delete Student
// ─────────────────────────────────────
async function deleteStudent(id) {
      const feedBackUpdateMessage = document.getElementById("form-feedback");

  const proceed = await confirmAction({
    title: "Delete student?",
    message: "This student will be removed permanently. This cannot be undone.",
    details: ["Their parent records are removed too"],
    confirmText: "Delete student",
    tone: "danger"
  });

  if (!proceed) return;

  try {

    await supabaseStudentsDataList
      .from("parents")
      .delete()
      .eq("student_id", id);

    const { error } = await supabaseStudentsDataList
      .from("students")
      .delete()
      .eq("id", id);

    if (error) throw error;

    loadStudents();

  } catch (err) {

    console.error("Delete error:", err);
    }
    
  feedBackUpdateMessage.classList.add("show-message");
    feedBackUpdateMessage.innerHTML = "Student deleted successfully";
    feedBackUpdateMessage.classList.add("success");
    setTimeout(()=>{
        feedBackUpdateMessage.classList.remove("show-message");
    }, 4000);
}


// ─────────────────────────────────────
// Edit Student
// ─────────────────────────────────────
async function editStudent(id) {
    // const feedBackUpdateMessage = document.getElementById("form-feedback");

  editingStudentId = id;

  try {

    const { data: student, error } = await supabaseStudentsDataList
      .from("students")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    const { data: parent } = await supabaseStudentsDataList
      .from("parents")
      .select("*")
      .eq("student_id", id)
      .maybeSingle();

    setValue("admission-number", student.admission_number);
    setValue("admissionDate", student.admission_date);
    setValue("surname-student", student.surname);
    setValue("first-name-student", student.first_name);
    setValue("datePicker", student.date_of_birth);
    setValue("studentGender", student.gender);
    // setValue("studentClass", student.classes?.class_name);
    setValue("studentClass", student.class_id);
    setValue("studentSection", student.section);
    setValue("studentStatus", student.status);

    if (parent) {
      setValue("parenFullName", parent.full_name);
      setValue("parentRelationship", parent.relationship);
      setValue("parentPhone", parent.phone);
      setValue("parentAddress", parent.address);
      setValue("workArea", parent.staff_type);
    }

    document.getElementById("addStudentBnt").textContent = "Update Student";
    document.getElementById("add-student").style.display = "flex";

  } catch (err) {

    console.error("Edit error:", err);
  }

}

/* Cancel clears the form and forgets the student being edited, so the
   next "Add Student" opens empty and saves a new student instead of
   updating the last one that was edited */
function closeAddStudent(){
   closeForm();
}


// function to load class
async function loadClassesDropdown() {

  const select = document.getElementById("studentClass");

  if (!select) return;

  const { data, error } = await supabaseStudentsDataList
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error(error.message);
    return;
  }

  // Reset dropdown
  select.innerHTML = `<option value="">Select Class</option>`;

  data.forEach(cls => {

    const option = document.createElement("option");

    option.value = cls.id; 
    option.textContent = cls.class_name;

    select.appendChild(option);

  });

}



async function loadFilterClasses() {

  const select = document.getElementById("filter-class");

  const { data, error } = await supabaseStudentsDataList
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error(error.message);
    return;
  }

  select.innerHTML = `<option value="">All Classes</option>`;

  data.forEach(cls => {

    const option = document.createElement("option");

    option.value = cls.id;             
    option.textContent = cls.class_name; 

    select.appendChild(option);

  });

}



// ─────────────────────────────────────
// Submit Form (Add / Update) with Validation
// ─────────────────────────────────────
async function handleStudentSubmit(e) {
  const feedBackMessage = document.getElementById("form-feedback");

  e.preventDefault();

  if (isSubmitting) return;

  // ───── Validation ─────
  const requiredFields = [
    // "admission-number",
    // "admissionDate",
    "surname-student",
    "first-name-student",
    // "datePicker",
    "studentGender",
    "studentClass"
    // "studentSection",
    // "studentStatus",
    // "parenFullName",
    // "parentRelationship",
    // "parentPhone"
  ];

  for (let id of requiredFields) {
    const field = document.getElementById(id);
    if (!field || field.value.trim() === "") {
      // alert("Please fill all fields marked with *");
      feedBackMessage.classList.add('show-message');
      feedBackMessage.classList.add('error');
      feedBackMessage.innerHTML = 'Please fill all fields marked with *';
      setTimeout(()=>{
         feedBackMessage.classList.remove('show-message');
      }, 4000);
      field.focus();
      return; // Stop submission
    }
  }

  isSubmitting = true;

  try {
    // ───── Student Data ─────
   const classSelect = document.getElementById("studentClass");

const studentData = {
  admission_number: document.getElementById("admission-number").value,
  admission_date: document.getElementById("admissionDate").value,
  surname: document.getElementById("surname-student").value,
  first_name: document.getElementById("first-name-student").value,
  date_of_birth: document.getElementById("datePicker").value,
  gender: document.getElementById("studentGender").value,

  class_id: classSelect.value, 
  class: classSelect.options[classSelect.selectedIndex].text, 

  section: document.getElementById("studentSection").value,
  status: document.getElementById("studentStatus").value
};

    // ───── Upload Image ─────
    const file = document.getElementById("studentPicture").files[0];
    if (file) {
      const filePath = `students/${Date.now()}-${file.name}`;
      const { error } = await supabaseStudentsDataList.storage
        .from("student-pictures")
        .upload(filePath, file);
      if (error) throw error;

      const { data } = supabaseStudentsDataList.storage
        .from("student-pictures")
        .getPublicUrl(filePath);

      studentData.picture_url = data.publicUrl;
    }

    let studentId;

    // ───── Insert / Update Student ─────
    if (editingStudentId) {
      const { error } = await supabaseStudentsDataList
        .from("students")
        .update(studentData)
        .eq("id", editingStudentId);
      if (error) throw error;
      studentId = editingStudentId;
    } else {
      const { data, error } = await supabaseStudentsDataList
        .from("students")
        .insert(studentData)
        .select()
        .single();
      if (error) throw error;
      studentId = data.id;
    }

    // ───── Parent Data ─────
    const parentData = {
      student_id: studentId,
      full_name: document.getElementById("parenFullName").value,
      relationship: document.getElementById("parentRelationship").value,
      phone: document.getElementById("parentPhone").value,
      address: document.getElementById("parentAddress").value,
      staff_type: document.getElementById("workArea").value
    };

    // Upsert parent (update if exists, insert if not)
    const { error: parentError } = await supabaseStudentsDataList
      .from("parents")
      .upsert(parentData, { onConflict: "student_id" });
    if (parentError) throw parentError;

    closeForm();
    loadStudents();
    loadStudentStats();

    // ───── Feedback Message ─────
    feedBackMessage.classList.add("show-message", "success");
    feedBackMessage.innerHTML = editingStudentId
      ? "Student updated successfully"
      : "Student registered successfully";
    setTimeout(() => {
      feedBackMessage.classList.remove("show-message");
    }, 4000);

  } catch (err) {
    console.error("Save error:", err);
    alert("Save failed: " + err.message);
  }

  isSubmitting = false;
}


// ─────────────────────────────────────
// View Student
// ─────────────────────────────────────
async function viewStudent(id) {

  try {

  const { data: student } =
  await supabaseStudentsDataList
    .from("students")
    .select(`
      *,
      classes (
        class_name
      )
    `)
    .eq("id", id)
    .single();

    const { data: parent } =
      await supabaseStudentsDataList
        .from("parents")
        .select("*")
        .eq("student_id", id)
        .maybeSingle();

    const fullName = studentFullName(student);

    document.getElementById("detail-full-name").textContent = fullName;
    document.getElementById("detail-fullname-persona").textContent = fullName;
   document.getElementById("detail-class-personal").textContent = student.classes?.class_name || "-";
    // document.getElementById("detail-class-personal").textContent = student.class || "-";
    document.getElementById("detail-status").textContent = student.status || "-";
    document.getElementById("detail-status-personal").textContent = student.status || "-";
    document.getElementById("detail-admission-number").textContent = student.admission_number || "-";
    document.getElementById("detail-dob").textContent = student.date_of_birth || "-";
    document.getElementById("detail-gender").textContent = student.gender || "-";
    document.getElementById("detail-admission-date").textContent = student.admission_date || "-";
    document.getElementById("detail-section").textContent = student.section || "-";

    if (parent) {

      document.getElementById("detail-parent-name").textContent = parent.full_name || "-";
      document.getElementById("detail-relationship").textContent = parent.relationship || "-";
      document.getElementById("detail-phone").textContent = parent.phone || "-";
      document.getElementById("detail-address").textContent = parent.address || "-";
      document.getElementById("detail-staff-type").textContent = parent.staff_type || "-";

    }

    const imgContainer = document.querySelector(".profile-box-img");

    if (imgContainer && student.picture_url) {

      imgContainer.innerHTML =
        `<img src="${student.picture_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;

    }

    document
      .getElementById("students-details-overlay")
      .style.display = "flex";

  } catch (err) {

    console.error("View error:", err);

  }

}


// ─────────────────────────────────────
// Helpers
// ─────────────────────────────────────
function setValue(id, value) {

  const el = document.getElementById(id);
  if (el) el.value = value || "";

}

function closeForm() {

  editingStudentId = null;

  document.getElementById("studentForm").reset();

  document.getElementById("add-student").style.display = "none";

  document.getElementById("addStudentBnt").textContent = "Add Student";

}

function closeOverlay(){
  document.getElementById("students-details-overlay").style.display = 'none';

}




document
  .getElementById("load-class-students")
  .addEventListener("click", filterStudents);

document
  .getElementById("search-by-name")
  .addEventListener("input", filterStudents);

async function filterStudents() {

  const selectedClass =
    document.getElementById("filter-class").value;

  const searchName =
    document.getElementById("search-by-name").value.trim();

  try {

    let query = supabaseStudentsDataList
      .from("students")
      .select(`
        *,
        classes (
          class_name
        )
      `)
      .order("surname", { ascending: true });

    if (selectedClass) {
      query = query.eq("class_id", selectedClass); 
    }

    if (searchName) {
      query = query.ilike("surname", `%${searchName}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    renderStudentsTable(data);

  } catch (err) {

    console.error("Filter error:", err);

  }

}


function renderStudentsTable(students) {

  const tbody = document.getElementById("studentsTableBody");

  tbody.innerHTML = "";

  if (!students.length) {
    tbody.innerHTML = emptyStudentsRow("No students found");
    return;
  }

  sortStudentsByName(students).forEach(student => {

    const tr = document.createElement("tr");
    tr.innerHTML = studentRowHtml(student);
    tbody.appendChild(tr);

  });

}


// Load Student Statistics (FAST METHOD)
// ─────────────────────────────────────
/* The status dropdown writes "Complete", but promoting a pupil out of the
   top class used to write "completed". Postgres = is case sensitive, so
   those pupils matched neither filter: they were missing from Total
   Complete and still counted in the other three. ilike matches whatever
   case is already in the table - see status_case_fix.sql for the
   backfill that settles the old rows. */
async function loadStudentStats() {

  const { count: totalStudents } =
    await supabaseStudentsDataList
      .from("students")
      .select("*", { count: "exact", head: true })
      .not("status", "ilike", "Complete")

        const { count: totalStudentsComplete } =
    await supabaseStudentsDataList
      .from("students")
      .select("*", { count: "exact", head: true })
      .ilike("status", "Complete")


  const { count: totalMale } =
    await supabaseStudentsDataList
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("gender", "Male")
      .not("status", "ilike", "Complete")


  const { count: totalFemale } =
    await supabaseStudentsDataList
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("gender", "Female")
      .not("status", "ilike", "Complete")


      animateCounter("totalstudents", totalStudents);
      animateCounter("totalstudents-complete", totalStudentsComplete);
  animateCounter("totalmale", totalMale);
  animateCounter("totalfemale", totalFemale);

}


// ─────────────────────────────────────
// Students Per Class Dashboard Cards
// ─────────────────────────────────────
async function loadStudentsPerClass() {

  try {

    const { data, error } = await supabaseStudentsDataList
      .from("students")
      .select(`
        gender,
        classes (
          class_name
        )
      `);

    if (error) throw error;

    const classStats = {};

    data.forEach(student => {

      const cls = student.classes?.class_name || "Unknown";

      if (!classStats[cls]) {
        classStats[cls] = {
          total: 0,
          male: 0,
          female: 0
        };
      }

      classStats[cls].total++;

      if (student.gender === "Male") classStats[cls].male++;
      if (student.gender === "Female") classStats[cls].female++;

    });

    const container = document.querySelector(".grid-class-layout");
    container.innerHTML = "";

    for (let cls in classStats) {

      const stats = classStats[cls];

      const card = document.createElement("div");
      card.classList.add("grid-class-card");

      card.innerHTML = `
        <h4>${cls}</h4>
        <p>Total Students: <span>${stats.total}</span></p>
        <div class="flex-gender-class">
            <p>Male: <span>${stats.male}</span></p>
            <p>Female: <span>${stats.female}</span></p>
        </div>
      `;

      container.appendChild(card);

    }

  } catch (err) {

    console.error("Class stats error:", err);

  }

}


async function createClassChart() {

  const { data } = await supabaseStudentsDataList
    .from("students")
    .select(`
      classes (
        class_name
      )
    `);

  const classCount = {};

  data.forEach(student => {

    const cls = student.classes?.class_name || "Unknown";

    classCount[cls] = (classCount[cls] || 0) + 1;

  });

  const labels = Object.keys(classCount);
  const values = Object.values(classCount);

  const canvas = document.getElementById("classChart");
  if (!canvas) return;

  // realtime redraws this on every student change, and Chart.js v4 refuses
  // to reuse a canvas that still holds a chart
  Chart.getChart(canvas)?.destroy();

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Students Per Class",
        data: values
      }]
    }
  });

}





// ─────────────────────────────────────
// Load Class List
// ─────────────────────────────────────
async function loadClassStudents(showAlert = false) {

  const classSelect = document.getElementById("class-select");
  const selectedClassId = classSelect.value;

  if (!selectedClassId) {
    if (showAlert) alert("Please select a class");
    return;
  }

  /* the header above the table is what gets printed, so it needs the name */
  const classNameLabel = document.getElementById("selected-class-name");
  if (classNameLabel) {
    classNameLabel.textContent =
      classSelect.options[classSelect.selectedIndex]?.textContent || "";
  }

  try {

    const { data, error } = await supabaseStudentsDataList
      .from("students")
      .select(`
        surname,
        first_name,
        gender
      `)
      .eq("class_id", selectedClassId) // ✅ FIX
      .eq("status", "Present")
      .order("surname", { ascending: true });

    if (error) throw error;

    const tableBody = document.getElementById("student-list-of-class");
    tableBody.innerHTML = "";

    let male = 0;
    let female = 0;

    sortStudentsByName(data).forEach((student, index) => {

      const fullName = studentFullName(student);

      if (student.gender === "Male") male++;
      if (student.gender === "Female") female++;

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${fullName}</td>
      `;

      tableBody.appendChild(row);

    });

    document.getElementById("class-total").textContent = data.length;
    document.getElementById("class-male").textContent = male;
    document.getElementById("class-female").textContent = female;

  } catch (err) {

    console.error("Class list error:", err);

  }

}

document
.getElementById("load-class-btn")
.addEventListener("click", () => {

  loadClassStudents(true);

});


document.addEventListener("DOMContentLoaded", () => {

  loadClassStudents(false);

});


document
.getElementById("class-select")
.addEventListener("change", () => {

  loadClassStudents(false);

});



document.addEventListener("DOMContentLoaded", function () {

  loadClassesDropdown();

  const searchInput = document.getElementById("class-search-list");

  searchInput.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase().trim();

    const rows =
      document.querySelectorAll("#student-list-of-class tr");

    rows.forEach(row => {

      const nameCell = row.children[1];

      if (!nameCell) return;

      const name = nameCell.textContent.toLowerCase();

      if (name.includes(searchValue)) {

        row.style.display = "";

      } else {

        row.style.display = "none";

      }

    });

  });

});



// ─────────────────────────────────────
// Print Class List
// ─────────────────────────────────────
function printClassList() {

  /* must be a unique id - "assessment-table-container" is repeated across
     several sections, so getElementById returned the wrong one */
  const printArea = document.getElementById("class-list-print-area");
  const rows = document.querySelectorAll("#student-list-of-class tr");

  if (!printArea || !rows.length) {
    alert("Load a class list before printing.");
    return;
  }

  const printWindow = window.open("", "_blank", "width=1000,height=800");

  if (!printWindow) {
    alert("Unable to open print window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Class List</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #000;
          }

          .terminal-card-header-details {
            text-align: center;
            margin-bottom: 16px;
          }

          h2, h3 {
            margin: 0 0 4px 0;
          }

          .class-list-status {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-top: 10px;
            font-size: 13px;
          }

          /* matches the uppercase roster styling on the page */
          h2, h3,
          .class-list-status,
          th {
            text-transform: uppercase;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }

          th, td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
            font-size: 14px;
          }

          th {
            background: #f2f2f2;
          }

          tr {
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 500);

}

document
  .getElementById("print-class-list-btn")
  ?.addEventListener("click", printClassList);