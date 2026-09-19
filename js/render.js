"use strict";

function getMonthList() {
  const monthObj = db[currentMonth] || {};
  return Object.keys(monthObj).map(id => ({
    id: id,
    status: "approved",
    ...monthObj[id]
  }));
}

function getOpeningBalance(beforeMonthKey) {
  let total = 0;
  Object.keys(db).forEach(monthKey => {
    if (monthKey >= beforeMonthKey) return;
    const monthObj = db[monthKey] || {};
    Object.values(monthObj).forEach(t => {
      if (t.status !== "approved") return;
      total += t.type === "in" ? t.amount : -t.amount;
    });
  });
  return total;
}

function renderDashboard() {
  const list = getMonthList().filter(t => t.status === "approved");
  const totalIn = list.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = list.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0);
  const opening = getOpeningBalance(currentMonth);
  const saldo = opening + totalIn - totalOut;
  totalInEl.textContent = formatRupiah(totalIn);
  totalOutEl.textContent = formatRupiah(totalOut);
  saldoValue.textContent = formatRupiah(saldo);
  saldoValue.classList.toggle("negative", saldo < 0);
}

const iconIn = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;

const iconOut = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`;

const iconTrash = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

const iconCheck = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const iconX = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

const iconClock = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>`;

const iconEdit = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

function renderList() {
  const list = getMonthList().filter(t => t.status === "approved").sort((a, b) => b.date.localeCompare(a.date));
  txCountEl.textContent = list.length + " transaksi";
  if (list.length === 0) {
    txListEl.innerHTML = `<div class="empty-state">Belum ada transaksi disetujui bulan ini.<br>Mulai catat lewat mikrofon atau form di atas.</div>`;
    return;
  }
  const canDelete = currentRole === "ketua";
  txListEl.innerHTML = list.map(t => `\n      <div class="tx-row">\n        <div class="tx-icon ${t.type}">${t.type === "in" ? iconIn : iconOut}</div>\n        <div class="tx-body">\n          <div class="tx-desc">${escapeHTML(t.desc)}</div>\n          <div class="tx-date">${formatDateShort(t.date)}${t.createdByName ? " · oleh " + escapeHTML(t.createdByName) : ""}</div>\n        </div>\n        <div class="tx-amount ${t.type}">${t.type === "in" ? "+" : "-"}${formatRupiah(t.amount)}</div>\n        ${canDelete ? `<div class="tx-actions">\n          <button class="tx-edit" data-id="${t.id}" aria-label="Edit">${iconEdit}</button>\n          <button class="tx-del" data-id="${t.id}" aria-label="Hapus">${iconTrash}</button>\n        </div>` : ""}\n      </div>\n    `).join("");
  txListEl.querySelectorAll(".tx-edit").forEach(btn => {
    btn.addEventListener("click", () => startEditTx(btn.dataset.id));
  });
  txListEl.querySelectorAll(".tx-del").forEach(btn => {
    btn.addEventListener("click", () => deleteTx(btn.dataset.id));
  });
}

function renderPending() {
  const list = getMonthList().filter(t => t.status === "pending").sort((a, b) => b.date.localeCompare(a.date));
  pendingCountEl.textContent = list.length;
  pendingSection.style.display = list.length ? "block" : "none";
  if (!list.length) {
    pendingListEl.innerHTML = "";
    return;
  }
  const isKetua = currentRole === "ketua";
  pendingListEl.innerHTML = list.map(t => {
    const canEdit = isKetua || t.createdByUid === currentUid;
    return `\n      <div class="tx-row pending">\n        <div class="tx-icon ${t.type}">${t.type === "in" ? iconIn : iconOut}</div>\n        <div class="tx-body">\n          <div class="tx-desc">${escapeHTML(t.desc)}</div>\n          <div class="tx-date">${formatDateShort(t.date)} · oleh ${escapeHTML(t.createdByName || "-")}</div>\n          <div class="tx-status">${iconClock} Menunggu ACC Ketua</div>\n        </div>\n        <div class="tx-amount ${t.type}">${t.type === "in" ? "+" : "-"}${formatRupiah(t.amount)}</div>\n        <div class="tx-actions">\n          ${canEdit ? `<button class="tx-edit" data-id="${t.id}" aria-label="Edit">${iconEdit}</button>` : ""}\n          ${isKetua ? `<button class="tx-approve" data-id="${t.id}" aria-label="Setujui">${iconCheck}</button>\n            <button class="tx-reject" data-id="${t.id}" aria-label="Tolak">${iconX}</button>` : ""}\n        </div>\n      </div>\n    `;
  }).join("");
  pendingListEl.querySelectorAll(".tx-edit").forEach(btn => {
    btn.addEventListener("click", () => startEditTx(btn.dataset.id));
  });
  pendingListEl.querySelectorAll(".tx-approve").forEach(btn => {
    btn.addEventListener("click", () => approveTx(btn.dataset.id));
  });
  pendingListEl.querySelectorAll(".tx-reject").forEach(btn => {
    btn.addEventListener("click", () => rejectTx(btn.dataset.id));
  });
}

