"use strict";

const NOTULEN_CODE = "NOT";

document.getElementById("notTanggal").value = todayISO();

const NOTULEN_MAX_FOTO = 4;
const NOTULEN_FOTO_MAX_SIDE = 1100;
const NOTULEN_FOTO_QUALITY = 0.7;

const notFotoInput = document.getElementById("notFotoInput");
const notFotoAddBtn = document.getElementById("notFotoAddBtn");
const notFotoGrid = document.getElementById("notFotoGrid");

let notulenFotoDraft = [];
let notulenFotoReady = true;
let notulenFotoOriginalCount = 0;

function renderNotulenFoto() {
  notFotoGrid.innerHTML = notulenFotoDraft.map((src, i) => `
    <div class="foto-item">
      <img src="${src}" alt="Foto dokumentasi ${i + 1}">
      <button type="button" data-index="${i}" aria-label="Hapus foto ${i + 1}">×</button>
    </div>
  `).join("");
  notFotoGrid.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      notulenFotoDraft.splice(Number(btn.dataset.index), 1);
      renderNotulenFoto();
    });
  });
  const full = notulenFotoDraft.length >= NOTULEN_MAX_FOTO;
  notFotoAddBtn.disabled = !notulenFotoReady || full;
  notFotoAddBtn.textContent = full ? "Batas foto tercapai" : "📷 Tambah Foto";
}

function compressNotulenFoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, NOTULEN_FOTO_MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", NOTULEN_FOTO_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("foto tidak terbaca"));
    };
    img.src = url;
  });
}

notFotoAddBtn.addEventListener("click", () => notFotoInput.click());

notFotoInput.addEventListener("change", async () => {
  const files = Array.from(notFotoInput.files || []);
  notFotoInput.value = "";
  if (!files.length) return;
  const slots = NOTULEN_MAX_FOTO - notulenFotoDraft.length;
  if (files.length > slots) showToast("Maksimal " + NOTULEN_MAX_FOTO + " foto per notulen");
  notFotoAddBtn.disabled = true;
  for (const file of files.slice(0, slots)) {
    try {
      notulenFotoDraft.push(await compressNotulenFoto(file));
    } catch (e) {
      showToast("Foto tidak bisa dibaca");
    }
  }
  renderNotulenFoto();
});

function fetchNotulenFoto(id) {
  return fdb.ref("notulenFoto/" + id).once("value").then(snap => {
    const val = snap.val();
    const list = Array.isArray(val) ? val : (val ? Object.values(val) : []);
    return list.filter(Boolean).slice(0, NOTULEN_MAX_FOTO);
  });
}

function persistNotulenFoto(id) {
  if (!notulenFotoReady) return Promise.resolve(true);
  if (!notulenFotoDraft.length && !notulenFotoOriginalCount) return Promise.resolve(true);
  const ref = fdb.ref("notulenFoto/" + id);
  const task = notulenFotoDraft.length ? ref.set(notulenFotoDraft) : ref.remove();
  return task.then(() => true).catch(() => false);
}

