const supabaseAcademicYearsSave = window.supabaseClient;

const academicMessage = document.getElementById("form-feedback");

document.getElementById("save-year-btn")
  .addEventListener("click", saveAcademicYear);

async function saveAcademicYear() {

  const yearName =
    document.getElementById("year-name-date").value.trim();

  const isActive =
    document.getElementById("is-active-checkbox").checked;

  if (!yearName) {
    // alert("Please enter academic year");
    academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = "Please enter academic year";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  try {

    /* year_name is unique in the database, so re-entering a year that
       exists is not a mistake worth an error - it means "use this one".
       The row is written first and the other years are deactivated after,
       because the old order deactivated everything and only then tried
       the insert: a duplicate name left the school with no active year */
    const { data: savedYear, error } = await supabaseAcademicYearsSave
      .from("academic_years")
      .upsert(
        {
          year_name: yearName,
          is_active: isActive
        },
        { onConflict: "year_name" }
      )
      .select("id, year_name")
      .single();

    if (error) throw error;

    /* ✅ If setting active → deactivate every other year.

       academic_years_single_active.sql puts a trigger on the table that
       has already done this by the time the upsert returns, so this is
       normally a no-op. It stays because it is what keeps the feature
       working on a database where that file has not been run yet. */
    if (isActive) {
      const { error: resetError } =
        await supabaseAcademicYearsSave
          .from("academic_years")
          .update({ is_active: false })
          .neq("id", savedYear.id);

      if (resetError) throw resetError;
    }

    // alert("Academic Year saved successfully");
     academicMessage.classList.add("show-message", "success");
    academicMessage.innerHTML = isActive
      ? `Academic year saved - ${escapeAcademicHtml(savedYear.year_name)} is now active`
      : "Academic year saved successfully";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "success");
    }, 4000);

    // Clear form
    document.getElementById("year-name-date").value = "";
    document.getElementById("is-active-checkbox").checked = false;

    /* the dropdowns and the notification bell read this table, and the
       year list is drawn by other scripts - refresh them now instead of
       waiting for the page to be reloaded */
    if (typeof loadAcademicYearsForReport === "function") {
      await loadAcademicYearsForReport();
    }

    await loadAcademicYearsTable({ showLoading: false });

    if (typeof loadAdminAlerts === "function") {
      await loadAdminAlerts();
    }

  } catch (err) {
    /* the generic "Error saving academic year" hid the reason - postgres
       says exactly what went wrong (RLS, duplicate year, replica
       identity), so show it instead of swallowing it */
    console.error("Error saving year:", err);

    academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = `Could not save academic year: ${escapeAcademicHtml(
      err?.message || "unknown error"
    )}`;
    setTimeout(() => {
      academicMessage.classList.remove("show-message", "error");
    }, 8000);
  }
}

function escapeAcademicHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}




// const supabaseReport = window.supabaseClient;

/* =====================================
   LOAD ACADEMIC YEARS INTO DROPDOWN
===================================== */
async function loadAcademicYearsForReport() {

  const { data, error } = await supabaseAcademicYearsSave
    .from("academic_years")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("academic-year-select");

  select.innerHTML = `<option value="">Select Academic Year</option>`;

  data.forEach(year => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name;
    select.appendChild(option);
  });
}


/* =====================================
   SAVE TERM + REPORT SETTINGS
===================================== */
document.getElementById("save-report-settings")
  .addEventListener("click", saveReportSettings);

