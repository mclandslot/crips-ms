/* =====================================
   SHARED STUDENT NAME SORTING

   Every teacher page lists the same class, so they must list it in the
   same order: males A → Z first, then females A → Z. Ordering is done
   here rather than in each query because "surname first_name" is one
   string the UI builds, not a column Postgres can sort on, and because
   four copies of this rule would drift apart.

   Loaded before the page scripts in index.html, so the helpers are on
   window by the time any of them run.
===================================== */

/* some records were imported from a numbered list, so the name can still
   carry its list position ("1. ACHEAMPONG ..."). Drop it, otherwise it
   shows in the UI and sorts 10 before 2 */
function stripLeadingNumber(value) {
  return String(value || "").replace(/^\s*\d+\s*[.)\-:]?\s*/, "").trim();
}

function studentFullName(student) {
  const surname = stripLeadingNumber(student?.surname);
  const firstName = stripLeadingNumber(student?.first_name);

  return `${surname} ${firstName}`.trim();
}

/* males 0, females 1, anything missing/unknown last */
function genderRank(student) {
  const gender = String(student?.gender || "").trim().toLowerCase();

  if (gender === "male") return 0;
  if (gender === "female") return 1;
  return 2;
}

function compareStudentsByName(a, b) {
  const rankDiff = genderRank(a) - genderRank(b);
  if (rankDiff !== 0) return rankDiff;

  return studentFullName(a).localeCompare(studentFullName(b), undefined, {
    sensitivity: "base",
    numeric: true
  });
}

/* getStudent pulls the student out of a row that only joins one, the way
   the score sheet reads student_marks.students. Left off, the rows are
   the students themselves. */
function sortStudentsByName(rows, getStudent) {
  const pick = typeof getStudent === "function" ? getStudent : (row) => row;

  return (rows || [])
    .slice()
    .sort((a, b) => compareStudentsByName(pick(a), pick(b)));
}

window.stripLeadingNumber = stripLeadingNumber;
window.studentFullName = studentFullName;
window.compareStudentsByName = compareStudentsByName;
window.sortStudentsByName = sortStudentsByName;
