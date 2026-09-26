const supabaseReportSettings = window.supabaseClient;

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadReportSettingsTable();
  await loadTermsForReportModal();
  await loadYearsForReportModal();
  bindReportSettingsEvents();
});

const feedBackResponse = document.getElementById("form-feedback");

/* =====================================
   EVENTS
===================================== */
function bindReportSettingsEvents() {
  document
    .getElementById("save-report-settings-btn")
    ?.addEventListener("click", updateReportSettings);

  document
    .getElementById("close-report-settings-modal-btn")
    ?.addEventListener("click", closeReportSettingsModal);

  document
    .getElementById("edit-report-settings-modal")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "edit-report-settings-modal") {
        closeReportSettingsModal();
      }
    });
}

/* =====================================
   LOAD TABLE
===================================== */
async function loadReportSettingsTable() {
  const tableBody = document.getElementById("reports-terms-settings");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;

  const { data, error } = await supabaseReportSettings
    .from("report_settings")
    .select(`
      id,
      vacation_date,
      next_term_date,
      term_id,
      academic_year_id,
      terms ( name ),
      academic_years ( year_name )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error.message);
    tableBody.innerHTML = `<tr><td colspan="5">Failed to load.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5">No data found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = data.map(item => {
    return `
      <tr>
        <td>${item.terms?.name || "-"}</td>
        <td>${item.academic_years?.year_name || "-"}</td>
        <td>${formatDate(item.vacation_date)}</td>
        <td>${formatDate(item.next_term_date)}</td>
        <td>
          <button onclick="openReportSettingsModal(
            '${item.id}',
            '${item.term_id}',
            '${item.academic_year_id}',
            '${item.vacation_date}',
            '${item.next_term_date}'
          )" class="edit-btn">
            <i class="fa-solid fa-pen-to-square"></i> Update
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

/* =====================================
   LOAD TERMS (FOR MODAL)
===================================== */
async function loadTermsForReportModal() {
  const select = document.getElementById("edit-report-term");
  if (!select) return;

  const { data } = await supabaseReportSettings
    .from("terms")
    .select("id, name")
    .order("created_at", { ascending: false });

  select.innerHTML = `<option value="">Select term</option>`;

  (data || []).forEach(term => {
    const option = document.createElement("option");
    option.value = term.id;
    option.textContent = term.name;
    select.appendChild(option);
  });
}

/* =====================================
   LOAD YEARS (FOR MODAL)
===================================== */
async function loadYearsForReportModal() {
  const select = document.getElementById("edit-report-year");
  if (!select) return;

  const { data } = await supabaseReportSettings
    .from("academic_years")
    .select("id, year_name")
    .order("created_at", { ascending: false });

  select.innerHTML = `<option value="">Select year</option>`;

  (data || []).forEach(year => {
    const option = document.createElement("option");
    option.value = year.id;
    option.textContent = year.year_name;
    select.appendChild(option);
  });
}

/* =====================================
   OPEN MODAL
===================================== */
function openReportSettingsModal(id, termId, yearId, vacation, nextTerm) {
  document.getElementById("edit-report-id").value = id;
  document.getElementById("edit-report-term").value = termId;
  document.getElementById("edit-report-year").value = yearId;
  document.getElementById("edit-vacation-date").value = vacation || "";
  document.getElementById("edit-next-term-date").value = nextTerm || "";

  document.getElementById("edit-report-settings-modal").style.display = "flex";
}

/* =====================================
   CLOSE MODAL
===================================== */
function closeReportSettingsModal() {
  document.getElementById("edit-report-settings-modal").style.display = "none";
}

/* =====================================
   UPDATE
===================================== */
async function updateReportSettings() {
  const id = document.getElementById("edit-report-id").value;
  const termId = document.getElementById("edit-report-term").value;
  const yearId = document.getElementById("edit-report-year").value;
  const vacation = document.getElementById("edit-vacation-date").value;
  const nextTerm = document.getElementById("edit-next-term-date").value;

  if (!termId || !yearId || !vacation || !nextTerm) {
    feedBackResponse.classList.add("show-message", "error");
feedBackResponse.innerHTML = '<i class="fa-solid fa-xmark"></i> Please fill all fields';
setTimeout(()=>{
    feedBackResponse.classList.remove("show-message", "error");
}, 3000);
    return;
  }

  const { error } = await supabaseReportSettings
    .from("report_settings")
    .update({
      term_id: termId,
      academic_year_id: yearId,
      vacation_date: vacation,
      next_term_date: nextTerm
    })
    .eq("id", id);

  if (error) {
    console.error(error.message);
    alert("Update failed");
    return;
  }

feedBackResponse.classList.add("show-message", "success");
feedBackResponse.innerHTML = '<i class="fa-solid fa-circle-check"></i> Updated successfully';
setTimeout(()=>{
    feedBackResponse.classList.remove("show-message", "success");
}, 3000);
  closeReportSettingsModal();
  loadReportSettingsTable();
}

/* =====================================
   FORMAT DATE
===================================== */
function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
}