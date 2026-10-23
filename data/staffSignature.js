const supabaseStaffSignature = window.supabaseClient;

/* =====================================
   MY SIGNATURE (head teacher + class teachers)

   Shared by the head teacher portal and the teacher portal: a member of
   staff uploads their signature once here, and the terminal report cards
   print it above the signature line instead of a row of dots
   (see data/studentTerminal.js). The head teacher's signs every card; a
   class teacher's signs the cards of the class assigned to them.

   The file goes to the public "staff-signatures" bucket and the link is
   stored on the signed-in user's own teachers row - teachers.id is the
   auth user id, so no lookup by name is needed.
===================================== */
const SIGNATURE_BUCKET = "staff-signatures";
const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024; // 2MB

let signatureUserId = null;
let signatureCurrentUrl = "";
let signatureSelectedFile = null;
let signaturePreviewObjectUrl = "";
let signatureIsSaving = false;

const signatureFeedBack = document.getElementById("form-feedback");

/* =====================================
   INIT
===================================== */
document.addEventListener("DOMContentLoaded", async () => {
  /* the markup is only on the portals that offer the upload */
  if (!document.getElementById("signature-overlay")) return;

  bindSignatureEvents();
  await loadOwnSignature();
});

/* =====================================
   EVENTS
===================================== */
function bindSignatureEvents() {
  document
    .getElementById("signature-body")
    ?.addEventListener("click", openSignatureOverlay);

  document
    .getElementById("close-signature-overlay")
    ?.addEventListener("click", closeSignatureOverlay);

  document
    .getElementById("signature-overlay")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "signature-overlay") {
        closeSignatureOverlay();
      }
    });

  document
    .getElementById("signature-file-input")
    ?.addEventListener("change", handleSignatureFileChosen);

  document
    .getElementById("save-signature-btn")
    ?.addEventListener("click", saveOwnSignature);

  document
    .getElementById("remove-signature-btn")
    ?.addEventListener("click", removeOwnSignature);
}

function openSignatureOverlay() {
  const overlay = document.getElementById("signature-overlay");
  if (!overlay) return;

  overlay.style.display = "flex";
  closeAccountMenu();

  setSignatureMessage("");
  loadOwnSignature();
}

function closeSignatureOverlay() {
  const overlay = document.getElementById("signature-overlay");
  if (overlay) overlay.style.display = "none";

  clearSignatureSelection();
  setSignatureMessage("");
}

/* the two portals name their account dropdown differently */
function closeAccountMenu() {
  const headAccountBox = document.querySelector(".account-box");
  if (headAccountBox) headAccountBox.style.display = "none";

  const teacherAccountBox = document.getElementById("account-model-box");
  if (teacherAccountBox) teacherAccountBox.style.display = "none";
}

/* =====================================
   HELPERS
===================================== */
function showSignatureFeedback(message, type = "success") {
  if (!signatureFeedBack) return;

  signatureFeedBack.classList.add("show-message", type);
  signatureFeedBack.innerHTML = message;

  setTimeout(() => {
    signatureFeedBack.classList.remove("show-message", "success", "error");
    signatureFeedBack.innerHTML = "";
  }, 3000);
}

function setSignatureMessage(message, type = "error") {
  const messageEl = document.getElementById("signature-message");
  if (!messageEl) return;

  messageEl.textContent = message || "";
  messageEl.style.color = type === "error" ? "#c92a2a" : "#1d583c";
}

function clearSignatureSelection() {
  const fileInput = document.getElementById("signature-file-input");
  const fileName = document.getElementById("signature-file-name");

  if (fileInput) fileInput.value = "";
  if (fileName) fileName.textContent = "";

  signatureSelectedFile = null;

  if (signaturePreviewObjectUrl) {
    URL.revokeObjectURL(signaturePreviewObjectUrl);
    signaturePreviewObjectUrl = "";
  }
}

function renderSignaturePreview(url) {
  const img = document.getElementById("signature-preview-img");
  const emptyText = document.getElementById("signature-empty-text");
  const removeBtn = document.getElementById("remove-signature-btn");

  if (url) {
    if (img) {
      img.src = url;
      img.style.display = "block";
    }
    if (emptyText) emptyText.style.display = "none";
  } else {
    if (img) {
      img.removeAttribute("src");
      img.style.display = "none";
    }
    if (emptyText) emptyText.style.display = "block";
  }

  /* nothing stored yet means nothing to remove */
  if (removeBtn) {
    removeBtn.style.display = signatureCurrentUrl ? "inline-block" : "none";
  }
}

/* the stored value is a public URL; the delete call needs the object path
   that sits after the bucket name */
function signatureStoragePathFromUrl(url) {
  const marker = `/${SIGNATURE_BUCKET}/`;
  const index = String(url || "").indexOf(marker);

  if (index === -1) return "";

  return decodeURIComponent(String(url).slice(index + marker.length));
}

function signatureFileExtension(file) {
  const fromName = String(file?.name || "").split(".").pop()?.toLowerCase();

  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;

  if (file?.type === "image/png") return "png";
  if (file?.type === "image/webp") return "webp";
  return "jpg";
}

