// function show active clicked links
const navLinks = document.querySelectorAll(".nav-links");
navLinks.forEach(navLink =>{
    navLink.addEventListener("click", ()=>{
        document.querySelector(".active")?.classList.remove("active");
       navLink.classList.add("active");
    });
});


// function dashboard content view home dash
document.getElementById("dashboard-overview-content").addEventListener("click", ()=>{
    document.getElementById("home-view").style.display = "block";
    document.getElementById("class-performance").style.display = "none";
    document.getElementById("attendance-overview").style.display = "none";
    document.getElementById("students-data").style.display = "none";
       document.getElementById("teachers-data").style.display = "none";
       document.getElementById("class-scored-data-section-dash").style.display = "none";
       document.getElementById("broad-sheet-data").style.display = "none";
 document.getElementById("terminal-reports-dash").style.display = "none";

})

// function dashboard content view student
document.getElementById("students-data-content").addEventListener("click", ()=>{
    document.getElementById("home-view").style.display = "none";
    document.getElementById("class-performance").style.display = "none";
    document.getElementById("attendance-overview").style.display = "none";
    document.getElementById("students-data").style.display = "block";
       document.getElementById("teachers-data").style.display = "none";
       document.getElementById("class-scored-data-section-dash").style.display = "none";
       document.getElementById("broad-sheet-data").style.display = "none";
 document.getElementById("terminal-reports-dash").style.display = "none";
  
   });

// function dashboard content view class performance
document.getElementById("class-performance-content").addEventListener("click", ()=>{
    document.getElementById("home-view").style.display = "none";
    document.getElementById("class-performance").style.display = "block";
    document.getElementById("attendance-overview").style.display = "none";
    document.getElementById("students-data").style.display = "none";
       document.getElementById("teachers-data").style.display = "none";
       document.getElementById("class-scored-data-section-dash").style.display = "none";
       document.getElementById("broad-sheet-data").style.display = "none";
 document.getElementById("terminal-reports-dash").style.display = "none";

})


// function dashboard content view attendance
document.getElementById("attendance-overview-content").addEventListener("click", ()=>{
    document.getElementById("home-view").style.display = "none";
    document.getElementById("class-performance").style.display = "none";
    document.getElementById("attendance-overview").style.display = "block";
    document.getElementById("students-data").style.display = "none";
       document.getElementById("teachers-data").style.display = "none";
       document.getElementById("class-scored-data-section-dash").style.display = "none";
       document.getElementById("broad-sheet-data").style.display = "none";
 document.getElementById("terminal-reports-dash").style.display = "none";

})


// function dashboard content view terminal reports
document.getElementById("terminal-reports-content").addEventListener("click", ()=>{
    document.getElementById("home-view").style.display = "none";
    document.getElementById("class-performance").style.display = "none";
    document.getElementById("attendance-overview").style.display = "none";
    document.getElementById("students-data").style.display = "none";
       document.getElementById("teachers-data").style.display = "none";
       document.getElementById("class-scored-data-section-dash").style.display = "none";
       document.getElementById("broad-sheet-data").style.display = "none";
 document.getElementById("terminal-reports-dash").style.display = "block";


})

// function dashboard content view broadsheet
document.getElementById("scores-sheet-section-content").addEventListener("click", ()=>{
    document.getElementById("home-view").style.display = "none";
    document.getElementById("class-performance").style.display = "none";
    document.getElementById("attendance-overview").style.display = "none";
    document.getElementById("students-data").style.display = "none";
       document.getElementById("teachers-data").style.display = "none";
       document.getElementById("class-scored-data-section-dash").style.display = "block";
       document.getElementById("broad-sheet-data").style.display = "none";
 document.getElementById("terminal-reports-dash").style.display = "none";
});







// function dashboard content view teachers
document.getElementById("teachers-data-content").addEventListener("click", ()=>{
    document.getElementById("home-view").style.display = "none";
    document.getElementById("class-performance").style.display = "none";
    document.getElementById("attendance-overview").style.display = "none";
    document.getElementById("students-data").style.display = "none";
       document.getElementById("teachers-data").style.display = "block";
       document.getElementById("class-scored-data-section-dash").style.display = "none";
       document.getElementById("broad-sheet-data").style.display = "none";
 document.getElementById("terminal-reports-dash").style.display = "none";
})



