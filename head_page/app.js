// active links 
const activeLinks = document.querySelectorAll(".nav-links");
activeLinks.forEach(navLink =>{
    navLink.addEventListener("click", ()=>{
        document.querySelector(".active")?.classList.remove("active");
        navLink.classList.add("active");
    })
})


  flatpickr("#datePicker", {
    dateFormat: "d-m-y",
    defaultDate: "today"
  });

//   for attendance date
//   flatpickr("#datePicker", {
//   maxDate: "today",
//   defaultDate: "today"
// });

 // function to show account page
    document.getElementById("show-accounts").addEventListener("click", ()=>{
    const accountPop = document.getElementById("account-model-box");
      accountPop.style.display ="block";
    })

     // function to close account page
    document.getElementById("close-accounts").addEventListener("click", ()=>{
    const accountClosePop = document.getElementById("account-model-box");
      accountClosePop.style.display ="none";
    })


// function to add new students page/ overlay 
function showAddStudents(){
     const newStudents = document.getElementById("add-student");
     newStudents.classList.add("showsLogsPage");

}
// function to cose add new students page/ overlay 
function closeAddStudent(){
     const newStudents = document.getElementById("add-student");
     newStudents.classList.remove("showsLogsPage");

}



// function to add new teacher page/ overlay 
function showAddTeacher(){
     const newTeachers = document.getElementById("add-teacher");
    newTeachers.style.display = "flex";

}

// function to cose add new students page/ overlay 
function closeAddTeacher(){
     const newTeachers = document.getElementById("add-teacher");
     newTeachers.style.display = "none";

}


// function to add new class page/ overlay 
function showAddClass(){
     const newClass = document.getElementById("add-class");
     newClass.classList.add("showsLogsPage");
}
// function to close new class page/ overlay 
function closeSubjectPage(){
     const newClass = document.getElementById("add-class");
     newClass.classList.remove("showsLogsPage");
}

// function to add new attendance page/ overlay 
function showAddAttendance(){
     const newAttendance = document.getElementById("add-attendance");
    newAttendance.style.display = "flex";

}
// function to close attendance page
function closeAddDays(){
     const newAttendance = document.getElementById("add-attendance");
     newAttendance.style.display = "none";
}


// function to add assign-subject page/ overlay 
function showAddAssignSubject(){
     const assignedSubjects = document.getElementById("assigned-subjects");
     assignedSubjects.classList.add("showsLogsPage");
}
// function to close assign-subject page/ overlay 
function closeSubject(){
     const assignedSubjects = document.getElementById("assigned-subjects");
     assignedSubjects.classList.remove("showsLogsPage");
}





// function to show all dashboard content

// function to show home dashboard
function showHomeDash(){
      const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "block";

          const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

     const assessmentDashboard = document.getElementById("assessment-dash");
    assessmentDashboard.style.display = "none";

      const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

            const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";


}

// function to show students dashboard
function showStudentDashboard(){
     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "block";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

     const assessmentDashboard = document.getElementById("assessment-dash");
    assessmentDashboard.style.display = "none";

      const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";
          
            const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";
}

// function to show teachers dashboard
function showTeachersDashboard(){
     const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "block";

     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";

     const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

     const assessmentDashboard = document.getElementById("assessment-dash");
    assessmentDashboard.style.display = "none";

      const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

            const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";
}


// function to show attendance dashboard
function showAttendanceStatus(){
     const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "block";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";

     const assessmentDashboard = document.getElementById("assessment-dash");
    assessmentDashboard.style.display = "none";

      const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

            const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";
}



// function to show assessment dashboard
function showAssessmentDash(){
     const assessmentDashboard = document.getElementById("assessment-dash");
    assessmentDashboard.style.display = "block";

       const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";

       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";


            const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";
}


// function to show terminal reports dashboard
function showTerminalReportDash(){
     const termReportDashboard = document.getElementById("terminal-dash");
    termReportDashboard.style.display = "block";

     const assessmentDashboard = document.getElementById("assessment-dash");
    assessmentDashboard.style.display = "none";

       const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";

       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

            const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";
}

