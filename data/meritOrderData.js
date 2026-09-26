const supabaseAdminMerit = window.supabaseClient;

/* =====================================
   GLOBAL STATE
===================================== */
const meritMessage = document.getElementById("form-feedback");

let meritRows = [];
// the Class column only earns its space when several classes are mixed together
let meritShowClassColumn = false;
let meritMeta = {
  className: "",
  termName: "",
  academicYear: ""
};

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadClassesForMerit();
  loadTermsForMerit();

  document
    .getElementById("load-merit-btn")
    ?.addEventListener("click", loadMeritOrder);

  document
    .getElementById("print-merit-btn")
    ?.addEventListener("click", printMeritOrder);
});

/* =====================================
   HELPERS
===================================== */
function meritFeedback(text) {
  if (!meritMessage) return;

  meritMessage.classList.add("show-message", "error");
  meritMessage.innerHTML = text;

  setTimeout(() => {
    meritMessage.classList.remove("show-message", "error");
  }, 4000);
}

function escapeMeritHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function meritColSpan() {
  return meritShowClassColumn ? 5 : 4;
}

/* the inline style travels with the markup into the print window */
function applyMeritClassColumn() {
  const header = document.querySelector(".merit-table .merit-class-col");
  if (header) header.style.display = meritShowClassColumn ? "" : "none";
}

function formatMeritPosition(num) {
  if (!num) return "-";

  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return `${num}ST`;
  if (j === 2 && k !== 12) return `${num}ND`;
  if (j === 3 && k !== 13) return `${num}RD`;
  return `${num}TH`;
}

/* =====================================
   LOAD CLASSES
===================================== */
async function loadClassesForMerit() {
  const select = document.getElementById("merit-class");
  if (!select) return;

  select.innerHTML = `<option value="">Loading classes...</option>`;

  const { data, error } = await supabaseAdminMerit
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error.message);
    select.innerHTML = `<option value="">Failed to load classes</option>`;
    return;
  }

  select.innerHTML = `
    <option value="">Select class</option>
    <option value="all">All Classes (whole school)</option>
  `;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name || "Unnamed Class";
    select.appendChild(option);
  });
}

/* =====================================
   LOAD TERMS
===================================== */
async function loadTermsForMerit() {
  const select = document.getElementById("merit-term");
  if (!select) return;

  select.innerHTML = `<option value="">Loading terms...</option>`;

  const { data: termsData, error: termsError } = await supabaseAdminMerit
    .from("terms")
    .select("id, name, academic_year_id, created_at")
    .order("created_at", { ascending: false });

  if (termsError) {
    console.error("Error loading terms:", termsError.message);
    select.innerHTML = `<option value="">Failed to load terms</option>`;
    return;
  }

  const academicYearIds = [
    ...new Set((termsData || []).map((t) => t.academic_year_id).filter(Boolean))
  ];

  let academicYearsMap = new Map();

  if (academicYearIds.length > 0) {
    const { data: yearRows, error: yearError } = await supabaseAdminMerit
      .from("academic_years")
      .select("id, year_name")
      .in("id", academicYearIds);

    if (yearError) {
      console.error("Error loading academic years:", yearError.message);
    } else {
      academicYearsMap = new Map(
        (yearRows || []).map((row) => [row.id, row.year_name || ""])
      );
    }
  }

  select.innerHTML = `<option value="">Select term</option>`;

  (termsData || []).forEach((termRow) => {
    const academicYearName = academicYearsMap.get(termRow.academic_year_id) || "";

    const option = document.createElement("option");
    option.value = termRow.id;
    option.textContent = academicYearName
      ? `${termRow.name} - ${academicYearName}`
      : (termRow.name || "Unnamed Term");

    option.dataset.termName = termRow.name || "";
    option.dataset.academicYear = academicYearName || "";
    select.appendChild(option);
  });
}

