/* =====================================
   CONFIRM DIALOG

   Replaces the browser's confirm() for destructive actions. The native
   one cannot be styled, truncates long text, and says "localhost says"
   above every message - which is not what an admin should see before
   deleting a pupil.

   Usage - it resolves true only when the confirm button is pressed:

     const ok = await confirmAction({
       title: "Delete student?",
       message: "Kofi Mensah will be removed permanently.",
       details: ["Their parent records go too"],
       confirmText: "Delete",
       tone: "danger"
     });

     if (!ok) return;

   The markup is injected here rather than written into index.html so
   the dialog cannot be half-installed on a page. Styles live in
   admin.css under CONFIRM DIALOG.
===================================== */
(function () {
  const TONES = {
    danger: "fa-trash",
    warning: "fa-triangle-exclamation",
    primary: "fa-circle-question"
  };

  let overlay = null;
  let activeResolve = null;
  let lastFocused = null;

  function buildDialog() {
    overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.id = "confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "confirm-dialog-title");
    overlay.setAttribute("aria-describedby", "confirm-dialog-message");

    overlay.innerHTML = `
      <div class="confirm-card" role="document">
        <div class="confirm-icon"><i class="fa-solid fa-trash"></i></div>

        <h3 class="confirm-title" id="confirm-dialog-title"></h3>
        <p class="confirm-message" id="confirm-dialog-message"></p>

        <ul class="confirm-details"></ul>

        <div class="confirm-actions">
          <button type="button" class="confirm-cancel-btn">Cancel</button>
          <button type="button" class="confirm-accept-btn">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay
      .querySelector(".confirm-cancel-btn")
      .addEventListener("click", () => close(false));

    overlay
      .querySelector(".confirm-accept-btn")
      .addEventListener("click", () => close(true));

    /* the backdrop cancels, the card does not - so a stray click inside
       the dialog cannot dismiss it */
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });

    document.addEventListener("keydown", (e) => {
      if (!overlay.classList.contains("open")) return;

      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }

      /* Enter confirms, but only while a dialog button has focus, so it
         cannot fire from a keypress meant for the page behind */
      if (e.key === "Enter" && overlay.contains(document.activeElement)) {
        e.preventDefault();
        close(document.activeElement.classList.contains("confirm-accept-btn"));
      }
    });
  }

  function close(result) {
    if (!activeResolve) return;

    const resolve = activeResolve;
    activeResolve = null;

    overlay.classList.remove("open");

    /* hand focus back to whatever opened the dialog */
    lastFocused?.focus?.();
    lastFocused = null;

    resolve(result);
  }

  window.confirmAction = function ({
    title = "Are you sure?",
    message = "",
    details = [],
    confirmText = "Confirm",
    cancelText = "Cancel",
    tone = "danger"
  } = {}) {
    if (!overlay) buildDialog();

    /* a second call while one is open would strand the first promise */
    if (activeResolve) close(false);

    const card = overlay.querySelector(".confirm-card");
    const icon = overlay.querySelector(".confirm-icon i");
    const list = overlay.querySelector(".confirm-details");

    card.className = `confirm-card tone-${TONES[tone] ? tone : "danger"}`;
    icon.className = `fa-solid ${TONES[tone] || TONES.danger}`;

    overlay.querySelector(".confirm-title").textContent = title;

    const messageEl = overlay.querySelector(".confirm-message");
    messageEl.textContent = message;
    messageEl.style.display = message ? "block" : "none";

    /* textContent per item: these strings carry names typed by users */
    list.innerHTML = "";
    details.filter(Boolean).forEach((detail) => {
      const li = document.createElement("li");
      li.textContent = detail;
      list.appendChild(li);
    });
    list.style.display = list.children.length ? "block" : "none";

    const acceptBtn = overlay.querySelector(".confirm-accept-btn");
    const cancelBtn = overlay.querySelector(".confirm-cancel-btn");

    acceptBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    lastFocused = document.activeElement;
    overlay.classList.add("open");

    /* Cancel takes focus, not Confirm: a stray Enter on a delete prompt
       should do nothing */
    cancelBtn.focus();

    return new Promise((resolve) => {
      activeResolve = resolve;
    });
  };
})();
