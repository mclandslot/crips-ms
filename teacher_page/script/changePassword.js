const supabaseChangePassword = window.supabaseClient;

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  setupChangePasswordUI();
});

const showResetPassFeedback =  document.getElementById("form-feedback");

/* =====================================
   SETUP UI
===================================== */
function setupChangePasswordUI() {
  const overlay = document.getElementById("password-overlay");
  const closeBtn = document.getElementById("close-password-overlay");
  const form = document.getElementById("change-password-form");

  closeBtn?.addEventListener("click", closePasswordOverlay);

  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closePasswordOverlay();
    }
  });

  form?.addEventListener("submit", handleChangePassword);
}

/* =====================================
   OPEN / CLOSE
===================================== */
function openPasswordOverlay() {
  const overlay = document.getElementById("password-overlay");
  const form = document.getElementById("change-password-form");
  const message = document.getElementById("change-password-message");

  if (form) form.reset();

  if (message) {
    message.textContent = "";
    message.className = "change-password-message";
  }

  overlay?.classList.add("active");
}

function closePasswordOverlay() {
  const overlay = document.getElementById("password-overlay");
  const form = document.getElementById("change-password-form");
  const message = document.getElementById("change-password-message");

  overlay?.classList.remove("active");

  if (form) form.reset();

  if (message) {
    message.textContent = "";
    message.className = "change-password-message";
  }
}

/* =====================================
   MESSAGE
===================================== */
function showPasswordMessage(text, type = "error") {
  const message = document.getElementById("change-password-message");
  if (!message) return;

  message.textContent = text;
  message.className = `change-password-message ${type}`;
}

/* =====================================
   CHANGE PASSWORD FOR LOGGED-IN USER
===================================== */
async function handleChangePassword(e) {
  e.preventDefault();

  const currentPassword =
    document.getElementById("current-password")?.value || "";
  const newPassword =
    document.getElementById("new-password")?.value || "";
  const confirmPassword =
    document.getElementById("confirm-password")?.value || "";
  const submitBtn = document.getElementById("btn-change-password");

  if (!currentPassword || !newPassword || !confirmPassword) {
    // showPasswordMessage("Please fill in all fields.");
    showResetPassFeedback.classList.add("show-message", "error");
    showResetPassFeedback.innerHTML = "Fill all fields.";
    setTimeout(()=>{
       showResetPassFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (newPassword.length < 6) {
    // showPasswordMessage("New password must be at least 6 characters.");
      showResetPassFeedback.classList.add("show-message", "error");
    showResetPassFeedback.innerHTML = "Password must be at least 6 leters.";
    setTimeout(()=>{
       showResetPassFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (newPassword !== confirmPassword) {
    // showPasswordMessage("New password and confirm password do not match.");
      showResetPassFeedback.classList.add("show-message", "error");
    showResetPassFeedback.innerHTML = "Password do not match.";
    setTimeout(()=>{
       showResetPassFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (currentPassword === newPassword) {
    // showPasswordMessage("New password must be different from current password.");
      showResetPassFeedback.classList.add("show-message", "error");
    showResetPassFeedback.innerHTML = "Password used before.";
    setTimeout(()=>{
       showResetPassFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Changing...";
    }

    showPasswordMessage("", "error");

    /* 1. Get current signed-in user */
    const {
      data: { user },
      error: userError
    } = await supabaseChangePassword.auth.getUser();

    if (userError || !user) {
      throw new Error("You are not logged in.");
    }

    if (!user.email) {
      throw new Error("User email not found.");
    }

    /* 2. Verify current password by signing in again */
    const { error: verifyError } =
      await supabaseChangePassword.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

    if (verifyError) {
      throw new Error("Current password is incorrect.");
    }

    /* 3. Update the logged-in user's password */
    const { error: updateError } =
      await supabaseChangePassword.auth.updateUser({
        password: newPassword
      });

    if (updateError) {
      throw new Error(updateError.message);
    }

    // showPasswordMessage("✅ Password changed successfully.", "success");
      showResetPassFeedback.classList.add("show-message", "success");
    showResetPassFeedback.innerHTML = "Changed successfully.";
    setTimeout(()=>{
       showResetPassFeedback.classList.remove("show-message", "error");
    }, 3000);

    setTimeout(() => {
      closePasswordOverlay();
    }, 4000);
  } catch (error) {
    console.error("Change password error:", error.message);
    showPasswordMessage(error.message || "Failed to change password.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Change password";
    }
  }
}

/* =====================================
   TOGGLE PASSWORD VISIBILITY
===================================== */
// document.addEventListener("click", function (e) {
//   const toggle = e.target.closest(".toggle-password");
//   if (!toggle) return;

//   const inputId = toggle.getAttribute("data-target");
//   const input = document.getElementById(inputId);
//   const icon = toggle.querySelector("i");

//   if (!input) return;

//   if (input.type === "password") {
//     input.type = "text";
//     icon.classList.remove("fa-eye");
//     icon.classList.add("fa-eye-slash");
//   } else {
//     input.type = "password";
//     icon.classList.remove("fa-eye-slash");
//     icon.classList.add("fa-eye");
//   }
// });