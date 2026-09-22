"use strict";

const NOTULEN_CODE = "NOT";

document.getElementById("notTanggal").value = todayISO();

function collectNotulenData() {
  const judul = document.getElementById("notJudul").value.trim();
  const tanggal = document.getElementById("notTanggal").value;
  const waktuMulai = document.getElementById("notWaktuMulai").value;
  const waktuSelesai = document.getElementById("notWaktuSelesai").value;
  const tempat = document.getElementById("notTempat").value.trim();
  const pemimpin = document.getElementById("notPemimpin").value.trim();
  const notulis = document.getElementById("notNotulis").value.trim();
  const peserta = document.getElementById("notPeserta").value.trim();
  const agenda = document.getElementById("notAgenda").value.trim();
  const pembahasan = document.getElementById("notPembahasan").value.trim();
  const tindakLanjut = document.getElementById("notTindakLanjut").value.trim();
  const catatan = document.getElementById("notCatatan").value.trim();

  if (!judul || !tanggal || !pemimpin || !notulis || !pembahasan) {
    showToast("Lengkapi judul, tanggal, pemimpin rapat, notulis, dan hasil pembahasan");
    return null;
  }

  return {
    judul: judul,
    tanggalRapat: tanggal,
    waktuMulai: waktuMulai,
    waktuSelesai: waktuSelesai,
    tempat: tempat,
    pemimpinRapat: pemimpin,
    notulis: notulis,
    peserta: peserta,
    agenda: agenda,
    pembahasan: pembahasan,
    tindakLanjut: tindakLanjut,
    catatan: catatan
  };
}

