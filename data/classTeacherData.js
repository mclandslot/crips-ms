const classTeacherAssignedToClass = window.supabaseClient; // your client


/* =====================================
   LOAD TEACHERS
===================================== */
async function loadTeachers() {

  const select = document.getElementById("teachers-registered-names");

  if (!select) {
    console.error("❌ Teacher dropdown not found");
    return;
  }

  try {
    const { data, error } = await  classTeacherAssignedToClass
      .from("teachers")
      .select("id, surname, first_name, role")
      .order("surname", { ascending: true });

    if (error) throw error;

    // Reset
    select.innerHTML = `<option value="" disabled selected>Select Teacher</option>`;

    /* administrators are not class teachers */
    (data || []).filter(teacher => !window.isNonTeachingRole(teacher.role)).forEach(teacher => {
      const option = document.createElement("option");
      option.value = teacher.id;
      option.textContent = `${teacher.surname || ""} ${teacher.first_name || ""}`.trim();
      select.appendChild(option);
    });

    console.log("✅ Teachers loaded");

  } catch (err) {
    console.error("❌ Error loading teachers:", err.message);
  }
}


/* =====================================
   LOAD CLASSES
===================================== */
async function loadAllClassesForDropdown() {

  console.log("🔥 NEW loadClasses running");

  const select = document.getElementById("student-assigned-teacher-classes");

  if (!select) {
    console.error("❌ Dropdown not found");
    return;
  }

  const classTeacherAssignedToClass = window.supabaseClient;

  const { data, error } = await classTeacherAssignedToClass
    .from("classes")
    .select("*");

  console.log("📦 Classes:", data);

  if (error) {
    console.error(error.message);
    return;
  }

  select.innerHTML = `<option disabled selected>Select Class</option>`;

  data.forEach(cls => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name;
    select.appendChild(option);
  });

  console.log("✅ Classes inserted");
}


/* =====================================
   ASSIGN CLASS TEACHER
===================================== */
async function assignClassTeacher() {

  const teacherId = document.getElementById("teachers-registered-names").value;
  const classId = document.getElementById("student-assigned-teacher-classes").value;
    const messageResponse = document.getElementById("form-feedback");

  if (!teacherId || !classId) {
       messageResponse.classList.add('show-message', 'error');
    messageResponse.textContent = 'Please select both teacher and class';
    setTimeout(()=>{
       messageResponse.classList.remove('show-message', 'error');
    }, 3000)
    return;
  }

  try {
    const { error } = await  classTeacherAssignedToClass
      .from("class_teachers")
      .upsert(
        {
          teacher_id: teacherId,
          class_id: classId
        },
        { onConflict: "class_id" } 
      );

    if (error) throw error;

       messageResponse.classList.add('show-message', 'success');
    messageResponse.textContent = 'Class teacher assigned successfully';
    setTimeout(()=>{
       messageResponse.classList.remove('show-message', 'success');
    }, 3000)

  } catch (err) {
    console.error("❌ Assignment error:", err.message);
            messageResponse.classList.add('show-message', 'error');
    messageResponse.textContent = 'check network or resign in.';
    setTimeout(()=>{
       messageResponse.classList.remove('show-message', 'error');
    }, 3000)
  }
}


/* =====================================
   LOAD WHEN MODAL OPENS (IMPORTANT FIX)
===================================== */
function openAssignClassModal() {

  document.getElementById("add-class-teacher").style.display = "flex";

  console.log("📂 Modal opened");

  loadTeachers();
  loadAllClassesForDropdown(); // ✅ NEW NAME
}

/* =====================================
   BUTTON EVENT
===================================== */
document
  .getElementById("assigned-class-teacher-btn")
  ?.addEventListener("click", assignClassTeacher);