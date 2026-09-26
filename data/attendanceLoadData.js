const supabaseAttendanceView = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
let selectedAttendanceClassId = "";
let selectedAttendanceClassName = "";
let selectedAttendanceTermId = "";
let selectedAttendanceTermName = "";
let selectedAttendanceAcademicYearId = "";
let selectedAttendanceAcademicYearName = "";
let selectedAttendanceRows = [];
let selectedAttendanceTermDaysId = "";
let selectedAttendanceTotalDays = 0;

/* the dated records behind the totals, so a day the class teacher marked
   wrongly can be corrected instead of the totals being overwritten */
let attendanceRecordsByStudent = new Map();
let classMarkedDates = [];
let editingAttendanceStudent = null;
let editingAttendanceDays = [];

const attendMessage = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadClassesForAttendanceView();
  await loadAcademicYearsForAttendanceView();
  bindAttendanceViewEvents();
});

/* =====================================
   LOAD CLASSES
   the option value is the class id, so the report
   never has to match on the class name
===================================== */
async function loadClassesForAttendanceView() {
  const select = document.getElementById("select-class-view-attendance");
  if (!select) return;

  select.innerHTML = `<option value="">Loading class...</option>`;

  const { data, error } = await supabaseAttendanceView
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error.message);
    select.innerHTML = `<option value="">Failed to load class</option>`;
    return;
  }

  select.innerHTML = `<option value="">Select class</option>`;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name || "Unnamed Class";
    select.appendChild(option);
  });
}

/* =====================================
   EVENTS
===================================== */
function bindAttendanceViewEvents() {
  document
    .getElementById("select-academic-year-view-attendance")
    ?.addEventListener("change", async () => {
      await loadTermsForAttendanceView();
    });

  document
    .getElementById("attendance-view-btn")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      await loadAttendanceReport();
    });

  document
    .getElementById("print-attendance")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      printAttendanceReport();
    });

  document
    .getElementById("edit-attendance")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      await openAttendanceTotalDaysEditor();
    });

  // term days are edited in the shared "Update Term Total Days" modal,
  // so the report has to refresh itself once that save goes through
  document.addEventListener("term-days-updated", async () => {
    if (selectedAttendanceRows.length) {
      await loadAttendanceReport();
    }
  });

  /* the report rows are rebuilt on every load, so the per-student edit
     buttons are handled on the table body instead of one by one */
  document
    .getElementById("load-student-class-attendace")
    ?.addEventListener("click", (e) => {
      const button = e.target.closest(".attendance-edit-row-btn");
      if (!button) return;

      e.preventDefault();
      openStudentAttendanceEditor(button.dataset.studentId || "");
    });

  document
    .getElementById("edit-attendance-day-list")
    ?.addEventListener("click", (e) => {
      const button = e.target.closest("[data-attendance-date]");
      if (!button) return;

      e.preventDefault();
      setAttendanceDayStatus(
        button.dataset.attendanceDate,
        button.dataset.attendanceStatus || ""
      );
    });

  document
    .getElementById("edit-attendance-add-date-btn")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      addAttendanceDayToEditor();
    });

  document
    .getElementById("save-student-attendance-btn")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      await saveStudentAttendanceEdits();
    });

  document
    .getElementById("edit-student-attendance")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "edit-student-attendance") {
        closeStudentAttendanceEditor();
      }
    });
}

/* =====================================
   EDIT (OVER ALL DAYS)
   reuses the term days modal from termDaysData.js,
   prefilled with the term/year the report was loaded for
===================================== */
async function openAttendanceTotalDaysEditor() {
  if (!selectedAttendanceRows.length) {
    showAttendanceMessage("Please load attendance before editing");
    return;
  }

  if (!selectedAttendanceTermDaysId) {
    showAttendanceMessage(
      "No total days set for this term yet. Use Add Total Days first"
    );
    return;
  }

  await openUpdateTermDaysModal(
    selectedAttendanceTermDaysId,
    selectedAttendanceAcademicYearId,
    selectedAttendanceTermId,
    selectedAttendanceTotalDays
  );
}