function clearNotulenForm() {
  [ "notJudul", "notTempat", "notWaktuMulai", "notWaktuSelesai", "notPemimpin", "notPeserta", "notAgenda", "notPembahasan", "notTindakLanjut", "notCatatan" ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("notTanggal").value = todayISO();
  const notNotulisEl = document.getElementById("notNotulis");
  if (notNotulisEl) notNotulisEl.value = ROLE_NAMES[currentRole] || "";
}

const notulenSubmitBtn = document.getElementById("notulenSubmitBtn");
const notulenEditBanner = document.getElementById("notulenEditBanner");
const notulenEditCancelBtn = document.getElementById("notulenEditCancelBtn");
const notulenListEl = document.getElementById("notulenList");
const notulenCountEl = document.getElementById("notulenCount");

notulenSubmitBtn.addEventListener("click", () => {
  const data = collectNotulenData();
  if (!data) return;

  if (editingNotulenId) {
    const original = notulen[editingNotulenId];
    const allowed = original && (isFullAdmin() || original.createdByUid === currentUid);
    if (!allowed) {
      showToast("Tidak punya izin mengedit notulen ini");
      return;
    }
    notulenSubmitBtn.disabled = true;
    fdb.ref("notulen/" + editingNotulenId).update({
      data: data
    }).then(() => {
      cancelEditNotulen();
      showToast("Notulen diperbarui");
    }).catch(err => {
      const code = err && err.code ? err.code : "";
      showToast(code === "PERMISSION_DENIED" ? "Ditolak sistem: Rules Firebase belum diperbarui" : "Gagal memperbarui notulen");
    }).finally(() => {
      notulenSubmitBtn.disabled = false;
    });
    return;
  }

  notulenSubmitBtn.disabled = true;
  const year = new Date().getFullYear();
  fdb.ref("notulenCounters/" + year).transaction(curr => (curr || 0) + 1).then(result => {
    const urut = result.snapshot.val();
    const bulanRoman = ROMAN_MONTHS[new Date().getMonth()];
    const nomor = urut + "/" + NOTULEN_CODE + "/PUK SP RTMM-SPSI/TES 1/" + bulanRoman + "/" + year;
    return fdb.ref("notulen").push({
      nomorNotulen: nomor,
      data: data,
      createdByUid: currentUid,
      createdByName: ROLE_NAMES[currentRole],
      createdByRole: currentRole,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
  }).then(() => {
    clearNotulenForm();
    showToast("Notulen tersimpan");
  }).catch(err => {
    const code = err && err.code ? err.code : "";
    if (code === "PERMISSION_DENIED") {
      showToast("Ditolak sistem: Rules Firebase belum diperbarui (lihat panduan)");
    } else if (code) {
      showToast("Gagal menyimpan notulen: " + code);
    } else {
      showToast("Gagal menyimpan notulen, cek koneksi internet");
    }
  }).finally(() => {
    notulenSubmitBtn.disabled = false;
  });
});

function startEditNotulen(id) {
  const n = notulen[id];
  if (!n) {
    showToast("Notulen tidak ditemukan");
    return;
  }
  switchTab("notulen");
  document.getElementById("notJudul").value = n.data.judul || "";
  document.getElementById("notTanggal").value = n.data.tanggalRapat || todayISO();
  document.getElementById("notWaktuMulai").value = n.data.waktuMulai || "";
  document.getElementById("notWaktuSelesai").value = n.data.waktuSelesai || "";
  document.getElementById("notTempat").value = n.data.tempat || "";
  document.getElementById("notPemimpin").value = n.data.pemimpinRapat || "";
  document.getElementById("notNotulis").value = n.data.notulis || "";
  document.getElementById("notPeserta").value = n.data.peserta || "";
  document.getElementById("notAgenda").value = n.data.agenda || "";
  document.getElementById("notPembahasan").value = n.data.pembahasan || "";
  document.getElementById("notTindakLanjut").value = n.data.tindakLanjut || "";
  document.getElementById("notCatatan").value = n.data.catatan || "";

  editingNotulenId = id;
  notulenEditBanner.style.display = "flex";
  notulenSubmitBtn.textContent = "Update Notulen";
  document.getElementById("notulenFormCard").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function cancelEditNotulen() {
  editingNotulenId = null;
  clearNotulenForm();
  notulenEditBanner.style.display = "none";
  notulenSubmitBtn.textContent = "Simpan Notulen";
}
notulenEditCancelBtn.addEventListener("click", cancelEditNotulen);

function deleteNotulen(id) {
  const n = notulen[id];
  const allowed = n && (isFullAdmin() || n.createdByUid === currentUid);
  if (!allowed) {
    showToast("Tidak punya izin menghapus notulen ini");
    return;
  }
  fdb.ref("notulen/" + id).remove().then(() => showToast("Notulen dihapus")).catch(() => showToast("Gagal menghapus, tidak punya izin"));
}

function getNotulenList() {
  return Object.keys(notulen).map(id => ({
    id: id,
    ...notulen[id]
  }));
}

function renderNotulen() {
  const all = getNotulenList().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  notulenCountEl.textContent = all.length + " notulen";

  if (!all.length) {
    notulenListEl.innerHTML = `<div class="empty-state">Belum ada notulen rapat. Buat lewat form di atas.</div>`;
    return;
  }

  notulenListEl.innerHTML = all.map(n => {
    const canManage = isFullAdmin() || n.createdByUid === currentUid;
    return `
      <div class="letter-row">
        <div class="letter-icon">${iconKeterangan}</div>
        <div class="letter-body">
          <div class="letter-title">${escapeHTML(n.data.judul)}</div>
          <div class="letter-sub">${escapeHTML(formatDateShort(n.data.tanggalRapat))} · oleh ${escapeHTML(n.createdByName || "-")}</div>
          <div class="letter-nomor">${escapeHTML(n.nomorNotulen || "-")}</div>
        </div>
        <div class="tx-actions">
          ${canManage ? `<button class="tx-edit" data-id="${n.id}" aria-label="Edit">${iconEdit}</button>
            <button class="tx-del" data-id="${n.id}" aria-label="Hapus">${iconTrash}</button>` : ""}
          <button class="letter-download notulen-preview" data-id="${n.id}" aria-label="Preview PDF">👁️</button>
          <button class="letter-download" data-id="${n.id}" aria-label="Unduh PDF">${iconDownload}</button>
        </div>
      </div>
    `;
  }).join("");

  notulenListEl.querySelectorAll(".tx-edit").forEach(btn => {
    btn.addEventListener("click", () => startEditNotulen(btn.dataset.id));
  });
  notulenListEl.querySelectorAll(".tx-del").forEach(btn => {
    btn.addEventListener("click", () => deleteNotulen(btn.dataset.id));
  });
  notulenListEl.querySelectorAll(".notulen-preview").forEach(btn => {
    btn.addEventListener("click", () => previewNotulenPDF(btn.dataset.id));
  });
  notulenListEl.querySelectorAll(".letter-download:not(.notulen-preview)").forEach(btn => {
    btn.addEventListener("click", () => downloadNotulenPDF(btn.dataset.id));
  });
}

function buildNotulenPDF(n) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const maxW = pageWidth - marginX * 2;
  let y = drawLetterhead(doc, pageWidth);

  function para(text, fontSize, lineHeight, bold) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW);
    lines.forEach(line => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, marginX, y);
      y += lineHeight;
    });
  }
  function centered(text, fontSize, bold, underline) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.text(text, pageWidth / 2, y, { align: "center" });
    if (underline) {
      const w = doc.getTextWidth(text);
      doc.setLineWidth(0.3);
      doc.line(pageWidth / 2 - w / 2, y + 1.2, pageWidth / 2 + w / 2, y + 1.2);
    }
    y += 6;
  }
  function labelValue(label, value, fontSize, lineHeight) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize || 10.5);
    doc.text(label, marginX, y);
    doc.text(":", marginX + 34, y);
    const lines = doc.splitTextToSize(value || "-", maxW - 38);
    lines.forEach((line, i) => doc.text(line, marginX + 38, y + i * (lineHeight || 5.2)));
    y += Math.max(1, lines.length) * (lineHeight || 5.2);
  }
  // Merapikan isi kolom bebas seperti "Hasil Pembahasan / Keputusan": baris kosong jadi jeda
  // paragraf, dan baris berawalan angka/bullet ("1.", "2)", "-", "•") dirender dengan indentasi
  // menggantung supaya sambungan teks yang panjang tetap rapi sejajar, bukan menempel ke nomor.
  function richText(text, fontSize, lineHeight) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const rawLines = String(text || "").split(/\r?\n/);
    rawLines.forEach(rawLine => {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        y += lineHeight * 0.5;
        return;
      }
      const listMatch = trimmed.match(/^(\d+[.)]|[-•*])\s+(.*)$/);
      const indent = listMatch ? 7 : 0;
      const marker = listMatch ? listMatch[1] : "";
      const body = listMatch ? listMatch[2] : trimmed;
      const wrapped = doc.splitTextToSize(body, maxW - indent);
      wrapped.forEach((w, i) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        if (i === 0 && marker) doc.text(marker, marginX, y);
        doc.text(w, marginX + indent, y);
        y += lineHeight;
      });
    });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Nomor : " + (n.nomorNotulen || "-"), marginX, y);
  y += 10;

  centered("NOTULEN RAPAT", 14, true, true);
  y += 3;

  labelValue("Judul Rapat", n.data.judul);
  labelValue("Hari/Tanggal", fmtTgl(n.data.tanggalRapat));
  if (n.data.waktuMulai) {
    const waktuText = n.data.waktuSelesai ? n.data.waktuMulai + " - " + n.data.waktuSelesai + " WIB" : n.data.waktuMulai + " WIB";
    labelValue("Waktu", waktuText);
  }
  if (n.data.tempat) labelValue("Tempat", n.data.tempat);
  labelValue("Pemimpin Rapat", n.data.pemimpinRapat);
  labelValue("Notulis", n.data.notulis);
  y += 2;

  if (n.data.peserta) {
    para("Peserta Rapat:", 10.5, 5.2, true);
    richText(n.data.peserta, 10.5, 5.2);
    y += 1;
  }
  if (n.data.agenda) {
    para("Agenda:", 10.5, 5.2, true);
    richText(n.data.agenda, 10.5, 5.2);
    y += 1;
  }
  para("Hasil Pembahasan / Keputusan:", 10.5, 5.2, true);
  richText(n.data.pembahasan, 10.5, 5.2);
  y += 1;
  if (n.data.tindakLanjut) {
    para("Tindak Lanjut:", 10.5, 5.2, true);
    richText(n.data.tindakLanjut, 10.5, 5.2);
    y += 1;
  }
  if (n.data.catatan) {
    para("Catatan: " + n.data.catatan, 10, 5, false);
  }

  y += 8;
  drawLetterClosing(doc, pageWidth, marginX, y, n.data.tanggalRapat, [
    { role: "Notulis", name: n.data.notulis },
    { role: "Pemimpin Rapat", name: n.data.pemimpinRapat }
  ]);

  return doc;
}

function previewNotulenPDF(id) {
  const n = notulen[id];
  if (!n) {
    showToast("Notulen tidak ditemukan");
    return;
  }
  const doc = buildNotulenPDF(n);
  window.open(doc.output("bloburl"), "_blank");
}

// Ubah nomor notulen resmi (yang mengandung "/") jadi nama file yang aman,
// supaya nama file PDF persis mencerminkan nomor suratnya untuk dokumentasi.
function sanitizeFilename(str) {
  return String(str || "")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function downloadNotulenPDF(id) {
  const n = notulen[id];
  if (!n) {
    showToast("Notulen tidak ditemukan");
    return;
  }
  const doc = buildNotulenPDF(n);
  const fileLabel = n.nomorNotulen ? sanitizeFilename(n.nomorNotulen) : n.data.tanggalRapat;
  doc.save(`Notulen-${fileLabel}.pdf`);
  showToast("Notulen PDF sedang diunduh");
}
