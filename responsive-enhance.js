/* =========================================================
   RekapKas — Responsive Enhancer
   Memindahkan elemen brand, navigasi tab, dan info user/logout
   ke sidebar kiri saat layar >= 1024px, tanpa mengubah
   event listener yang sudah dipasang di elemen aslinya
   (elemen DIPINDAH, bukan digandakan, jadi semua fungsi
   klik / auth / logout tetap bekerja seperti biasa).

   Cara pakai: taruh <script src="responsive-enhance.js" defer></script>
   setelah script utama aplikasi, sebelum </body>.
   ========================================================= */
(function () {
  "use strict";

  const BREAKPOINT = "(min-width: 1024px)";
  const mq = window.matchMedia(BREAKPOINT);

  let sidebarEl = null;
  let isDesktop = false;

  // Simpan lokasi asli tiap elemen supaya bisa dikembalikan saat ke mobile
  const originalSlots = new Map(); // el -> { parent, nextSibling }

  function rememberSlot(el) {
    if (!el || originalSlots.has(el)) return;
    originalSlots.set(el, { parent: el.parentNode, nextSibling: el.nextSibling });
  }

  function restoreSlot(el) {
    const slot = originalSlots.get(el);
    if (!slot || !el) return;
    if (slot.nextSibling && slot.nextSibling.parentNode === slot.parent) {
      slot.parent.insertBefore(el, slot.nextSibling);
    } else {
      slot.parent.appendChild(el);
    }
  }

  function buildSidebarShell() {
    if (sidebarEl) return sidebarEl;
    sidebarEl = document.createElement("aside");
    sidebarEl.id = "rkSidebar";
    return sidebarEl;
  }

  function getPageTitleEl(headerInner) {
    let titleEl = document.getElementById("rkPageTitle");
    if (!titleEl) {
      titleEl = document.createElement("h1");
      titleEl.id = "rkPageTitle";
      titleEl.textContent = "Keuangan";
    }
    return titleEl;
  }

  function updatePageTitle() {
    const titleEl = document.getElementById("rkPageTitle");
    if (!titleEl) return;
    const suratActive = document.getElementById("tabSurat");
    const isSurat = suratActive && suratActive.classList.contains("active");
    titleEl.textContent = isSurat ? "Surat" : "Keuangan";
  }

  function applyDesktopLayout() {
    const appRoot = document.getElementById("appRoot");
    if (!appRoot) return;

    const header = appRoot.querySelector("header");
    const headerInner = header ? header.querySelector(".header-inner") : null;
    const brand = header ? header.querySelector(".brand") : null;
    const roleBar = header ? header.querySelector(".role-bar") : null;
    const mainTabs = appRoot.querySelector(".main-tabs");

    if (!header || !headerInner || !brand || !roleBar || !mainTabs) return;

    [brand, roleBar, mainTabs].forEach(rememberSlot);

    const sidebar = buildSidebarShell();
    if (!sidebar.parentNode) {
      appRoot.insertBefore(sidebar, appRoot.firstChild);
    }

    // Susun ulang isi sidebar: brand -> nav -> spacer -> role/logout
    sidebar.appendChild(brand);
    sidebar.appendChild(mainTabs);

    let spacer = sidebar.querySelector(".sidebar-spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.className = "sidebar-spacer";
      sidebar.appendChild(spacer);
    } else {
      sidebar.appendChild(spacer); // pastikan urutan tetap benar
    }
    sidebar.appendChild(roleBar);

    // Judul halaman menggantikan posisi brand di header
    const titleEl = getPageTitleEl(headerInner);
    if (!titleEl.parentNode) {
      headerInner.insertBefore(titleEl, headerInner.firstChild);
    }
    updatePageTitle();

    isDesktop = true;
  }

  function applyMobileLayout() {
    if (!isDesktop) return; // sudah dalam mode mobile, tidak perlu apa-apa

    const titleEl = document.getElementById("rkPageTitle");
    if (titleEl && titleEl.parentNode) {
      titleEl.parentNode.removeChild(titleEl);
    }

    // Kembalikan elemen ke posisi semula sesuai urutan asal
    originalSlots.forEach((slot, el) => restoreSlot(el));

    if (sidebarEl && sidebarEl.parentNode) {
      sidebarEl.parentNode.removeChild(sidebarEl);
    }

    isDesktop = false;
  }

  function sync() {
    if (mq.matches) {
      applyDesktopLayout();
    } else {
      applyMobileLayout();
    }
  }

  // Perbarui judul header setiap kali tab Keuangan/Surat diklik
  function hookTabTitleUpdates() {
    const tabKeuangan = document.getElementById("tabKeuangan");
    const tabSurat = document.getElementById("tabSurat");
    if (tabKeuangan) tabKeuangan.addEventListener("click", () => setTimeout(updatePageTitle, 0));
    if (tabSurat) tabSurat.addEventListener("click", () => setTimeout(updatePageTitle, 0));
  }

  function init() {
    hookTabTitleUpdates();
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
    } else if (typeof mq.addListener === "function") {
      // fallback untuk browser lama
      mq.addListener(sync);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
