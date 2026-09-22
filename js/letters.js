"use strict";

const ROMAN_MONTHS = [ "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII" ];

function collectLetterData() {
  if (selectedLetterType === "mandat") {
    const nama = document.getElementById("mandatNama").value.trim();
    const jabatan = document.getElementById("mandatJabatan").value.trim();
    const perihal = document.getElementById("mandatPerihal").value.trim();
    const keperluan = document.getElementById("mandatKeperluan").value.trim();
    const hari = document.getElementById("mandatHari").value.trim();
    const jam = document.getElementById("mandatJam").value.trim();
    const tempat = document.getElementById("mandatTempat").value.trim();
    const mulai = document.getElementById("mandatMulai").value;
    const selesai = document.getElementById("mandatSelesai").value;
    const catatan = document.getElementById("mandatCatatan").value.trim();
    if (!nama || !jabatan || !keperluan || !mulai) {
      showToast("Lengkapi nama, jabatan, uraian tugas, dan tanggal mulai");
      return null;
    }
    return {
      penerimaNama: nama,
      penerimaJabatan: jabatan,
      perihal: perihal,
      keperluan: keperluan,
      hari: hari,
      jam: jam,
      tempatTugas: tempat,
      tanggalMulai: mulai,
      tanggalSelesai: selesai || mulai,
      catatan: catatan
    };
  }
  if (selectedLetterType === "undangan") {
    const perihal = document.getElementById("undPerihal").value.trim();
    const tujuan = document.getElementById("undTujuan").value.trim();
    const tglAcara = document.getElementById("undTanggalAcara").value;
    const waktu = document.getElementById("undWaktu").value;
    const tempat = document.getElementById("undTempat").value.trim();
    const agenda = document.getElementById("undAgenda").value.trim();
    const catatan = document.getElementById("undCatatan").value.trim();
    if (!perihal || !tujuan || !tglAcara || !tempat) {
      showToast("Lengkapi perihal, tujuan, tanggal, dan tempat acara");
      return null;
    }
    return {
      perihal: perihal,
      tujuanPeserta: tujuan,
      tanggalAcara: tglAcara,
      waktuAcara: waktu,
      tempatAcara: tempat,
      agenda: agenda,
      catatan: catatan
    };
  }
  const namaK = document.getElementById("ketNama").value.trim();
  const jabatanK = document.getElementById("ketJabatan").value.trim();
  const isi = document.getElementById("ketIsi").value.trim();
  const berlaku = document.getElementById("ketBerlaku").value;
  if (!namaK || !jabatanK || !isi) {
    showToast("Lengkapi nama, jabatan/NIK, dan isi keterangan");
    return null;
  }
  return {
    namaDiterangkan: namaK,
    jabatanNIK: jabatanK,
    isiKeterangan: isi,
    masaBerlaku: berlaku
  };
}

