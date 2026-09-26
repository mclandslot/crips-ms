// const supabaseClientCall = window.supabaseClient;

// const addStudentBtn = document.getElementById("addStudentBnt");

// if (addStudentBtn) {
//   addStudentBtn.addEventListener("click", registerStudent);
// }

// const studentAlerts = document.getElementById("form-feedback");

// async function registerStudent(e) {
//   e.preventDefault();

//   // STUDENT DATA
//   const admissionNumber = document.getElementById("admission-number").value.trim();
//   const admissionDate = document.getElementById("admissionDate").value;
//   const surname = document.getElementById("surname-student").value.trim();
//   const firstName = document.getElementById("first-name-student").value.trim();
//   const dob = document.getElementById("datePicker").value;
//   const gender = document.getElementById("studentGender").value;
//   const studentClass = document.getElementById("studentClass").value;
//   const section = document.getElementById("studentSection").value;
//   const status = document.getElementById("studentStatus").value;

//   const successAlert = document.getElementById("success-show");
//   const errorAlert = document.getElementById("success-show");

//   // PARENT DATA
//   const parentName = document.getElementById("parenFullName").value.trim();
//   const relationship = document.getElementById("parentRelationship").value;
//   const parentPhone = document.getElementById("parentPhone").value.trim();
//   const parentAddress = document.getElementById("parentAddress").value.trim();
//   const staffType = document.getElementById("workArea").value;

//   if ( !surname || !firstName || !studentClass) {
//     studentAlerts.classList.add("show-message", "error");
//    studentAlerts.innerHTML = '<i class="fa-solid fa-check"></i> Enter firstname, surname and class';
//     setTimeout(()=>{
//       studentAlerts.classList.remove('show-message', 'error');
   
//     }, 3000)
//     return;
//   }

//   try {

//     /* =============================
//        1️⃣ Upload Picture (if exists)
//     ============================== */

//     let pictureUrl = null;
//     const pictureFile = document.getElementById("studentPicture").files[0];

//     if (pictureFile) {
//       const filePath = `students/${Date.now()}-${pictureFile.name}`;

//       const { error: uploadError } = await supabaseClientCall.storage
//         .from("student-pictures")
//         .upload(filePath, pictureFile);

//       if (uploadError) {
//         alert(uploadError.message);
//         return;
//       }

//       const { data } = supabaseClientCall.storage
//         .from("student-pictures")
//         .getPublicUrl(filePath);

//       pictureUrl = data.publicUrl;
//     }

//     /* =============================
//        2️⃣ Insert Student
//     ============================== */

//     const { data: studentData, error: studentError } =
//       await supabaseClientCall
//         .from("students")
//         .insert({
//           admission_number: admissionNumber || null,
//           admission_date: admissionDate || null,
//           surname: surname,
//           first_name: firstName,
//           date_of_birth: dob || null,
//           gender: gender || null,
//           class: studentClass,
//           section: section,
//           status: status,
//           picture_url: pictureUrl
//         })
//         .select()
//         .single();

//     if (studentError) {
//       alert(studentError.message);
//       return;
//     }

//     /* =============================
//        3️⃣ Insert Parent
//     ============================== */

//     const { error: parentError } = await supabaseClientCall
//       .from("parents")
//       .insert({
//         student_id: studentData.id,
//         full_name: parentName,
//         relationship: relationship,
//         phone: parentPhone,
//         address: parentAddress,
//         staff_type: staffType
//       });

//     if (parentError) {
//       alert(parentError.message);
//       return;
//     }

//       studentAlerts.classList.add("show-message", "success");
//    studentAlerts.innerHTML = '<i class="fa-solid fa-check"></i> Student registered successfully!';
//     setTimeout(()=>{
//        studentAlerts.classList.remove('show-message', 'success');
//     }, 3000)

//   } catch (err) {
//     console.error("Student registration error:", err);
//   }
// }