async function saveReportSettings() {

  const academicYearId =
    document.getElementById("academic-year-select").value;

  const termName =
    document.getElementById("term-name-set").value.trim();

  const startDate =
    document.getElementById("term-start-date").value;

  const endDate =
    document.getElementById("term-end-date").value;

  const vacationDate =
    document.getElementById("vacation-date").value;

  const nextTermDate =
    document.getElementById("next-term-date").value;

  if (!academicYearId || !termName) {
    // alert("Please fill all required fields");
     academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = "Please fill all required fields";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  try {

    /* =====================================
       1. CHECK OR CREATE TERM
    ===================================== */
    let termId;

    const { data: existingTerm } = await supabaseAcademicYearsSave
      .from("terms")
      .select("*")
      .eq("name", termName)
      .eq("academic_year_id", academicYearId)
      .single();

    if (existingTerm) {

      termId = existingTerm.id;

    } else {

      const { data: newTerm, error: termError } =
        await supabaseAcademicYearsSave
          .from("terms")
          .insert({
            name: termName,
            academic_year_id: academicYearId,
            start_date: startDate,
            end_date: endDate
          })
          .select()
          .single();

      if (termError) throw termError;

      termId = newTerm.id;
    }


    /* =====================================
       2. SAVE REPORT SETTINGS
    ===================================== */
    const { error: reportError } =
      await supabaseAcademicYearsSave
        .from("report_settings")
        .upsert({
          academic_year_id: academicYearId,
          term_id: termId,
          vacation_date: vacationDate,
          next_term_date: nextTermDate
        });

    if (reportError) throw reportError;


    /* =====================================
       SUCCESS
    ===================================== */
    // alert("Report settings saved successfully");
     academicMessage.classList.add("show-message", "success");
    academicMessage.innerHTML = "Report settings saved successfully";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "success");
    }, 4000);

    // Optional: reset form
    document.getElementById("term-name-set").value = "";
    document.getElementById("term-start-date").value = "";
    document.getElementById("term-end-date").value = "";
    document.getElementById("vacation-date").value = "";
    document.getElementById("next-term-date").value = "";

    /* the term settings table and the notification list are drawn by
       other scripts. Realtime redraws them anyway, but calling them here
       means the new term is on screen immediately - and it still works
       if realtime is not enabled for the table */
    if (typeof loadTermsToTable === "function") {
      await loadTermsToTable({ showLoading: false });
    }

    if (typeof loadAdminAlerts === "function") {
      await loadAdminAlerts();
    }

  } catch (err) {
    console.error("Error saving report settings:", err);

    academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = `Could not save term settings: ${escapeAcademicHtml(
      err?.message || "unknown error"
    )}`;
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "error");
    }, 8000);
  }
}


async function loadAcademicYearsForDays() {

  const { data, error } = await supabaseAcademicYearsSave
    .from("academic_years")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("select-academic-year-days");

  select.innerHTML = `<option value="">Select Academic Year</option>`;

  data.forEach(year => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name;
    select.appendChild(option);
  });
}


document.getElementById("select-academic-year-days")
  .addEventListener("change", loadTermsForSelectedYear);

async function loadTermsForSelectedYear() {

  const yearId = document.getElementById("select-academic-year-days").value;

  console.log("Selected Year ID:", yearId);

  if (!yearId) return;

  const { data, error } = await supabaseAcademicYearsSave
    .from("terms")
    .select("*")
    .eq("academic_year_id", yearId);

  console.log("TERMS FROM DB:", data);

  if (error) {
    console.error(error);
    return;
  }

  // 🔥 ALWAYS re-fetch the element at runtime
  const termSelect = document.querySelector("#select-term-add-days");

  if (!termSelect) {
    console.error("Term select not found");
    return;
  }

  // Clear
  termSelect.options.length = 0;

  // Default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select Term";
  termSelect.appendChild(defaultOption);

  // Add DB terms
  data.forEach(term => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name;
    termSelect.appendChild(option);
  });

//   console.log("Dropdown element:", termSelect);
// console.log("Options count:", termSelect.options.length);

//   console.log("✅ Dropdown populated:", termSelect.options.length);
}


// save academic days
document.getElementById("save-term-btn")
  .addEventListener("click", saveTermDays);

async function saveTermDays() {

  const academicYearId =
    document.getElementById("select-academic-year-days").value;

  const termId =
    document.getElementById("select-term-add-days").value;

  const totalDays =
    document.getElementById("total-days-for-term").value;

  if (!academicYearId || !termId || !totalDays) {
    // alert("Please fill all fields");
     academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = "Please fill all fields";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "error");
    }, 4000);
    return;
  }

  try {

    const { error } = await supabaseAcademicYearsSave
      .from("term_days")
      .upsert({
        academic_year_id: academicYearId,
        term_id: termId,
        total_days: totalDays
      });

    if (error) throw error;

    // alert("Total days saved successfully");
     academicMessage.classList.add("show-message", "success");
    academicMessage.innerHTML = "Total days saved successfully";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "success");
    }, 4000);

    // Reset
    document.getElementById("total-days-for-term").value = "";

  } catch (err) {
    console.error("Error saving term days:", err);
    // alert("Error saving data");
     academicMessage.classList.add("show-message", "error");
    academicMessage.innerHTML = "Error saving data";
    setTimeout(()=>{
      academicMessage.classList.remove("show-message", "error");
    }, 4000);
  }
}


/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", () => {
  loadAcademicYearsForReport();
   loadAcademicYearsForDays();
    loadTermsForSelectedYear();
    loadAcademicYearsTable();
    subscribeToAcademicYearChanges();
    bindAcademicYearUiEvents();