const iconMandat = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

const iconUndangan = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;

const iconKeterangan = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`;

const iconDownload = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

const LETTER_LABELS = {
  mandat: "Surat Tugas",
  undangan: "Undangan",
  keterangan: "Surat Keterangan"
};

function letterIcon(type) {
  if (type === "mandat") return iconMandat;
  if (type === "undangan") return iconUndangan;
  return iconKeterangan;
}

function letterSummary(l) {
  if (l.type === "mandat") return `Kepada ${l.data.penerimaNama} (${l.data.penerimaJabatan})`;
  if (l.type === "undangan") return l.data.perihal;
  return `Untuk ${l.data.namaDiterangkan}`;
}

function getLettersList() {
  return Object.keys(letters).map(id => ({
    id: id,
    ...letters[id]
  }));
}

function renderSurat() {
  const all = getLettersList();
  const pending = all.filter(l => l.status === "pending").sort((a, b) => b.createdAt - a.createdAt);
  const approved = all.filter(l => l.status === "approved").sort((a, b) => b.createdAt - a.createdAt);
  suratPendingCount.textContent = pending.length;
  suratPendingSection.style.display = pending.length ? "block" : "none";
  const isKetua = currentRole === "ketua";
  suratPendingList.innerHTML = pending.map(l => {
    const canEdit = isKetua || l.createdByUid === currentUid;
    return `\n      <div class="letter-row pending">\n        <div class="letter-icon">${letterIcon(l.type)}</div>\n        <div class="letter-body">\n          <div class="letter-title">${escapeHTML(LETTER_LABELS[l.type])}</div>\n          <div class="letter-sub">${escapeHTML(letterSummary(l))}</div>\n          <div class="tx-status">${iconClock} Menunggu ACC · oleh ${escapeHTML(l.createdByName || "-")}</div>\n        </div>\n        <div class="tx-actions">\n          ${canEdit ? `<button class="tx-edit" data-id="${l.id}" aria-label="Edit">${iconEdit}</button>` : ""}\n          ${isKetua ? `<button class="tx-approve" data-id="${l.id}" aria-label="Setujui">${iconCheck}</button>\n            <button class="tx-reject" data-id="${l.id}" aria-label="Tolak">${iconX}</button>` : ""}\n        </div>\n      </div>\n    `;
  }).join("");
  suratPendingList.querySelectorAll(".tx-edit").forEach(btn => btn.addEventListener("click", () => startEditLetter(btn.dataset.id)));
  suratPendingList.querySelectorAll(".tx-approve").forEach(btn => btn.addEventListener("click", () => approveLetter(btn.dataset.id)));
  suratPendingList.querySelectorAll(".tx-reject").forEach(btn => btn.addEventListener("click", () => rejectLetter(btn.dataset.id)));
  suratArchiveCount.textContent = approved.length + " surat";
  if (!approved.length) {
    suratArchiveList.innerHTML = `<div class="empty-state">Belum ada surat yang disetujui.</div>`;
  } else {
    suratArchiveList.innerHTML = approved.map(l => `\n        <div class="letter-row">\n          <div class="letter-icon">${letterIcon(l.type)}</div>\n          <div class="letter-body">\n            <div class="letter-title">${escapeHTML(LETTER_LABELS[l.type])}</div>\n            <div class="letter-sub">${escapeHTML(letterSummary(l))}</div>\n            <div class="letter-nomor">${escapeHTML(l.nomorSurat || "-")}</div>\n          </div>\n          <div class="tx-actions">\n            ${isKetua ? `<button class="tx-edit" data-id="${l.id}" aria-label="Edit">${iconEdit}</button>\n            <button class="tx-del" data-id="${l.id}" aria-label="Hapus">${iconTrash}</button>` : ""}\n            <button class="letter-download" data-id="${l.id}" aria-label="Unduh PDF">${iconDownload}</button>\n          </div>\n        </div>\n      `).join("");
    suratArchiveList.querySelectorAll(".letter-download").forEach(btn => {
      btn.addEventListener("click", () => downloadLetterPDF(btn.dataset.id));
    });
    suratArchiveList.querySelectorAll(".tx-edit").forEach(btn => {
      btn.addEventListener("click", () => startEditLetter(btn.dataset.id));
    });
    suratArchiveList.querySelectorAll(".tx-del").forEach(btn => {
      btn.addEventListener("click", () => deleteLetter(btn.dataset.id));
    });
  }
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderAll() {
  renderMonthOptions();
  renderDashboard();
  renderList();
  renderPending();
}

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;

let isListening = false;

const NUMBER_WORDS = new Set([ "nol", "satu", "se", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas", "belas", "puluh", "seratus", "ratus", "seribu", "ribu", "sejuta", "juta" ]);

const UNITS = {
  nol: 0,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9
};

const INCOME_KEYWORDS = [ "gaji", "gajian", "terima", "diterima", "dapat", "dana masuk", "transfer masuk", "bonus", "thr", "untung", "pendapatan", "hasil jual", "cair", "komisi" ];

function wordsToNumber(tokens) {
  let total = 0, current = 0;
  for (const w of tokens) {
    if (w === "sepuluh") {
      current += 10;
      continue;
    }
    if (w === "sebelas") {
      current += 11;
      continue;
    }
    if (w === "seratus") {
      total += 100;
      current = 0;
      continue;
    }
    if (w === "seribu") {
      total += 1e3;
      current = 0;
      continue;
    }
    if (w === "sejuta") {
      total += 1e6;
      current = 0;
      continue;
    }
    if (w === "se") {
      current += 1;
      continue;
    }
    if (w in UNITS) {
      current += UNITS[w];
      continue;
    }
    if (w === "belas") {
      current += 10;
      continue;
    }
    if (w === "puluh") {
      current = (current || 1) * 10;
      continue;
    }
    if (w === "ratus") {
      current = (current || 1) * 100;
      total += current;
      current = 0;
      continue;
    }
    if (w === "ribu") {
      current = (current || 1) * 1e3;
      total += current;
      current = 0;
      continue;
    }
    if (w === "juta") {
      current = (current || 1) * 1e6;
      total += current;
      current = 0;
      continue;
    }
  }
  return total + current;
}

function extractAmount(lowerText) {
  const digitMatch = lowerText.match(/(\d[\d.,]*)\s*(ribu|rb\.?|juta|jt\.?)?/i);
  if (digitMatch && digitMatch[1].replace(/[.,]/g, "").length > 0) {
    let val = parseInt(digitMatch[1].replace(/[.,]/g, ""), 10);
    const suf = (digitMatch[2] || "").toLowerCase().replace(/\.$/, "");
    if (suf === "ribu" || suf === "rb") val *= 1e3; else if (suf === "juta" || suf === "jt") val *= 1e6;
    if (val > 0) {
      return {
        value: val,
        span: digitMatch[0]
      };
    }
  }
  const words = lowerText.split(/\s+/);
  let start = -1, end = -1;
  for (let i = 0; i < words.length; i++) {
    if (NUMBER_WORDS.has(words[i])) {
      if (start === -1) start = i;
      end = i;
    } else if (start !== -1) {
      break;
    }
  }
  if (start !== -1) {
    const tokens = words.slice(start, end + 1);
    const value = wordsToNumber(tokens);
    if (value > 0) {
      return {
        value: value,
        span: tokens.join(" ")
      };
    }
  }
  return {
    value: 0,
    span: ""
  };
}

function detectType(lowerText) {
  return INCOME_KEYWORDS.some(k => lowerText.includes(k)) ? "in" : "out";
}

function buildDescription(originalLower, span) {
  let desc = originalLower;
  if (span) {
    const idx = desc.indexOf(span);
    if (idx !== -1) desc = desc.slice(0, idx) + desc.slice(idx + span.length);
  }
  desc = desc.replace(/\b(rupiah|rp|sebesar|sejumlah|senilai|kurang lebih|sekitar)\b/gi, " ");
  desc = desc.replace(/\s+/g, " ").trim();
  if (!desc) desc = selectedType === "in" ? "Pemasukan" : "Pengeluaran";
  return desc.charAt(0).toUpperCase() + desc.slice(1);
}

function processVoiceInput(transcript) {
  const lower = transcript.toLowerCase().trim();
  const {value: amount, span: span} = extractAmount(lower);
  const type = detectType(lower);
  const desc = buildDescription(lower, span);
  setType(type);
  descInput.value = desc;
  amountInput.value = amount ? amount.toLocaleString("id-ID") : "";
  dateInput.value = todayISO();
  if (amount) {
    micStatus.innerHTML = `🎙 "${escapeHTML(transcript)}" → form terisi. Cek lalu tekan <b>Simpan</b>.`;
  } else {
    micStatus.innerHTML = `🎙 "${escapeHTML(transcript)}" → nominal tidak terdeteksi, isi manual ya.`;
    amountInput.focus();
  }
}

if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI;
  recognition.lang = "id-ID";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    micStatus.innerHTML = "<b>Mendengarkan...</b> silakan bicara";
  };
  recognition.onresult = e => {
    const transcript = e.results[0][0].transcript;
    processVoiceInput(transcript);
  };
  recognition.onerror = e => {
    micStatus.textContent = "Tidak terdengar jelas, coba lagi.";
  };
  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
  };
  micBtn.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch (e) {}
  });
} else {
  micBtn.disabled = true;
  micBtn.style.opacity = "0.4";
  micStatus.innerHTML = 'Input suara tidak didukung di browser ini.<div class="unsupported">Gunakan Google Chrome untuk fitur ini.</div>';
}

exportBtn.addEventListener("click", () => {
  const list = getMonthList().filter(t => t.status === "approved").sort((a, b) => a.date.localeCompare(b.date));
  if (list.length === 0) {
    showToast("Belum ada transaksi disetujui untuk dicetak");
    return;
  }
  const {jsPDF: jsPDF} = window.jspdf;
  const doc = new jsPDF;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const textMaxWidth = pageWidth - marginX * 2;
  function centeredBlock(text, y, fontSize, lineHeight) {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, textMaxWidth);
    lines.forEach((line, i) => doc.text(line, pageWidth / 2, y + i * lineHeight, {
      align: "center"
    }));
    return y + lines.length * lineHeight;
  }
  let cursorY = 12;
  if (LOGO_DATA_URI) {
    try {
      const logoSize = 20;
      doc.addImage(LOGO_DATA_URI, "JPEG", pageWidth / 2 - logoSize / 2, 8, logoSize, logoSize);
      cursorY = 8 + logoSize + 6;
    } catch (e) {}
  }
  doc.setFont("helvetica", "bold");
  cursorY = centeredBlock("KEUANGAN PUK FSP RTMM SPSI PT. TORABIKA EKA SEMESTA 2023-2026", cursorY, 11.5, 5.2);
  cursorY += 1;
  cursorY = centeredBlock("DATA KELUAR MASUK SPSI UNTUK BERBAGAI KEGIATAN", cursorY, 10, 4.6);
  cursorY += 1;
  doc.setFont("helvetica", "normal");
  cursorY = centeredBlock("BULAN " + monthLabel(currentMonth).toUpperCase(), cursorY, 10, 4.6);
  cursorY += 4;
  doc.setDrawColor(29, 99, 180);
  doc.setLineWidth(.6);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 8;
  const totalIn = list.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = list.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0);
  const openingBalance = getOpeningBalance(currentMonth);
  const saldo = openingBalance + totalIn - totalOut;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Saldo Awal Bulan Ini : " + formatRupiah(openingBalance), marginX, cursorY);
  cursorY += 8;
  function formatAngka(n) {
    n = Math.round(n || 0);
    return n.toLocaleString("id-ID");
  }
  let runningSaldo = openingBalance;
  const body = list.map(t => {
    runningSaldo += t.type === "in" ? t.amount : -t.amount;
    return [ formatDateShort(t.date), t.desc, t.type === "in" ? formatAngka(t.amount) : "-", t.type === "out" ? formatAngka(t.amount) : "-", formatAngka(runningSaldo) ];
  });
  const sizeCandidates = [ {
    fontSize: 9,
    pad: 3.2
  }, {
    fontSize: 8.5,
    pad: 2.6
  }, {
    fontSize: 8,
    pad: 2.2
  }, {
    fontSize: 7.5,
    pad: 1.8
  }, {
    fontSize: 7,
    pad: 1.4
  }, {
    fontSize: 6.5,
    pad: 1.1
  }, {
    fontSize: 6,
    pad: .9
  }, {
    fontSize: 5.5,
    pad: .7
  }, {
    fontSize: 5,
    pad: .5
  } ];
  const FOOTER_SPACE_NEEDED = 10 + 14 + 55;
  const tableHead = [ [ "Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo" ] ];
  const tableFoot = [ [ "", "TOTAL", formatRupiah(totalIn), formatRupiah(totalOut), formatRupiah(saldo) ] ];
  const tableColumnStyles = {
    0: {
      cellWidth: 24
    },
    2: {
      halign: "right"
    },
    3: {
      halign: "right"
    },
    4: {
      halign: "right",
      fontStyle: "bold"
    }
  };
  let tableStyle = sizeCandidates[sizeCandidates.length - 1];
  for (const cand of sizeCandidates) {
    const trialDoc = new jsPDF;
    trialDoc.autoTable({
      head: tableHead,
      body: body,
      foot: tableFoot,
      startY: cursorY,
      styles: {
        font: "helvetica",
        fontSize: cand.fontSize,
        cellPadding: cand.pad
      },
      headStyles: {
        fillColor: [ 29, 99, 180 ],
        textColor: [ 255, 255, 255 ],
        halign: "center"
      },
      footStyles: {
        fillColor: [ 238, 242, 247 ],
        textColor: [ 22, 32, 43 ],
        fontStyle: "bold",
        halign: "right"
      },
      columnStyles: tableColumnStyles
    });
    const trialEnd = trialDoc.lastAutoTable.finalY;
    if (trialEnd + FOOTER_SPACE_NEEDED <= pageHeight - 10) {
      tableStyle = cand;
      break;
    }
  }
  doc.autoTable({
    head: tableHead,
    body: body,
    startY: cursorY,
    styles: {
      font: "helvetica",
      fontSize: tableStyle.fontSize,
      cellPadding: tableStyle.pad
    },
    headStyles: {
      fillColor: [ 29, 99, 180 ],
      textColor: [ 255, 255, 255 ],
      halign: "center"
    },
    columnStyles: tableColumnStyles,
    didParseCell: function(data) {
      if (data.section === "body") {
        if (data.column.index === 2 && data.cell.raw !== "-") data.cell.styles.textColor = [ 29, 99, 180 ];
        if (data.column.index === 3 && data.cell.raw !== "-") data.cell.styles.textColor = [ 220, 38, 38 ];
      }
    },
    foot: tableFoot,
    footStyles: {
      fillColor: [ 238, 242, 247 ],
      textColor: [ 22, 32, 43 ],
      fontStyle: "bold",
      halign: "right"
    }
  });
  let finalY = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Saldo Akhir Bulan Ini : " + formatRupiah(saldo), 14, finalY);
  finalY += 14;
  const sigBlockHeight = 55;
  if (finalY + sigBlockHeight > pageHeight - 10) {
    doc.addPage();
    finalY = 15;
  }
  const [yy, mm] = currentMonth.split("-");
  const lastDay = new Date(parseInt(yy, 10), parseInt(mm, 10), 0).getDate();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Cikupa, ${lastDay} ${monthLabel(currentMonth)}`, pageWidth - 14, finalY + 6, {
    align: "right"
  });
  doc.text("Mengetahui,", 14, finalY + 18);
  const colWidth = (pageWidth - 28) / 3;
  const col1X = 14 + colWidth / 2;
  const col2X = 14 + colWidth + colWidth / 2;
  const col3X = 14 + colWidth * 2 + colWidth / 2;
  const roleY = finalY + 26;
  const lineY = roleY + 24;
  const nameY = lineY + 5;
  const lineHalfWidth = Math.min(24, colWidth / 2 - 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Ketua", col1X, roleY, {
    align: "center"
  });
  doc.text("Sekretaris", col2X, roleY, {
    align: "center"
  });
  doc.text("Bendahara", col3X, roleY, {
    align: "center"
  });
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(.3);
  doc.line(col1X - lineHalfWidth, lineY, col1X + lineHalfWidth, lineY);
  doc.line(col2X - lineHalfWidth, lineY, col2X + lineHalfWidth, lineY);
  doc.line(col3X - lineHalfWidth, lineY, col3X + lineHalfWidth, lineY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(ROLE_NAMES.ketua, col1X, nameY, {
    align: "center"
  });
  doc.text(ROLE_NAMES.sekretaris, col2X, nameY, {
    align: "center"
  });
  doc.text(ROLE_NAMES.bendahara, col3X, nameY, {
    align: "center"
  });
  doc.save(`Laporan-Keuangan-${currentMonth}.pdf`);
  showToast("Laporan PDF sedang diunduh");
});

