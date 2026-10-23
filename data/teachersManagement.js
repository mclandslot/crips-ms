// const supabaseTeachersData = window.supabaseClient;
const supabaseTeachers = window.supabaseClient;

const addTeacherBtn = document.getElementById("addTeachersBtn");

let editingTeacherId = null;
const feedBackMessage = document.getElementById("form-feedback");

/* =====================================
   ROLE MAPPING (FIXED )
===================================== */
function mapProfileRole(role) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "administrator" || value === "admin") return "admin";
  if (value === "system admin" || value === "system_admin") return "system_admin";
  if (value === "head teacher" || value === "head_teacher") return "head_teacher";
  if (value === "teacher") return "teacher";

  return "";
}

/* =====================================
   EVENT
===================================== */
if (addTeacherBtn) {
  addTeacherBtn.addEventListener("click", registerTeacher);
}

/* =====================================
   REGISTER TEACHER
===================================== */
async function registerTeacher() {
  try {

    /* both this and createTeacher.js listen on the same button, and
       preventDefault() there does not stop this listener - while a teacher is
       being edited the update is createTeacher.js's job, not this one's */
    if (window.editingTeacherId) return;

    const surname = document.getElementById("teacher-surname").value.trim();
    const firstname = document.getElementById("teacher-firstname").value.trim();
    const dob = document.getElementById("datePicker-dob")?.value || null;
    const gender = document.getElementById("teacher-gender").value;
    const marital = document.getElementById("marital-status").value;
    const qualification = document.getElementById("Qualification").value;

    /* Status is a <select>: ":checked" matched nothing, so whatever the admin
       picked was thrown away and every new teacher was saved as "Active" */
    const status =
      document.getElementById("teacher-Active-Status")?.value || "";

    const phone = document.getElementById("teacher-Phone").value.trim();
    const email = document.getElementById("teacher-Email").value.trim().toLowerCase();
    const address = document.getElementById("teacher-Address").value.trim();

    const role = document.getElementById("role").value;
    const password = document.getElementById("teacher-password").value;

    const employedDate = document.getElementById("employed-date")?.value || null;

    if (!surname || !firstname || !email || !role || !password || !status) {
      feedBackMessage.classList.add("show-message", "error");
      feedBackMessage.innerHTML = "Fill all required fields (*)";
      setTimeout(() => {
        feedBackMessage.classList.remove("show-message", "error");
      }, 3000);
      return;
    }

    /* =========================
       ROLE FIX
    ========================= */
    const formattedRole = mapProfileRole(role);

    if (!formattedRole) {
      // alert("Invalid role selected");
       feedBackMessage.classList.add("show-message", "error");
      feedBackMessage.innerHTML = "Invalid role selected";
      setTimeout(() => {
        feedBackMessage.classList.remove("show-message", "error");
      }, 3000);
      return;
    }

    /* =========================
       IMAGE UPLOAD
    ========================= */
    let pictureUrl = null;

    const file = document.getElementById("teacher-picture").files[0];

    if (file) {
      const filePath = `teachers/${Date.now()}-${file.name}`;

      const { error: uploadError } =
        await supabaseTeachers.storage
          .from("teacher-pictures")
          .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } =
        supabaseTeachers.storage
          .from("teacher-pictures")
          .getPublicUrl(filePath);

      pictureUrl = data.publicUrl;
    }

    /* =========================
       CREATE THE ACCOUNT (SERVER SIDE)

       auth.signUp() would sign THIS browser in as the new teacher and log
       the admin out, so the login, the teachers row and the profile are all
       created by the edge function instead.
    ========================= */
    const { error: createError } = await supabaseTeachers.functions.invoke(
      "create-staff-account",
      {
        body: {
          email,
          password,
          profileRole: formattedRole,
          teacher: {
            surname,
            first_name: firstname,
            dob: dob || null,
            gender,
            marital_status: marital,
            qualification,
            status,
            phone,
            address,
            role,
            employed_date: employedDate || null,
            picture_url: pictureUrl
          }
        }
      }
    );

    if (createError) {
      let details = createError.message;

      try {
        if (createError.context) {
          const errorBody = await createError.context.json();
          details = errorBody.error || errorBody.message || details;
        }
      } catch (parseErr) {
        console.error("Could not parse function error body:", parseErr);
      }

      throw new Error(details);
    }

    /* =========================
       SUCCESS UI
    ========================= */
    feedBackMessage.classList.add("show-message", "success");
    feedBackMessage.innerHTML = "Teacher added successfully";

    setTimeout(() => {
      feedBackMessage.classList.remove("show-message", "success");
    }, 4000);

    /* the admin now stays on the page, so both the assign-class dropdown and
       the Manage Teachers table need refreshing */
    loadTeachers();
    window.loadTeachersForAdminTable?.();
    loadTotalTeachers();

  } catch (err) {
    console.error("Teacher error:", err);
    alert(err.message);
  }
}


async function loadTotalTeachers() {

  const el = document.getElementById("total-teachers");
  if (!el) return;

  try {

    /* the roles are read back and counted here rather than counted in the
       database, so this card matches the teachers table: administrator
       accounts are not staff and are left out of both */
    const { data, error } = await supabaseTeachers
      .from("teachers")
      .select("role");

    if (error) throw error;

    const teachers = (data || []).filter(
      (teacher) => !window.isAdminRole(teacher.role)
    );

    el.textContent = teachers.length;

  } catch (err) {
    console.error("Error loading teacher count:", err.message);
    el.textContent = "0";
  }
}

loadTotalTeachers();