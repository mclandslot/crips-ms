/* =====================================
   INSTALLABLE APP (PWA)

   Registers the service worker that lets CRIPS MS be added to a phone's
   home screen. The worker's location is worked out from this script's
   own URL, so it registers correctly whether the app is hosted at the
   domain root or in a sub-folder, and from any portal page.

   Must be loaded WITHOUT defer/async: document.currentScript is only set
   while a classic script runs synchronously.
===================================== */
(function () {
  if (!("serviceWorker" in navigator)) return;

  const scriptUrl = document.currentScript && document.currentScript.src;
  if (!scriptUrl) return;

  const swUrl = new URL("sw.js", scriptUrl);
  const scope = new URL("./", scriptUrl);

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(swUrl.href, { scope: scope.pathname })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
})();
