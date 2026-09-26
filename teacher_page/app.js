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

  // loader page shown
  function loadApp(){
    const loaderPage = document.getElementById("loader");
    setTimeout(()=>{
  loaderPage.style.display = "none";
    }, 3000)
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


    // function to show notification box
    // a class, not style.display: the panel is a flex column, so setting
    // display:block would stop the body scrolling under a fixed header
    document.getElementById("show-notice").addEventListener("click", ()=>{
      document.querySelector(".notification-wrapper").classList.toggle("pop");
    })

        // function to close notification box
    document.getElementById("close-notice-wrapper").addEventListener("click", ()=>{
      document.querySelector(".notification-wrapper").classList.remove("pop");
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


  // all content nav clicks
  // function to show home dashboard
function homeDashShow(){
  const attendanceMarking = document.getElementById("Attendance-marking");
  attendanceMarking.style.display = "none";

  const homeDashboard = document.getElementById("home");
  homeDashboard.style.display = "block";

  const markEntering = document.getElementById("marks-entering");
  markEntering.style.display = "none";

    const attendanceTrack = document.getElementById("viewMarkAttendance");
  attendanceTrack.style.display = "none";

    const classSubject = document.getElementById("class-subjects");
  classSubject.style.display = "none";

      const allStudentsList = document.getElementById("class-name");
  allStudentsList.style.display = "none";

      const viewScores = document.getElementById("sheet-Scores");
    viewScores.style.display = "none";

       const reportsCardShow = document.getElementById('report-remarks-dash');
  reportsCardShow.style.display = "none";

}

// function for marks entering page
function marksEnteringShow(){
  const attendanceMarking = document.getElementById("Attendance-marking");
  attendanceMarking.style.display = "none";

  const homeDashboard = document.getElementById("home");
  homeDashboard.style.display = "none";

  const markEntering = document.getElementById("marks-entering");
  markEntering.style.display = "block";

    const attendanceTrack = document.getElementById("viewMarkAttendance");
  attendanceTrack.style.display = "none";

    const classSubject = document.getElementById("class-subjects");
  classSubject.style.display = "none";

      const allStudentsList = document.getElementById("class-name");
  allStudentsList.style.display = "none";

      const viewScores = document.getElementById("sheet-Scores");
    viewScores.style.display = "none";

       const reportsCardShow = document.getElementById('report-remarks-dash');
  reportsCardShow.style.display = "none";
}


// Attendance-marking function
function attendance(){
  const attendanceMarking = document.getElementById("Attendance-marking");
  attendanceMarking.style.display = "block";

  const homeDashboard = document.getElementById("home");
  homeDashboard.style.display = "none";

  const markEntering = document.getElementById("marks-entering");
  markEntering.style.display = "none";

  const attendanceTrack = document.getElementById("viewMarkAttendance");
  attendanceTrack.style.display = "none";

    const classSubject = document.getElementById("class-subjects");
  classSubject.style.display = "none";

      const allStudentsList = document.getElementById("class-name");
  allStudentsList.style.display = "none";

      const viewScores = document.getElementById("sheet-Scores");
    viewScores.style.display = "none";

       const reportsCardShow = document.getElementById('report-remarks-dash');
  reportsCardShow.style.display = "none";
}

// attendance view function
function attendanceReview(){
  const attendanceMarking = document.getElementById("Attendance-marking");
  attendanceMarking.style.display = "none";

  const homeDashboard = document.getElementById("home");
  homeDashboard.style.display = "none";

  const markEntering = document.getElementById("marks-entering");
  markEntering.style.display = "none";

   const classSubject = document.getElementById("class-subjects");
  classSubject.style.display = "none";

  const attendanceTrack = document.getElementById("viewMarkAttendance");
  attendanceTrack.style.display = "block";

      const allStudentsList = document.getElementById("class-name");
  allStudentsList.style.display = "none";

     const reportsCardShow = document.getElementById('report-remarks-dash');
  reportsCardShow.style.display = "none";
}

// all class and subject view function
function allClassSubjects(){
  const attendanceMarking = document.getElementById("Attendance-marking");
  attendanceMarking.style.display = "none";

  const homeDashboard = document.getElementById("home");
  homeDashboard.style.display = "none";

  const markEntering = document.getElementById("marks-entering");
  markEntering.style.display = "none";

   const classSubject = document.getElementById("class-subjects");
  classSubject.style.display = "block";

  const attendanceTrack = document.getElementById("viewMarkAttendance");
  attendanceTrack.style.display = "none";

    const allStudentsList = document.getElementById("class-name");
  allStudentsList.style.display = "none";

      const viewScores = document.getElementById("sheet-Scores");
    viewScores.style.display = "none";

       const reportsCardShow = document.getElementById('report-remarks-dash');
  reportsCardShow.style.display = "none";
}


// function to view class name
function allStudentsNames(){

   const allStudentsList = document.getElementById("class-name");
  allStudentsList.style.display = "block";

   const attendanceMarking = document.getElementById("Attendance-marking");
  attendanceMarking.style.display = "none";

  const homeDashboard = document.getElementById("home");
  homeDashboard.style.display = "none";

  const markEntering = document.getElementById("marks-entering");
  markEntering.style.display = "none";

   const classSubject = document.getElementById("class-subjects");
  classSubject.style.display = "none";

  const attendanceTrack = document.getElementById("viewMarkAttendance");
  attendanceTrack.style.display = "none";

    const viewScores = document.getElementById("sheet-Scores");
    viewScores.style.display = "none";

       const reportsCardShow = document.getElementById('report-remarks-dash');
  reportsCardShow.style.display = "none";

}


// function to view score sheet
function viewScoreSheet(){
     const viewScores = document.getElementById("sheet-Scores");
    viewScores.style.display = "block";

   const allStudentsList = document.getElementById("class-name");
  allStudentsList.style.display = "none";

   const attendanceMarking = document.getElementById("Attendance-marking");
  attendanceMarking.style.display = "none";

  const homeDashboard = document.getElementById("home");
  homeDashboard.style.display = "none";

  const markEntering = document.getElementById("marks-entering");
  markEntering.style.display = "none";

   const classSubject = document.getElementById("class-subjects");
  classSubject.style.display = "none";

  const attendanceTrack = document.getElementById("viewMarkAttendance");
  attendanceTrack.style.display = "none";

   const reportsCardShow = document.getElementById('report-remarks-dash');
  reportsCardShow.style.display = "none";

}


function showStudentReportsDash(){

  const reportsCardShow = document.getElementById('report-remarks-dash');
  reportsCardShow.style.display = "block";

     const viewScores = document.getElementById("sheet-Scores");
    viewScores.style.display = "none";

   const allStudentsList = document.getElementById("class-name");
  allStudentsList.style.display = "none";

   const attendanceMarking = document.getElementById("Attendance-marking");
  attendanceMarking.style.display = "none";

  const homeDashboard = document.getElementById("home");
  homeDashboard.style.display = "none";

  const markEntering = document.getElementById("marks-entering");
  markEntering.style.display = "none";

   const classSubject = document.getElementById("class-subjects");
  classSubject.style.display = "none";

  const attendanceTrack = document.getElementById("viewMarkAttendance");
  attendanceTrack.style.display = "none";
}



// show mobile menu bar
document.getElementById("toggle-in-menu").addEventListener("click", ()=>{
  const mobileMenu = document.getElementById("mobile-menu");
  mobileMenu.classList.add("show-sm-menu");
})

// hide mobile menu bar
// document.getElementById("toggle-out").addEventListener("click", ()=>{
//   const mobileMenu = document.getElementById("mobile-menu");
//   mobileMenu.classList.remove("show-sm-menu");
// })

// function to close mobile side bar
window.addEventListener('click', (e)=>{
  const mobileOverSideBar = document.getElementById("mobile-menu");
  if(e.target === mobileOverSideBar){
    mobileOverSideBar.classList.remove("show-sm-menu");
  }
})


// function to show attendance list card
// document.getElementById("mark-attendance-shown-btn").addEventListener("click", ()=>{
//    const attendanceCard = document.getElementById("shows-attendance-list");
//     attendanceCard.style.display = "block";
// })


// function for marked attendance
// document.getElementById("save-attendance-btn").addEventListener("click", ()=>{
//   const successAlert = document.getElementById("success-alert");
//   successAlert.classList.add("success-alert-pop");

//   setTimeout(()=>{
//       successAlert.classList.remove("success-alert-pop");
//   }, 3000);
// })

const showMarkAttendanceListCard = document.getElementById("shows-attendance-list");
showMarkAttendanceListCard.style.display = 'none'

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

// function to hide the class & students nav
const subjectClass = document.getElementById("class__subject-card").style.display = 'none';
const attendanceClass = document.getElementById('attendance-link-card').style.display = 'none';
const manageReportCard = document.getElementById("manage-student-assigned-class-report").style.display = 'none';

