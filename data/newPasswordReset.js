const supabaseAdminPasswordReset = window.supabaseClient;

const newPassFeedback =  document.getElementById("form-feedback");

document.addEventListener("DOMContentLoaded", () => {
  setupResetPasswordModal();
});

function setupResetPasswordModal() {
  const openBtn = document.getElementById("open-reset-password-modal");
  const closeBtn = document.getElementById("close-reset-password-modal");
  const modal = document.getElementById("reset-password-modal");
  const submitBtn = document.getElementById("submit-reset-password-btn");

  console.log("openBtn:", openBtn);
  console.log("closeBtn:", closeBtn);
  console.log("modal:", modal);
  console.log("submitBtn:", submitBtn);

  openBtn?.addEventListener("click", openResetPasswordModal);
  closeBtn?.addEventListener("click", closeResetPasswordModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeResetPasswordModal();
    }
  });

  submitBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("Reset button clicked");
    await handleAdminPasswordReset();
  });
}

function openResetPasswordModal() {
  const modal = document.getElementById("reset-password-modal");
  if (modal) modal.style.display = "flex";
}

function closeResetPasswordModal() {
  const modal = document.getElementById("reset-password-modal");
  if (modal) modal.style.display = "none";
}
async function handleAdminPasswordReset() {
    const emailInput = document.getElementById("reset-staff-email");
    const newPasswordInput = document.getElementById("reset-staff-new-password");
    const confirmPasswordInput = document.getElementById("reset-staff-confirm-password");
  
    const email = emailInput?.value?.trim().toLowerCase() || "";
    const newPassword = newPasswordInput?.value?.trim() || "";
    const confirmPassword = confirmPasswordInput?.value?.trim() || "";
  
    if (!email) {
      // alert("Enter staff email.");
      newPassFeedback.classList.add("show-message", "error");
      newPassFeedback.innerHTML = "Enter staff email";
      setTimeout(()=>{
         newPassFeedback.classList.remove("show-message", "error");
      }, 3000);
      return;
    }
  
    if (!newPassword) {
      // alert("Enter new password.");
       newPassFeedback.classList.add("show-message", "error");
      newPassFeedback.innerHTML = "Enter new password";
      setTimeout(()=>{
         newPassFeedback.classList.remove("show-message", "error");
      }, 3000);
      return;
    }
  
    if (newPassword.length < 6) {
      // alert("Password must be at least 6 characters.");
       newPassFeedback.classList.add("show-message", "error");
      newPassFeedback.innerHTML = "Password must be at least 6 characters";
      setTimeout(()=>{
         newPassFeedback.classList.remove("show-message", "error");
      }, 3000);
      return;
    }
  
    if (newPassword !== confirmPassword) {
      // alert("Passwords do not match.");
       newPassFeedback.classList.add("show-message", "error");
      newPassFeedback.innerHTML = "Password do not match";
      setTimeout(()=>{
         newPassFeedback.classList.remove("show-message", "error");
      }, 3000);
      return;
    }
  
    try {
      const { data, error } =
        await window.supabaseClient.functions.invoke(
          "reset-staff-password-by-email",
          {
            body: { email, newPassword }
          }
        );

        
  
      console.log("FUNCTION DATA:", data);
      console.log("FUNCTION ERROR:", error);
  
      if (error) {
        let details = error.message;
  
        try {
          if (error.context) {
            const body = await error.context.json();
            console.log("FUNCTION ERROR BODY:", body);
            details = body.error || body.message || details;
          }
        } catch (parseErr) {
          console.error("Could not parse function error body:", parseErr);
        }
  
        alert(details || "Failed to reset password.");
        return;
      }
  
      // alert("✅ Password reset successful.");
       newPassFeedback.classList.add("show-message", "success");
      newPassFeedback.innerHTML = "Password reset successful";
      setTimeout(()=>{
         newPassFeedback.classList.remove("show-message", "success");
      }, 3000);
    } catch (err) {
      console.error("RESET ERROR:", err);
      // alert(err.message || "Unexpected error");
       newPassFeedback.classList.add("show-message", "error");
      newPassFeedback.innerHTML = "Unexpected error";
      setTimeout(()=>{
         newPassFeedback.classList.remove("show-message", "error");
      }, 3000);
    }
  }