const XLSX_COLORS = {
  blue: "1D63B4",
  red: "DC2626",
  grayFill: "EEF2F7",
  white: "FFFFFF",
  border: "CBD5E1"
};

function xlsxBorderAll() {
  const line = {
    style: "thin",
    color: {
      rgb: XLSX_COLORS.border
    }
  };
  return {
    top: line,
    bottom: line,
    left: line,
    right: line
  };
}

function xlsxStyleCell(ws, r, c, style) {
  const addr = XLSX.utils.encode_cell({
    r: r,
    c: c
  });
  if (!ws[addr]) ws[addr] = {
    t: "z"
  };
  ws[addr].s = Object.assign({}, ws[addr].s, style);
}

function buildMonthBlock(monthKey) {
  const list = Object.values(db[monthKey] || {}).filter(t => t.status === "approved").sort((a, b) => a.date.localeCompare(b.date));
  const totalIn = list.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = list.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0);
  const opening = getOpeningBalance(monthKey);
  const closing = opening + totalIn - totalOut;
  const rows = [];
  const ops = [];
  const merges = [];
  rows.push([ "KEUANGAN PUK FSP RTMM SPSI PT. TORABIKA EKA SEMESTA 2023-2026", "", "", "", "" ]);
  rows.push([ "DATA KELUAR MASUK SPSI UNTUK BERBAGAI KEGIATAN", "", "", "", "" ]);
  rows.push([ "BULAN " + monthLabel(monthKey).toUpperCase(), "", "", "", "" ]);
  rows.push([]);
  rows.push([ "Saldo Awal Bulan Ini", "", "", "", opening ]);
  rows.push([]);
  const headerRowIdx = rows.length;
  rows.push([ "Tanggal", "Keterangan", "Pemasukan (Rp)", "Pengeluaran (Rp)", "Saldo (Rp)" ]);
  let running = opening;
  const dataStartIdx = rows.length;
  list.forEach(t => {
    running += t.type === "in" ? t.amount : -t.amount;
    rows.push([ fmtTgl(t.date), t.desc, t.type === "in" ? t.amount : "", t.type === "out" ? t.amount : "", running ]);
  });
  const dataEndIdx = rows.length - 1;
  const totalRowIdx = rows.length;
  rows.push([ "", "TOTAL", totalIn, totalOut, closing ]);
  rows.push([]);
  const closingRowIdx = rows.length;
  rows.push([ "Saldo Akhir Bulan Ini", "", "", "", closing ]);
  merges.push({
    s: {
      r: 0,
      c: 0
    },
    e: {
      r: 0,
      c: 4
    }
  }, {
    s: {
      r: 1,
      c: 0
    },
    e: {
      r: 1,
      c: 4
    }
  }, {
    s: {
      r: 2,
      c: 0
    },
    e: {
      r: 2,
      c: 4
    }
  }, {
    s: {
      r: 4,
      c: 0
    },
    e: {
      r: 4,
      c: 3
    }
  }, {
    s: {
      r: closingRowIdx,
      c: 0
    },
    e: {
      r: closingRowIdx,
      c: 3
    }
  });
  ops.push({
    r: 0,
    c: 0,
    style: {
      font: {
        bold: true,
        sz: 12
      },
      alignment: {
        horizontal: "center"
      }
    }
  });
  ops.push({
    r: 1,
    c: 0,
    style: {
      font: {
        bold: true,
        sz: 10.5
      },
      alignment: {
        horizontal: "center"
      }
    }
  });
  ops.push({
    r: 2,
    c: 0,
    style: {
      font: {
        sz: 10.5
      },
      alignment: {
        horizontal: "center"
      }
    }
  });
  ops.push({
    r: 4,
    c: 0,
    style: {
      font: {
        bold: true
      }
    }
  });
  ops.push({
    r: 4,
    c: 4,
    style: {
      font: {
        bold: true
      },
      numFmt: "#,##0",
      alignment: {
        horizontal: "right"
      }
    }
  });
  ops.push({
    r: closingRowIdx,
    c: 0,
    style: {
      font: {
        bold: true,
        sz: 12
      }
    }
  });
  ops.push({
    r: closingRowIdx,
    c: 4,
    style: {
      font: {
        bold: true,
        sz: 12
      },
      numFmt: "#,##0",
      alignment: {
        horizontal: "right"
      }
    }
  });
  for (let c = 0; c < 5; c++) {
    ops.push({
      r: headerRowIdx,
      c: c,
      style: {
        font: {
          bold: true,
          color: {
            rgb: XLSX_COLORS.white
          }
        },
        fill: {
          fgColor: {
            rgb: XLSX_COLORS.blue
          }
        },
        alignment: {
          horizontal: "center"
        },
        border: xlsxBorderAll()
      }
    });
  }
  for (let r = dataStartIdx; r <= dataEndIdx; r++) {
    for (let c = 0; c < 5; c++) {
      const style = {
        border: xlsxBorderAll()
      };
      if (c === 2) {
        style.numFmt = "#,##0";
        style.alignment = {
          horizontal: "right"
        };
        style.font = {
          color: {
            rgb: XLSX_COLORS.blue
          }
        };
      }
      if (c === 3) {
        style.numFmt = "#,##0";
        style.alignment = {
          horizontal: "right"
        };
        style.font = {
          color: {
            rgb: XLSX_COLORS.red
          }
        };
      }
      if (c === 4) {
        style.numFmt = "#,##0";
        style.alignment = {
          horizontal: "right"
        };
        style.font = {
          bold: true
        };
      }
      ops.push({
        r: r,
        c: c,
        style: style
      });
    }
  }
  for (let c = 0; c < 5; c++) {
    const style = {
      font: {
        bold: true
      },
      fill: {
        fgColor: {
          rgb: XLSX_COLORS.grayFill
        }
      },
      border: xlsxBorderAll()
    };
    if (c >= 2) {
      style.numFmt = "#,##0";
      style.alignment = {
        horizontal: "right"
      };
    }
    ops.push({
      r: totalRowIdx,
      c: c,
      style: style
    });
  }
  return {
    rows: rows,
    ops: ops,
    merges: merges
  };
}

