/* =========================
   TEACHER PAGE GUARD

   Self-contained on purpose: the teacher portal does not load
   data/authenticPage.js, and pulling it in would collide with the
   globals the other teacher scripts already declare.
========================= */

(async function protectTeacherPortal() {
  const supabase = window.supabaseClient;

  if (!supabase) {
    console.error("Supabase client not initialized");
    return;
  }

  const toLogin = () => window.location.replace(window.appUrl("index.html"));

  async function guard() {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        toLogin();
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_active, must_change_password")
        .eq("id", data.user.id)
        .maybeSingle();

      /* a failed lookup is not proof of anything - the login page will
         retry and explain, so the session is kept */
      if (profileError) {
        console.error("Profile lookup error:", profileError.message);
        toLogin();
        return;
      }

      /* no profile, or blocked from the admin Manage Teachers screen */
      if (!profile || !profile.is_active) {
        await supabase.auth.signOut();
        toLogin();
        return;
      }

      /* an admin-set password is known to the admin, so it must be
         replaced before the portal opens */
      if (profile.must_change_password) {
        window.location.replace(window.appUrl("change-password.html"));
        return;
      }

      /* same role mapping the login redirect uses */
      if (window.portalForRole(profile.role) !== "teacher_page") {
        await supabase.auth.signOut();
        toLogin();
      }
    } catch (err) {
      console.error("Teacher guard error:", err);
      toLogin();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", guard);
  } else {
    await guard();
  }
})();
