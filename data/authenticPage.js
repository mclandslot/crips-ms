const supabaseClient = window.supabaseClient;

/* =========================
   LOGIN FORM HANDLING
========================= */

const form = document.getElementById("login-form");

if (form) {
  form.addEventListener("submit", handleLogin);
}

function showLoginMessage(message, type = "error") {
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

function setLoginButton(busy) {
  const btn = document.getElementById("login-submit-btn");
  if (!btn) return;

  if (!btn.dataset.label) btn.dataset.label = btn.innerHTML;
  btn.disabled = busy;
  btn.innerHTML = busy ? "Signing in.." : btn.dataset.label;
}

/* a wrong password and a dropped connection need different advice */
function loginErrorMessage(error) {
  const text = String(error?.message || "").toLowerCase();

  if (!navigator.onLine || text.includes("fetch") || text.includes("network")) {
    return "Unable to connect. Check your internet connection";
  }
  if (text.includes("email not confirmed")) {
    return "Email not confirmed. Contact the administrator";
  }
  return "Invalid login credentials";
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("user_name")?.value.trim();
  const password = document.getElementById("user_password")?.value.trim();

  if (!email || !password) {
    showLoginMessage("Enter email and password");
    return;
  }

  if (!supabaseClient) {
    showLoginMessage("Unable to connect. Check your internet connection");
    return;
  }

  setLoginButton(true);

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data?.user) {
      showLoginMessage(loginErrorMessage(error));
      setLoginButton(false);
      return;
    }

    localStorage.setItem("teacherId", data.user.id);

    const problem = await redirectUser();

    if (problem) {
      showLoginMessage(problem);
      setLoginButton(false);
      return;
    }

    showLoginMessage("Login successfully!", "success");
  } catch (err) {
    console.error("Login error:", err);
    showLoginMessage(loginErrorMessage(err));
    setLoginButton(false);
  }
}


/* =========================
   ROLE REDIRECT
   Sends a signed-in user to their portal. Returns a message when they
   cannot go anywhere (the account is then signed out), or "" once the
   browser is on its way.
========================= */

async function redirectUser() {
  try {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) return "Your session has expired. Sign in again";

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role, is_active, must_change_password")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError.message);
      return "Unable to load your account. Try again";
    }

    if (!profile) {
      await supabaseClient.auth.signOut();
      return "No account profile found. Contact the administrator";
    }

    if (!profile.is_active) {
      await supabaseClient.auth.signOut();
      return "Your account has been blocked. Contact the administrator";
    }

    /* an admin-set password is known to the admin, so it must be replaced
       before the account can be used */
    if (profile.must_change_password) {
      window.location.replace(window.appUrl("change-password.html"));
      return "";
    }

    const portal = window.portalForRole(profile.role);

    if (!portal) {
      await supabaseClient.auth.signOut();
      return "Your account has no access role. Contact the administrator";
    }

    window.location.replace(window.appUrl(`${portal}/index.html`));
    return "";
  } catch (err) {
    console.error("Redirect error:", err);
    return "Unable to connect. Check your internet connection";
  }
}


/* =========================
   PAGE PROTECTION
   allowedPortal is the portal folder the page belongs to; the role check
   uses the same mapping as the login redirect.
========================= */

async function protectPage(allowedPortal) {
  const toLogin = () => window.location.replace(window.appUrl("index.html"));

  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) {
      toLogin();
      return;
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role, is_active, must_change_password")
      .eq("id", data.user.id)
      .maybeSingle();

    /* a failed lookup is not proof the user is unauthorised - keep the
       session and let the login page retry rather than signing them out */
    if (profileError) {
      console.error("Profile lookup error:", profileError.message);
      toLogin();
      return;
    }

    if (
      !profile ||
      !profile.is_active ||
      window.portalForRole(profile.role) !== allowedPortal
    ) {
      await supabaseClient.auth.signOut();
      toLogin();
      return;
    }

    /* the session is valid, but an admin knows this password - no portal
       until it has been replaced */
    if (profile.must_change_password) {
      window.location.replace(window.appUrl("change-password.html"));
    }
  } catch (err) {
    console.error("Protection error:", err);
    toLogin();
  }
}


/* =========================
   LOGOUT
========================= */

async function logout() {
  const signOutBtn = document.getElementById("btn-yes-logout");
  if (signOutBtn) signOutBtn.innerHTML = "signing out..";

  try {
    await supabaseClient?.auth.signOut();
  } catch (err) {
    console.error("Logout error:", err);
  }

  window.location.replace(window.appUrl("index.html")); // prevents back-button access
}




/* =========================
   AUTO REDIRECT (LOGIN PAGE ONLY)
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  const isLoginPage = document.getElementById("login-form");

  if (!isLoginPage || !supabaseClient) return; // Only run on login page

  try {
    /* getSession reads local storage only, so a signed-out visitor costs
       no network request and sees no error */
    const { data } = await supabaseClient.auth.getSession();

    if (!data?.session) return;

    const problem = await redirectUser();
    if (problem) showLoginMessage(problem);
  } catch (err) {
    console.error("Auto-redirect error:", err);
  }
});