exportXlsxBtn.addEventListener("click", () => {
  if (typeof XLSX === "undefined") {
    showToast("Gagal memuat pustaka XLSX, cek koneksi internet");
    return;
  }
  const allMonthKeys = Object.keys(db).filter(mk => Object.values(db[mk] || {}).some(t => t.status === "approved")).sort();
  if (allMonthKeys.length === 0) {
    showToast("Belum ada transaksi disetujui untuk diekspor");
    return;
  }
  const wb = XLSX.utils.book_new();
  const ringkasanAoa = [ [ "REKAP KEUANGAN SELURUH PERIODE", "", "", "", "" ], [], [ "Bulan", "Saldo Awal (Rp)", "Pemasukan (Rp)", "Pengeluaran (Rp)", "Saldo Akhir (Rp)" ] ];
  let grandIn = 0, grandOut = 0, finalSaldo = 0;
  allMonthKeys.forEach(mk => {
    const list = Object.values(db[mk] || {}).filter(t => t.status === "approved");
    const inSum = list.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
    const outSum = list.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0);
    const opening = getOpeningBalance(mk);
    const closing = opening + inSum - outSum;
    grandIn += inSum;
    grandOut += outSum;
    finalSaldo = closing;
    ringkasanAoa.push([ monthLabel(mk), opening, inSum, outSum, closing ]);
  });
  const totalRingkasanRowIdx = ringkasanAoa.length;
  ringkasanAoa.push([ "TOTAL KESELURUHAN", "", grandIn, grandOut, finalSaldo ]);
  const ringkasanWs = XLSX.utils.aoa_to_sheet(ringkasanAoa);
  ringkasanWs["!cols"] = [ {
    wch: 18
  }, {
    wch: 16
  }, {
    wch: 16
  }, {
    wch: 16
  }, {
    wch: 16
  } ];
  ringkasanWs["!merges"] = [ {
    s: {
      r: 0,
      c: 0
    },
    e: {
      r: 0,
      c: 4
    }
  } ];
  xlsxStyleCell(ringkasanWs, 0, 0, {
    font: {
      bold: true,
      sz: 13
    },
    alignment: {
      horizontal: "center"
    }
  });
  for (let c = 0; c < 5; c++) {
    xlsxStyleCell(ringkasanWs, 2, c, {
      font: {
        bold: true,
        color: {
          rgb: XLSX_COLORS.white
        }
      },
      fill: {
        fgColor: {
          rgb: XLSX_COLORS.blue
        }
      },
      alignment: {
        horizontal: "center"
      },
      border: xlsxBorderAll()
    });
  }
  for (let r = 3; r < totalRingkasanRowIdx; r++) {
    for (let c = 0; c < 5; c++) {
      const style = {
        border: xlsxBorderAll()
      };
      if (c >= 1) {
        style.numFmt = "#,##0";
        style.alignment = {
          horizontal: "right"
        };
      }
      if (c === 2) style.font = {
        color: {
          rgb: XLSX_COLORS.blue
        }
      };
      if (c === 3) style.font = {
        color: {
          rgb: XLSX_COLORS.red
        }
      };
      if (c === 4) style.font = {
        bold: true
      };
      xlsxStyleCell(ringkasanWs, r, c, style);
    }
  }
  for (let c = 0; c < 5; c++) {
    const style = {
      font: {
        bold: true
      },
      fill: {
        fgColor: {
          rgb: XLSX_COLORS.grayFill
        }
      },
      border: xlsxBorderAll()
    };
    if (c >= 2) {
      style.numFmt = "#,##0";
      style.alignment = {
        horizontal: "right"
      };
    }
    xlsxStyleCell(ringkasanWs, totalRingkasanRowIdx, c, style);
  }
  XLSX.utils.book_append_sheet(wb, ringkasanWs, "Ringkasan");
  const combinedRows = [];
  const combinedMerges = [];
  const combinedOps = [];
  allMonthKeys.forEach((mk, idx) => {
    if (idx > 0) {
      combinedRows.push([]);
      combinedRows.push([]);
    }
    const startRow = combinedRows.length;
    const block = buildMonthBlock(mk);
    block.rows.forEach(row => combinedRows.push(row));
    block.merges.forEach(m => combinedMerges.push({
      s: {
        r: m.s.r + startRow,
        c: m.s.c
      },
      e: {
        r: m.e.r + startRow,
        c: m.e.c
      }
    }));
    block.ops.forEach(op => combinedOps.push({
      r: op.r + startRow,
      c: op.c,
      style: op.style
    }));
  });
  const bulananWs = XLSX.utils.aoa_to_sheet(combinedRows);
  bulananWs["!cols"] = [ {
    wch: 14
  }, {
    wch: 42
  }, {
    wch: 16
  }, {
    wch: 16
  }, {
    wch: 16
  } ];
  bulananWs["!merges"] = combinedMerges;
  combinedOps.forEach(op => xlsxStyleCell(bulananWs, op.r, op.c, op.style));
  XLSX.utils.book_append_sheet(wb, bulananWs, "Rekap Bulanan");
  const firstMonth = allMonthKeys[0];
  const lastMonth = allMonthKeys[allMonthKeys.length - 1];
  XLSX.writeFile(wb, `Rekap-Keuangan-Lengkap-${firstMonth}_sd_${lastMonth}.xlsx`);
  showToast("Rekap keseluruhan (XLSX) sedang diunduh");
});
