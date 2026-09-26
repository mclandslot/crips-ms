const supabaseHeadTeacherClassView = window.supabaseClient;

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadHeadTeacherClassCards();
});

/* =====================================
   LOAD CLASS CARDS
===================================== */
async function loadHeadTeacherClassCards() {
  const container = document.getElementById("actions-class-data");
  if (!container) return;

  container.innerHTML = `<p>Loading classes...</p>`;

  try {
    const { data: classes, error: classError } = await supabaseHeadTeacherClassView
      .from("classes")
      .select("id, class_name")
      .order("class_name", { ascending: true });

    if (classError) throw classError;

    const { data: students, error: studentError } = await supabaseHeadTeacherClassView
      .from("students")
      .select("id, class_id, gender");

    if (studentError) throw studentError;

    if (!classes || classes.length === 0) {
      container.innerHTML = `<p>No classes found.</p>`;
      return;
    }

    const cardsHTML = classes.map(cls => {
      const classStudents = (students || []).filter(
        student => student.class_id === cls.id
      );

      const totalStudents = classStudents.length;

      const maleCount = classStudents.filter(student => {
        const gender = String(student.gender || "").trim().toLowerCase();
        return gender === "male";
      }).length;

      const femaleCount = classStudents.filter(student => {
        const gender = String(student.gender || "").trim().toLowerCase();
        return gender === "female";
      }).length;

      return `
        <div class="headteacher-class-card">
          <h3>${escapeHtml(cls.class_name || "Unknown")}</h3>
          <p>Total Students: ${totalStudents}</p>
          <div class="class-gender-row">
            <span>Male: ${maleCount}</span>
            <span>Female: ${femaleCount}</span>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = cardsHTML;

  } catch (error) {
    console.error("Error loading class cards:", error.message);
    container.innerHTML = `<p>Failed to load classes data.</p>`;
  }
}

/* =====================================
   HELPERS
===================================== */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}