/* =====================================
   LOAD CURRENT SIGNATURE
===================================== */
async function loadOwnSignature() {
  try {
    const {
      data: { user },
      error: userError
    } = await supabaseStaffSignature.auth.getUser();

    if (userError || !user) return;

    signatureUserId = user.id;

    const { data, error } = await supabaseStaffSignature
      .from("teachers")
      .select("id, signature_url")
      .eq("id", signatureUserId)
      .maybeSingle();

    if (error) {
      console.error("Error loading signature:", error.message);
      return;
    }

    signatureCurrentUrl = data?.signature_url || "";
    renderSignaturePreview(signatureCurrentUrl);
  } catch (err) {
    console.error("Unexpected error loading signature:", err);
  }
}

/* =====================================
   CHOOSE FILE
===================================== */
function handleSignatureFileChosen(e) {
  const file = e.target.files?.[0];

  setSignatureMessage("");

  if (!file) {
    clearSignatureSelection();
    renderSignaturePreview(signatureCurrentUrl);
    return;
  }

  if (!String(file.type).startsWith("image/")) {
    clearSignatureSelection();
    renderSignaturePreview(signatureCurrentUrl);
    setSignatureMessage("Please choose an image file (PNG, JPG or WEBP).");
    return;
  }

  if (file.size > SIGNATURE_MAX_BYTES) {
    clearSignatureSelection();
    renderSignaturePreview(signatureCurrentUrl);
    setSignatureMessage("Image is too large. Maximum size is 2MB.");
    return;
  }

  if (signaturePreviewObjectUrl) {
    URL.revokeObjectURL(signaturePreviewObjectUrl);
  }

  signatureSelectedFile = file;
  signaturePreviewObjectUrl = URL.createObjectURL(file);

  const fileName = document.getElementById("signature-file-name");
  if (fileName) fileName.textContent = file.name;

  renderSignaturePreview(signaturePreviewObjectUrl);
}

/* =====================================
   SAVE
===================================== */
async function saveOwnSignature() {
  if (signatureIsSaving) return;

  const saveBtn = document.getElementById("save-signature-btn");

  if (!signatureSelectedFile) {
    setSignatureMessage("Please choose a signature image first.");
    return;
  }

  if (!signatureUserId) {
    await loadOwnSignature();

    if (!signatureUserId) {
      setSignatureMessage("Your session has expired. Please sign in again.");
      return;
    }
  }

  signatureIsSaving = true;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = "Saving...";
  }

  const previousUrl = signatureCurrentUrl;

  try {
    const extension = signatureFileExtension(signatureSelectedFile);

    /* the storage policy keys off this shape: signatures/<uid>-<stamp>.<ext> */
    const filePath = `signatures/${signatureUserId}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabaseStaffSignature.storage
      .from(SIGNATURE_BUCKET)
      .upload(filePath, signatureSelectedFile, {
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseStaffSignature.storage
      .from(SIGNATURE_BUCKET)
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl || "";

    const { error: updateError } = await supabaseStaffSignature
      .from("teachers")
      .update({ signature_url: publicUrl })
      .eq("id", signatureUserId);

    if (updateError) throw updateError;

    signatureCurrentUrl = publicUrl;

    clearSignatureSelection();
    renderSignaturePreview(signatureCurrentUrl);
    setSignatureMessage("Signature saved.", "success");
    showSignatureFeedback("Signature saved successfully", "success");

    /* the row already points at the new file, so a failed cleanup of the
       old one only leaves an unused object behind */
    const previousPath = signatureStoragePathFromUrl(previousUrl);

    if (previousPath && previousPath !== filePath) {
      await supabaseStaffSignature.storage
        .from(SIGNATURE_BUCKET)
        .remove([previousPath]);
    }
  } catch (err) {
    console.error("Error saving signature:", err);
    setSignatureMessage(err?.message || "Failed to save signature.");
    showSignatureFeedback("Failed to save signature", "error");
  } finally {
    signatureIsSaving = false;

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = "Save signature";
    }
  }
}

/* =====================================
   REMOVE
===================================== */
async function removeOwnSignature() {
  if (signatureIsSaving) return;

  if (!signatureCurrentUrl) {
    setSignatureMessage("There is no saved signature to remove.");
    return;
  }

  const confirmed = await confirmAction({
    title: "Remove your signature?",
    message: "Terminal reports will print a blank signature line instead.",
    confirmText: "Remove signature",
    tone: "danger"
  });

  if (!confirmed) return;

  const removeBtn = document.getElementById("remove-signature-btn");

  signatureIsSaving = true;

  if (removeBtn) {
    removeBtn.disabled = true;
    removeBtn.innerHTML = "Removing...";
  }

  try {
    const { error: updateError } = await supabaseStaffSignature
      .from("teachers")
      .update({ signature_url: null })
      .eq("id", signatureUserId);

    if (updateError) throw updateError;

    const storagePath = signatureStoragePathFromUrl(signatureCurrentUrl);

    if (storagePath) {
      await supabaseStaffSignature.storage
        .from(SIGNATURE_BUCKET)
        .remove([storagePath]);
    }

    signatureCurrentUrl = "";

    clearSignatureSelection();
    renderSignaturePreview("");
    setSignatureMessage("Signature removed.", "success");
    showSignatureFeedback("Signature removed", "success");
  } catch (err) {
    console.error("Error removing signature:", err);
    setSignatureMessage(err?.message || "Failed to remove signature.");
    showSignatureFeedback("Failed to remove signature", "error");
  } finally {
    signatureIsSaving = false;

    if (removeBtn) {
      removeBtn.disabled = false;
      removeBtn.innerHTML = "Remove";
    }
  }
}
