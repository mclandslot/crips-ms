/* =========================
   FORCED PASSWORD CHANGE

   Reached when profiles.must_change_password is true, which the admin
   reset function sets. The page guards send the user here and refuse to
   let them back into a portal until the flag is cleared.
========================= */

const supabaseForcePassword = window.supabaseClient;

function forcePasswordFeedback(message, type = "error") {
  const el = document.getElementById(
    type === "success" ? "success-show" : "error-show"
  );
  if (!el) return;

  el.classList.add("show-message");
  el.innerHTML = `<i class="fa-solid fa-circle-${
    type === "success" ? "check" : "xmark"
  }"></i> ${message}`;

  setTimeout(() => {
    el.classList.remove("show-message");
  }, 4000);
}

/* Nobody should sit on this page without a session, and nobody who has
   already changed their password should be held here. */
async function initForcePasswordPage() {
  const { data, error } = await supabaseForcePassword.auth.getUser();

  if (error || !data?.user) {
    window.location.replace(window.appUrl("index.html"));
    return;
  }

  const { data: profile, error: profileError } = await supabaseForcePassword
    .from("profiles")
    .select("is_active, must_change_password")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    await supabaseForcePassword.auth.signOut();
    window.location.replace(window.appUrl("index.html"));
    return;
  }

  if (!profile.must_change_password) {
    const problem = await redirectUser();
    if (problem) forcePasswordFeedback(problem);
  }
}

async function handleForcePasswordChange(e) {
  e.preventDefault();

  const btn = document.getElementById("force-password-btn");
  const newPassword =
    document.getElementById("force-new-password")?.value?.trim() || "";
  const confirmPassword =
    document.getElementById("force-confirm-password")?.value?.trim() || "";

  if (!newPassword || !confirmPassword) {
    forcePasswordFeedback("Fill in both fields");
    return;
  }

  if (newPassword.length < 6) {
    forcePasswordFeedback("Password must be at least 6 characters");
    return;
  }

  if (newPassword !== confirmPassword) {
    forcePasswordFeedback("Passwords do not match");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving...";
  }

  try {
    const { data, error } = await supabaseForcePassword.auth.updateUser({
      password: newPassword
    });

    if (error) {
      forcePasswordFeedback(error.message);
      return;
    }

    const userId = data?.user?.id;

    if (!userId) {
      forcePasswordFeedback("Unable to find user");
      return;
    }

    /* the flag must clear or the guards will send them straight back */
    const { error: profileError } = await supabaseForcePassword
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", userId);

    if (profileError) {
      forcePasswordFeedback(profileError.message);
      return;
    }

    forcePasswordFeedback("Password changed successfully", "success");

    setTimeout(async () => {
      const problem = await redirectUser();
      if (problem) forcePasswordFeedback(problem);
    }, 1200);
  } catch (err) {
    console.error("Force password change error:", err);
    forcePasswordFeedback("Failed to change password");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Save Password";
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document
    .getElementById("force-password-form")
    ?.addEventListener("submit", handleForcePasswordChange);

  document
    .getElementById("force-password-signout")
    ?.addEventListener("click", async () => {
      await supabaseForcePassword.auth.signOut();
      window.location.replace(window.appUrl("index.html"));
    });

  await initForcePasswordPage();
});