/* =====================================
   LOAD ORDER OF MERIT
===================================== */
async function loadMeritOrder() {
  const classSelect = document.getElementById("merit-class");
  const termSelect = document.getElementById("merit-term");
  const tableBody = document.getElementById("merit-table-body");

  if (!classSelect || !termSelect || !tableBody) return;

  const classId = classSelect.value;
  const termId = termSelect.value;

  if (!classId || !termId) {
    meritFeedback("Please select class and term");
    return;
  }

  const allClasses = classId === "all";
  const selectedTermOption = termSelect.options[termSelect.selectedIndex];

  meritShowClassColumn = allClasses;
  applyMeritClassColumn();

  meritMeta = {
    className: allClasses
      ? "All Classes"
      : (classSelect.options[classSelect.selectedIndex]?.textContent || "-"),
    termName: selectedTermOption?.dataset.termName || "-",
    academicYear: selectedTermOption?.dataset.academicYear || "-"
  };

  updateMeritHeader();

  tableBody.innerHTML = `<tr><td colspan="4">Loading order of merit...</td></tr>`;

  try {
    /* students */
    let studentQuery = supabaseAdminMerit
      .from("students")
      .select("id, surname, first_name, class_id, classes (class_name)")
      .not("status", "ilike", "Complete");

    if (!allClasses) studentQuery = studentQuery.eq("class_id", classId);

    const { data: students, error: studentsError } = await studentQuery;

    if (studentsError) {
      console.error("Error loading students:", studentsError.message);
      tableBody.innerHTML = `<tr><td colspan="4">Failed to load students</td></tr>`;
      return;
    }

    if (!students || students.length === 0) {
      meritRows = [];
      tableBody.innerHTML = `<tr><td colspan="4">No students found</td></tr>`;
      updateMeritSummary();
      return;
    }

    /* marks for the term */
    let marksQuery = supabaseAdminMerit
      .from("student_marks")
      .select("student_id, class_id, subject, marks")
      .eq("term_id", termId);

    if (!allClasses) marksQuery = marksQuery.eq("class_id", classId);

    const { data: marks, error: marksError } = await marksQuery;

    if (marksError) {
      console.error("Error loading marks:", marksError.message);
      tableBody.innerHTML = `<tr><td colspan="4">Failed to load marks</td></tr>`;
      return;
    }

    /* total + subject count per student */
    const totalsMap = new Map();

    (marks || []).forEach((mark) => {
      const score = Number(mark.marks || 0);
      const entry = totalsMap.get(mark.student_id) || { total: 0, subjects: 0 };

      entry.total += Number.isNaN(score) ? 0 : score;
      entry.subjects += 1;

      totalsMap.set(mark.student_id, entry);
    });

    meritRows = students.map((student) => {
      const entry = totalsMap.get(student.id) || { total: 0, subjects: 0 };

      return {
        name: studentFullName(student) || "-",
        className: student.classes?.class_name || "-",
        total: entry.total,
        subjects: entry.subjects,
        average: entry.subjects ? (entry.total / entry.subjects).toFixed(2) : "0.00",
        position: "-"
      };
    });

    /* order of merit: highest total first, name breaks ties */
    meritRows.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    let currentPosition = 0;
    let lastTotal = null;

    meritRows.forEach((row, index) => {
      if (row.total !== lastTotal) {
        currentPosition = index + 1;
        lastTotal = row.total;
      }
      row.position = currentPosition;
    });

    renderMeritTable();
    updateMeritSummary();
  } catch (err) {
    console.error("Unexpected order of merit error:", err);
    tableBody.innerHTML = `<tr><td colspan="4">Unexpected error occurred</td></tr>`;
  }
}

