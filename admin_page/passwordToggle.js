
document.addEventListener("DOMContentLoaded", () => {

  const passwordInput = document.getElementById("user_password");
  const toggleIcon = document.getElementById("toggle-password");

  if (!passwordInput || !toggleIcon) {
    console.error("Password or icon not found");
    return;
  }

  toggleIcon.addEventListener("click", () => {

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggleIcon.classList.remove("fa-eye");
      toggleIcon.classList.add("fa-eye-slash");
    } else {
      passwordInput.type = "password";
      toggleIcon.classList.remove("fa-eye-slash");
      toggleIcon.classList.add("fa-eye");
    }

  });

});