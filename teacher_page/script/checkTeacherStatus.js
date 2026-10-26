const supabaseTeachersStatusClassTeacher = window.supabaseClient;

async function checkTeacherAccess() {

  // Get logged-in user
  const { data: { user }, error: userError } = await supabaseTeachersStatusClassTeacher.auth.getUser();

  if (userError || !user) {
    console.error("User not logged in");
    return;
  }

  const teacherId = user.id; // must match teachers.id

  console.log("Logged in teacher:", teacherId);

  // Check if teacher has an assigned class
  const { data, error } = await supabaseTeachersStatusClassTeacher
    .from("class_teachers")
    .select("class_id")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    console.error("Error checking assignment:", error);
    return;
  }

  const attendanceCard = document.getElementById('attendance-link-card');
  const reportCard = document.getElementById("manage-student-assigned-class-report");

  if (data) {
    // ✅ Teacher has class → show UI
    if (attendanceCard) attendanceCard.style.display = 'block';
    if (reportCard) reportCard.style.display = 'block';

    console.log("Access granted");

  } else {
    // ❌ No class assigned → keep hidden
    console.log("No class assigned");
  }

}

document.addEventListener("DOMContentLoaded", () => {
  checkTeacherAccess();
});