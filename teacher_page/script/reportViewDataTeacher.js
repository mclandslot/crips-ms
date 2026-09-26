// const supabaseClientReportViewClass = window.supabaseClient;

// // GLOBAL STATE
// // let teacherId = null;
// let assignedClassId = null;
// let assignedClassName = "";
// let termData = null;
// let teacherDataId = window.teacherId || null;
// let selectedStudentIdForRemark = null;

// /* =====================================
//    INIT
// ===================================== */
// document.addEventListener("DOMContentLoaded", async () => {
//   await getLoggedInTeacher();
//   await loadCurrentTerm();
//   await loadAssignedClassForTeacher();
//   await loadOverallClassResults();
//   setupRemarkModalEvents();
// });

// /* =====================================
//    GET LOGGED IN TEACHER
// ===================================== */
// async function getLoggedInTeacher() {
//   const { data: { user }, error } = await supabaseClientReportViewClass.auth.getUser();
  

//   if (error || !user) {
//     console.error("Teacher not logged in", error);
//     return;
//   }

//   teacherId = user.id;
//   console.log("Teacher ID:", teacherId);
// }

// /* =====================================
//    GET CURRENT TERM
// ===================================== */
// async function loadCurrentTerm() {
//   const { data, error } = await supabaseClientReportViewClass
//     .from("term_settings")
//     .select("*")
//     .limit(1);

//   if (error) {
//     console.error("Error loading term:", error.message);
//     return;
//   }

//   if (!data || data.length === 0) {
//     console.warn("No term found");
//     return;
//   }

//   termData = data[0];

//   document.getElementById("assigned-term-name").textContent =
//     `${termData.term} (${termData.academic_year})`;
// }

// /* =====================================
//    LOAD CLASS ASSIGNED TO CLASS TEACHER
// ===================================== */
// async function loadAssignedClassForTeacher() {

//   const { data, error } = await supabaseClientReportViewClass
//     .from("class_teachers")
//     .select(`
//       class_id,
//       classes (class_name)
//     `)
//     .eq("teacher_id", teacherId)
//     .maybeSingle();

//   if (error) {
//     console.error("Error loading assigned class:", error.message);
//     return;
//   }

//   if (!data) {
//     document.getElementById("assigned-class-name").textContent =
//       "No class assigned";
//     return;
//   }

//   assignedClassId = data.class_id;
//   assignedClassName = data.classes?.class_name || "Unknown Class";

//   document.getElementById("assigned-class-name").textContent = assignedClassName;

//   console.log("Assigned Class:", assignedClassId, assignedClassName);
// }

// /* =====================================
//    GRADE FUNCTION (A-F)
// ===================================== */
// function getGrade(total) {
//   if (total >= 90) return "A";
//   if (total >= 80) return "B";
//   if (total >= 70) return "C";
//   if (total >= 60) return "D";
//   return "F";
// }

// /* =====================================
//    REMARK FUNCTION
// ===================================== */
// function getRemark(total) {
//   if (total >= 90) return "EXCELLENT";
//   if (total >= 80) return "VERY GOOD";
//   if (total >= 70) return "GOOD";
//   if (total >= 60) return "AVERAGE";
//   if (total >= 50) return "WEAK PASS";
//   return "FAIL";
// }

// /* =====================================
//    POSITION FORMATTER
// ===================================== */
// function formatPosition(pos) {
//   if (pos % 100 >= 11 && pos % 100 <= 13) return pos + "TH";
//   if (pos % 10 === 1) return pos + "ST";
//   if (pos % 10 === 2) return pos + "ND";
//   if (pos % 10 === 3) return pos + "RD";
//   return pos + "TH";
// }

// /* =====================================
//    LOAD OVERALL CLASS RESULTS
// ===================================== */
// async function loadOverallClassResults() {

//   const tbody = document.getElementById("overall-result-table-body");
//   tbody.innerHTML = `<tr><td colspan="50">Loading results...</td></tr>`;

//   if (!assignedClassId || !termData) {
//     tbody.innerHTML = `<tr><td colspan="50">No class or term assigned</td></tr>`;
//     return;
//   }

//   // 1. Load students in class
//   const { data: students, error: studentError } = await supabaseClientReportViewClass
//     .from("students")
//     .select("id, surname, first_name, roll_no")
//     .eq("class_id", assignedClassId)
//     .order("surname", { ascending: true });

//   if (studentError) {
//     console.error(studentError.message);
//     tbody.innerHTML = `<tr><td colspan="50">Error loading students</td></tr>`;
//     return;
//   }

//   if (!students || students.length === 0) {
//     tbody.innerHTML = `<tr><td colspan="50">No students found</td></tr>`;
//     return;
//   }

//   const studentIds = students.map(s => s.id);

//   // 2. Load all marks for those students in the term
//   const { data: marksData, error: marksError } = await supabaseClientReportViewClass
//     .from("student_marks")
//     .select("student_id, subject, marks")
//     .eq("class_id", assignedClassId)
//     .eq("term_id", termData.id)
//     .in("student_id", studentIds);