/* =====================================
   RENDER TABLE
===================================== */
function renderMeritTable() {
  const tableBody = document.getElementById("merit-table-body");
  if (!tableBody) return;

  if (!meritRows.length) {
    tableBody.innerHTML = `<tr><td colspan="4">No order of merit data found</td></tr>`;
    return;
  }

  tableBody.innerHTML = meritRows
    .map(
      (row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td class="student-name-cell">${escapeMeritHtml(row.name)}</td>
        ${meritShowClassColumn ? `<td>${escapeMeritHtml(row.className)}</td>` : ""}
        <td><strong>${row.total}</strong></td>
        <td><strong>${formatMeritPosition(row.position)}</strong></td>
      </tr>
    `
    )
    .join("");
}

/* =====================================
   HEADER + SUMMARY
===================================== */
function updateMeritHeader() {
  const classEl = document.getElementById("merit-display-class");
  const termEl = document.getElementById("merit-display-term");
  const yearEl = document.getElementById("merit-display-academic-year");

  if (classEl) classEl.textContent = meritMeta.className || "-";
  if (termEl) termEl.textContent = meritMeta.termName || "-";
  if (yearEl) yearEl.textContent = meritMeta.academicYear || "-";
}

function updateMeritSummary() {
  const summaryEl = document.getElementById("merit-summary");
  if (!summaryEl) return;

  if (!meritRows.length) {
    summaryEl.textContent = "";
    return;
  }

  const totals = meritRows.map((row) => row.total);
  const sum = totals.reduce((a, b) => a + b, 0);
  const average = (sum / totals.length).toFixed(2);

  summaryEl.innerHTML = `
    <strong>Total Students:</strong> ${meritRows.length} |
    <strong>Class Average:</strong> ${average} |
    <strong>Highest:</strong> ${Math.max(...totals)} |
    <strong>Lowest:</strong> ${Math.min(...totals)}
  `;
}

/* =====================================
   PRINT ORDER OF MERIT (A4 PORTRAIT)
===================================== */
function printMeritOrder() {
  const printArea = document.getElementById("merit-print-area");

  if (!printArea || !meritRows.length) {
    meritFeedback("No order of merit loaded to print");
    return;
  }

  /* the print window is a blank document, so a relative logo path has no base
     to resolve against - .src is already absolute */
  const logoSrc =
    document.querySelector("#merit-print-area .school-img")?.src || "";

  const printWindow = window.open("", "_blank", "width=1000,height=800");

  if (!printWindow) {
    alert("Unable to open print window.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <html>
      <head>
        <title>Order of Merit</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 15px;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* --- header: same layout as the other printed sheets --- */
          .terminal-card-header-details {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
            margin-bottom: 1rem;
          }

          .school-details-middle {
            display: flex;
            flex-direction: column;
            gap: .1rem;
            text-align: center;
            padding: 0 1rem;
          }

          .school-details-middle h2,
          .school-details-middle h3,
          .school-details-middle h4 { margin: 0; }

          .school-details-middle h2 { font-size: 1.8rem; }
          .school-details-middle h3 { font-size: 1.5rem; }
          .school-details-middle h4 { font-size: 1.3rem; }

          /* the source PNG is 1056x992, so it MUST be constrained here or it
             prints at natural size and swallows the page */
          .school-img {
            width: 100px;
            height: 100px;
            object-fit: contain;
            display: block;
            flex-shrink: 0;
          }

          .sheet-logo-balance {
            width: 100px;
            flex-shrink: 0;
          }

          .class-in-information {
            display: flex;
            gap: 5rem;
            align-items: flex-start;
            justify-content: center;
            margin-block: 1rem;
            padding: 0 1.5rem;
          }

          .box-left-in-class h4 {
            font-size: 15px;
            margin: 0 0 .3rem;
          }

          .merit-summary {
            margin: 0 0 10px;
            font-size: 13px;
            text-align: center;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            border: 1px solid #000;
            padding: 5px;
            font-size: 14px;
            text-align: center;
          }

          th {
            background: #fff;
          }

          .student-name-cell {
            text-align: left;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        </style>
      </head>

      <body>
        <div class="terminal-card-header-details">
          ${logoSrc ? `<img src="${logoSrc}" alt="logo" class="school-img">` : ""}
          <div class="school-details-middle">
            <h3>CRIG PRIMARY SCHOOL</h3>
            <h4>ORDER OF MERIT</h4>
          </div>
          <span class="sheet-logo-balance"></span>
        </div>

        <div class="class-in-information">
          <div class="box-left-in-class">
            <h4>ACADEMIC YEAR: <span>${escapeMeritHtml(meritMeta.academicYear)}</span></h4>
            <h4>TERM: <span>${escapeMeritHtml(meritMeta.termName)}</span></h4>
          </div>

          <div class="box-left-in-class">
            <h4>CLASS: <span>${escapeMeritHtml(meritMeta.className)}</span></h4>
          </div>
        </div>

        <p class="merit-summary">${document.getElementById("merit-summary")?.innerHTML || ""}</p>

        ${document.querySelector(".merit-table-wrapper")?.innerHTML || ""}
      </body>
    </html>
  `);

  printWindow.document.close();

  /* Wait for the logo to finish decoding, otherwise print() can fire against a
     zero-height image and the header prints misaligned. */
  const images = Array.from(printWindow.document.images);
  Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
    )
  ).then(() => {
    printWindow.focus();
    printWindow.print();
  });
}