/* =====================================
   LOAD ACADEMIC YEARS
===================================== */
async function loadAcademicYearsForAttendanceView() {
  const select = document.getElementById("select-academic-year-view-attendance");
  if (!select) return;

  select.innerHTML = `<option value="">Loading year...</option>`;

  const { data, error } = await supabaseAttendanceView
    .from("academic_years")
    .select("id, year_name, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading academic years:", error.message);
    select.innerHTML = `<option value="">Failed to load year</option>`;
    return;
  }

  select.innerHTML = `<option value="">Select year</option>`;

  (data || []).forEach((year) => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name || "-";

    if (year.is_active) {
      option.selected = true;
    }

    select.appendChild(option);
  });

  if (select.value) {
    await loadTermsForAttendanceView();
  }
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadTermsForAttendanceView() {
  const yearSelect = document.getElementById("select-academic-year-view-attendance");
  const termSelect = document.getElementById("select-term-view-attendance");

  if (!yearSelect || !termSelect) return;

  const academicYearId = yearSelect.value;

  termSelect.innerHTML = `<option value="">Loading term...</option>`;

  if (!academicYearId) {
    termSelect.innerHTML = `<option value="">Select term</option>`;
    return;
  }

  const { data, error } = await supabaseAttendanceView
    .from("terms")
    .select("id, name, academic_year_id, created_at")
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading terms:", error.message);
    termSelect.innerHTML = `<option value="">Failed to load term</option>`;
    return;
  }

  termSelect.innerHTML = `<option value="">Select term</option>`;

  (data || []).forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name || "-";
    termSelect.appendChild(option);
  });
}

