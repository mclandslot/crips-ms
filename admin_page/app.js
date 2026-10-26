// active links 
const activeLinks = document.querySelectorAll(".nav-links");
activeLinks.forEach(navLink =>{
    navLink.addEventListener("click", ()=>{
        document.querySelector(".active")?.classList.remove("active");
        navLink.classList.add("active");
    })
})


  // flatpickr("#datePicker",{
  //   dateFormat: "m-d-y",
  //   defaultDate: "today"
  // });

 // loader page shown
  function loadApp(){
    const loaderPage = document.getElementById("loader-page");
    setTimeout(()=>{
  loaderPage.style.display = "none";
    }, 1000)
  };
  loadApp();


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


// alert-notification
document.getElementById("show-notification").addEventListener("click", ()=>{
    document.getElementById("alert-notification").classList.toggle("pop");
})


document.getElementById("close-x-notice").addEventListener("click", ()=>{
    document.getElementById("alert-notification").classList.remove("pop");

})


// function to add new students page/ overlay 
function showAddStudentsPage(){
     const newStudents = document.getElementById("add-student");
     newStudents.style.display = 'flex';
    //  newStudents.classList.add("showsLogsPage");

}
// function to cose add new students page/ overlay 
// function closeAddStudent(){
//      const newStudents = document.getElementById("add-student");
//      newStudents.classList.remove("showsLogsPage");

// }



// function to add new teacher page/ overlay 
function showAddTeacher(){
     const newTeachers = document.getElementById("add-teacher");
    newTeachers.style.display = "flex";

}

// function openAddClass() {
//   document.getElementById("add-class").style.display = "flex";

//   // 🔥 THIS IS THE FIX
//   loadClasses();
// }

// function to cose add new students page/ overlay 
function closeAddTeacher(){
     const newTeachers = document.getElementById("add-teacher");
     newTeachers.style.display = "none";
     newTeachers.classList.remove("active");

     /* cancelling out of an edit has to disarm edit mode as well, or the next
        Add Teacher click updates the teacher that was cancelled out of */
     window.resetTeacherForm?.();

}


// function to add new class page/ overlay 
function openAssignClassModal(){
     document.getElementById("add-class-teacher").style.display = 'flex';
}
// function to close new class page/ overlay 
function closeSubjectPage(){
     const newClass = document.getElementById("add-class-teacher");
         newClass.style.display = "none";
}

// function to add new attendance page/ overlay 
function showAddAttendance(){
     const newAttendance = document.getElementById("add-attendance");
    newAttendance.style.display = "flex";

}
// closing the "Set Term Total Days" overlay is handled by closeAddDaysSetting()
// below — closeAddDays() belongs to termDaysData.js and closes the update overlay


// function to add assign-subject page/ overlay 
// function showAddAssignSubject(){
//      const assignedSubjects = document.getElementById("assigned-subjects");
//      assignedSubjects.classList.add("showsLogsPage");
// }
// function to close assign-subject page/ overlay 
function closeSubject(){
     const assignedSubjects = document.getElementById("assigned-subjects");
     assignedSubjects.style.display = 'none';
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

       const assessmentDashboard = document.getElementById("assement-content-dash");
    assessmentDashboard.style.display = "none";

      const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

            const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";

          const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "none";

 const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

    const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

   document.getElementById("term-review-dash").style.display = "none";


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

      const assessmentDashboard = document.getElementById("assement-content-dash");
    assessmentDashboard.style.display = "none";

      const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";
          
            const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";

const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

    const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

   document.getElementById("term-review-dash").style.display = "none";


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

     const assessmentDashboard = document.getElementById("assement-content-dash");
    assessmentDashboard.style.display = "none";

      const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

            const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";

          const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "none";

      const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

    const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

   document.getElementById("term-review-dash").style.display = "none";
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

       const assessmentDashboard = document.getElementById("assement-content-dash");
    assessmentDashboard.style.display = "none";

      const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

            const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

           const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";

          const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "none";

   const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

    const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

   document.getElementById("term-review-dash").style.display = "none";
}



// function to show assessment dashboard
function showAssessmentDash(){
     const assessmentDashboard = document.getElementById("assement-content-dash");
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

          const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "none";

    const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

    const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

   document.getElementById("term-review-dash").style.display = "none";
}


// function to show terminal reports dashboard
function TerminalReportDashboardShow(){
     const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "block";

     const assessmentDashboard = document.getElementById("assement-content-dash");
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

          const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "none";

const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

   document.getElementById("term-review-dash").style.display = "none";
}