//    loadTermsForSelectedYear()


//   saveAcademicYear();
});


/* =====================================
   ACADEMIC YEARS TABLE
   Term Review -> Academic years
===================================== */
async function loadAcademicYearsTable({ showLoading = true } = {}) {
  const tableBody = document.getElementById("academic-years-body");
  if (!tableBody) return;

  if (showLoading) {
    tableBody.innerHTML = `<tr><td colspan="4">Loading academic years...</td></tr>`;
  }

  const [yearsResponse, termsResponse] = await Promise.all([
    supabaseAcademicYearsSave
      .from("academic_years")
      .select("id, year_name, is_active, created_at")
      .order("created_at", { ascending: false }),

    /* the terms are pulled once and grouped here rather than counted per
       row, so the table costs two queries no matter how many years */
    supabaseAcademicYearsSave
      .from("terms")
      .select("id, name, academic_year_id")
  ]);

  if (yearsResponse.error) {
    console.error("Error loading academic years:", yearsResponse.error.message);
    tableBody.innerHTML = `<tr><td colspan="4">Failed to load academic years.</td></tr>`;
    return;
  }

  if (termsResponse.error) {
    console.error("Error loading terms:", termsResponse.error.message);
  }

  const years = yearsResponse.data || [];

  if (!years.length) {
    tableBody.innerHTML = `<tr><td colspan="4">No academic years found.</td></tr>`;
    return;
  }

  const termsByYear = new Map();

  (termsResponse.data || []).forEach((term) => {
    if (!term.academic_year_id) return;

    const list = termsByYear.get(term.academic_year_id) || [];
    list.push(term.name || "-");
    termsByYear.set(term.academic_year_id, list);
  });

  tableBody.innerHTML = years.map((year) => {
    const termNames = termsByYear.get(year.id) || [];

    return `
      <tr class="${year.is_active ? "current-term-row" : ""}">
        <td>${escapeAcademicHtml(year.year_name || "-")}</td>
        <td>${year.is_active ? `<span class="status-pill status-active">Active</span>` : "-"}</td>
        <td>${termNames.length ? escapeAcademicHtml(termNames.join(", ")) : "-"}</td>
        <td>
          <button
            type="button"
            class="edit-btn"
            title="Update academic year"
            aria-label="Update academic year"
            onclick="openEditAcademicYearModal('${year.id}', '${escapeAcademicJs(year.year_name || "")}', ${year.is_active === true})"
          >
            <i class="fa-solid fa-pen-to-square"></i> Update
          </button>
          <button
            type="button"
            class="delete-btn"
            title="Delete academic year"
            aria-label="Delete academic year"
            onclick="deleteAcademicYear('${year.id}', '${escapeAcademicJs(year.year_name || "")}', ${year.is_active === true})"
          >
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* =====================================
   EDIT ACADEMIC YEAR
===================================== */
function bindAcademicYearUiEvents() {
  document
    .getElementById("save-academic-year-update-btn")
    ?.addEventListener("click", updateAcademicYearFromModal);

  document
    .getElementById("close-edit-academic-year-btn")
    ?.addEventListener("click", closeEditAcademicYearModal);

  /* clicking the backdrop closes it, same as the edit term modal */
  document
    .getElementById("edit-academic-year-modal")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "edit-academic-year-modal") {
        closeEditAcademicYearModal();
      }
    });
}

function openEditAcademicYearModal(id, name, isActive) {
  const modal = document.getElementById("edit-academic-year-modal");
  const idInput = document.getElementById("edit-academic-year-id");
  const nameInput = document.getElementById("edit-academic-year-name");
  const activeInput = document.getElementById("edit-academic-year-active");

  if (!modal || !idInput || !nameInput || !activeInput) return;

  idInput.value = id || "";
  nameInput.value = name || "";
  activeInput.checked = isActive === true;

  /* the active year cannot be switched off from here - something has to
     stay active, so activate a different year instead */
  activeInput.disabled = isActive === true;

  modal.style.display = "flex";
}

function closeEditAcademicYearModal() {
  const modal = document.getElementById("edit-academic-year-modal");
  if (!modal) return;

  modal.style.display = "none";

  document.getElementById("edit-academic-year-id").value = "";
  document.getElementById("edit-academic-year-name").value = "";

  const activeInput = document.getElementById("edit-academic-year-active");
  activeInput.checked = false;
  activeInput.disabled = false;
}

async function updateAcademicYearFromModal() {
  const id = document.getElementById("edit-academic-year-id")?.value.trim();
  const yearName = document.getElementById("edit-academic-year-name")?.value.trim();
  const isActive = document.getElementById("edit-academic-year-active")?.checked;

  if (!id) {
    showAcademicMessage("Academic year ID is missing.", "error");
    return;
  }

  if (!yearName) {
    showAcademicMessage("Please enter the academic year.", "error");
    return;
  }

  const { error } = await supabaseAcademicYearsSave
    .from("academic_years")
    .update({
      year_name: yearName,
      is_active: isActive
    })
    .eq("id", id);

  if (error) {
    console.error("Update academic year error:", error.message);
    showAcademicMessage(
      `Could not update academic year: ${escapeAcademicHtml(error.message)}`,
      "error"
    );
    return;
  }

  /* the trigger in academic_years_single_active.sql clears the other
     years, but this keeps activation working where it is not installed */
  if (isActive) {
    const { error: resetError } = await supabaseAcademicYearsSave
      .from("academic_years")
      .update({ is_active: false })
      .neq("id", id);

    if (resetError) {
      console.error("Error deactivating other years:", resetError.message);
    }
  }

  showAcademicMessage(
    `<i class="fa-solid fa-circle-check"></i> Academic year updated successfully`,
    "success"
  );

  closeEditAcademicYearModal();

  await loadAcademicYearsTable({ showLoading: false });
  await loadAcademicYearsForReport();

  if (typeof loadAdminAlerts === "function") {
    await loadAdminAlerts();
  }
}

/* =====================================
   DELETE ACADEMIC YEAR

   A year is only ever deleted to undo a typo. If terms hang off it they
   carry marks, attendance and report dates, so the delete is refused and
   names what is in the way instead of cascading.
===================================== */
async function deleteAcademicYear(id, name, isActive) {
  if (!id) return;

  const label = name || "this academic year";

  /* nothing activates another year automatically, so removing the active
     one leaves every dashboard reading "academic year is not set" */
  const details = isActive
    ? [`"${label}" is the ACTIVE year - the school will have no active year until you set another one.`]
    : [];

  const proceed = await confirmAction({
    title: "Delete academic year?",
    message: `${label} will be removed permanently. This cannot be undone.`,
    details,
    confirmText: "Delete year",
    tone: "danger"
  });

  if (!proceed) return;

  const { data: terms, error: termsError } = await supabaseAcademicYearsSave
    .from("terms")
    .select("name")
    .eq("academic_year_id", id);

  if (termsError) {
    console.error("Error checking terms for year:", termsError.message);
    showAcademicMessage("Could not check the year's terms. Try again.", "error");
    return;
  }

  if (terms && terms.length) {
    const names = terms.map((term) => term.name || "-").join(", ");

    showAcademicMessage(
      `Cannot delete "${escapeAcademicHtml(label)}" - it still has ${terms.length} term(s): ${escapeAcademicHtml(names)}. Delete those first from Term settings.`,
      "error"
    );
    return;
  }

  const { error } = await supabaseAcademicYearsSave
    .from("academic_years")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete academic year error:", error.message);
    showAcademicMessage(
      `Could not delete academic year: ${escapeAcademicHtml(error.message)}`,
      "error"
    );
    return;
  }

  showAcademicMessage(
    `<i class="fa-solid fa-circle-check"></i> ${escapeAcademicHtml(label)} deleted`,
    "success"
  );

  await loadAcademicYearsTable({ showLoading: false });
  await loadAcademicYearsForReport();

  if (typeof loadAdminAlerts === "function") {
    await loadAdminAlerts();
  }
}

/* =====================================
   REALTIME
===================================== */
function subscribeToAcademicYearChanges() {
  window.subscribeRealtime?.({
    name: "admin-academic-years-live",
    /* terms is watched too: the Terms column lists them, and it is what
       decides whether a year can be deleted */
    tables: ["academic_years", "terms"],
    delay: 300,
    onChange: async () => {
      await loadAcademicYearsTable({ showLoading: false });
      await loadAcademicYearsForReport();
    }
  });
}

function showAcademicMessage(html, type) {
  if (!academicMessage) return;

  academicMessage.classList.add("show-message", type);
  academicMessage.innerHTML = html;

  setTimeout(() => {
    academicMessage.classList.remove("show-message", type);
  }, 6000);
}

function escapeAcademicJs(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    /* lands inside a double-quoted onclick attribute */
    .replace(/"/g, "&quot;");
}


// document.getElementById("select-academic-year-days")
//   .addEventListener("change", () => {
//     loadTermsForSelectedYear();
//   });