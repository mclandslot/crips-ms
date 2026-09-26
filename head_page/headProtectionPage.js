const supabaseHeadTeacherDashboard = window.supabaseClient;
// const supabaseHeadTeacherlogs = window.supabaseClient;

const logMessage = document.getElementById("form-feedback");

/* =====================================
   PROTECT HEAD TEACHER PAGE
===================================== */
async function protectTeacherPage() {
  const toLogin = () => window.location.replace(window.appUrl("index.html"));

  if (!supabaseHeadTeacherDashboard) return;

  try {
    /* getUser checks the token with the server; getSession would accept
       an expired or revoked one from local storage */
    const { data, error: userError } =
      await supabaseHeadTeacherDashboard.auth.getUser();

    const user = data?.user;

    if (userError || !user) {
      toLogin();
      return;
    }

    const { data: profile, error: profileError } =
      await supabaseHeadTeacherDashboard
        .from("profiles")
        .select("id, full_name, role, is_active, must_change_password")
        .eq("id", user.id)
        .maybeSingle();

    /* a failed lookup is not proof of anything - the login page will
       retry and explain, so the session is kept */
    if (profileError) {
      console.error("Profile lookup error:", profileError.message);
      toLogin();
      return;
    }

    /*  BLOCKED USER / NO PROFILE */
    if (!profile || !profile.is_active) {
      await supabaseHeadTeacherDashboard.auth.signOut();
      toLogin();
      return;
    }

    /*  ADMIN-SET PASSWORD MUST BE REPLACED FIRST */
    if (profile.must_change_password) {
      window.location.replace(window.appUrl("change-password.html"));
      return;
    }

    /*  ROLE PROTECTION - same role mapping the login redirect uses */
    if (window.portalForRole(profile.role) !== "head_page") {
      await supabaseHeadTeacherDashboard.auth.signOut();
      toLogin();
      return;
    }

    /*  LOAD USER INFO */
    const nameEl = document.getElementById("head-teacher-name");

    if (nameEl) {
      nameEl.textContent = profile.full_name || "Head Teacher";
    }

  } catch (err) {
    console.error("Protect page error:", err);
    toLogin();
  }
}

/* =====================================
   LOGOUT
===================================== */
// async function logout() {
//   try {
//     const signOutBtn = document.getElementById("btn-yes-logout");

//     if (signOutBtn) {
//       signOutBtn.innerHTML = "Signing out...";
//       signOutBtn.disabled = true;
//     }

//     logMessage.classList.add("show-message", "success");
//     logMessage.innerHTML = "Logout successfully";
//     setTimeout(()=>{
//       logMessage.classList.remove("show-message", "success");
//     })


//     await supabaseHeadTeacherlogs.auth.signOut();

//     window.location.replace("../index.html");

//   } catch (err) {
//     console.error("Logout error:", err.message);
//   }
// }

/* =====================================
   LOAD HEAD TEACHER INFO
===================================== */
// async function loadTeacherInfo() {
//   try {
//     const {
//       data: { user }
//     } = await supabaseHeadTeacherlogs.auth.getUser();

//     if (!user) return;

//     const { data: profile, error } =
//       await supabaseHeadTeacherlogs
//         .from("profiles")
//         .select("full_name, email")
//         .eq("id", user.id)
//         .single();

//     if (error || !profile) return;

//     const nameEl = document.getElementById("head-teacher-name");

//     if (nameEl) {
//       nameEl.textContent = profile.full_name || "Head Teacher";
//     }

//   } catch (err) {
//     console.error("Load teacher info error:", err.message);
//   }
// }

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await protectTeacherPage();
  // await loadTeacherInfo();
});