renderNotulenFoto();

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
  notulenFotoDraft = [];
  notulenFotoReady = true;
  notulenFotoOriginalCount = 0;
  renderNotulenFoto();
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
    const editId = editingNotulenId;
    fdb.ref("notulen/" + editId).update({
      data: data
    }).then(() => persistNotulenFoto(editId)).then(fotoOk => {
      logActivity("notulen", "edit", `Edit notulen "${data.judul}" (${data.tanggalRapat})`);
      cancelEditNotulen();
      showToast(fotoOk ? "Notulen diperbarui" : "Notulen diperbarui, tetapi foto gagal disimpan (cek Rules Firebase)");
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
    const newRef = fdb.ref("notulen").push();
    return newRef.set({
      nomorNotulen: nomor,
      data: data,
      createdByUid: currentUid,
      createdByName: ROLE_NAMES[currentRole],
      createdByRole: currentRole,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => newRef.key);
  }).then(newId => {
    logActivity("notulen", "buat", `Buat notulen "${data.judul}" (${data.tanggalRapat})`);
    return persistNotulenFoto(newId);
  }).then(fotoOk => {
    clearNotulenForm();
    showToast(fotoOk ? "Notulen tersimpan" : "Notulen tersimpan, tetapi foto gagal disimpan (cek Rules Firebase)");
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
  notulenFotoDraft = [];
  notulenFotoReady = false;
  notulenFotoOriginalCount = 0;
  renderNotulenFoto();
  fetchNotulenFoto(id).then(list => {
    if (editingNotulenId !== id) return;
    notulenFotoDraft = list;
    notulenFotoOriginalCount = list.length;
    notulenFotoReady = true;
    renderNotulenFoto();
  }).catch(() => {
    if (editingNotulenId !== id) return;
    showToast("Foto dokumentasi gagal dimuat");
  });
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
  fdb.ref("notulen/" + id).remove().then(() => {
    fdb.ref("notulenFoto/" + id).remove().catch(() => {});
    logActivity("notulen", "hapus", `Hapus notulen "${n.data.judul}" (${n.data.tanggalRapat})`);
    showToast("Notulen dihapus");
  }).catch(() => showToast("Gagal menghapus, tidak punya izin"));
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

function drawNotulenDokumentasi(doc, pageWidth, marginX, n, fotos) {
  const maxW = pageWidth - marginX * 2;
  const title = "DOKUMENTASI RAPAT";
  let y = 22;
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, y, { align: "center" });
  const titleW = doc.getTextWidth(title);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - titleW / 2, y + 1.2, pageWidth / 2 + titleW / 2, y + 1.2);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const info = [
    n.nomorNotulen ? "Lampiran Notulen Nomor: " + n.nomorNotulen : "",
    n.data.judul,
    fmtTgl(n.data.tanggalRapat) + (n.data.tempat ? " - " + n.data.tempat : "")
  ].filter(Boolean);
  info.forEach(line => {
    doc.splitTextToSize(line, maxW).forEach(part => {
      doc.text(part, pageWidth / 2, y, { align: "center" });
      y += 5;
    });
  });
  y += 5;

  const gap = 6;
  const colW = (maxW - gap) / 2;
  const boxH = colW * 0.75;
  fotos.slice(0, NOTULEN_MAX_FOTO).forEach((src, i) => {
    const x = marginX + (i % 2) * (colW + gap);
    const top = y + Math.floor(i / 2) * (boxH + 12);
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.rect(x, top, colW, boxH);
    try {
      const props = doc.getImageProperties(src);
      const scale = Math.min(colW / props.width, boxH / props.height);
      const w = props.width * scale;
      const h = props.height * scale;
      doc.addImage(src, "JPEG", x + (colW - w) / 2, top + (boxH - h) / 2, w, h);
    } catch (e) {}
    doc.setFontSize(9);
    doc.text("Foto " + (i + 1), x + colW / 2, top + boxH + 5, { align: "center" });
  });
  doc.setDrawColor(0);
}

function buildNotulenPDF(n, fotos) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const maxW = pageWidth - marginX * 2;
  let y = drawLetterhead(doc, pageWidth, true);

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

  if (fotos && fotos.length) drawNotulenDokumentasi(doc, pageWidth, marginX, n, fotos);

  return doc;
}

function loadNotulenFotoForPDF(id) {
  return fetchNotulenFoto(id).then(list => ({ fotos: list, ok: true })).catch(() => ({ fotos: [], ok: false }));
}

function previewNotulenPDF(id) {
  const n = notulen[id];
  if (!n) {
    showToast("Notulen tidak ditemukan");
    return;
  }
  const win = window.open("", "_blank");
  loadNotulenFotoForPDF(id).then(res => {
    if (!res.ok) showToast("Foto dokumentasi gagal dimuat, PDF dibuat tanpa foto");
    const url = buildNotulenPDF(n, res.fotos).output("bloburl");
    if (win) win.location.href = url;
    else window.open(url, "_blank");
  });
}

function downloadNotulenPDF(id) {
  const n = notulen[id];
  if (!n) {
    showToast("Notulen tidak ditemukan");
    return;
  }
  loadNotulenFotoForPDF(id).then(res => {
    if (!res.ok) showToast("Foto dokumentasi gagal dimuat, PDF dibuat tanpa foto");
    const doc = buildNotulenPDF(n, res.fotos);
    const fileLabel = n.nomorNotulen ? sanitizeFilename(n.nomorNotulen) : n.data.tanggalRapat;
    doc.save(`Notulen-${fileLabel}.pdf`);
    showToast("Notulen PDF sedang diunduh");
  });
}
