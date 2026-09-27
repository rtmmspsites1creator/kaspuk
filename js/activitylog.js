"use strict";

const ACTIVITY_MODULE_LABELS = {
  transaksi: "Keuangan",
  surat: "Surat",
  notulen: "Notulen",
  pengaturan: "Pengaturan"
};

const ACTIVITY_MODULE_ICONS = {
  transaksi: "💰",
  surat: "📄",
  notulen: "🗒️",
  pengaturan: "⚙️"
};

const ACTIVITY_ACTION_LABELS = {
  buat: "Buat",
  edit: "Edit",
  approve: "Setujui",
  tolak: "Tolak",
  hapus: "Hapus"
};

function formatLogTimestamp(ms) {
  if (!ms) return "-";
  const d = new Date(ms);
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()].slice(0, 3)} ${d.getFullYear()} \u00b7 ${jam}:${menit}`;
}

function getActivityLogList() {
  return Object.keys(activityLog).map(id => ({
    id: id,
    ...activityLog[id]
  }));
}

function renderActivityLog() {
  if (!activityLogList) return;
  const keyword = (activityLogSearch.value || "").trim().toLowerCase();
  let all = getActivityLogList().sort((a, b) => (b.at || 0) - (a.at || 0));

  if (keyword) {
    all = all.filter(entry => {
      const haystack = [
        entry.byName,
        entry.byRole,
        entry.description,
        ACTIVITY_MODULE_LABELS[entry.module]
      ].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }

  activityLogCount.textContent = all.length + " aktivitas";

  if (!all.length) {
    activityLogList.innerHTML = `<div class="empty-state">${keyword ? "Tidak ada aktivitas yang cocok dengan pencarian." : "Belum ada aktivitas tercatat."}</div>`;
    return;
  }

  activityLogList.innerHTML = all.map(entry => `
    <div class="letter-row">
      <div class="letter-icon">${ACTIVITY_MODULE_ICONS[entry.module] || "\u{1F4CB}"}</div>
      <div class="letter-body">
        <div class="letter-title">${escapeHTML(ACTIVITY_ACTION_LABELS[entry.action] || entry.action)} \u00b7 ${escapeHTML(ACTIVITY_MODULE_LABELS[entry.module] || entry.module)}</div>
        <div class="letter-sub">${escapeHTML(entry.description || "-")}</div>
        <div class="letter-nomor">${escapeHTML(entry.byName || "-")} (${escapeHTML(ROLE_LABELS[entry.byRole] || entry.byRole || "-")}) \u00b7 ${formatLogTimestamp(entry.at)}</div>
      </div>
    </div>
  `).join("");
}

activityLogSearch.addEventListener("input", renderActivityLog);
