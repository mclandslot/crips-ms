if (!window.supabaseClient) {
  console.error("Supabase client not initialized");
}

const supabaseTeacherDashboard = window.supabaseClient;

/* =====================================
   HELPERS
===================================== */
function escapeDashboardHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* the dashboard tab and the class & subjects tab show the same cards */
function dashboardContainers(kind) {
  const ids =
    kind === "classes"
      ? ["dashboard-assigned-classes", "class-subjects-assigned-classes"]
      : ["dashboard-assigned-subjects", "class-subjects-assigned-subjects"];

  return ids
    .map((id) => document.getElementById(id))
    .filter(Boolean);
}

function renderCards(kind, cards) {
  const html = cards.length
    ? cards.join("")
    : `<div class="assign-card">
         <h4>No ${kind === "classes" ? "class" : "subject"} assigned</h4>
         <p class="bold-p-assign">
           <i class="fa-solid fa-circle-info"></i>
           Contact the administrator
         </p>
       </div>`;

  dashboardContainers(kind).forEach((container) => {
    container.innerHTML = html;
  });
}

function setStat(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

/* =====================================
   LOAD DASHBOARD
===================================== */
async function loadTeacherDashboard() {
  try {
    /* GET LOGGED IN USER */
    const { data: sessionData } =
      await supabaseTeacherDashboard.auth.getSession();

    /* the page guard handles the redirect to the login page */
    if (!sessionData?.session) return;

    const teacherId = sessionData.session.user.id;

    /* GET ASSIGNED SUBJECTS + CLASSES */
    const { data: assignments, error: assignError } =
      await supabaseTeacherDashboard
        .from("teacher_subject_assignments")
        .select("class_id, subject, classes (class_name)")
        .eq("teacher_id", teacherId);

    if (assignError) {
      console.error(assignError);
      return;
    }

    if (!assignments || assignments.length === 0) {
      setStat("total-assigned-class", 0);
      setStat("total-assigned-subjects", 0);
      setStat("total-assigned-students", 0);
      renderCards("classes", []);
      renderCards("subjects", []);
      return;
    }

    /* UNIQUE CLASSES (id -> name) */
    const classNames = new Map();

    assignments.forEach((a) => {
      if (a.class_id && !classNames.has(a.class_id)) {
        classNames.set(a.class_id, a.classes?.class_name || "Unnamed class");
      }
    });

    const classIds = [...classNames.keys()];

    /* UNIQUE SUBJECTS (subject -> the classes it is taught in) */
    const subjectClasses = new Map();

    assignments.forEach((a) => {
      if (!a.subject) return;

      if (!subjectClasses.has(a.subject)) {
        subjectClasses.set(a.subject, new Set());
      }

      if (a.class_id) subjectClasses.get(a.subject).add(a.class_id);
    });

    const subjects = [...subjectClasses.keys()].sort();

    setStat("total-assigned-class", classIds.length);
    setStat("total-assigned-subjects", subjects.length);

    /* GET STUDENTS IN THOSE CLASSES */
    const { data: students, error: studentError } =
      await supabaseTeacherDashboard
        .from("students")
        .select("id, class_id")
        .in("class_id", classIds);

    if (studentError) {
      console.error("Student error:", studentError);
      return;
    }

    const studentList = students || [];

    /* STUDENTS PER CLASS */
    const studentsPerClass = new Map();

    studentList.forEach((s) => {
      studentsPerClass.set(
        s.class_id,
        (studentsPerClass.get(s.class_id) || 0) + 1
      );
    });

    /* TOTAL ASSIGNED STUDENTS */
    setStat("total-assigned-students", studentList.length);

    /* DISPLAY CLASS CARDS */
    const classCards = [...classNames.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([classId, className]) => {
        const count = studentsPerClass.get(classId) || 0;

        return `
          <div class="assign-card">
            <h4>${escapeDashboardHtml(className)}</h4>
            <p class="bold-p-assign">
              <i class="fa-solid fa-users"></i>
              ${count} Student${count === 1 ? "" : "s"}
            </p>
          </div>
        `;
      });

    renderCards("classes", classCards);

    /* DISPLAY SUBJECT CARDS - one card per assigned subject */
    const subjectCards = subjects.map((subject) => {
      const subjectClassIds = [...subjectClasses.get(subject)];

      /* students counted only in the classes this subject is taught in */
      const subjectStudents = subjectClassIds.reduce(
        (total, classId) => total + (studentsPerClass.get(classId) || 0),
        0
      );

      const taughtIn = subjectClassIds
        .map((classId) => classNames.get(classId) || "Unnamed class")
        .sort((a, b) => a.localeCompare(b))
        .join(", ");

      return `
        <div class="assign-card">
          <h4>${escapeDashboardHtml(subject)}</h4>
          <p class="bold-p-assign">
            <i class="fa-solid fa-layer-group"></i>
            ${escapeDashboardHtml(taughtIn)}
          </p>
          <p class="bold-p-assign">
            <i class="fa-solid fa-users"></i>
            ${subjectStudents} Student${subjectStudents === 1 ? "" : "s"}
          </p>
        </div>
      `;
    });

    renderCards("subjects", subjectCards);
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

/* LOAD DASHBOARD */
document.addEventListener("DOMContentLoaded", () => {
  loadTeacherDashboard();
});