/* =====================================
   LOAD ATTENDANCE REPORT
===================================== */
async function loadAttendanceReport() {
  const classSelect = document.getElementById("select-class-view-attendance");
  const termSelect = document.getElementById("select-term-view-attendance");
  const yearSelect = document.getElementById("select-academic-year-view-attendance");
  const tableBody = document.getElementById("load-student-class-attendace");

  if (!classSelect || !termSelect || !yearSelect || !tableBody) return;

  const selectedClassValue = classSelect.value || "";
  const selectedClassLabel =
    classSelect.options[classSelect.selectedIndex]?.textContent?.trim() || "";

  selectedAttendanceTermId = termSelect.value || "";
  selectedAttendanceTermName =
    termSelect.options[termSelect.selectedIndex]?.textContent?.trim() || "";
  selectedAttendanceAcademicYearId = yearSelect.value || "";
  selectedAttendanceAcademicYearName =
    yearSelect.options[yearSelect.selectedIndex]?.textContent?.trim() || "";

  if (!selectedClassValue) {
    // alert("Please select class.");
    attendMessage.classList.add("show-message", "error");
    attendMessage.innerHTML = "Please select class";
    setTimeout(()=>{
      attendMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  if (!selectedAttendanceTermId) {
    // alert("Please select term.");
      attendMessage.classList.add("show-message", "error");
    attendMessage.innerHTML = "Please select term";
    setTimeout(()=>{
      attendMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  if (!selectedAttendanceAcademicYearId) {
    // alert("Please select academic year.");
      attendMessage.classList.add("show-message", "error");
    attendMessage.innerHTML = "Please select academic year";
    setTimeout(()=>{
      attendMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  tableBody.innerHTML = `<tr><td colspan="6">Loading attendance...</td></tr>`;

  selectedAttendanceTermDaysId = "";
  selectedAttendanceTotalDays = 0;
  attendanceRecordsByStudent = new Map();
  classMarkedDates = [];

  try {
    /* -----------------------------
       1. CONFIRM THE SELECTED CLASS
    ----------------------------- */
    const { data: classData, error: classError } = await supabaseAttendanceView
      .from("classes")
      .select("id, class_name")
      .eq("id", selectedClassValue)
      .maybeSingle();

    if (classError) throw classError;

    if (!classData) {
      selectedAttendanceRows = [];
      tableBody.innerHTML = `<tr><td colspan="6">Selected class was not found.</td></tr>`;
      updateAttendanceHeader([], selectedClassLabel);
      return;
    }

    selectedAttendanceClassId = classData.id;
    selectedAttendanceClassName = classData.class_name || selectedClassLabel;

    /* -----------------------------
       2. GET TOTAL DAYS FROM term_days
    ----------------------------- */
    let overallDays = 0;

    const { data: termDaysData, error: termDaysError } = await supabaseAttendanceView
      .from("term_days")
      .select("id, total_days, term_id, academic_year_id")
      .eq("term_id", selectedAttendanceTermId)
      .eq("academic_year_id", selectedAttendanceAcademicYearId)
      .limit(1);

    if (termDaysError) {
      console.error("Error loading term days:", termDaysError.message);
    }

    if (termDaysData?.length) {
      overallDays = Number(termDaysData[0].total_days || 0);
      selectedAttendanceTermDaysId = termDaysData[0].id || "";
      selectedAttendanceTotalDays = overallDays;
    }

    /* -----------------------------
       3. GET ACTIVE STUDENTS IN CLASS
    ----------------------------- */
    const { data: students, error: studentsError } = await supabaseAttendanceView
      .from("students")
      .select("id, surname, first_name, gender, class_id, status")
      .eq("class_id", selectedAttendanceClassId)
      .eq("status", "Present")
      .order("surname", { ascending: true })
      .order("first_name", { ascending: true });

    if (studentsError) throw studentsError;

    if (!students || students.length === 0) {
      selectedAttendanceRows = [];
      tableBody.innerHTML = `<tr><td colspan="6">No students found in this class.</td></tr>`;
      updateAttendanceHeader([], selectedAttendanceClassName);
      return;
    }

    /* -----------------------------
       4. GET ATTENDANCE BY class_id + term_id + academic_year_id
    ----------------------------- */
    const { data: attendanceData, error: attendanceError } = await supabaseAttendanceView
      .from("attendance")
      .select("id, student_id, class_id, term_id, academic_year_id, date, status")
      .eq("class_id", selectedAttendanceClassId)
      .eq("term_id", selectedAttendanceTermId)
      .eq("academic_year_id", selectedAttendanceAcademicYearId);

    if (attendanceError) throw attendanceError;

    const attendanceRows = attendanceData || [];

    /* keep every dated record so the editor can fix the day that was
       marked wrongly, and remember the days the class was marked on */
    const markedDates = new Set();

    attendanceRows.forEach((row) => {
      if (!row.date) return;

      markedDates.add(row.date);

      if (!attendanceRecordsByStudent.has(row.student_id)) {
        attendanceRecordsByStudent.set(row.student_id, new Map());
      }

      attendanceRecordsByStudent.get(row.student_id).set(row.date, {
        id: row.id,
        status: readableAttendanceStatus(row.status)
      });
    });

    classMarkedDates = [...markedDates].sort();

    /* -----------------------------
       5. COUNT PRESENT / ABSENT
    ----------------------------- */
    const attendanceMap = new Map();

    attendanceRows.forEach((row) => {
      if (!attendanceMap.has(row.student_id)) {
        attendanceMap.set(row.student_id, {
          present: 0,
          absent: 0
        });
      }

      const current = attendanceMap.get(row.student_id);

      if (normalizeAttendanceText(row.status) === "present") {
        current.present += 1;
      } else if (normalizeAttendanceText(row.status) === "absent") {
        current.absent += 1;
      }
    });

    /* -----------------------------
       6. BUILD REPORT ROWS
    ----------------------------- */
    selectedAttendanceRows = sortStudentsByName(students).map((student, index) => {
      const stats = attendanceMap.get(student.id) || { present: 0, absent: 0 };
      const fullName = studentFullName(student) || "-";

      return {
        no: index + 1,
        studentId: student.id,
        studentName: fullName,
        className: selectedAttendanceClassName,
        academicYear: selectedAttendanceAcademicYearName,
        termName: selectedAttendanceTermName,
        present: stats.present,
        absent: stats.absent,
        overallDays: overallDays
      };
    });

    renderAttendanceTable();
    updateAttendanceHeader(students, selectedAttendanceClassName);
  } catch (error) {
    console.error("Error loading attendance report:", error.message || error);
    selectedAttendanceRows = [];
    tableBody.innerHTML = `<tr><td colspan="6">Failed to load attendance.</td></tr>`;
    updateAttendanceHeader([], selectedClassLabel || "");
  }
}

/* =====================================
   RENDER TABLE
===================================== */
function renderAttendanceTable() {
  const tableBody = document.getElementById("load-student-class-attendace");
  if (!tableBody) return;

  if (!selectedAttendanceRows.length) {
    tableBody.innerHTML = `<tr><td colspan="6">No attendance data found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = selectedAttendanceRows
    .map((row) => {
      return `
        <tr>
          <td>${row.no}</td>
          <td>${escapeAttendanceHtml(row.studentName)}</td>
          <td>${row.present}</td>
          <td>${row.absent}</td>
          <td>${row.overallDays}</td>
          <td class="attendance-action-col">
            <button
              type="button"
              class="edit-btn attendance-edit-row-btn"
              data-student-id="${escapeAttendanceHtml(row.studentId)}"
              title="Edit attendance"
            >
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

/* =====================================
   UPDATE HEADER
===================================== */
function updateAttendanceHeader(students = [], className = "") {
  const classTitle = document.querySelector(".class-seleted-name-for-attendance-view");
  const totalStudents = document.getElementById("total-student-view-class-attendance");
  const academicYearEl = document.getElementById("academic-year-attendance");
  const termNameEl = document.getElementById("term-view-attendance-name");
  const headingClassName = document.querySelector(".attend h3");

  if (classTitle) {
    classTitle.textContent = className ? `${className} Attendance Report` : "";
  }

  if (headingClassName) {
    headingClassName.textContent = className || "-";
  }

  if (totalStudents) {
    totalStudents.textContent = students.length || 0;
  }

  if (academicYearEl) {
    academicYearEl.textContent = selectedAttendanceAcademicYearName || "-";
  }

  if (termNameEl) {
    termNameEl.textContent = selectedAttendanceTermName || "-";
  }
}

/* =====================================
   PRINT
===================================== */
function printAttendanceReport() {
  const wrapper = document.querySelector(".attendance-print-wrapper");

  if (!wrapper || !wrapper.innerHTML.trim()) {
    // alert("No attendance report loaded to print.");
      attendMessage.classList.add("show-message", "error");
    attendMessage.innerHTML = "No attendance report loaded to print";
    setTimeout(()=>{
      attendMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  if (!selectedAttendanceRows.length) {
    // alert("Please load attendance before printing.");
      attendMessage.classList.add("show-message", "error");
    attendMessage.innerHTML = "Please load attendance before printing";
    setTimeout(()=>{
      attendMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  const printWindow = window.open("", "_blank", "width=1000,height=800");

  if (!printWindow) {
    alert("Unable to open print window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>CRIPS-MS</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #000;
          }

          h2, h3, h4, p {
            margin: 0 0 8px 0;
          }

          .report-card-header-details
           {
            margin-bottom: 20px;
            
          }

        

         
          table {
            width: 100%;
            border-collapse: collapse;
          }

            .attend-details-middle{
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: .5rem;

}
    .attend-details-middle h2{
    text-align: center;
    }

    .report-class-information{
    display: none;
    }

.attend{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
   
}

          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 14px;
    
          }

          th {
            background: #f2f2f2;
          }

          .basic-details {
            display: none;
          }

          /* the per-student edit buttons are screen only */
          .attendance-action-col {
            display: none;
          }

          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${wrapper.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

/* =====================================
   EDIT ONE STUDENT'S DAYS

   The report shows totals, but attendance is saved one row per day, so
   the editor works on those dated rows. Correcting the day the class
   teacher marked wrongly is what moves the present/absent totals.
===================================== */
function openStudentAttendanceEditor(studentId) {
  const overlay = document.getElementById("edit-student-attendance");
  if (!overlay) return;

  const reportRow = selectedAttendanceRows.find(
    (item) => item.studentId === studentId
  );

  if (!reportRow) {
    showAttendanceMessage("Please load attendance before editing");
    return;
  }

  editingAttendanceStudent = {
    id: studentId,
    name: reportRow.studentName
  };

  const studentDays = attendanceRecordsByStudent.get(studentId) || new Map();

  /* every day the class was marked, plus any day this student alone has */
  const dates = [
    ...new Set([...classMarkedDates, ...studentDays.keys()])
  ].sort();

  editingAttendanceDays = dates.map((date) => {
    const record = studentDays.get(date);

    return {
      date,
      rowId: record?.id || "",
      hasRow: Boolean(record),
      original: record?.status || "",
      current: record?.status || ""
    };
  });

  const meta = document.getElementById("edit-attendance-student-meta");
  if (meta) {
    meta.textContent = [
      reportRow.studentName,
      selectedAttendanceClassName,
      selectedAttendanceTermName,
      selectedAttendanceAcademicYearName
    ]
      .filter(Boolean)
      .join("  -  ");
  }

  const newDateInput = document.getElementById("edit-attendance-new-date");
  if (newDateInput) newDateInput.value = "";

  renderAttendanceDayEditor();

  overlay.style.display = "flex";
}

function closeStudentAttendanceEditor() {
  const overlay = document.getElementById("edit-student-attendance");

  editingAttendanceStudent = null;
  editingAttendanceDays = [];

  if (overlay) overlay.style.display = "none";
}

/* =====================================
   RENDER THE DAY LIST
===================================== */
function renderAttendanceDayEditor() {
  const list = document.getElementById("edit-attendance-day-list");
  if (!list) return;

  const scrollPosition = list.scrollTop;

  if (!editingAttendanceDays.length) {
    list.innerHTML = `
      <p class="attendance-edit-empty">
        No attendance day has been marked for this class yet.
        Add the day below to record it.
      </p>
    `;
  } else {
    const statusOptions = [
      { status: "Present", label: "Present", className: "present" },
      { status: "Absent", label: "Absent", className: "absent" },
      { status: "", label: "Not marked", className: "unmarked" }
    ];

    list.innerHTML = editingAttendanceDays
      .map((day) => {
        const buttons = statusOptions
          .map((option) => {
            const isActive = day.current === option.status ? " active" : "";

            return `
              <button
                type="button"
                class="attendance-day-btn ${option.className}${isActive}"
                data-attendance-date="${escapeAttendanceHtml(day.date)}"
                data-attendance-status="${option.status}"
              >
                ${option.label}
              </button>
            `;
          })
          .join("");

        const changed =
          day.current !== day.original
            ? `<span class="attendance-edit-changed">edited</span>`
            : "";

        return `
          <div class="attendance-edit-day">
            <span class="attendance-edit-date">
              ${escapeAttendanceHtml(formatAttendanceDate(day.date))}
              ${changed}
            </span>
            <div class="attendance-edit-day-actions">${buttons}</div>
          </div>
        `;
      })
      .join("");
  }

  list.scrollTop = scrollPosition;

  updateAttendanceEditorTotals();
}

/* =====================================
   TOTALS INSIDE THE EDITOR
===================================== */
function updateAttendanceEditorTotals() {
  const present = editingAttendanceDays.filter(
    (day) => day.current === "Present"
  ).length;

  const absent = editingAttendanceDays.filter(
    (day) => day.current === "Absent"
  ).length;

  const presentEl = document.getElementById("edit-attendance-present-count");
  const absentEl = document.getElementById("edit-attendance-absent-count");
  const totalDaysEl = document.getElementById("edit-attendance-total-days");
  const warning = document.getElementById("edit-attendance-warning");

  if (presentEl) presentEl.textContent = present;
  if (absentEl) absentEl.textContent = absent;
  if (totalDaysEl) {
    totalDaysEl.textContent = selectedAttendanceTotalDays || "-";
  }

  if (!warning) return;

  /* the term total is what the report prints in "OVER ALL DAYS", so going
     past it would show a pupil present more days than the school ran */
  if (
    selectedAttendanceTotalDays > 0 &&
    present + absent > selectedAttendanceTotalDays
  ) {
    warning.textContent =
      `Marked days (${present + absent}) are more than the ` +
      `${selectedAttendanceTotalDays} days set for this term.`;
    warning.style.display = "block";
  } else {
    warning.textContent = "";
    warning.style.display = "none";
  }
}

/* =====================================
   CHANGE ONE DAY
===================================== */
function setAttendanceDayStatus(date, status) {
  const day = editingAttendanceDays.find((item) => item.date === date);
  if (!day) return;

  day.current = status;

  renderAttendanceDayEditor();
}

/* =====================================
   ADD A DAY THE TEACHER NEVER MARKED
===================================== */
function addAttendanceDayToEditor() {
  const input = document.getElementById("edit-attendance-new-date");

  if (!editingAttendanceStudent || !input) return;

  const value = input.value;

  if (!value) {
    showAttendanceMessage("Please pick the date to add");
    return;
  }

  if (editingAttendanceDays.some((day) => day.date === value)) {
    showAttendanceMessage("That day is already on the list");
    return;
  }

  editingAttendanceDays.push({
    date: value,
    rowId: "",
    hasRow: false,
    original: "",
    current: "Present"
  });

  editingAttendanceDays.sort((a, b) => a.date.localeCompare(b.date));

  input.value = "";

  renderAttendanceDayEditor();
}

/* =====================================
   SAVE THE CORRECTIONS
===================================== */
async function saveStudentAttendanceEdits() {
  if (!editingAttendanceStudent) return;

  if (
    !selectedAttendanceClassId ||
    !selectedAttendanceTermId ||
    !selectedAttendanceAcademicYearId
  ) {
    showAttendanceMessage("Please load attendance before editing");
    return;
  }

  const upserts = [];
  const deleteIds = [];

  editingAttendanceDays.forEach((day) => {
    if (day.current && day.current !== day.original) {
      upserts.push({
        student_id: editingAttendanceStudent.id,
        class_id: selectedAttendanceClassId,
        term_id: selectedAttendanceTermId,
        academic_year_id: selectedAttendanceAcademicYearId,
        date: day.date,
        status: day.current
      });
    }

    if (!day.current && day.hasRow && day.rowId) {
      deleteIds.push(day.rowId);
    }
  });

  if (!upserts.length && !deleteIds.length) {
    showAttendanceMessage("No attendance change to save");
    return;
  }

  /* clearing a day is the only part of this that removes a record, so it
     is the only part that asks first */
  if (deleteIds.length && typeof confirmAction === "function") {
    const proceed = await confirmAction({
      title: "Remove marked day(s)?",
      message:
        `${editingAttendanceStudent.name} will lose ${deleteIds.length} ` +
        `marked day(s) for this term.`,
      details: ["A removed day counts as neither present nor absent"],
      confirmText: "Save changes",
      tone: "warning"
    });

    if (!proceed) return;
  }

  const saveBtn = document.getElementById("save-student-attendance-btn");

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  try {
    if (upserts.length) {
      const { error } = await supabaseAttendanceView
        .from("attendance")
        .upsert(upserts, { onConflict: "student_id,term_id,date" });

      if (error) throw error;
    }

    if (deleteIds.length) {
      const { error } = await supabaseAttendanceView
        .from("attendance")
        .delete()
        .in("id", deleteIds);

      if (error) throw error;
    }

    closeStudentAttendanceEditor();

    await loadAttendanceReport();

    showAttendanceMessage("Attendance updated", "success");
  } catch (error) {
    console.error("Error updating attendance:", error.message || error);
    showAttendanceMessage("Failed to update attendance");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save changes";
    }
  }
}

/* =====================================
   HELPERS
===================================== */
function showAttendanceMessage(text, type = "error") {
  if (!attendMessage) return;

  attendMessage.classList.remove("show-message", "error", "success");
  attendMessage.classList.add("show-message", type);
  attendMessage.innerHTML = text;

  setTimeout(() => {
    attendMessage.classList.remove("show-message", type);
  }, 4000);
}

/* "Present", "Absent" or "" - anything the teacher saved that is neither
   counts as unmarked, so the editor can set it properly */
function readableAttendanceStatus(value) {
  const status = normalizeAttendanceText(value);

  if (status === "present") return "Present";
  if (status === "absent") return "Absent";
  return "";
}

function formatAttendanceDate(value) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function normalizeAttendanceText(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeAttendanceHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}