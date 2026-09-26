

const supabaseShowLoggedData = window.supabaseClient;

/* =====================================
SHOW LOGGED IN TEACHER NAME + EMAIL
   (FROM teachers TABLE)
===================================== */
async function displayLoggedTeacherInfo() {

  const nameEl = document.getElementById("logged-teacher-name");
  const emailEl = document.getElementById("logged-email");
  const fullNameEl = document.getElementById("show-user-full-name");

  // Get logged in user
  const { data: { user }, error } =
    await supabaseShowLoggedData.auth.getUser();

  if (error || !user) {
    console.error("No logged in teacher:", error);
    return;
  }

  // Show email from auth
  emailEl.textContent = user.email || "No Email";

  // Fetch teacher info from teachers table
  const { data: teacherData, error: teacherError } =
    await supabaseShowLoggedData
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

  const fullName = `${teacherData.surname || ""} ${teacherData.first_name || ""} ${teacherData.other_name || ""}`.trim();
  const showFullName = `${teacherData.first_name || ""}`.trim();

//   const great = 'Hi';
  nameEl.textContent = fullName || "Teacher";
  fullNameEl.textContent = 'Hi' + " " + showFullName;
}


document.addEventListener("DOMContentLoaded", async () => {
  await displayLoggedTeacherInfo();

});


// const supabaseShowLoggedData = window.supabaseClient;

// /* =====================================
//    SHOW LOGGED IN USER NAME + EMAIL
//    (FROM profiles TABLE)
// ===================================== */
// async function displayLoggedTeacherInfo() {
//   const nameEl = document.getElementById("logged-teacher-name");
//   const emailEl = document.getElementById("logged-email");
//   const fullNameEl = document.getElementById("show-user-full-name");

//   try {
//     const {
//       data: { user },
//       error: userError
//     } = await supabaseShowLoggedData.auth.getUser();

//     if (userError || !user) {
//       console.error("No logged in user:", userError);
//       if (nameEl) nameEl.textContent = "User";
//       if (emailEl) emailEl.textContent = "No Email";
//       if (fullNameEl) fullNameEl.textContent = "Hi";
//       return;
//     }

//     const { data: profileData, error: profileError } =
//       await supabaseShowLoggedData
//         .from("profiles")
//         .select("full_name, email")
//         .eq("id", user.id)
//         .maybeSingle();

//     if (profileError) {
//       console.error("Profiles table error:", profileError.message);

//       if (nameEl) nameEl.textContent = "User";
//       if (emailEl) emailEl.textContent = user.email || "No Email";
//       if (fullNameEl) fullNameEl.textContent = "Hi";
//       return;
//     }

//     const fullName = profileData?.full_name?.trim() || "User";
//     const profileEmail = profileData?.email?.trim() || user.email || "No Email";
//     const firstName = fullName.split(" ")[0] || "User";

//     if (nameEl) nameEl.textContent = fullName;
//     if (emailEl) emailEl.textContent = profileEmail;
//     if (fullNameEl) fullNameEl.textContent = `Hi ${firstName}`;
//   } catch (error) {
//     console.error("displayLoggedTeacherInfo error:", error);

//     if (nameEl) nameEl.textContent = "User";
//     if (emailEl) emailEl.textContent = "No Email";
//     if (fullNameEl) fullNameEl.textContent = "Hi";
//   }
// }

// document.addEventListener("DOMContentLoaded", async () => {
//   await displayLoggedTeacherInfo();
// });