// function to show class list dashboard
function showClassDash(){
       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "block";

     const termReportDashboard = document.getElementById("terminal-dash");
    termReportDashboard.style.display = "none";

     const assessmentDashboard = document.getElementById("assessment-dash");
    assessmentDashboard.style.display = "none";

       const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";

         const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";
}



// function to show broadsheet dashboard
function showBroadSheet(){
      const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "block";

       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

     const termReportDashboard = document.getElementById("terminal-dash");
    termReportDashboard.style.display = "none";

     const assessmentDashboard = document.getElementById("assessment-dash");
    assessmentDashboard.style.display = "none";

       const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";

     const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";
}

// function to show score sheet
function showScoreDash(){

const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "block";

    const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

     const termReportDashboard = document.getElementById("terminal-dash");
    termReportDashboard.style.display = "none";

     const assessmentDashboard = document.getElementById("assessment-dash");
    assessmentDashboard.style.display = "none";

       const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";
  
}




// function to show assessment generation
document.getElementById("generation-id").addEventListener("click", ()=>{
     const assessmentForm = document.getElementById("assessment-table-container");
     assessmentForm.style.display = "block";
})

//function to close-student-details
document.getElementById("close-student-details").addEventListener("click", ()=>{
     const studentDetails = document.getElementById("students-details-overlay");
     studentDetails.style.display = "none";
})

// report-new-date-btn function
document.getElementById("report-new-date-btn").addEventListener("click", ()=>{
     const reportNewData = document.getElementById("setReportDateOverlay");
      reportNewData.style.display = "flex";
})

//function to close-student-details
document.getElementById("close-set-report-details").addEventListener("click", ()=>{
     const reportNewData = document.getElementById("setReportDateOverlay");
      reportNewData.style.display = "none";
})




// function for password page
document.getElementById("password-body").addEventListener("click", ()=>{
  const showPasswordOverlay = document.getElementById("password-overlay");
  showPasswordOverlay.style.display= "flex";

   const accountClosePop = document.getElementById("account-model-box");
      accountClosePop.style.display ="none";
})

// function to close password overlay
document.getElementById("close-password-overlay").addEventListener("click", ()=>{
   const showPasswordOverlay = document.getElementById("password-overlay");
  showPasswordOverlay.style.display= "none";
})


// function for log out page
document.getElementById("log-out-body").addEventListener("click", ()=>{
  const showLogOutOverlay = document.getElementById("logout-overlay");
  showLogOutOverlay.style.display= "flex";

   const accountClosePop = document.getElementById("account-model-box");
      accountClosePop.style.display ="none";
})

// function to close log out overlay
document.getElementById("btn-no").addEventListener("click", ()=>{
    const showLogOutOverlay = document.getElementById("logout-overlay");
  showLogOutOverlay.style.display= "none";
})


// Function to toggle-dark mode
const btn = document.getElementById("darkToggle");

btn.onclick = () => {
  document.body.classList.toggle("dark");

  // save preference
  localStorage.setItem("theme", 
    document.body.classList.contains("dark") ? "dark" : "light"
  );

  const accountClosePop = document.getElementById("account-model-box");
      accountClosePop.style.display ="none";

};

// load saved theme
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}



















const tags = document.querySelectorAll(".tag");
const hiddenInput = document.getElementById("selectedSubjects");

let selected = [];

tags.forEach(tag => {
    tag.addEventListener("click", () => {
        const value = tag.dataset.value;

        if (selected.includes(value)) {
            selected = selected.filter(item => item !== value);
            tag.classList.remove("active");
        } else {
            selected.push(value);
            tag.classList.add("active");
        }

        hiddenInput.value = selected.join(",");
    });
});



// function to open logout page
function openLogs(){
    const logOut = document.getElementById("logs");
    logOut.classList.add("showsLogsPage");
}

// function to close logout page
function closeLogs(){
    const logOut = document.getElementById("logs");
    logOut.classList.remove("showsLogsPage");
}


// function showMessage(){
//     const showMessages = document.getElementById("success-alert");
//     showMessages.classList.add("showText");
//     setTimeout(()=>{
//         showMessages.classList.remove("showText");
//     }, 3000)
// }

// showMessage();




/* <script>
function myFunction() {
  let x = document.body;
  x.classList.toggle("w3-black");
}
</script> */