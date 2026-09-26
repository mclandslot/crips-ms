const supabaseAttendanceSet = window.supabaseClient;

/* =====================================
   SAVE TERM TOTAL DAYS (ADMIN)
===================================== */
document.addEventListener("DOMContentLoaded", () => {

  const saveBtn = document.getElementById("save-term-btn");

  if (saveBtn) {
    saveBtn.addEventListener("click", saveTermDays);
  }

});


async function saveTermDays() {

  const term = document.querySelector("#select-term-period select").value;
  const year = document.getElementById("academic-year").value.trim();
  const totalDays = document.getElementById("total-days-for-term").value.trim();

  if (!term || !year || !totalDays) {
    alert("Please fill all fields");
    return;
  }

  const { error } = await supabaseAttendanceSet
    .from("term_settings")
    .upsert(
      {
        term: term,
        academic_year: year,
        total_days: parseInt(totalDays)
      },
      { onConflict: "term,academic_year" }
    );

  if (error) {
    console.error("Save Error:", error.message);
    alert("Error saving term days");
    return;
  }

  alert("Term days saved successfully");

  closeAddTermDaysModal();
}


/* =====================================
   CHECK IF ATTENDANCE IS ALLOWED
===================================== */
async function canMarkAttendance(classId, term, year) {

  // 1. Get max allowed days
  const { data: termData, error: termError } = await supabaseAttendanceSet
    .from("term_settings")
    .select("total_days")
    .eq("term", term)
    .eq("academic_year", year)
    .single();

  if (termError || !termData) {
    alert("Admin has not set term days");
    return false;
  }

  // 2. Count existing attendance records
  const { count, error: countError } = await supabaseAttendanceSet
    .from("attendance")
    .select("*", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("term", term)
    .eq("academic_year", year);

  if (countError) {
    console.error("Count Error:", countError.message);
    return false;
  }

  // 3. Check limit
  if (count >= termData.total_days) {
    alert("Maximum attendance days reached for this term");

    // Optional: disable attendance button
    const btn = document.getElementById("mark-attendance-btn");
    if (btn) btn.disabled = true;

    return false;
  }

  return true;
}


/* =====================================
   EXAMPLE: SAVE ATTENDANCE (USE THIS)
===================================== */
async function saveAttendance(classId, term, year, attendanceData) {

  // 🔥 Check limit first
  const allowed = await canMarkAttendance(classId, term, year);

  if (!allowed) return;

  // ✅ Save attendance
  const { error } = await supabaseAttendanceSet
    .from("attendance")
    .insert(attendanceData);

  if (error) {
    console.error("Attendance Error:", error.message);
    alert("Error saving attendance");
    return;
  }

  alert("Attendance saved successfully");

  localStorage.setItem("currentTerm", term);
localStorage.setItem("academicYear", academicYear);
}


/* =====================================
   CLOSE MODAL
===================================== */
function closeAddTermDaysModal() {
  const modal = document.getElementById("add-attendance");
  if (modal) {
    modal.style.display = "none";
  }
}


/* =====================================
   OPTIONAL: CLICK OUTSIDE TO CLOSE
===================================== */
window.addEventListener("click", (e) => {
  const modal = document.getElementById("add-attendance");
  if (e.target === modal) {
    modal.style.display = "none";
  }
});