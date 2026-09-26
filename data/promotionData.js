const supabasePromotionAdmin = window.supabaseClient;

/* =====================================
   GLOBALS
===================================== */
let promotionStudents = [];

const promotionOrder = [
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4A",
  "Primary 4B",
  "Primary 5A",
  "Primary 5B",
  "Primary 6A",
  "Primary 6B"
];

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadPromotionClasses();

  document
    .getElementById("load-promotion-students-btn")
    ?.addEventListener("click", async () => {
      await loadStudentsForPromotion();
    });

  document
    .getElementById("promote-class-btn")
    ?.addEventListener("click", async () => {
      await promoteAllStudentsInSelectedClass();
    });
});

/* =====================================
   HELPERS
===================================== */
function normalizePromotionText(value) {
  return String(value || "").trim().toLowerCase();
}

function getNextClassNameForPromotion(currentClassName) {
  const normalized = normalizePromotionText(currentClassName);

  const index = promotionOrder.findIndex(
    (name) => normalizePromotionText(name) === normalized
  );

  if (index === -1) return null;

  const current = promotionOrder[index];

  if (current === "Primary 6A" || current === "Primary 6B") {
    return "COMPLETED";
  }

  return promotionOrder[index + 1] || null;
}

function escapePromotionHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =====================================
   LOAD CLASSES
===================================== */
async function loadPromotionClasses() {
  const select = document.getElementById("promotion-class-select");
  if (!select) return;

  select.innerHTML = `<option value="">Loading classes...</option>`;

  const { data, error } = await supabasePromotionAdmin
    .from("classes")
    .select("id, class_name")
    .order("class_name", { ascending: true });

  if (error) {
    console.error("Error loading classes:", error.message);
    select.innerHTML = `<option value="">Failed to load classes</option>`;
    return;
  }

  select.innerHTML = `<option value="">Select Class</option>`;

  (data || []).forEach((cls) => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.class_name;
    select.appendChild(option);
  });
}

/* =====================================
   LOAD STUDENTS FOR PREVIEW
===================================== */
async function loadStudentsForPromotion() {
  const classSelect = document.getElementById("promotion-class-select");
  const tableBody = document.getElementById("promotion-students-table-body");
  const totalEl = document.getElementById("promotion-total-students");
  const infoEl = document.getElementById("promotion-preview-info");

  if (!classSelect || !tableBody) return;

  const selectedClassId = classSelect.value;
  const selectedClassName =
    classSelect.options[classSelect.selectedIndex]?.textContent || "";

  if (!selectedClassId) {
    alert("Please select a class.");
    return;
  }

  tableBody.innerHTML = `<tr><td colspan="5">Loading students...</td></tr>`;
  if (infoEl) infoEl.innerHTML = "";

  const { data, error } = await supabasePromotionAdmin
    .from("students")
    .select(`
      id,
      surname,
      first_name,
      gender,
      status,
      class_id,
      classes!students_class_id_fkey (
        id,
        class_name
      )
    `)
    .eq("class_id", selectedClassId)
    .eq("status", "Present")
    .order("surname", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error loading students for promotion:", error.message);
    tableBody.innerHTML = `<tr><td colspan="5">Failed to load students.</td></tr>`;
    if (totalEl) totalEl.textContent = "0";
    return;
  }

  promotionStudents = sortStudentsByName(data);

  if (totalEl) {
    totalEl.textContent = promotionStudents.length;
  }

  if (!promotionStudents.length) {
    tableBody.innerHTML = `<tr><td colspan="5">No active students found in ${escapePromotionHtml(selectedClassName)}.</td></tr>`;
    return;
  }

  if (infoEl) {
    infoEl.innerHTML = `<p><strong>Preview:</strong> Students in ${escapePromotionHtml(selectedClassName)} will be promoted when you click <strong>Promote All Students</strong>.</p>`;
  }

  tableBody.innerHTML = promotionStudents
    .map((student, index) => {
      const fullName = studentFullName(student) || "-";

      const currentClassName = student.classes?.class_name || "-";
      const nextClassName = getNextClassNameForPromotion(currentClassName);

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapePromotionHtml(fullName)}</td>
          <td>${escapePromotionHtml(currentClassName)}</td>
          <td>${escapePromotionHtml(nextClassName === "COMPLETED" ? "Completed" : (nextClassName || "-"))}</td>
          <td>${escapePromotionHtml(student.status || "-")}</td>
        </tr>
      `;
    })
    .join("");
}

/* =====================================
   GET CLASS ID BY NAME
===================================== */
async function getPromotionClassIdByName(className) {
  const { data, error } = await supabasePromotionAdmin
    .from("classes")
    .select("id, class_name")
    .eq("class_name", className)
    .maybeSingle();

  if (error) {
    console.error("Error getting class by name:", error.message);
    return null;
  }

  return data?.id || null;
}

/* =====================================
   PROMOTE ALL STUDENTS
===================================== */
async function promoteAllStudentsInSelectedClass() {
  const classSelect = document.getElementById("promotion-class-select");

  if (!classSelect) return;

  const selectedClassId = classSelect.value;
  const selectedClassName =
    classSelect.options[classSelect.selectedIndex]?.textContent || "";

  if (!selectedClassId) {
    alert("Please select a class.");
    return;
  }

  if (!promotionStudents.length) {
    await loadStudentsForPromotion();
  }

  if (!promotionStudents.length) {
    alert("No present students found in this class.");
    return;
  }

  /* not a delete, but the same prompt: promotion moves every pupil in the
     class at once and there is no undo button for it */
  const proceed = await confirmAction({
    title: "Promote this class?",
    message: `All active students in ${selectedClassName} will be moved to the next class.`,
    details: [`${promotionStudents.length} student(s) will be promoted`],
    confirmText: "Promote class",
    tone: "primary"
  });

  if (!proceed) return;

  let successCount = 0;
  let failedCount = 0;

  for (const student of promotionStudents) {
    const currentClassName = student.classes?.class_name || "";
    const nextClassName = getNextClassNameForPromotion(currentClassName);

    if (!nextClassName) {
      failedCount++;
      continue;
    }

    if (nextClassName === "COMPLETED") {
      const { error } = await supabasePromotionAdmin
        .from("students")
        .update({
          class_id: null,
          /* "Complete" with a capital C: that is what the status dropdown
             writes and what every count filters on. Writing "completed"
             here left these pupils uncounted on both sides */
          status: "Complete"
        })
        .eq("id", student.id);

      if (error) {
        console.error(`Failed to complete student ${student.id}:`, error.message);
        failedCount++;
      } else {
        successCount++;
      }

      continue;
    }

    const nextClassId = await getPromotionClassIdByName(nextClassName);

    if (!nextClassId) {
      console.error(`Next class not found: ${nextClassName}`);
      failedCount++;
      continue;
    }

    const { error } = await supabasePromotionAdmin
      .from("students")
      .update({
        class_id: nextClassId,
        status: "Present"
      })
      .eq("id", student.id);

    if (error) {
      console.error(`Failed to promote student ${student.id}:`, error.message);
      failedCount++;
    } else {
      successCount++;
    }
  }

  alert(
    `Promotion complete.\nSuccessful: ${successCount}\nFailed: ${failedCount}`
  );

  promotionStudents = [];
  await loadStudentsForPromotion();
}