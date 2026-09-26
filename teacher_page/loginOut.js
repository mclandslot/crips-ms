/* page access is checked by script/protectTeacherPage.js */

const supabaseTeachers = window.supabaseClient;
const logFeedBack = document.getElementById("form-feedback");

async function logout() {
  const singOutBnt = document.getElementById('btn-yes-logout');
  if (singOutBnt) singOutBnt.innerHTML = 'signing out..';

  try {
    await supabaseTeachers?.auth.signOut();
  } catch (err) {
    console.error("Logout error:", err);
  }

  window.location.replace(window.appUrl("index.html")); // prevents back-button access
}


async function loadTeacherInfo() {

  const { data } = await supabaseClient.auth.getUser();

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .single();

  document.getElementById("teacher-name").textContent = profile.full_name;
}