function clearLetterForm() {
  [ "mandatNama", "mandatJabatan", "mandatPerihal", "mandatKeperluan", "mandatHari", "mandatJam", "mandatTempat", "mandatMulai", "mandatSelesai", "mandatCatatan", "undPerihal", "undTujuan", "undTanggalAcara", "undWaktu", "undTempat", "undAgenda", "undCatatan", "ketNama", "ketJabatan", "ketIsi", "ketBerlaku" ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  suratTanggal.value = todayISO();
}

suratSubmitBtn.addEventListener("click", () => {
  if (editingLetterId) {
    const original = letters[editingLetterId];
    const allowed = original && (isFullAdmin() || original.createdByUid === currentUid);
    if (!allowed) {
      showToast("Tidak punya izin mengedit surat ini");
      return;
    }
    const data = collectLetterData();
    if (!data) return;
    suratSubmitBtn.disabled = true;
    fdb.ref("letters/" + editingLetterId).update({
      tanggalSurat: suratTanggal.value || todayISO(),
      data: data
    }).then(() => {
      cancelEditLetter();
      showToast("Surat diperbarui");
    }).catch(err => {
      const code = err && err.code ? err.code : "";
      showToast(code === "PERMISSION_DENIED" ? "Ditolak sistem: Rules Firebase belum diperbarui" : "Gagal memperbarui surat");
    }).finally(() => {
      suratSubmitBtn.disabled = false;
    });
    return;
  }
  if (currentRole !== "sekretaris" && !isFullAdmin()) {
    showToast("Hanya Sekretaris/Ketua/Super Admin yang bisa membuat surat");
    return;
  }
  const data = collectLetterData();
  if (!data) return;
  const isKetua = isFullAdmin();
  suratSubmitBtn.disabled = true;
  fdb.ref("letters").push({
    type: selectedLetterType,
    tanggalSurat: suratTanggal.value || todayISO(),
    status: isKetua ? "approved" : "pending",
    nomorSurat: null,
    data: data,
    createdByUid: currentUid,
    createdByName: ROLE_NAMES[currentRole],
    createdByRole: currentRole,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    clearLetterForm();
    showToast(isKetua ? "Surat tersimpan" : "Surat terkirim · menunggu ACC Ketua");
  }).catch(err => {
    const code = err && err.code ? err.code : "";
    if (code === "PERMISSION_DENIED") {
      showToast("Ditolak sistem: Rules Firebase belum diperbarui (lihat panduan)");
    } else if (code) {
      showToast("Gagal mengirim surat: " + code);
    } else {
      showToast("Gagal mengirim surat, cek koneksi internet");
    }
  }).finally(() => {
    suratSubmitBtn.disabled = false;
  });
});

function selectLetterType(type) {
  selectedLetterType = type;
  document.querySelectorAll(".letter-type-btn").forEach(b => b.classList.toggle("active", b.dataset.lettertype === type));
  document.getElementById("fieldsMandat").style.display = type === "mandat" ? "block" : "none";
  document.getElementById("fieldsUndangan").style.display = type === "undangan" ? "block" : "none";
  document.getElementById("fieldsKeterangan").style.display = type === "keterangan" ? "block" : "none";
}

function startEditLetter(id) {
  const l = letters[id];
  if (!l) {
    showToast("Surat tidak ditemukan");
    return;
  }
  switchTab("surat");
  suratFormCard.style.display = "block";
  selectLetterType(l.type);
  suratTanggal.value = l.tanggalSurat || todayISO();
  if (l.type === "mandat") {
    document.getElementById("mandatNama").value = l.data.penerimaNama || "";
    document.getElementById("mandatJabatan").value = l.data.penerimaJabatan || "";
    document.getElementById("mandatPerihal").value = l.data.perihal || "";
    document.getElementById("mandatKeperluan").value = l.data.keperluan || "";
    document.getElementById("mandatHari").value = l.data.hari || "";
    document.getElementById("mandatJam").value = l.data.jam || "";
    document.getElementById("mandatTempat").value = l.data.tempatTugas || "";
    document.getElementById("mandatMulai").value = l.data.tanggalMulai || "";
    document.getElementById("mandatSelesai").value = l.data.tanggalSelesai || "";
    document.getElementById("mandatCatatan").value = l.data.catatan || "";
  } else if (l.type === "undangan") {
    document.getElementById("undPerihal").value = l.data.perihal || "";
    document.getElementById("undTujuan").value = l.data.tujuanPeserta || "";
    document.getElementById("undTanggalAcara").value = l.data.tanggalAcara || "";
    document.getElementById("undWaktu").value = l.data.waktuAcara || "";
    document.getElementById("undTempat").value = l.data.tempatAcara || "";
    document.getElementById("undAgenda").value = l.data.agenda || "";
    document.getElementById("undCatatan").value = l.data.catatan || "";
  } else {
    document.getElementById("ketNama").value = l.data.namaDiterangkan || "";
    document.getElementById("ketJabatan").value = l.data.jabatanNIK || "";
    document.getElementById("ketIsi").value = l.data.isiKeterangan || "";
    document.getElementById("ketBerlaku").value = l.data.masaBerlaku || "";
  }
  editingLetterId = id;
  suratEditBanner.style.display = "flex";
  suratSubmitBtn.textContent = "Update Surat";
  suratFormCard.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function cancelEditLetter() {
  editingLetterId = null;
  clearLetterForm();
  suratEditBanner.style.display = "none";
  suratSubmitBtn.textContent = isFullAdmin() ? "Simpan Surat" : "Kirim untuk ACC Ketua";
  if (currentRole !== "sekretaris" && !isFullAdmin()) suratFormCard.style.display = "none";
}

suratEditCancelBtn.addEventListener("click", cancelEditLetter);

function approveLetter(id) {
  if (!isFullAdmin()) return;
  const letterType = letters[id] && letters[id].type || "undangan";
  const code = LETTER_CODES[letterType] || "SRT";
  const year = (new Date).getFullYear();
  fdb.ref("letterCounters/" + year).transaction(curr => (curr || 0) + 1).then(result => {
    const urut = result.snapshot.val();
    const bulanRoman = ROMAN_MONTHS[(new Date).getMonth()];
    const nomor = urut + "/" + code + "/PUK SP RTMM-SPSI/TES 1/" + bulanRoman + "/" + year;
    return fdb.ref("letters/" + id).update({
      status: "approved",
      nomorSurat: nomor,
      approvedByName: ROLE_NAMES[currentRole],
      approvedAt: firebase.database.ServerValue.TIMESTAMP
    });
  }).then(() => showToast("Surat disetujui & diberi nomor")).catch(() => showToast("Gagal menyetujui surat"));
}

function rejectLetter(id) {
  if (!isFullAdmin()) return;
  fdb.ref("letters/" + id).remove().then(() => showToast("Surat ditolak & dihapus")).catch(() => showToast("Gagal menolak surat"));
}

function deleteLetter(id) {
  if (!isFullAdmin()) {
    showToast("Hanya Ketua/Super Admin yang bisa menghapus surat");
    return;
  }
  fdb.ref("letters/" + id).remove().then(() => showToast("Surat dihapus")).catch(() => showToast("Gagal menghapus, tidak punya izin"));
}

const LETTER_CODES = {
  mandat: "ST",
  undangan: "UND",
  keterangan: "SKET"
};

function drawLetterhead(doc, pageWidth) {
  const logoSize = 18;
  if (LOGO_DATA_URI) {
    try {
      doc.addImage(LOGO_DATA_URI, "JPEG", 14, 8, logoSize, logoSize);
    } catch (e) {}
  }
  let y = 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("PIMPINAN UNIT KERJA", pageWidth / 2, y, {
    align: "center"
  });
  y += 5.5;
  doc.setFontSize(10.5);
  doc.text("SERIKAT PEKERJA ROKOK TEMBAKAU MAKANAN MINUMAN", pageWidth / 2, y, {
    align: "center"
  });
  y += 4.8;
  doc.text("SERIKAT PEKERJA SELURUH INDONESIA", pageWidth / 2, y, {
    align: "center"
  });
  y += 4.8;
  doc.setFont("helvetica", "bold");
  doc.text("( PUK SP RTMM - SPSI PT TORABIKA EKA SEMESTA 1 )", pageWidth / 2, y, {
    align: "center"
  });
  y += 4.6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("NOMOR BUKTI PENCATATAN DISNAKERTRANS NOMOR: 243/Disnakertrans/X1/2001", pageWidth / 2, y, {
    align: "center"
  });
  y += 3.2;
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(.2);
  doc.line(16, y, pageWidth - 16, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Jln. Raya Serang KM. 12,5 Kecamatan Cikupa Kabupaten Tangerang", pageWidth / 2, y, {
    align: "center"
  });
  y += 3;
  doc.setDrawColor(29, 99, 180);
  doc.setLineWidth(.9);
  doc.line(14, y, pageWidth - 14, y);
  y += .9;
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(.2);
  doc.line(14, y, pageWidth - 14, y);
  return y + 9;
}

function fmtTgl(iso) {
  if (!iso) return "-";
  const d = new Date(iso + "T00:00:00");
  return d.getDate() + " " + MONTHS_ID[d.getMonth()] + " " + d.getFullYear();
}

function drawLetterClosing(doc, pageWidth, marginX, y, tanggalSurat, signers) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const estimatedHeight = 65;
  if (y + estimatedHeight > pageHeight - 12) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Dikeluarkan di  : Cikupa", pageWidth - marginX, y, {
    align: "right"
  });
  y += 5.5;
  doc.text("Pada Tanggal    : " + fmtTgl(tanggalSurat), pageWidth - marginX, y, {
    align: "right"
  });
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PIMPINAN UNIT KERJA", pageWidth / 2, y, {
    align: "center"
  });
  y += 4.6;
  doc.setFontSize(8.5);
  doc.text("SERIKAT PEKERJA - ROKOK, TEMBAKAU, MAKANAN DAN MINUMAN", pageWidth / 2, y, {
    align: "center"
  });
  y += 4.2;
  doc.text("SERIKAT PEKERJA SELURUH INDONESIA", pageWidth / 2, y, {
    align: "center"
  });
  y += 4.2;
  doc.setFont("helvetica", "bold");
  doc.text("PT TORABIKA EKA SEMESTA 1 CIKUPA", pageWidth / 2, y, {
    align: "center"
  });
  y += 16;
  const n = signers.length;
  const usableWidth = pageWidth - marginX * 2;
  const colWidth = usableWidth / n;
  const centers = signers.map((s, i) => marginX + colWidth * i + colWidth / 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  signers.forEach((s, i) => doc.text(s.role + ",", centers[i], y, {
    align: "center"
  }));
  const lineY = y + 24;
  const half = Math.min(24, colWidth / 2 - 6);
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(.3);
  centers.forEach(c => doc.line(c - half, lineY, c + half, lineY));
  const nameY = lineY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  signers.forEach((s, i) => doc.text(s.name, centers[i], nameY, {
    align: "center"
  }));
  let ty = nameY + 14;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.text("Tembusan :", marginX, ty);
  ty += 4.5;
  doc.setFont("helvetica", "normal");
  doc.text("1. Kepada Yth, Pimpinan Perusahaan PT. Torabika Eka Semesta Cikupa.", marginX + 4, ty);
  ty += 4.2;
  doc.text("2. Arsip.-", marginX + 4, ty);
  return ty;
}

