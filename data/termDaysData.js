const supabaseTermDays = window.supabaseClient;


/* =====================================
   GLOBAL STATE
===================================== */
let editingTermDaysId = null;
const termDaysFeedback = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadTermDaysTable();
  await loadAcademicYearsForTermDaysUpdate();
  await loadTermsForTermDaysUpdate();
  bindTermDaysEvents();
});

/* =====================================
   EVENTS
===================================== */
function bindTermDaysEvents() {
  document
    .getElementById("update-save-term-btn")
    ?.addEventListener("click", updateTermDays);

  document
    .getElementById("update-select-academic-year-days")
    ?.addEventListener("change", async () => {
      await loadTermsForTermDaysUpdate();
    });
}

/* =====================================
   LOAD TERM DAYS TABLE
===================================== */
async function loadTermDaysTable() {
  const tableBody = document.getElementById("term-days-body");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

  const { data, error } = await supabaseTermDays
    .from("term_days")
    .select(`
      id,
      term_id,
      academic_year_id,
      total_days,
      created_at,
      terms (
        id,
        name
      ),
      academic_years (
        id,
        year_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading term days:", error.message);
    tableBody.innerHTML = `<tr><td colspan="4">Failed to load.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4">No current term loaded.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data
    .map((item) => {
      return `
        <tr>
          <td>${escapeHtml(item.terms?.name || "-")}</td>
          <td>${escapeHtml(item.academic_years?.year_name || "-")}</td>
          <td>${item.total_days ?? "-"}</td>
          <td>
            <button
              onclick="openUpdateTermDaysModal(
                '${item.id}',
                '${item.academic_year_id || ""}',
                '${item.term_id || ""}',
                '${item.total_days ?? ""}'
              )"
            class="edit-btn">
              <i class="fa-solid fa-pen-to-square"></i> Update
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

/* =====================================
   LOAD ACADEMIC YEARS INTO UPDATE MODAL
===================================== */
async function loadAcademicYearsForTermDaysUpdate(selectedYearId = "") {
  const select = document.getElementById("update-select-academic-year-days");
  if (!select) return;

  const { data, error } = await supabaseTermDays
    .from("academic_years")
    .select("id, year_name")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading academic years:", error.message);
    select.innerHTML = `<option value="">Failed to load academic years</option>`;
    return;
  }

  select.innerHTML = `<option value="">Select academic year</option>`;

  (data || []).forEach((year) => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name || "-";
    if (selectedYearId && selectedYearId === year.id) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

/* =====================================
   LOAD TERMS INTO UPDATE MODAL
===================================== */
async function loadTermsForTermDaysUpdate(selectedTermId = "") {
  const yearSelect = document.getElementById("update-select-academic-year-days");
  const termSelect = document.getElementById("update-select-term-add-days");

  if (!yearSelect || !termSelect) return;

  const academicYearId = yearSelect.value;

  termSelect.innerHTML = `<option value="">Loading terms...</option>`;

  if (!academicYearId) {
    termSelect.innerHTML = `<option value="">Select term</option>`;
    return;
  }

  const { data, error } = await supabaseTermDays
    .from("terms")
    .select("id, name, academic_year_id")
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading terms:", error.message);
    termSelect.innerHTML = `<option value="">Failed to load terms</option>`;
    return;
  }

  termSelect.innerHTML = `<option value="">Select term</option>`;

  (data || []).forEach((term) => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name || "-";
    if (selectedTermId && selectedTermId === term.id) {
      option.selected = true;
    }
    termSelect.appendChild(option);
  });
}

/* =====================================
   OPEN UPDATE MODAL
===================================== */
async function openUpdateTermDaysModal(id, academicYearId, termId, totalDays) {
  editingTermDaysId = id || null;

  const overlay = document.getElementById("update-attendance");
  const totalDaysInput = document.getElementById("update-total-days-for-term");

  await loadAcademicYearsForTermDaysUpdate(academicYearId);
  await loadTermsForTermDaysUpdate(termId);

  if (totalDaysInput) {
    totalDaysInput.value = totalDays || "";
  }

  if (overlay) {
    overlay.style.display = "flex";
  }
}

/* =====================================
   CLOSE UPDATE MODAL
===================================== */
function closeAddDays() {
  const overlay = document.getElementById("update-attendance");
  const yearSelect = document.getElementById("update-select-academic-year-days");
  const termSelect = document.getElementById("update-select-term-add-days");
  const totalDaysInput = document.getElementById("update-total-days-for-term");

  editingTermDaysId = null;

  if (overlay) overlay.style.display = "none";
  if (yearSelect) yearSelect.value = "";
  if (termSelect) termSelect.innerHTML = `<option value="">Select term</option>`;
  if (totalDaysInput) totalDaysInput.value = "";
}

/* =====================================
   UPDATE TERM DAYS
===================================== */
async function updateTermDays(e) {
  e?.preventDefault?.();

  const academicYearId =
    document.getElementById("update-select-academic-year-days")?.value || "";
  const termId =
    document.getElementById("update-select-term-add-days")?.value || "";
  const totalDaysValue =
    document.getElementById("update-total-days-for-term")?.value || "";

  if (!editingTermDaysId) {
    // alert("No term days record selected for update.");
    termDaysFeedback.classList.add("show-message", "error");
    termDaysFeedback.innerHTML = "No term days record selected";
    setTimeout(()=>{
      termDaysFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (!academicYearId) {
    // alert("Please select academic year.");
       termDaysFeedback.classList.add("show-message", "error");
    termDaysFeedback.innerHTML = "Please select academic year";
    setTimeout(()=>{
      termDaysFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (!termId) {
    // alert("Please select term.");
       termDaysFeedback.classList.add("show-message", "error");
    termDaysFeedback.innerHTML = "Please select term";
    setTimeout(()=>{
      termDaysFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  if (totalDaysValue === "") {
    // alert("Please enter total days.");
       termDaysFeedback.classList.add("show-message", "error");
    termDaysFeedback.innerHTML = "Please enter total days";
    setTimeout(()=>{
      termDaysFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  const totalDays = Number(totalDaysValue);

  if (Number.isNaN(totalDays) || totalDays < 0) {
    // alert("Please enter a valid total days value.");
       termDaysFeedback.classList.add("show-message", "error");
    termDaysFeedback.innerHTML = "Please enter a valid total days value";
    setTimeout(()=>{
      termDaysFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  const { error } = await supabaseTermDays
    .from("term_days")
    .update({
      academic_year_id: academicYearId,
      term_id: termId,
      total_days: totalDays
    })
    .eq("id", editingTermDaysId);

  if (error) {
    console.error("Error updating term days:", error.message);
    // alert("Failed to update term days.");
       termDaysFeedback.classList.add("show-message", "error");
    termDaysFeedback.innerHTML = "Failed to update term days";
    setTimeout(()=>{
      termDaysFeedback.classList.remove("show-message", "error");
    }, 3000);
    return;
  }

  // alert("✅ Term days updated successfully");
     termDaysFeedback.classList.add("show-message", "success");
    termDaysFeedback.innerHTML = "Tem days updated successfully";
    setTimeout(()=>{
      termDaysFeedback.classList.remove("show-message", "success");
    }, 3000);
  closeAddDays();
  await loadTermDaysTable();

  // lets any open report (e.g. the attendance report) pick up the new total
  document.dispatchEvent(new CustomEvent("term-days-updated"));
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