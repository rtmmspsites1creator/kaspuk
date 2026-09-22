(function() {
  "use strict";
  const BREAKPOINT = "(min-width: 1024px)";
  const mq = window.matchMedia(BREAKPOINT);
  let sidebarEl = null;
  let isDesktop = false;
  const originalSlots = new Map;
  function rememberSlot(el) {
    if (!el || originalSlots.has(el)) return;
    originalSlots.set(el, {
      parent: el.parentNode,
      nextSibling: el.nextSibling
    });
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
    const labels = { keuangan: "Keuangan", surat: "Surat", notulen: "Notulen", pengaturan: "Pengaturan" };
    const activeBtn = document.querySelector(".main-tabs .main-tab.active");
    const tab = activeBtn ? activeBtn.dataset.tab : "keuangan";
    titleEl.textContent = labels[tab] || "Keuangan";
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
    [ brand, roleBar, mainTabs ].forEach(rememberSlot);
    const sidebar = buildSidebarShell();
    if (!sidebar.parentNode) {
      appRoot.insertBefore(sidebar, appRoot.firstChild);
    }
    sidebar.appendChild(brand);
    sidebar.appendChild(mainTabs);
    let spacer = sidebar.querySelector(".sidebar-spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.className = "sidebar-spacer";
      sidebar.appendChild(spacer);
    } else {
      sidebar.appendChild(spacer);
    }
    sidebar.appendChild(roleBar);
    const titleEl = getPageTitleEl(headerInner);
    if (!titleEl.parentNode) {
      headerInner.insertBefore(titleEl, headerInner.firstChild);
    }
    updatePageTitle();
    isDesktop = true;
  }
  function applyMobileLayout() {
    if (!isDesktop) return;
    const titleEl = document.getElementById("rkPageTitle");
    if (titleEl && titleEl.parentNode) {
      titleEl.parentNode.removeChild(titleEl);
    }
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
  function hookTabTitleUpdates() {
    document.querySelectorAll(".main-tabs .main-tab").forEach(btn => {
      btn.addEventListener("click", () => setTimeout(updatePageTitle, 0));
    });
  }
  function init() {
    hookTabTitleUpdates();
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(sync);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