function downloadLetterPDF(id) {
  const l = letters[id];
  if (!l) {
    showToast("Surat tidak ditemukan");
    return;
  }
  const {jsPDF: jsPDF} = window.jspdf;
  const doc = new jsPDF;
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
    doc.text(text, pageWidth / 2, y, {
      align: "center"
    });
    if (underline) {
      const w = doc.getTextWidth(text);
      doc.setLineWidth(.3);
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
    doc.text(":", marginX + 30, y);
    const lines = doc.splitTextToSize(value || "-", maxW - 34);
    lines.forEach((line, i) => doc.text(line, marginX + 34, y + i * (lineHeight || 5.2)));
    y += Math.max(1, lines.length) * (lineHeight || 5.2);
  }
  if (l.type === "mandat") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text("Nomor : " + (l.nomorSurat || "-"), marginX, y);
    y += 5.5;
    doc.text("Hal      : " + (l.data.perihal || "-"), marginX, y);
    y += 10;
    centered("SURAT TUGAS", 14, true, true);
    y += 3;
    para("Kepada Yth,", 10.5, 5.2, false);
    para(l.data.penerimaNama + " (" + l.data.penerimaJabatan + ")", 10.5, 5.2, true);
    para("Di - Tempat", 10.5, 5.2, false);
    y += 3;
    para("Dengan Hormat,", 10.5, 5.2, false);
    y += 1;
    para("Sehubungan dengan pelaksanaan kegiatan organisasi, dengan ini kami menugaskan Saudara/i tersebut di atas untuk:", 10.5, 5.2, false);
    y += 1;
    para(l.data.keperluan, 10.5, 5.2, false);
    y += 2;
    if (l.data.hari) labelValue("HARI", l.data.hari);
    labelValue("TANGGAL", fmtTgl(l.data.tanggalMulai) + " s/d " + fmtTgl(l.data.tanggalSelesai));
    if (l.data.jam) labelValue("JAM", l.data.jam);
    if (l.data.tempatTugas) labelValue("TEMPAT", l.data.tempatTugas);
    if (l.data.catatan) {
      y += 1;
      para("Catatan: " + l.data.catatan, 10, 5, false);
    }
    y += 4;
    para("Demikian surat tugas ini diberikan untuk dapat dipergunakan sebagaimana mestinya.", 10.5, 5.2, false);
    y += 10;
    drawLetterClosing(doc, pageWidth, marginX, y, l.tanggalSurat, [ {
      role: "Ketua",
      name: ROLE_NAMES.ketua
    }, {
      role: "Sekretaris",
      name: ROLE_NAMES.sekretaris
    } ]);
  } else if (l.type === "undangan") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text("Nomor    : " + (l.nomorSurat || "-"), marginX, y);
    y += 5.5;
    doc.text("Lampiran : -", marginX, y);
    y += 5.5;
    doc.text("Perihal  : " + l.data.perihal, marginX, y);
    y += 10;
    para("Kepada Yth,", 10.5, 5.2, false);
    para(l.data.tujuanPeserta, 10.5, 5.2, true);
    para("Di - Tempat", 10.5, 5.2, false);
    y += 3;
    para("Dengan Hormat,", 10.5, 5.2, false);
    y += 1;
    para("Sehubungan dengan akan diselenggarakannya kegiatan organisasi, kami mengundang Bapak/Ibu/Saudara untuk hadir pada:", 10.5, 5.2, false);
    y += 2;
    labelValue("HARI/TANGGAL", fmtTgl(l.data.tanggalAcara));
    if (l.data.waktuAcara) labelValue("JAM", l.data.waktuAcara + " WIB");
    labelValue("TEMPAT", l.data.tempatAcara);
    if (l.data.agenda) {
      y += 2;
      para("Agenda:", 10.5, 5.2, false);
      para(l.data.agenda, 10.5, 5.2, false);
    }
    if (l.data.catatan) {
      y += 1;
      para("Catatan: " + l.data.catatan, 10, 5, false);
    }
    y += 4;
    para("Demikian undangan ini kami sampaikan, atas perhatian dan kehadirannya kami ucapkan terima kasih.", 10.5, 5.2, false);
    y += 10;
    drawLetterClosing(doc, pageWidth, marginX, y, l.tanggalSurat, [ {
      role: "Ketua",
      name: ROLE_NAMES.ketua
    }, {
      role: "Sekretaris",
      name: ROLE_NAMES.sekretaris
    } ]);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text("Nomor : " + (l.nomorSurat || "-"), marginX, y);
    y += 10;
    centered("SURAT KETERANGAN", 14, true, true);
    y += 3;
    para("Yang bertanda tangan di bawah ini, Ketua PUK SP RTMM-SPSI PT. Torabika Eka Semesta 1, dengan ini menerangkan bahwa:", 10.5, 5.2, false);
    y += 2;
    labelValue("Nama", l.data.namaDiterangkan);
    labelValue("Jabatan/NIK", l.data.jabatanNIK);
    y += 2;
    para(l.data.isiKeterangan, 10.5, 5.2, false);
    if (l.data.masaBerlaku) {
      y += 1;
      para("Surat keterangan ini berlaku sampai dengan " + fmtTgl(l.data.masaBerlaku) + ".", 10.5, 5.2, false);
    }
    y += 4;
    para("Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.", 10.5, 5.2, false);
    y += 10;
    drawLetterClosing(doc, pageWidth, marginX, y, l.tanggalSurat, [ {
      role: "Ketua",
      name: ROLE_NAMES.ketua
    } ]);
  }
  const fileType = l.type === "mandat" ? "Tugas" : l.type === "undangan" ? "Undangan" : "Keterangan";
  doc.save(`Surat-${fileType}-${l.tanggalSurat}.pdf`);
  showToast("Surat PDF sedang diunduh");
}