// function dashboard content view score sheet
document.getElementById("broad-sheet-data-content").addEventListener("click", ()=>{
    document.getElementById("home-view").style.display = "none";
    document.getElementById("class-performance").style.display = "none";
    document.getElementById("attendance-overview").style.display = "none";
    document.getElementById("students-data").style.display = "none";
       document.getElementById("teachers-data").style.display = "none";
       document.getElementById("class-scored-data-section-dash").style.display = "none";
       document.getElementById("broad-sheet-data").style.display = "block";
 document.getElementById("terminal-reports-dash").style.display = "none";
})




document.getElementById("profile-overlay").addEventListener("click", ()=>{
    const profileShows = document.querySelector(".profile");
    profileShows.style.display = "block";
});

// functions to show account profile
document.getElementById("accounts-btn").addEventListener("click", ()=>{
     const profileShows = document.querySelector(".account-box");
    profileShows.style.display = "block";
})

document.querySelector(".profile").addEventListener("click", ()=>{
    const profileShows = document.querySelector(".profile");
    profileShows.style.display = "none";
})

// close-overlay
document.getElementById("close-overlay").addEventListener("click", ()=>{
    const profileShows = document.querySelector(".account-box");
    profileShows.style.display = "none";
});

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
document.getElementById("show-sign-out").addEventListener("click", ()=>{
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


// alert-notification
document.getElementById("show-notification").addEventListener("click", ()=>{
    document.getElementById("alert-notification").classList.toggle("pop");
})


document.getElementById("close-x-notice").addEventListener("click", ()=>{
    document.getElementById("alert-notification").classList.remove("pop");

})




document.addEventListener("DOMContentLoaded", () =>{
    const currentPassInput = document.getElementById("current-password");
    const newPassInput = document.getElementById("new-password");
    const newSetPassInput = document.getElementById("confirm-password");
    const currentPassInputIcon = document.getElementById("current-pass-input-confirm");
    const newSetPassInputIcon = document.getElementById("new-pass-set");
    const newSetPassInputCons = document.getElementById("new-pass-set-confirm");

    currentPassInputIcon.addEventListener("click", ()=>{
        if(currentPassInput.type === "password"){
            currentPassInput.type = "text";
            currentPassInputIcon.classList.add("fa-eye-slash");
            currentPassInputIcon.classList.remove("fa-eye");
        }
        else{
              currentPassInput.type = "text";
            currentPassInputIcon.classList.remove("fa-eye-slash");
            currentPassInputIcon.classList.add("fa-eye");
        }
    })


    newSetPassInputIcon.addEventListener("click", ()=>{
        if(newPassInput.type === "password"){
            newPassInput.type = "password";
            newSetPassInputIcon.classList.add("fa-eye-slash");
            newSetPassInputIcon.classList.remove("fa-eye");
        }
        else{
             newPassInput.type = "password";
            newSetPassInputIcon.classList.remove("fa-eye-slash");
            newSetPassInputIcon.classList.add("fa-eye");
        }
    })

    newSetPassInputCons.addEventListener("click", ()=>{
          if(newSetPassInput.type === "password"){
           newSetPassInput.type = "password";
            newSetPassInputCons.classList.add("fa-eye-slash");
            newSetPassInputCons.classList.remove("fa-eye");
        }
        else{
             newSetPassInput.type = "password";
           newSetPassInputCons.classList.remove("fa-eye-slash");
            newSetPassInputCons.classList.add("fa-eye");
        }
    })

   
})


// function to load student attendance records in a table
document.getElementById("close-preview-attendance").addEventListener("click", ()=>{
    document.getElementById("records-attendance").style.display = "none";
})


// function to show mobile side nav
document.getElementById("show-moble-nav").addEventListener("click", ()=>{
    document.getElementById("small-moble-overlay").classList.add("add-small-nav");
})


// document.getElementById("small-moble-overlay").addEventListener("click", ()=>{
    const closeMobileNav =  document.getElementById("small-moble-overlay");
    closeMobileNav?.addEventListener("click",(e)=>{
 if(e.target === closeMobileNav){
           closeMobileNav.classList.remove("add-small-nav");
    }
    });



