const supabaseClientStudentDataPerClassList = window.supabaseClient;

let teacherClasses = [];
let allStudents = [];
const classDataFeedBack = document.getElementById("form-feedback");


/* =====================================
   LOAD TEACHER ASSIGNED CLASSES
===================================== */
async function loadAssignedClasses() {

  const { data: userData } =
    await supabaseClientStudentDataPerClassList.auth.getUser();

  if (!userData?.user) {
    console.error("No logged in user");
    return;
  }

  const teacherId = userData.user.id;

  // ✅ USE NEW TABLE
  const { data: assignments, error } =
    await supabaseClientStudentDataPerClassList
      .from("teacher_subject_assignments")
      .select("class_id, classes(class_name)")
      .eq("teacher_id", teacherId);

  if (error) {
    console.error(error);
    return;
  }

  // extract unique classes
  const uniqueClassesMap = {};

  assignments.forEach(a => {
    if (a.class_id && a.classes?.class_name) {
      uniqueClassesMap[a.class_id] = a.classes.class_name;
    }
  });

  teacherClasses = Object.entries(uniqueClassesMap).map(([id, name]) => ({
    id,
    name
  }));

  const select =
    document.getElementById("select-student-classes-assigned");

  select.innerHTML = `<option value="">Select class</option>`;

  teacherClasses.forEach(cls => {
    const option = document.createElement("option");
    option.value = cls.id; // store class_id
    option.textContent = cls.name; // display class_name
    select.appendChild(option);
  });

}


/* =====================================
   LOAD ALL STUDENTS
===================================== */
async function loadAllStudents() {

  const { data, error } =
    await supabaseClientStudentDataPerClassList
      .from("students")
      .select(`
        id,
        surname,
        first_name,
        gender,
        class_id,
        classes(class_name)
      `);

  if (error) {
    console.error(error);
    return;
  }

  allStudents = data || [];
}


/* =====================================
   BUTTON EVENT
===================================== */
document
  .getElementById("btn-show-student-list-for-class")
  ?.addEventListener("click", showStudentsForSelectedClass);


/* =====================================
   MAIN FUNCTION
===================================== */
function showStudentsForSelectedClass() {

  const selectedClassId =
    document.getElementById("select-student-classes-assigned").value;

  if (!selectedClassId) {
    // alert("Please select a class");
    classDataFeedBack.classList.add("show-message", "error");
    classDataFeedBack.innerHTML = "Select a class";
    setTimeout(()=>{
      classDataFeedBack.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  const wrapper =
    document.getElementById("student-names-wrapper");

  const listContainer =
    document.querySelector(".student-selected-container");

  wrapper.style.display = "block";

  // ✅ filter using class_id
  const filteredStudents = sortStudentsByName(
    allStudents.filter(s => s.class_id === selectedClassId)
  );

  // clear UI
  listContainer.innerHTML = "";

  const className =
    filteredStudents[0]?.classes?.class_name || "Class";

  if (filteredStudents.length === 0) {
    listContainer.innerHTML = `
      <div class="student-list-header">
        <h4>${className}</h4>
      </div>
      <p class="student-list-empty">No students found in this class.</p>
    `;
    return;
  }

  // header with class name + student count
  listContainer.innerHTML = `
    <div class="student-list-header">
      <h4>${className}</h4>
      <span class="student-count-badge">
        <i class="fa-solid fa-users"></i> ${filteredStudents.length} student${filteredStudents.length > 1 ? "s" : ""}
      </span>
    </div>
    <div class="student-name-grid"></div>
  `;

  const grid = listContainer.querySelector(".student-name-grid");

  // display students
  filteredStudents.forEach((student, index) => {

    const fullName = studentFullName(student);

    const initials =
      `${(stripLeadingNumber(student.surname) || " ")[0]}${(stripLeadingNumber(student.first_name) || " ")[0]}`
        .trim()
        .toUpperCase();

    const div = document.createElement("div");
    div.className = "student-name-item";

    div.innerHTML = `
      <span class="student-index">${index + 1}</span>
      <span class="student-avatar">${initials}</span>
      <span class="student-fullname">${fullName}</span>
    `;

    grid.appendChild(div);

  });

}

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadAssignedClasses();
  await loadAllStudents();
});