// function to show class list dashboard
function showClassDash(){
       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "block";

     const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

       const assessmentDashboard = document.getElementById("assement-content-dash");
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

          const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "none";

const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

   document.getElementById("term-review-dash").style.display = "none";
}



// every dashboard section the sidebar switches between
const ADMIN_DASH_SECTION_IDS = [
  "home-dash",
  "students-dash",
  "teacher-dash",
  "attendance-dash",
  "assement-content-dash",
  "classes-list-dash",
  "broadsheet-dash",
  "score-dash",
  "assigned-teacher-dash",
  "end-term-reports-dash",
  "term-review-dash",
  "promotion-dash"
];

// function to show order of merit dashboard
function showMeritDash(){
  ADMIN_DASH_SECTION_IDS.forEach((sectionId)=>{
    const section = document.getElementById(sectionId);
    if (section) section.style.display = "none";
  });

  const meritDashboard = document.getElementById("merit-dash");
  if (meritDashboard) meritDashboard.style.display = "block";
}

// sidebar handlers that swap the visible dashboard section
// (the rest of the sidebar only opens overlays, so it must not hide anything)
const ADMIN_SECTION_SWITCHERS = [
  "showHomeDash",
  "showStudentDashboard",
  "showTeachersDashboard",
  "showAttendanceStatus",
  "showAssessmentDash",
  "TerminalReportDashboardShow",
  "showClassDash",
  "showBroadSheet",
  "showScoreDash",
  "assignedClassTeachersDash",
  "showStudentPromotion",
  "showTermReview"
];

// the older show...() handlers don't know about the merit section,
// so hide it whenever one of them is clicked
document.addEventListener("click", (e)=>{
  const sidebarItem = e.target.closest(".navigation-container li[onclick]");
  if (!sidebarItem) return;

  const handlerName = (sidebarItem.getAttribute("onclick") || "").split("(")[0].trim();
  if (!ADMIN_SECTION_SWITCHERS.includes(handlerName)) return;

  const meritDashboard = document.getElementById("merit-dash");
  if (meritDashboard) meritDashboard.style.display = "none";
});

// function to show broadsheet dashboard
function showBroadSheet(){
      const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "block";

       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

    const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

      const assessmentDashboard = document.getElementById("assement-content-dash");
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

          const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "none";

  const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

   document.getElementById("term-review-dash").style.display = "none";
}

// function to show score sheet
function showScoreDash(){

const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "block";

    const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";

    const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

     const assessmentDashboard = document.getElementById("assement-content-dash");
    assessmentDashboard.style.display = "none";

       const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";

     const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "none";

  const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

   document.getElementById("term-review-dash").style.display = "none";
  
}


// function to show assigned class teachers sheet
function assignedClassTeachersDash(){

const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "block";

          const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";

    const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";
const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

       const assessmentDashboard = document.getElementById("assement-content-dash");
    assessmentDashboard.style.display = "none";

       const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";

       const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

   document.getElementById("term-review-dash").style.display = "none";
  
}

// function to show promotion of students
function showStudentPromotion(){
   const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'block';

  const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "block";

          const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";

    const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";
const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

       const assessmentDashboard = document.getElementById("assement-content-dash");
    assessmentDashboard.style.display = "none";

       const attendanceDashboard = document.getElementById("attendance-dash");
     attendanceDashboard.style.display = "none";

      const teacherDashboard = document.getElementById("teacher-dash");
     teacherDashboard.style.display = "none";

     const studentDashboard = document.getElementById("students-dash");
     studentDashboard.style.display = "none";

     const homeDashboard = document.getElementById("home-dash");
     homeDashboard.style.display = "none";

      document.getElementById("term-review-dash").style.display = "none";
}




