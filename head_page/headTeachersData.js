const supabaseHeadTeacher = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
let headTeacherUserId = null;
let headTeacherProfile = null;
let headCurrentAcademicYear = null;
let headCurrentTerm = null;

const messageAlert = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await initializeHeadTeacherDashboard();
});

async function initializeHeadTeacherDashboard() {
  await getLoggedInHeadTeacher();
  await loadCurrentAcademicYearAndTerm();
  await loadSummaryCards();
  await loadClassPerformance();
  await loadAttendanceOverview();
  await loadClassesForHeadTeacherFilters();
  await loadAcademicYearsForHeadTeacherFilters();
  await loadTermsForHeadTeacherFilters();
  await loadReportApprovalTable();
  await loadAlerts();
  await loadStudentGenderStats();
  bindHeadTeacherEvents();
}

/* =====================================
   EVENTS
===================================== */
function bindHeadTeacherEvents() {
  document
    .getElementById("head-report-year")
    ?.addEventListener("change", async () => {
      await loadTermsForOneFilter("head-report-year", "head-report-term");
    });

  document
    .getElementById("head-broadsheet-year")
    ?.addEventListener("change", async () => {
      await loadTermsForOneFilter("head-broadsheet-year", "head-broadsheet-term");
    });

  // document
  //   .getElementById("head-view-terminal-reports-btn")
  //   ?.addEventListener("click", loadHeadTeacherTerminalReports);

  // document
  //   .getElementById("head-print-terminal-reports-btn")
  //   ?.addEventListener("click", printHeadTeacherTerminalReports);

  // document
  //   .getElementById("head-load-broadsheet-btn")
  //   ?.addEventListener("click", loadHeadTeacherBroadsheet);

  // document
  //   .getElementById("head-print-broadsheet-btn")
  //   ?.addEventListener("click", printHeadTeacherBroadsheet);

  // document
  //   .getElementById("head-remark-class")
  //   ?.addEventListener("change", loadStudentsForRemarkClass);

  // document
  //   .getElementById("save-head-teacher-remark-btn")
  //   ?.addEventListener("click", saveHeadTeacherRemark);
}

/* =====================================
   AUTH / PROFILE
===================================== */
async function getLoggedInHeadTeacher() {
  const {
    data: { user },
    error
  } = await supabaseHeadTeacher.auth.getUser();

  if (error || !user) {
    console.error("No logged-in head teacher:", error);
    return;
  }

  headTeacherUserId = user.id;

  const { data: profileData, error: profileError } = await supabaseHeadTeacher
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", headTeacherUserId)
    .maybeSingle();

  if (profileError) {
    console.error("Error loading profile:", profileError.message);
  }

  headTeacherProfile = profileData || {
    id: user.id,
    full_name: user.user_metadata?.full_name || "Head Teacher",
    email: user.email || "-",
    role: "head_teacher"
  };

  const nameEl = document.getElementById("head-teacher-name");
  const emailEl = document.getElementById("head-teacher-email");
  const roleEl = document.getElementById("head-teacher-role");

  if (nameEl) nameEl.textContent = headTeacherProfile.full_name || "-";
  if (emailEl) emailEl.textContent = headTeacherProfile.email || user.email || "-";
  if (roleEl) roleEl.textContent = formatRole(headTeacherProfile.role || "head_teacher");
}

/* =====================================
   CURRENT YEAR / TERM
===================================== */
async function loadCurrentAcademicYearAndTerm() {
  const { data: activeYear, error: yearError } = await supabaseHeadTeacher
    .from("academic_years")
    .select("id, year_name, is_active")
    .eq("is_active", true)
    .maybeSingle();

  if (yearError) {
    console.error("Error loading active academic year:", yearError.message);
    return;
  }

  headCurrentAcademicYear = activeYear || null;

  const currentYearEl = document.getElementById("head-current-year");
  if (currentYearEl) {
    currentYearEl.textContent = headCurrentAcademicYear?.year_name || "-";
  }

  if (!headCurrentAcademicYear) return;

  const today = new Date().toISOString().split("T")[0];

  const { data: currentTerm, error: termError } = await supabaseHeadTeacher
    .from("terms")
    .select("id, name, academic_year_id, start_date, end_date, created_at")
    .eq("academic_year_id", headCurrentAcademicYear.id)
    .lte("start_date", today)
    .gte("end_date", today)
    .maybeSingle();

  if (termError) {
    console.error("Error loading current term:", termError.message);
  }

  if (currentTerm) {
    headCurrentTerm = currentTerm;
  } else {
    const { data: fallbackTerms, error: fallbackError } = await supabaseHeadTeacher
      .from("terms")
      .select("id, name, academic_year_id, start_date, end_date, created_at")
      .eq("academic_year_id", headCurrentAcademicYear.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fallbackError) {
      console.error("Error loading fallback term:", fallbackError.message);
    }

    headCurrentTerm = fallbackTerms?.[0] || null;
  }

  const currentTermEl = document.getElementById("head-current-term");
  if (currentTermEl) {
    currentTermEl.textContent = headCurrentTerm?.name || "-";
  }
}

