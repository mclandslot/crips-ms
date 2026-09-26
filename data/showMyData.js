

const supabaseNavShowLoggedData = window.supabaseClient;

/* =====================================
SHOW LOGGED IN TEACHER NAME + EMAIL
   (FROM teachers TABLE)
===================================== */
async function displayLoggedTeacherInfo() {

  const nameEl = document.getElementById("logged-admin-name");
  const emailEl = document.getElementById("logged-admin-email");
  const fullNameEl = document.getElementById("show-user-admin-full-name");

  // Get logged in user
  const { data: { user }, error } =
    await supabaseNavShowLoggedData .auth.getUser();

  if (error || !user) {
    console.error("No logged in teacher:", error);
    return;
  }

  // Show email from auth
  emailEl.textContent = user.email || "No Email";

  // Fetch teacher info from teachers table
  const { data: teacherData, error: teacherError } =
    await supabaseNavShowLoggedData 
      .from("teachers")
      .select("surname, first_name, email")
      .eq("id", user.id)
      .maybeSingle();

  if (teacherError) {
    console.error("Teacher table error:", teacherError.message);
    nameEl.textContent = "Teacher";
    return;
  }

  if (!teacherData) {
    nameEl.textContent = "Teacher";
    return;
  }

  const fullNameName = `${teacherData.surname || ""} ${teacherData.first_name || ""} ${teacherData.other_name || ""}`.trim();
  const showFullName = `${teacherData.first_name || ""}`.trim();

//   const great = 'Hi';
  nameEl.textContent = fullNameName || "Teacher";
  fullNameEl.textContent = 'Hi' + " " + showFullName;
}


document.addEventListener("DOMContentLoaded", async () => {
  await displayLoggedTeacherInfo();
  
});