//   if (marksError) {
//     console.error(marksError.message);
//     tbody.innerHTML = `<tr><td colspan="50">Error loading marks</td></tr>`;
//     return;
//   }

//   // 3. Get all subjects in that class for that term
//   const allSubjects = [...new Set((marksData || []).map(m => m.subject))].sort();

//   // 4. Generate table header dynamically
//   const thead = document.getElementById("overall-result-table-head");

//   let headerHTML = `
//     <tr>
//       <th>Roll No</th>
//       <th>Student Name</th>
//   `;

//   allSubjects.forEach(sub => {
//     headerHTML += `<th>${sub}</th>`;
//   });

//   headerHTML += `
//       <th>Overall</th>
//       <th>Position</th>
//       <th>Remark</th>
//       <th>Action</th>
//     </tr>
//   `;

//   thead.innerHTML = headerHTML;

//   // 5. Build student marks map
//   const marksMap = {};

//   (marksData || []).forEach(m => {
//     if (!marksMap[m.student_id]) marksMap[m.student_id] = {};
//     marksMap[m.student_id][m.subject] = m.marks || 0;
//   });

//   // 6. Compute totals for each student
//   const results = students.map(st => {
//     let total = 0;

//     allSubjects.forEach(sub => {
//       total += marksMap[st.id]?.[sub] || 0;
//     });

//     return {
//       student_id: st.id,
//       roll_no: st.roll_no || "-",
//       name: `${st.surname} ${st.first_name}`,
//       subjectMarks: marksMap[st.id] || {},
//       total
//     };
//   });

//   // 7. Sort by total for ranking
//   results.sort((a, b) => b.total - a.total);

//   // 8. Assign positions with ties
//   let lastScore = null;
//   let currentPosition = 0;

//   results.forEach((r, index) => {
//     if (r.total !== lastScore) {
//       currentPosition = index + 1;
//       lastScore = r.total;
//     }
//     r.position = currentPosition;
//   });

//   // 9. Render table body
//   tbody.innerHTML = "";

//   results.forEach((r, index) => {

//     let rowHTML = `
//       <tr>
//         <td class="roll-no">${r.roll_no}</td>
//         <td class="student-name">${r.name}</td>
//     `;

//     allSubjects.forEach(sub => {
//       const score = r.subjectMarks[sub] || 0;

//       rowHTML += `
//         <td class="subject-cell">
//           <span class="grade-pill grade-${getGrade(score).toLowerCase()}">
//             ${getGrade(score)}
//           </span>
//           <span class="score-text">${score}%</span>
//         </td>
//       `;
//     });

//     rowHTML += `
//         <td class="overall-cell">
//           <span class="grade-pill grade-${getGrade((r.total / allSubjects.length) || 0).toLowerCase()}">
//             ${getGrade((r.total / allSubjects.length) || 0)}
//           </span>
//           <span class="score-text overall-score">${r.total}</span>
//         </td>

//         <td class="position-cell">
//           <span class="position-badge">${formatPosition(r.position)}</span>
//         </td>

//         <td class="remark-cell">${getRemark((r.total / allSubjects.length) || 0)}</td>

//         <td class="action-cell">
//           <button class="remark-btn"
//             onclick="openRemarkModal('${r.student_id}', '${r.name}')">
//             Add Remark
//           </button>
//         </td>
//       </tr>
//     `;

//     tbody.innerHTML += rowHTML;
//   });
// }




// /* =====================================
//    REMARK MODAL FUNCTIONS
// ===================================== */
// function openRemarkModal(studentId, studentName) {
//   selectedStudentIdForRemark = studentId;

//   document.getElementById("remark-modal-overlay").style.display = "flex";
//   document.getElementById("remark-student-name").textContent =
//     `Student: ${studentName}`;

//   document.getElementById("remark-textarea").value = "";
// }

// function closeRemarkModal() {
//   selectedStudentIdForRemark = null;
//   document.getElementById("remark-modal-overlay").style.display = "none";
// }

// /* =====================================
//    SAVE TEACHER REMARK
// ===================================== */
// async function saveTeacherRemark() {

//   const remarkText = document.getElementById("remark-textarea").value.trim();

//   if (!remarkText) {
//     alert("Please enter a remark");
//     return;
//   }

//   if (!selectedStudentIdForRemark) {
//     alert("No student selected");
//     return;
//   }

//   const { error } = await supabaseClientReportViewClass
//     .from("class_teacher_remarks")
//     .upsert({
//       student_id: selectedStudentIdForRemark,
//       class_id: assignedClassId,
//       teacher_id: teacherId,
//       term_id: termData.id,
//       remark: remarkText
//     });

//   if (error) {
//     console.error(error.message);
//     alert("Error saving remark");
//     return;
//   }

//   alert("✅ Remark saved");
//   closeRemarkModal();
// }

// /* =====================================
//    MODAL EVENTS
// ===================================== */
// function setupRemarkModalEvents() {

//   document
//     .getElementById("close-remark-btn")
//     .addEventListener("click", closeRemarkModal);

//   document
//     .getElementById("save-remark-btn")
//     .addEventListener("click", saveTeacherRemark);
// }