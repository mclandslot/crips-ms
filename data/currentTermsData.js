const supabaseTermsSettings = window.supabaseClient;

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadTermsToTable();
  await loadAcademicYearsForEditModal();
  bindTermUiEvents();
  subscribeToTermChanges();
});

const currentTermsMessage = document.getElementById("form-feedback")


/* =====================================
   BIND EVENTS
===================================== */
function bindTermUiEvents() {
  document
    .getElementById("save-term-update-btn")
    ?.addEventListener("click", updateTermFromModal);

  document
    .getElementById("close-edit-term-modal-btn")
    ?.addEventListener("click", closeEditTermModal);

  document
    .getElementById("edit-term-modal")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "edit-term-modal") {
        closeEditTermModal();
      }
    });
}

/* =====================================
   LOAD TERMS INTO TABLE
===================================== */
/* showLoading is off for realtime redraws: a live refresh should not
   blink "Loading..." over a table the admin is reading */
async function loadTermsToTable({ showLoading = true } = {}) {
  const tableBody = document.getElementById("current-terms-settings");
  if (!tableBody) return;

  if (showLoading) {
    tableBody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
  }

  const { data, error } = await supabaseTermsSettings
    .from("terms")
    .select(`
      id,
      name,
      start_date,
      end_date,
      academic_year_id,
      created_at,
      academic_years (
        id,
        year_name,
        is_active
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading terms:", error.message);
    tableBody.innerHTML = `<tr><td colspan="5">Failed to load terms.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5">No terms found.</td></tr>`;
    return;
  }

  const today = new Date();

  tableBody.innerHTML = data.map((term) => {
    const isCurrent = isCurrentTerm(term.start_date, term.end_date, today);

    return `
      <tr class="${isCurrent ? "current-term-row" : ""}">
        <td>${escapeHtml(term.name || "-")}</td>
        <td>${escapeHtml(term.academic_years?.year_name || "-")}</td>
        <td>${formatDate(term.start_date)}</td>
        <td>${formatDate(term.end_date)}</td>
        <td>
          <button
            class="edit-btn"
            onclick="openEditTermModal(
              '${term.id}',
              '${escapeJs(term.name || "")}',
              '${term.academic_year_id || ""}',
              '${term.start_date || ""}',
              '${term.end_date || ""}'
            )"
          >
            <i class="fa-solid fa-pen-to-square"></i> Update
          </button>
          <button
            type="button"
            class="delete-btn"
            title="Delete term"
            aria-label="Delete term"
            onclick="deleteTermFromTable('${term.id}', '${escapeJs(term.name || "")}')"
          >
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* =====================================
   LOAD ACADEMIC YEARS FOR MODAL
===================================== */
async function loadAcademicYearsForEditModal() {
  const select = document.getElementById("edit-term-year");
  if (!select) return;

  select.innerHTML = `<option value="">Loading academic years...</option>`;

  const { data, error } = await supabaseTermsSettings
    .from("academic_years")
    .select("id, year_name, is_active")
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
    select.appendChild(option);
  });
}

/* =====================================
   OPEN / CLOSE MODAL
===================================== */
function openEditTermModal(id, name, academicYearId, startDate, endDate) {
  const modal = document.getElementById("edit-term-modal");
  const idInput = document.getElementById("edit-term-id");
  const nameInput = document.getElementById("edit-term-name");
  const yearInput = document.getElementById("edit-term-year");
  const startInput = document.getElementById("edit-term-start-date");
  const endInput = document.getElementById("edit-term-end-date");

  if (!modal || !idInput || !nameInput || !yearInput || !startInput || !endInput) {
    return;
  }

  idInput.value = id || "";
  nameInput.value = name || "";
  yearInput.value = academicYearId || "";
  startInput.value = startDate || "";
  endInput.value = endDate || "";

  modal.style.display = "flex";
}

function closeEditTermModal() {
  const modal = document.getElementById("edit-term-modal");
  if (!modal) return;

  modal.style.display = "none";

  document.getElementById("edit-term-id").value = "";
  document.getElementById("edit-term-name").value = "";
  document.getElementById("edit-term-year").value = "";
  document.getElementById("edit-term-start-date").value = "";
  document.getElementById("edit-term-end-date").value = "";
}

/* =====================================
   UPDATE TERM
===================================== */
async function updateTermFromModal() {
  const id = document.getElementById("edit-term-id")?.value.trim();
  const name = document.getElementById("edit-term-name")?.value.trim();
  const academicYearId = document.getElementById("edit-term-year")?.value;
  const startDate = document.getElementById("edit-term-start-date")?.value;
  const endDate = document.getElementById("edit-term-end-date")?.value;

  if (!id) {
    // alert("Term ID is missing.");
    currentTermsMessage.classList.add("show-message","error");
    currentTermsMessage.innerHTML = "Term ID is missing.";
    setTimeout(()=>{
      currentTermsMessage.classList.remove("show-message","error");
    }, 4000);
    return;
  }

  if (!name) {
    // alert("Please enter term name.");
      currentTermsMessage.classList.add("show-message","error");
    currentTermsMessage.innerHTML = "Please enter term name.";
    setTimeout(()=>{
      currentTermsMessage.classList.remove("show-message","error");
    }, 4000);
    return;
  }

  if (!academicYearId) {
    // alert("Please select academic year.");
       currentTermsMessage.classList.add("show-message","error");
    currentTermsMessage.innerHTML = "Please enter academic year.";
    setTimeout(()=>{
      currentTermsMessage.classList.remove("show-message","error");
    }, 4000);
    return;
  }

  if (!startDate) {
    // alert("Please select start date.");
       currentTermsMessage.classList.add("show-message","error");
    currentTermsMessage.innerHTML = "Please select start date.";
    setTimeout(()=>{
      currentTermsMessage.classList.remove("show-message","error");
    }, 4000);
    return;
  }

  if (!endDate) {
    // alert("Please select end date.");
       currentTermsMessage.classList.add("show-message","error");
    currentTermsMessage.innerHTML = "Please select end date.";
    setTimeout(()=>{
      currentTermsMessage.classList.remove("show-message","error");
    }, 4000);
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    // alert("Start date cannot be after end date.");
       currentTermsMessage.classList.add("show-message","error");
    currentTermsMessage.innerHTML = "Start date cannot be after end date.";
    setTimeout(()=>{
      currentTermsMessage.classList.remove("show-message","error");
    }, 4000);
    return;
  }

  const { error } = await supabaseTermsSettings
    .from("terms")
    .update({
      name,
      academic_year_id: academicYearId,
      start_date: startDate,
      end_date: endDate
    })
    .eq("id", id);

  if (error) {
    console.error("Update error:", error.message);
    // alert("Failed to update term.");
       currentTermsMessage.classList.add("show-message","error");
    currentTermsMessage.innerHTML = "Failed to update term, relogin.";
    setTimeout(()=>{
      currentTermsMessage.classList.remove("show-message","error");
    }, 4000);
    return;
  }


currentTermsMessage.classList.add("show-message", "success");
currentTermsMessage.innerHTML = '<i class="fa-solid fa-circle-check"></i> Term updated successfully';
setTimeout(()=>{
    currentTermsMessage.classList.remove("show-message", "success");
}, 4000);
  closeEditTermModal();
  await loadTermsToTable({ showLoading: false });
}

/* =====================================
   REALTIME
   The table redraws itself whenever terms change, so a term saved from
   the Academic Year form - or edited by another admin in another tab -
   appears without reloading the page.
===================================== */
function subscribeToTermChanges() {
  window.subscribeRealtime?.({
    name: "admin-terms-live",
    /* the table prints the year name beside each term, so a renamed or
       deleted year has to redraw it too */
    tables: ["terms", "academic_years"],
    delay: 250,
    onChange: async () => {
      await loadTermsToTable({ showLoading: false });

      /* refilling the dropdown would wipe what the admin has picked, so
         it only reloads while the edit modal is closed */
      const modal = document.getElementById("edit-term-modal");
      if (!modal || modal.style.display === "none" || modal.style.display === "") {
        await loadAcademicYearsForEditModal();
      }
    }
  });
}

/* =====================================
   DELETE TERM
   For terms typed in by mistake. A term that already carries marks,
   remarks or attendance is real academic data, so it is refused - the
   admin has to clear that data first (or just Update the term instead).
===================================== */
async function deleteTermFromTable(id, name) {
  if (!id) {
    showTermsMessage("Term ID is missing.", "error");
    return;
  }

  const label = name || "this term";

  /* the records are counted before anything is asked, so the dialog can
     list exactly what goes - one prompt instead of the two the old
     confirm() flow needed */
  const blockers = await countTermRelatedRecords(id);

  if (blockers.failed) {
    showTermsMessage("Could not check the term's records. Try again.", "error");
    return;
  }

  if (blockers.marks || blockers.remarks || blockers.attendance) {
    const parts = [];
    if (blockers.marks) parts.push(`${blockers.marks} mark record(s)`);
    if (blockers.remarks) parts.push(`${blockers.remarks} class teacher remark(s)`);
    if (blockers.attendance) parts.push(`${blockers.attendance} attendance record(s)`);

    showTermsMessage(
      `"${escapeHtml(label)}" cannot be deleted - it still has ${parts.join(", ")}.`,
      "error"
    );
    return;
  }

  /* term days and report dates are settings the admin entered for this
     term, so they go with it - but never without saying so first */
  const details = [];
  if (blockers.termDays) details.push("The total attendance days saved for this term");
  if (blockers.reportSettings) details.push("The report dates saved for this term");

  const proceed = await confirmAction({
    title: "Delete term?",
    message: `${label} will be removed permanently. This cannot be undone.`,
    details,
    confirmText: "Delete term",
    tone: "danger"
  });

  if (!proceed) return;

  /* delete the children first: the term row will not go if the database
     has no cascade set up on these */
  if (blockers.termDays) {
    const { error } = await supabaseTermsSettings
      .from("term_days")
      .delete()
      .eq("term_id", id);

    if (error) {
      console.error("Delete term_days error:", error.message);
      showTermsMessage("Failed to remove the term's attendance days.", "error");
      return;
    }
  }

  if (blockers.reportSettings) {
    const { error } = await supabaseTermsSettings
      .from("report_settings")
      .delete()
      .eq("term_id", id);

    if (error) {
      console.error("Delete report_settings error:", error.message);
      showTermsMessage("Failed to remove the term's report dates.", "error");
      return;
    }
  }

  const { error } = await supabaseTermsSettings
    .from("terms")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete term error:", error.message);
    showTermsMessage("Failed to delete term, relogin.", "error");
    return;
  }

  showTermsMessage(
    `<i class="fa-solid fa-circle-check"></i> Term deleted successfully`,
    "success"
  );

  await loadTermsToTable({ showLoading: false });
}

/* counts, not rows: head:true keeps the payload empty */
async function countTermRelatedRecords(termId) {
  const tables = [
    ["marks", "student_marks"],
    ["remarks", "class_teacher_remarks"],
    ["attendance", "attendance"],
    ["termDays", "term_days"],
    ["reportSettings", "report_settings"]
  ];

  const results = await Promise.all(
    tables.map(([, table]) =>
      supabaseTermsSettings
        .from(table)
        .select("term_id", { count: "exact", head: true })
        .eq("term_id", termId)
    )
  );

  const counts = { failed: false };

  results.forEach((result, index) => {
    const [key, table] = tables[index];

    if (result.error) {
      console.error(`Error counting ${table}:`, result.error.message);
      counts.failed = true;
      return;
    }

    counts[key] = result.count || 0;
  });

  return counts;
}

/* =====================================
   HELPERS
===================================== */
function showTermsMessage(html, type) {
  if (!currentTermsMessage) return;

  currentTermsMessage.classList.add("show-message", type);
  currentTermsMessage.innerHTML = html;

  setTimeout(() => {
    currentTermsMessage.classList.remove("show-message", type);
  }, 4000);
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString();
}

function isCurrentTerm(startDate, endDate, today = new Date()) {
  if (!startDate || !endDate) return false;

  const start = new Date(startDate);
  const end = new Date(endDate);

  return today >= start && today <= end;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJs(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    /* these strings land inside a double-quoted onclick attribute, so a
       stray quote in the term name would otherwise close it early */
    .replace(/"/g, "&quot;");
}