/* =====================================
   TERM ROSTER

   Shared by every sheet that is viewed for an academic year + term
   (terminal reports, assessment sheet, score sheet, order of merit,
   broadsheet, attendance).

   Promotion overwrites students.class_id, so the students table only
   knows where a pupil is NOW. A sheet for an earlier term would show
   whoever sits in the class today and drop the pupils who were actually
   there. student_term_classes keeps the class of every pupil for every
   term, and the sheets read their roster from it.

   Fallback for a term with nothing in that table: the records keep
   class_id + term_id, so the roster is rebuilt from them, plus the
   current class list when the selected term is the current term.
===================================== */
(function () {
  const rosterClient = window.supabaseClient;

  // tables that carry student_id + class_id + term_id
  const ROSTER_SOURCES = ["student_marks", "attendance", "class_teacher_remarks"];

  // keeps the .in() filter well inside the request URL limit
  const ID_CHUNK = 150;

  let academicYearsCache = null;

  async function loadAcademicYears(force = false) {
    if (academicYearsCache && !force) return academicYearsCache;

    const { data, error } = await rosterClient
      .from("academic_years")
      .select("id, year_name, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading academic years:", error.message);
      return [];
    }

    academicYearsCache = data || [];
    return academicYearsCache;
  }

  async function isActiveAcademicYear(academicYearId) {
    if (!academicYearId) return false;
    const years = await loadAcademicYears();
    return years.some((year) => year.id === academicYearId && year.is_active);
  }

  /* =====================================
     YEAR + TERM SELECTS
     the active year is picked on load, and the term list always
     belongs to the picked year
  ===================================== */
  async function fillAcademicYearSelect(select) {
    if (!select) return;

    select.innerHTML = `<option value="">Loading year...</option>`;

    const years = await loadAcademicYears(true);

    select.innerHTML = `<option value="">Select year</option>`;

    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = year.id;
      option.textContent = year.year_name || "Unnamed Year";
      if (year.is_active) option.selected = true;
      select.appendChild(option);
    });
  }

  async function fillTermSelect(termSelect, academicYearId, yearName = "") {
    if (!termSelect) return;

    if (!academicYearId) {
      termSelect.innerHTML = `<option value="">Select year first</option>`;
      return;
    }

    termSelect.innerHTML = `<option value="">Loading term...</option>`;

    const { data, error } = await rosterClient
      .from("terms")
      .select("id, name, academic_year_id, start_date, end_date, created_at")
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
      option.textContent = term.name || "Unnamed Term";
      option.dataset.termName = term.name || "";
      option.dataset.academicYear = yearName;
      option.dataset.academicYearId = academicYearId;
      option.dataset.startDate = term.start_date || "";
      option.dataset.endDate = term.end_date || "";
      termSelect.appendChild(option);
    });
  }

  async function bindYearTermSelects(yearSelectId, termSelectId) {
    const yearSelect = document.getElementById(yearSelectId);
    const termSelect = document.getElementById(termSelectId);
    if (!yearSelect || !termSelect) return;

    const refreshTerms = () =>
      fillTermSelect(
        termSelect,
        yearSelect.value,
        yearSelect.value
          ? yearSelect.options[yearSelect.selectedIndex]?.textContent?.trim() || ""
          : ""
      );

    yearSelect.addEventListener("change", refreshTerms);

    await fillAcademicYearSelect(yearSelect);
    await refreshTerms();
  }

  /* =====================================
     STUDENTS FOR A CLASS IN A TERM
     classId empty = every class (order of merit "All classes").
     Each student comes back with term_class_id, the class they
     were in for that term.

     student_term_classes (supabase/policies/student_term_classes.sql)
     records that class for every pupil, every term. Until a term has
     rows there, the roster is rebuilt from the term's records instead.
  ===================================== */
  async function loadTermStudents(options) {
    const recorded = await loadRecordedTermStudents(options);
    if (recorded) return recorded;

    return loadTermStudentsFromRecords(options);
  }

  // null = nothing recorded for this term (or the table is not there yet)
  async function loadRecordedTermStudents({
    classId = "",
    termId,
    select = "id, surname, first_name, gender, class_id"
  }) {
    let query = rosterClient
      .from("student_term_classes")
      .select(`class_id, students!inner (${select})`)
      .eq("term_id", termId);

    if (classId) query = query.eq("class_id", classId);

    const { data, error } = await query;

    if (error) {
      console.warn("student_term_classes unavailable, using term records:", error.message);
      return null;
    }

    if (!data.length) {
      // an empty class is a real answer only if the term itself is recorded
      const { count, error: countError } = await rosterClient
        .from("student_term_classes")
        .select("term_id", { count: "exact", head: true })
        .eq("term_id", termId);

      if (countError || !count) return null;
    }

    return sortStudentsByName(
      data.map((row) => ({ ...row.students, term_class_id: row.class_id }))
    );
  }

  /* includeCurrent(query) may narrow the current-class list,
     e.g. to Present pupils only */
  async function loadTermStudentsFromRecords({
    classId = "",
    termId,
    academicYearId,
    select = "id, surname, first_name, gender, class_id",
    includeCurrent = (query) => query
  }) {
    const ids = new Set();

    const sourceResults = await Promise.all(
      ROSTER_SOURCES.map((table) => {
        let query = rosterClient.from(table).select("student_id").eq("term_id", termId);
        if (classId) query = query.eq("class_id", classId);
        return query;
      })
    );

    sourceResults.forEach(({ data, error }, index) => {
      if (error) {
        console.error(`Error loading ${ROSTER_SOURCES[index]} roster:`, error.message);
        return;
      }
      (data || []).forEach((row) => row.student_id && ids.add(row.student_id));
    });

    const students = new Map();

    // today's class list belongs to the current term only
    const currentTerm = await getCurrentTerm();

    if (currentTerm ? currentTerm.id === termId : await isActiveAcademicYear(academicYearId)) {
      let currentQuery = rosterClient.from("students").select(select);
      currentQuery = classId
        ? currentQuery.eq("class_id", classId)
        : currentQuery.not("class_id", "is", null);

      const { data, error } = await includeCurrent(currentQuery);
      if (error) throw error;

      (data || []).forEach((student) => students.set(student.id, student));
    }

    const missingIds = [...ids].filter((id) => !students.has(id));

    for (let i = 0; i < missingIds.length; i += ID_CHUNK) {
      const { data, error } = await rosterClient
        .from("students")
        .select(select)
        .in("id", missingIds.slice(i, i + ID_CHUNK));

      if (error) throw error;

      (data || []).forEach((student) => students.set(student.id, student));
    }

    return sortStudentsByName([...students.values()]);
  }

  /* =====================================
     CURRENT TERM
     one rule for every portal, by the term dates:
       the latest term that has started (in progress, or during
       the holiday the one just ended, so its marks and remarks
       can still be finished)
       else the next one to start
       else the newest term created
     Not tied to the active year: the new year's Term 1 starts
     before that year is made active. A term created in advance
     changes nothing until its start date.
  ===================================== */
  const TERM_FIELDS =
    "id, name, academic_year_id, start_date, end_date, created_at, academic_years (id, year_name)";

  async function getCurrentTerm() {
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

    const lookups = [
      () =>
        rosterClient
          .from("terms")
          .select(TERM_FIELDS)
          .lte("start_date", today)
          .order("start_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1),
      () =>
        rosterClient
          .from("terms")
          .select(TERM_FIELDS)
          .gt("start_date", today)
          .order("start_date", { ascending: true })
          .limit(1),
      () =>
        rosterClient
          .from("terms")
          .select(TERM_FIELDS)
          .order("created_at", { ascending: false })
          .limit(1)
    ];

    for (const lookup of lookups) {
      const { data, error } = await lookup();

      if (error) {
        console.error("Error loading current term:", error.message);
        return null;
      }

      if (data?.length) {
        const term = data[0];
        return {
          ...term,
          year_name: term.academic_years?.year_name || ""
        };
      }
    }

    return null;
  }

  /* =====================================
     STAFF FOR A CLASS IN A TERM
     head teacher, class teacher and subject teachers as they were
     in that term (supabase/policies/term_staff.sql), with their
     names and signatures copied in.
     null = nothing recorded for this term (or the tables are not
     there yet) - the caller then uses today's assignments
  ===================================== */
  async function loadTermStaff({ termId, classId }) {
    if (!termId) return null;

    const [head, classTeacher, subjects] = await Promise.all([
      rosterClient
        .from("term_head_teachers")
        .select("teacher_id, teacher_name, signature_url")
        .eq("term_id", termId)
        .limit(1),
      classId
        ? rosterClient
            .from("term_class_teachers")
            .select("class_id, teacher_id, teacher_name, signature_url")
            .eq("term_id", termId)
            .eq("class_id", classId)
            .limit(1)
        : Promise.resolve({ data: [], error: null }),
      classId
        ? rosterClient
            .from("term_subject_teachers")
            .select("class_id, subject, teacher_id, teacher_name")
            .eq("term_id", termId)
            .eq("class_id", classId)
            .order("subject", { ascending: true })
        : Promise.resolve({ data: [], error: null })
    ]);

    const failed = head.error || classTeacher.error || subjects.error;

    if (failed) {
      console.warn("Term staff unavailable, using current assignments:", failed.message);
      return null;
    }

    const found = head.data.length || classTeacher.data.length || subjects.data.length;

    if (!found) {
      // a class with no staff is a real answer only if the term was copied
      const { count, error } = await rosterClient
        .from("term_class_teachers")
        .select("term_id", { count: "exact", head: true })
        .eq("term_id", termId);

      if (error || !count) return null;
    }

    return {
      head: head.data[0] || null,
      classTeacher: classTeacher.data[0] || null,
      subjects: subjects.data
    };
  }

  window.termRoster = {
    loadTermStaff,
    getCurrentTerm,
    loadAcademicYears,
    isActiveAcademicYear,
    fillAcademicYearSelect,
    fillTermSelect,
    bindYearTermSelects,
    loadTermStudents
  };
})();