/* =====================================
   SUMMARY CARDS
===================================== */
async function loadSummaryCards() {
  await Promise.all([
    loadTotalStudentsCard(),
    loadTotalTeachersCard(),
    loadTotalClassesCard(),
    loadAttendanceRateCard(),
    loadReportsReadyCard(),
    loadPendingApprovalCard(),
    loadTotalComStudentsCard(),
    loadTotalMaleStudentsCard(),
    loadTotalFemaleStudentsCard()
  ]);
}

async function loadTotalStudentsCard() {
  const el = document.getElementById("head-total-students");
  if (!el) return;

  const { count, error } = await supabaseHeadTeacher
    .from("students")
    .select("*", { count: "exact", head: true })
    .not("status", "ilike", "Complete");

  if (error) {
    console.error("Error loading total students:", error.message);
    el.textContent = "0";
    return;
  }

  el.textContent = count || 0;
}


async function loadTotalMaleStudentsCard() {
  const male = document.getElementById("male-total-students");
  if (!male) return;

  const { count, error } = await supabaseHeadTeacher
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("gender", "Male")
    .not("status", "ilike", "Complete");

  if (error) {
    console.error("Error loading total students:", error.message);
    male.textContent = "0";
    return;
  }

  male.textContent = count || 0;
}


async function loadTotalFemaleStudentsCard() {
  const female = document.getElementById("female-total-students");
  if (!female) return;

  const { count, error } = await supabaseHeadTeacher
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("gender", "Female")
    .not("status", "ilike", "Complete");

  if (error) {
    console.error("Error loading total students:", error.message);
    female.textContent = "0";
    return;
  }

  female.textContent = count || 0;
}


async function loadTotalComStudentsCard() {
  const ele = document.getElementById("completed-total-students");
  if (!ele) return;

  const { count, error } = await supabaseHeadTeacher
    .from("students")
    .select("*", { count: "exact", head: true })
    .ilike("status", "Complete");

  if (error) {
    console.error("Error loading total students:", error.message);
    ele.textContent = "0";
    return;
  }

  ele.textContent = count || 0;
}


async function loadTotalTeachersCard() {
  const el = document.getElementById("head-total-teachers");
  if (!el) return;

  /* the roles are read back and counted here rather than counted in the
     database, so this card matches the teachers table: administrator
     accounts are not staff and are left out of both */
  const { data, error } = await supabaseHeadTeacher
    .from("teachers")
    .select("role");

  if (error) {
    console.error("Error loading total teachers:", error.message);
    el.textContent = "0";
    return;
  }

  const teachers = (data || []).filter(
    (teacher) => !window.isAdminRole(teacher.role)
  );

  el.textContent = teachers.length;
}

async function loadTotalClassesCard() {
  const el = document.getElementById("head-total-classes");
  if (!el) return;

  const { data, error } = await supabaseHeadTeacher
    .from("classes")
    .select("id, class_name");

  if (error) {
    console.error("Error loading total classes:", error.message);
    el.textContent = "0";
    return;
  }

  el.textContent = excludeCompletedClasses(data).length;
}

async function loadAttendanceRateCard() {
  const el = document.getElementById("head-attendance-rate");
  if (!el) return;

  if (!headCurrentAcademicYear || !headCurrentTerm) {
    el.textContent = "0%";
    return;
  }

  const { data, error } = await supabaseHeadTeacher
    .from("attendance")
    .select("status")
    .eq("term_id", headCurrentTerm.id)
    .eq("academic_year_id", headCurrentAcademicYear.id);

  if (error) {
    console.error("Error loading attendance rate:", error.message);
    el.textContent = "0%";
    return;
  }

  const rows = data || [];
  if (!rows.length) {
    el.textContent = "0%";
    return;
  }

  const present = rows.filter((r) => normalizeText(r.status) === "present").length;
  const rate = ((present / rows.length) * 100).toFixed(1);

  el.textContent = `${rate}%`;
}

async function loadReportsReadyCard() {
  const el = document.getElementById("head-reports-ready");
  if (!el) return;

  if (!headCurrentTerm || !headCurrentAcademicYear) {
    el.textContent = "0";
    return;
  }

  const { data, error } = await supabaseHeadTeacher
    .from("student_marks")
    .select("class_id")
    .eq("term_id", headCurrentTerm.id);

  if (error) {
    console.error("Error loading reports ready:", error.message);
    el.textContent = "0";
    return;
  }

  const uniqueClasses = [...new Set((data || []).map((item) => item.class_id).filter(Boolean))];
  el.textContent = uniqueClasses.length;
}

