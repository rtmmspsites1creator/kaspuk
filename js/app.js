"use strict";

const installBar = document.getElementById("installBar");

const installBtn = document.getElementById("installBtn");

let deferredInstallPrompt = null;

function isRunningStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

if (!isRunningStandalone()) {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installBar.style.display = "flex";
  });
}

installBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  installBar.style.display = "none";
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
});

window.addEventListener("appinstalled", () => {
  installBar.style.display = "none";
  deferredInstallPrompt = null;
  showToast("Aplikasi berhasil diinstal");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

function switchTab(tab) {
  tabKeuangan.classList.toggle("active", tab === "keuangan");
  tabSurat.classList.toggle("active", tab === "surat");
  tabNotulen.classList.toggle("active", tab === "notulen");
  tabPengaturan.classList.toggle("active", tab === "pengaturan");
  viewKeuangan.style.display = tab === "keuangan" ? "block" : "none";
  viewSurat.style.display = tab === "surat" ? "block" : "none";
  viewNotulen.style.display = tab === "notulen" ? "block" : "none";
  viewPengaturan.style.display = tab === "pengaturan" ? "block" : "none";
  bottomBarKeuangan.style.display = tab === "keuangan" ? "block" : "none";
  document.body.style.paddingBottom = tab === "keuangan" ? "100px" : "24px";
}

tabKeuangan.addEventListener("click", () => switchTab("keuangan"));

tabSurat.addEventListener("click", () => switchTab("surat"));

tabNotulen.addEventListener("click", () => switchTab("notulen"));

tabPengaturan.addEventListener("click", () => switchTab("pengaturan"));

setType("out");

renderAll();

updateOfflineBadge();

syncOfflineTx();