// function to show term review set
function showTermReview(){
   document.getElementById("term-review-dash").style.display = "block";

     const promotionCardShow = document.getElementById('promotion-dash');
  promotionCardShow.style.display = 'none';

  const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
         assignedTeacherDashboard.style.display = "block";

          const scoreDashboard = document.getElementById("score-dash");
          scoreDashboard.style.display = "none";

    const broadDashboard = document.getElementById("broadsheet-dash");
          broadDashboard.style.display = "none";

       const classDashboard = document.getElementById("classes-list-dash");
          classDashboard.style.display = "none";
const termReportDashboard = document.getElementById("end-term-reports-dash");
    termReportDashboard.style.display = "none";

       const assessmentDashboard = document.getElementById("assement-content-dash");
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


// function showStudentReportsDash(){

//   const reportsCardShow = document.getElementById("terminal-dashboard");
//   reportsCardShow.style.display = "block";

//   const assignedTeacherDashboard = document.getElementById("assigned-teacher-dash");
//        assignedTeacherDashboard.style.display = "none";

//           const scoreDashboard = document.getElementById("score-dash");
//           scoreDashboard.style.display = "none";

//     const broadDashboard = document.getElementById("broadsheet-dash");
//           broadDashboard.style.display = "none";

//        const classDashboard = document.getElementById("classes-list-dash");
//           classDashboard.style.display = "none";

//     //  const termReportDashboard = document.getElementById("terminal-dashboard");
//     // termReportDashboard.style.display = "none";

//      const assessmentDashboard = document.getElementById("assessment-dash");
//     assessmentDashboard.style.display = "none";

//        const attendanceDashboard = document.getElementById("attendance-dash");
//      attendanceDashboard.style.display = "none";

//       const teacherDashboard = document.getElementById("teacher-dash");
//      teacherDashboard.style.display = "none";

//      const studentDashboard = document.getElementById("students-dash");
//      studentDashboard.style.display = "none";

//      const homeDashboard = document.getElementById("home-dash");
//      homeDashboard.style.display = "none";
// }




// function to show assessment generation
document.getElementById("generation-id").addEventListener("click", ()=>{
     const assessmentForm = document.getElementById("assessment-table-container");
     assessmentForm.style.display = "block";
})

//function to close-student-details
// document.getElementById("close-student-details").addEventListener("click", ()=>{
//      const studentDetails = document.getElementById("students-details-overlay");
//      studentDetails.style.display = "none";
// })

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


// function to open academic year
document.getElementById("academic-new-date-btn").addEventListener('click', ()=>{
  const newAcademicYear = document.getElementById("setAcademicDateOverlay");
  newAcademicYear.style.display = "flex";
})

document.getElementById("close-academic-report-details").addEventListener('click', ()=>{
  const newAcademicYear = document.getElementById("setAcademicDateOverlay");
  newAcademicYear.style.display = "none";
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


const activeReviewTerms = document.querySelectorAll(".reports-btn-review");
activeReviewTerms.forEach(activeReviewTerm =>{
  activeReviewTerm.addEventListener("click", ()=>{
    document.querySelector(".active-review")?.classList.remove("active-review");
    activeReviewTerm.classList.add("active-review");
  })
})

// term review tabs: each button shows its own panel and hides the rest.
// Driven off this list so adding a tab is one line, not an edit to every
// handler.
const termReviewTabs = {
  "current-terms-btn-show": "current-terms-container",
  "report-settings-btn-show": "reports-settings-container",
  "term-days-btn-show": "term-days-container",
  "academic-years-btn-show": "academic-years-container"
};

Object.entries(termReviewTabs).forEach(([btnId, panelId]) => {
  document.getElementById(btnId)?.addEventListener("click", () => {
    Object.values(termReviewTabs).forEach((id) => {
      const panel = document.getElementById(id);
      if (panel) panel.style.display = id === panelId ? "block" : "none";
    });
  });
});


function closeAddDaysSetting(){
document.getElementById("add-attendance").style.display = "none";
}



// function to refresh page
document.getElementById('refreshPageBtn').onclick = () => location.reload();


// document.getElementById("open-reset-password-modal").addEventListener("click", ()=>{
//   document.getElementById("reset-password-modal").style.display = "flex";
// })




// SQL UPDATE FOR THE TEACHERS LOGINS
// id = auth user id
// email = staff login email
// full_name = staff full name
// role = teacher / head_teacher / admin


document.addEventListener("DOMContentLoaded", ()=>{
  const newPassView = document.getElementById("new-pass-view");
  const newPassConfirms = document.getElementById("new-pass-confirm");
  const newPassInput = document.getElementById("reset-staff-new-password");
  const newPassInputConfirm = document.getElementById("reset-staff-confirm-password");

 newPassView.addEventListener("click", ()=>{
   if(newPassInput.type === "password"){
    newPassInput.type = "text";
    newPassView.classList.add("fa-eye");
    newPassView.classList.remove("fa-eye-slash");
  }
  else{
      newPassInput.type = "text";
    newPassView.classList.remove("fa-eye");
    newPassView.classList.add("fa-eye-slash");
  }
 });

 

 newPassConfirms.addEventListener("click", ()=>{
  if(newPassInputConfirm.type === "password"){
    newPassInputConfirm.type = "text";
    newPassConfirms.classList.add("fa-eye");
    newPassConfirms.classList.remove("fa-eye-slash");
  }
  else{
     newPassInputConfirm.type = "text";
    newPassConfirms.classList.remove("fa-eye");
    newPassConfirms.classList.add("fa-eye-slash");
  }
 });

  
});