async function loadPendingApprovalCard() {
  const el = document.getElementById("head-pending-approval");
  if (!el) return;

  if (!headCurrentTerm || !headCurrentAcademicYear) {
    el.textContent = "0";
    return;
  }

  const { data: classes, error: classError } = await supabaseHeadTeacher
    .from("classes")
    .select("id, class_name");

  const { data: marks, error: marksError } = await supabaseHeadTeacher
    .from("student_marks")
    .select("class_id")
    .eq("term_id", headCurrentTerm.id);

  if (classError || marksError) {
    console.error("Error loading pending approval:", classError?.message || marksError?.message);
    el.textContent = "0";
    return;
  }

  const allClasses = excludeCompletedClasses(classes).map((c) => c.id);
  const realClassIds = new Set(allClasses);

  const readyClasses = [
    ...new Set(
      (marks || []).map((m) => m.class_id).filter((id) => realClassIds.has(id))
    )
  ];

  el.textContent = Math.max(allClasses.length - readyClasses.length, 0);
}

/* =====================================
   CLASS PERFORMANCE
===================================== */
async function loadClassPerformance() {
  const tbody = document.getElementById("head-class-performance-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6">Loading class performance...</td></tr>`;

  const caption = document.getElementById("head-class-performance-caption");
  if (caption && headCurrentTerm) {
    caption.textContent =
      `Pupils assessment at the end of ${headCurrentTerm.name || "the term"}, ` +
      `${headCurrentAcademicYear?.year_name || ""} academic year — performance in percentage (%)`;
  }

  const { data: classes, error: classError } = await supabaseHeadTeacher
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (classError) {
    console.error("Error loading classes:", classError.message);
    tbody.innerHTML = `<tr><td colspan="6">Failed to load class performance.</td></tr>`;
    return;
  }

  const visibleClasses = excludeCompletedClasses(classes);

  if (!visibleClasses.length) {
    tbody.innerHTML = `<tr><td colspan="6">No class performance loaded.</td></tr>`;
    return;
  }

  let marksRows = [];

  if (headCurrentTerm) {
    const { data: marksData, error: marksError } = await supabaseHeadTeacher
      .from("student_marks")
      .select("class_id, student_id, marks, class_score, exam_score")
      .eq("term_id", headCurrentTerm.id)
      .in("class_id", visibleClasses.map((cls) => cls.id));

    if (marksError) {
      console.error("Error loading marks for class performance:", marksError.message);
    }

    marksRows = marksData || [];
  }

  /* each pupil is banded by their average across the subjects they were
     marked in; a class's figures are the share of its marked pupils per band */
  const pupilTotals = new Map();

  marksRows.forEach((m) => {
    const hasTotal = m.marks !== null && m.marks !== undefined && m.marks !== "";
    const score = hasTotal
      ? Number(m.marks)
      : Number(m.class_score || 0) + Number(m.exam_score || 0);
    if (Number.isNaN(score)) return;

    const key = `${m.class_id}__${m.student_id}`;
    const entry = pupilTotals.get(key) || { classId: m.class_id, sum: 0, count: 0 };
    entry.sum += score;
    entry.count += 1;
    pupilTotals.set(key, entry);
  });

  const bandCounts = new Map();

  pupilTotals.forEach(({ classId, sum, count }) => {
    const average = sum / count;
    const counts = bandCounts.get(classId) || [0, 0, 0, 0, 0];
    const band =
      average >= 80 ? 0 :
      average >= 70 ? 1 :
      average >= 60 ? 2 :
      average >= 50 ? 3 : 4;
    counts[band] += 1;
    bandCounts.set(classId, counts);
  });

  const formatPercent = (part, whole) =>
    `${Number(((part / whole) * 100).toFixed(2))}%`;

  tbody.innerHTML = visibleClasses
    .map((cls) => {
      const counts = bandCounts.get(cls.id);
      const pupils = counts ? counts.reduce((a, b) => a + b, 0) : 0;

      const cells = pupils
        ? counts.map((n) => `<td>${formatPercent(n, pupils)}</td>`).join("")
        : `<td>-</td>`.repeat(5);

      return `
        <tr>
          <td><strong>${escapeHtml(cls.class_name)}</strong></td>
          ${cells}
        </tr>
      `;
    })
    .join("");
}

/* =====================================
   ATTENDANCE OVERVIEW
===================================== */
async function loadAttendanceOverview() {
  const tbody = document.getElementById("head-attendance-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7">Loading attendance...</td></tr>`;

  const { data: classes, error: classError } = await supabaseHeadTeacher
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (classError) {
    console.error("Error loading classes for attendance overview:", classError.message);
    tbody.innerHTML = `<tr><td colspan="7">Failed to load attendance data.</td></tr>`;
    return;
  }

  const rows = [];

  for (const cls of excludeCompletedClasses(classes)) {
    const { count: totalStudents } = await supabaseHeadTeacher
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("class_id", cls.id)
      .not("status", "ilike", "Complete");

    let attendance = [];

    if (headCurrentTerm && headCurrentAcademicYear) {
      const { data: attendanceData } = await supabaseHeadTeacher
        .from("attendance")
        .select("status")
        .eq("class_id", cls.id)
        .eq("term_id", headCurrentTerm.id)
        .eq("academic_year_id", headCurrentAcademicYear.id);

      attendance = attendanceData || [];
    }

    const present = attendance.filter((a) => normalizeText(a.status) === "present").length;
    const absent = attendance.filter((a) => normalizeText(a.status) === "absent").length;
    const total = present + absent;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";

    rows.push({
      id: cls.id,
      class_name: cls.class_name,
      total_students: totalStudents || 0,
      present,
      absent,
      percentage
    });
  }

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7">No attendance data loaded.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((row, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.class_name)}</td>
          <td>${row.total_students}</td>
          <td>${row.present}</td>
          <td>${row.absent}</td>
          <td>${row.percentage}%</td>
          <td>
            <button type="button" onclick="quickViewAttendanceClass('${row.id}', '${escapeHtml(row.class_name)}')">View</button>
          </td>
        </tr>
      `;
    })
    .join("");
}


async function quickViewAttendanceClass(classId, className) {
  const modal = document.getElementById("records-attendance");
  const tbody = document.getElementById("attendance-records-tbody");

  if (!modal || !tbody) return;

  modal.style.display = "block";
  tbody.innerHTML = `<tr><td colspan="5">Loading records...</td></tr>`;

  const classInfo = modal.querySelector(".class-choosen");
  if (classInfo) {
    classInfo.innerHTML = `
      <p>Class: ${escapeHtml(className || "-")}</p>
      <p>Term: ${escapeHtml(headCurrentTerm?.name || "-")}</p>
    `;
  }

  try {
    const { data: students, error: studentsError } = await supabaseHeadTeacher
      .from("students")
      .select("id, surname, first_name, gender")
      .eq("class_id", classId)
      .not("status", "ilike", "Complete")
      .order("surname", { ascending: true })
      .order("first_name", { ascending: true });

    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No students found.</td></tr>`;
      return;
    }

    const { data: attendanceData, error: attendanceError } = await supabaseHeadTeacher
      .from("attendance")
      .select("student_id, status")
      .eq("class_id", classId)
      .eq("term_id", headCurrentTerm.id)
      .eq("academic_year_id", headCurrentAcademicYear.id);

    if (attendanceError) throw attendanceError;

    const attendanceMap = new Map();

    (attendanceData || []).forEach((record) => {
      const key = record.student_id;

      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, {
          present: 0,
          absent: 0
        });
      }

      const item = attendanceMap.get(key);
      const status = normalizeText(record.status);

      if (status === "present") item.present += 1;
      if (status === "absent") item.absent += 1;
    });

    tbody.innerHTML = sortStudentsByName(students)
      .map((student, index) => {
        const fullName = studentFullName(student) || "-";

        const record = attendanceMap.get(student.id) || {
          present: 0,
          absent: 0
        };

        const totalDays = record.present + record.absent;

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(fullName)}</td>
            <td>${record.present}</td>
            <td>${record.absent}</td>
            <td>${totalDays}</td>
          </tr>
        `;
      })
      .join("");

  } catch (error) {
    console.error("Attendance preview error:", error.message);
    tbody.innerHTML = `<tr><td colspan="5">Failed to load attendance records.</td></tr>`;
  }
}



/* =====================================
   FILTER LOADERS
===================================== */
async function loadClassesForHeadTeacherFilters() {
  const ids = [
    "head-report-class",
    "head-broadsheet-class",
    "head-remark-class"
  ];

  const { data, error } = await supabaseHeadTeacher
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes for filters:", error.message);
    return;
  }

  ids.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = `<option value="">Select Class</option>`;

    excludeCompletedClasses(data).forEach((cls) => {
      const option = document.createElement("option");
      option.value = cls.id;
      option.textContent = cls.class_name;
      select.appendChild(option);
    });
  });
}

async function loadAcademicYearsForHeadTeacherFilters() {
  const ids = [
    "head-report-year",
    "head-broadsheet-year"
  ];

  const { data, error } = await supabaseHeadTeacher
    .from("academic_years")
    .select("id, year_name, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading academic years for filters:", error.message);
    return;
  }

  ids.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = `<option value="">Select Academic Year</option>`;

    (data || []).forEach((year) => {
      const option = document.createElement("option");
      option.value = year.id;
      option.textContent = year.year_name;
      if (year.is_active) option.selected = true;
      select.appendChild(option);
    });
  });
}

async function loadTermsForHeadTeacherFilters() {
  await loadTermsForOneFilter("head-report-year", "head-report-term");
  await loadTermsForOneFilter("head-broadsheet-year", "head-broadsheet-term");
}

async function loadTermsForOneFilter(yearSelectId, termSelectId) {
  const yearSelect = document.getElementById(yearSelectId);
  const termSelect = document.getElementById(termSelectId);

  if (!yearSelect || !termSelect) return;

  const academicYearId = yearSelect.value;
  termSelect.innerHTML = `<option value="">Select Term</option>`;

  if (!academicYearId) return;

  const { data, error } = await supabaseHeadTeacher
    .from("terms")
    .select("id, name, academic_year_id")
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading terms:", error.message);
    return;
  }

  (data || []).forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name;
    termSelect.appendChild(option);
  });
}

/* =====================================
   TERMINAL REPORTS
===================================== */
// async function loadHeadTeacherTerminalReports() {
//   const classId = document.getElementById("head-report-class")?.value || "";
//   const yearId = document.getElementById("head-report-year")?.value || "";
//   const termId = document.getElementById("head-report-term")?.value || "";
//   const container = document.getElementById("head-terminal-report-container");

//   if (!container) return;

//   if (!classId || !yearId || !termId) {
//     alert("Select class, academic year, and term.");
//     return;
//   }

//   container.innerHTML = `<p>Loading reports...</p>`;

//   const { data: classData } = await supabaseHeadTeacher
//     .from("classes")
//     .select("id, class_name")
//     .eq("id", classId)
//     .maybeSingle();

//   const { data: yearData } = await supabaseHeadTeacher
//     .from("academic_years")
//     .select("id, year_name")
//     .eq("id", yearId)
//     .maybeSingle();

//   const { data: termData } = await supabaseHeadTeacher
//     .from("terms")
//     .select("id, name")
//     .eq("id", termId)
//     .maybeSingle();

//   const { data: students, error: studentsError } = await supabaseHeadTeacher
//     .from("students")
//     .select("id, surname, first_name, class_id, status")
//     .eq("class_id", classId)
//     .neq("status", "completed")
//     .order("surname", { ascending: true });

//   if (studentsError) {
//     console.error("Error loading report students:", studentsError.message);
//     container.innerHTML = `<p>Failed to load reports.</p>`;
//     return;
//   }

//   if (!students || !students.length) {
//     container.innerHTML = `<p>No students found.</p>`;
//     return;
//   }

//   const { data: marksData } = await supabaseHeadTeacher
//     .from("student_marks")
//     .select("student_id, subject, marks, class_score, exam_score, grade, remark")
//     .eq("class_id", classId)
//     .eq("term_id", termId);

//   const marksByStudent = new Map();

//   (marksData || []).forEach((mark) => {
//     if (!marksByStudent.has(mark.student_id)) {
//       marksByStudent.set(mark.student_id, []);
//     }
//     marksByStudent.get(mark.student_id).push(mark);
//   });

//   container.innerHTML = students
//     .map((student) => {
//       const fullName = `${student.surname || ""} ${student.first_name || ""}`.trim();
//       const rows = marksByStudent.get(student.id) || [];

//       const total = rows.reduce((sum, row) => sum + Number(row.marks || 0), 0);
//       const average = rows.length ? (total / rows.length).toFixed(2) : "0.00";

//       const subjectsHtml = rows.length
//         ? rows.map((row) => `
//             <tr>
//               <td>${escapeHtml(row.subject || "-")}</td>
//               <td>${row.class_score ?? 0}</td>
//               <td>${row.exam_score ?? 0}</td>
//               <td>${row.marks ?? 0}</td>
//               <td>${escapeHtml(row.grade || "-")}</td>
//               <td>${escapeHtml(row.remark || "-")}</td>
//             </tr>
//           `).join("")
//         : `<tr><td colspan="6">No marks found</td></tr>`;

//       return `
//         <div class="head-report-card" style="border:1px solid #ddd; padding:16px; margin-bottom:20px;">
//           <h3>${escapeHtml(fullName)}</h3>
//           <p><strong>Class:</strong> ${escapeHtml(classData?.class_name || "-")}</p>
//           <p><strong>Academic Year:</strong> ${escapeHtml(yearData?.year_name || "-")}</p>
//           <p><strong>Term:</strong> ${escapeHtml(termData?.name || "-")}</p>
//           <p><strong>Total:</strong> ${total} &nbsp; <strong>Average:</strong> ${average}</p>
//           <table style="width:100%; border-collapse:collapse;" border="1" cellpadding="6">
//             <thead>
//               <tr>
//                 <th>Subject</th>
//                 <th>Class Score</th>
//                 <th>Exam Score</th>
//                 <th>Total</th>
//                 <th>Grade</th>
//                 <th>Remark</th>
//               </tr>
//             </thead>
//             <tbody>${subjectsHtml}</tbody>
//           </table>
//         </div>
//       `;
//     })
//     .join("");
// }

// function printHeadTeacherTerminalReports() {
//   const container = document.getElementById("head-terminal-report-container");

//   if (!container || !container.innerHTML.trim() || normalizeText(container.textContent) === "no reports loaded.") {
//     alert("No reports loaded to print.");
//     return;
//   }

//   const printWindow = window.open("", "_blank", "width=1000,height=800");
//   if (!printWindow) return;

//   printWindow.document.write(`
//     <html>
//       <head>
//         <title>Terminal Reports</title>
//         <style>
//           body { font-family: Arial, sans-serif; padding: 20px; }
//           table { width: 100%; border-collapse: collapse; margin-top: 10px; }
//           th, td { border: 1px solid #000; padding: 6px; font-size: 13px; }
//           .head-report-card { page-break-after: always; }
//         </style>
//       </head>
//       <body>${container.innerHTML}</body>
//     </html>
//   `);

//   printWindow.document.close();
//   printWindow.focus();
//   printWindow.print();
// }

/* opens the Terminal Reports view (driven by ../data/studentTerminal.js)
   on the chosen class for the current term */
async function quickLoadHeadTerminalReports(classId) {
  const classSelect = document.getElementById("class-to-select-terminal-reports");
  const yearSelect = document.getElementById("academic-year-to-select-terminal-reports");
  const termSelect = document.getElementById("term-to-select-terminal-reports");

  document.getElementById("terminal-reports-content")?.click();

  if (classSelect) classSelect.value = classId;

  if (yearSelect && headCurrentAcademicYear) {
    yearSelect.value = headCurrentAcademicYear.id;
    await loadTermsForSelectedAcademicYear();
  }

  if (termSelect && headCurrentTerm) termSelect.value = headCurrentTerm.id;

  await handleViewTerminalReports();
}

/* =====================================
   BROADSHEET
===================================== */
// async function loadHeadTeacherBroadsheet() {
//   const classId = document.getElementById("head-broadsheet-class")?.value || "";
//   const yearId = document.getElementById("head-broadsheet-year")?.value || "";
//   const termId = document.getElementById("head-broadsheet-term")?.value || "";
//   const container = document.getElementById("head-broadsheet-container");

//   if (!container) return;

//   if (!classId || !yearId || !termId) {
//     alert("Select class, academic year, and term.");
//     return;
//   }

//   container.innerHTML = `<p>Loading broadsheet...</p>`;

//   const { data: classData } = await supabaseHeadTeacher
//     .from("classes")
//     .select("id, class_name")
//     .eq("id", classId)
//     .maybeSingle();

//   const { data: students } = await supabaseHeadTeacher
//     .from("students")
//     .select("id, surname, first_name")
//     .eq("class_id", classId)
//     .neq("status", "completed")
//     .order("surname", { ascending: true });

//   const { data: marks } = await supabaseHeadTeacher
//     .from("student_marks")
//     .select("student_id, subject, marks")
//     .eq("class_id", classId)
//     .eq("term_id", termId);

//   const subjects = [...new Set((marks || []).map((m) => m.subject).filter(Boolean))].sort();

//   const rows = (students || []).map((student) => {
//     const studentMarks = (marks || []).filter((m) => m.student_id === student.id);
//     const total = studentMarks.reduce((sum, item) => sum + Number(item.marks || 0), 0);

//     return {
//       student,
//       studentMarks,
//       total
//     };
//   });

//   rows.sort((a, b) => b.total - a.total);

//   const headerSubjects = subjects.map((s) => `<th>${escapeHtml(s)}</th>`).join("");

//   const bodyRows = rows.map((row, index) => {
//     const name = `${row.student.surname || ""} ${row.student.first_name || ""}`.trim();

//     const scoreCells = subjects.map((subject) => {
//       const found = row.studentMarks.find((m) => m.subject === subject);
//       return `<td>${found?.marks ?? "-"}</td>`;
//     }).join("");

//     return `
//       <tr>
//         <td>${index + 1}</td>
//         <td>${escapeHtml(name)}</td>
//         ${scoreCells}
//         <td>${row.total}</td>
//       </tr>
//     `;
//   }).join("");

//   container.innerHTML = `
//     <div>
//       <h3>${escapeHtml(classData?.class_name || "-")} Broadsheet</h3>
//       <table style="width:100%; border-collapse:collapse;" border="1" cellpadding="6">
//         <thead>
//           <tr>
//             <th>No.</th>
//             <th>Student</th>
//             ${headerSubjects}
//             <th>Total</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${bodyRows || `<tr><td colspan="${subjects.length + 3}">No broadsheet data found.</td></tr>`}
//         </tbody>
//       </table>
//     </div>
//   `;
// }

// function printHeadTeacherBroadsheet() {
//   const container = document.getElementById("head-broadsheet-container");

//   if (!container || !container.innerHTML.trim() || normalizeText(container.textContent) === "no broadsheet loaded.") {
//     alert("No broadsheet loaded to print.");
//     return;
//   }

//   const printWindow = window.open("", "_blank", "width=1000,height=800");
//   if (!printWindow) return;

//   printWindow.document.write(`
//     <html>
//       <head>
//         <title>Broadsheet</title>
//         <style>
//           body { font-family: Arial, sans-serif; padding: 20px; }
//           table { width: 100%; border-collapse: collapse; }
//           th, td { border: 1px solid #000; padding: 6px; font-size: 13px; }
//         </style>
//       </head>
//       <body>${container.innerHTML}</body>
//     </html>
//   `);

//   printWindow.document.close();
//   printWindow.focus();
//   printWindow.print();
// }

/* =====================================
   REMARKS
===================================== */
// async function loadStudentsForRemarkClass() {
//   const classId = document.getElementById("head-remark-class")?.value || "";
//   const studentSelect = document.getElementById("head-remark-student");

//   if (!studentSelect) return;

//   studentSelect.innerHTML = `<option value="">Select Student</option>`;

//   if (!classId) return;

//   const { data, error } = await supabaseHeadTeacher
//     .from("students")
//     .select("id, surname, first_name")
//     .eq("class_id", classId)
//     .neq("status", "completed")
//     .order("surname", { ascending: true });

//   if (error) {
//     console.error("Error loading students for remarks:", error.message);
//     return;
//   }

//   (data || []).forEach((student) => {
//     const option = document.createElement("option");
//     option.value = student.id;
//     option.textContent = `${student.surname || ""} ${student.first_name || ""}`.trim();
//     studentSelect.appendChild(option);
//   });
// }

// async function saveHeadTeacherRemark() {
//   const classId = document.getElementById("head-remark-class")?.value || "";
//   const studentId = document.getElementById("head-remark-student")?.value || "";
//   const remarkText = document.getElementById("head-teacher-remark-text")?.value.trim() || "";

//   if (!classId || !studentId || !remarkText) {
//     alert("Select class, student, and enter remark.");
//     return;
//   }

//   if (!headCurrentTerm || !headCurrentAcademicYear) {
//     alert("Current term or academic year not found.");
//     return;
//   }

//   const payload = {
//     student_id: studentId,
//     class_id: classId,
//     term_id: headCurrentTerm.id,
//     conduct: null,
//     attitude: null,
//     interest: null,
//     remark: remarkText
//   };

//   const { error } = await supabaseHeadTeacher
//     .from("class_teacher_remarks")
//     .upsert(payload, {
//       onConflict: "student_id,class_id,term_id"
//     });

//   if (error) {
//     console.error("Error saving head teacher remark:", error.message);
//     alert("Failed to save remark.");
//     return;
//   }

//   alert("✅ Remark saved successfully");
//   document.getElementById("head-teacher-remark-text").value = "";
// }

/* =====================================
   ALERTS
===================================== */
async function loadAlerts() {
  const list = document.getElementById("head-alerts-list");
  if (!list) return;

  const alerts = [];

  if (headCurrentTerm) {
    const { data: classes } = await supabaseHeadTeacher
      .from("classes")
      .select("id, class_name");

    const { data: marks } = await supabaseHeadTeacher
      .from("student_marks")
      .select("class_id")
      .eq("term_id", headCurrentTerm.id);

    const classIdsWithMarks = [...new Set((marks || []).map((m) => m.class_id).filter(Boolean))];

    /* the Complete/Completed row holds graduated pupils, so it never
       needs marks and must not raise an alert */
    excludeCompletedClasses(classes).forEach((cls) => {
      if (!classIdsWithMarks.includes(cls.id)) {
        alerts.push(`Marks not entered for ${cls.class_name}`);
      }
    });
  }

  if (!headCurrentTerm || !headCurrentAcademicYear) {
    alerts.push("Current term or academic year is not set.");
  }

  if (!alerts.length) {
    list.innerHTML = `<li class="alert-empty">No alerts yet.</li>`;
    return;
  }

  list.innerHTML = alerts.map((alert) => `<li>${escapeHtml(alert)}</li>`).join("");
}

/* =====================================
   QUICK ATTENDANCE VIEW
===================================== */
// function quickViewAttendanceClass(className) {
//   alert(`Open attendance report for ${className}`);
// }

/* =====================================
   HELPERS
===================================== */
function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

/* the Complete/Completed row parks graduated pupils - it is not a
   real class, so it must never count towards class totals */
function isCompletedClassName(className) {
  const value = normalizeText(className);
  return value === "complete" || value === "completed";
}

function excludeCompletedClasses(classes) {
  return (classes || []).filter((cls) => !isCompletedClassName(cls.class_name));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatRole(role) {
  return String(role || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}


/* =====================================
   APPROVAL FLOW EVENTS
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("confirm-approve-report-btn")
    ?.addEventListener("click", approveHeadTeacherReport);

  document
    .getElementById("close-approval-modal-btn")
    ?.addEventListener("click", closeApprovalModal);

  document
    .getElementById("head-approval-modal")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "head-approval-modal") {
        closeApprovalModal();
      }
    });
});

/* =====================================
   LOAD REPORT APPROVAL TABLE
===================================== */
async function loadReportApprovalTable() {
  const tbody = document.getElementById("head-report-approval-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7">Loading approvals...</td></tr>`;

  if (!headCurrentAcademicYear || !headCurrentTerm) {
    tbody.innerHTML = `<tr><td colspan="7">Current year or term not found.</td></tr>`;
    return;
  }

  const { data: classes, error: classesError } = await supabaseHeadTeacher
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (classesError) {
    console.error("Error loading classes:", classesError.message);
    tbody.innerHTML = `<tr><td colspan="7">Failed to load report approvals.</td></tr>`;
    return;
  }

  const { data: marksData, error: marksError } = await supabaseHeadTeacher
    .from("student_marks")
    .select("class_id")
    .eq("term_id", headCurrentTerm.id);

  if (marksError) {
    console.error("Error loading marks:", marksError.message);
    tbody.innerHTML = `<tr><td colspan="7">Failed to load report approvals.</td></tr>`;
    return;
  }

  const { data: approvalData, error: approvalError } = await supabaseHeadTeacher
    .from("report_approvals")
    .select("class_id, term_id, academic_year_id, approval_status, head_teacher_remark, approved_at")
    .eq("term_id", headCurrentTerm.id)
    .eq("academic_year_id", headCurrentAcademicYear.id);

  if (approvalError) {
    console.error("Error loading approvals:", approvalError.message);
  }

  const classesWithMarks = [...new Set((marksData || []).map((m) => m.class_id).filter(Boolean))];
  const approvalsMap = new Map();

  (approvalData || []).forEach((item) => {
    approvalsMap.set(item.class_id, item);
  });

  const readyClasses = (classes || []).filter((cls) => classesWithMarks.includes(cls.id));

  if (!readyClasses.length) {
    tbody.innerHTML = `<tr><td colspan="7">No reports awaiting approval.</td></tr>`;
    return;
  }

  tbody.innerHTML = readyClasses.map((cls, index) => {
    const approval = approvalsMap.get(cls.id);
    const status = "Reports Ready";
    const approvalStatus = approval?.approval_status || "pending";

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(cls.class_name)}</td>
        <td>${escapeHtml(headCurrentAcademicYear.year_name)}</td>
        <td>${escapeHtml(headCurrentTerm.name)}</td>
        <td>${status}</td>
        <td class="${approvalStatus === "approved" ? "approval-approved" : "approval-pending"}">
          ${approvalStatus.toUpperCase()}
        </td>
        <td>
          <button onclick="quickLoadHeadTerminalReports('${cls.id}')">View</button>
          <button onclick="openApprovalModal(
            '${cls.id}',
            '${escapeJs(cls.class_name)}',
            '${headCurrentTerm.id}',
            '${escapeJs(headCurrentTerm.name)}',
            '${headCurrentAcademicYear.id}',
            '${escapeJs(headCurrentAcademicYear.year_name)}',
            '${escapeJs(approval?.head_teacher_remark || "")}'
          )">
            ${approvalStatus === "approved" ? "Update Approval" : "Approve"}
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* =====================================
   OPEN / CLOSE APPROVAL MODAL
===================================== */
function openApprovalModal(classId, className, termId, termName, yearId, yearName, remark = "") {
  document.getElementById("approve-class-id").value = classId || "";
  document.getElementById("approve-term-id").value = termId || "";
  document.getElementById("approve-year-id").value = yearId || "";

  document.getElementById("approve-class-name").value = className || "";
  document.getElementById("approve-term-name").value = termName || "";
  document.getElementById("approve-year-name").value = yearName || "";
  document.getElementById("approve-head-remark").value = remark || "";

  document.getElementById("head-approval-modal").style.display = "flex";
}

function closeApprovalModal() {
  const modal = document.getElementById("head-approval-modal");
  if (!modal) return;

  modal.style.display = "none";

  document.getElementById("approve-class-id").value = "";
  document.getElementById("approve-term-id").value = "";
  document.getElementById("approve-year-id").value = "";
  document.getElementById("approve-class-name").value = "";
  document.getElementById("approve-term-name").value = "";
  document.getElementById("approve-year-name").value = "";
  document.getElementById("approve-head-remark").value = "";
}

/* =====================================
   APPROVE REPORT
===================================== */
async function approveHeadTeacherReport() {
  const classId = document.getElementById("approve-class-id")?.value || "";
  const termId = document.getElementById("approve-term-id")?.value || "";
  const yearId = document.getElementById("approve-year-id")?.value || "";
  const remark = document.getElementById("approve-head-remark")?.value.trim() || "";

  if (!classId || !termId || !yearId) {
    alert("Missing approval details.");
    return;
  }

  const payload = {
    class_id: classId,
    term_id: termId,
    academic_year_id: yearId,
    approved_by: headTeacherUserId,
    approval_status: "approved",
    head_teacher_remark: remark,
    approved_at: new Date().toISOString()
  };

  const { error } = await supabaseHeadTeacher
    .from("report_approvals")
    .upsert(payload, {
      onConflict: "class_id,term_id,academic_year_id"
    });

  if (error) {
    console.error("Error approving report:", error.message);
    alert("Failed to approve report.");
    return;
  }

  alert("✅ Report approved successfully");
  closeApprovalModal();
  await loadReportApprovalTable();
  await loadPendingApprovalCard();
}





/* =====================================
   HELPERS
===================================== */
function escapeJs(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}